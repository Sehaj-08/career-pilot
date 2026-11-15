import { useState, useEffect, useRef, useCallback } from 'react';

// ── Helper: Convert PCM Float32 Array to 16kHz 16-bit Mono WAV Blob ─────────
function encodeWav(samples, sourceSampleRate = 44100) {
  const targetSampleRate = 16000;
  let resampled;

  if (sourceSampleRate === targetSampleRate) {
    resampled = samples;
  } else {
    const ratio = sourceSampleRate / targetSampleRate;
    const newLength = Math.max(1, Math.round(samples.length / ratio));
    resampled = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const origIndex = i * ratio;
      const indexFloor = Math.floor(origIndex);
      const indexCeil = Math.min(samples.length - 1, indexFloor + 1);
      const frac = origIndex - indexFloor;
      resampled[i] = samples[indexFloor] * (1 - frac) + samples[indexCeil] * frac;
    }
  }

  const buffer = new ArrayBuffer(44 + resampled.length * 2);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + resampled.length * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // "fmt " chunk
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true); // Byte rate (16000 * 2 bytes)
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample

  // "data" chunk
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, resampled.length * 2, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < resampled.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, resampled[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

// Helper to convert Blob to Base64 string
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const b64 = reader.result.split(',')[1];
        resolve(b64);
      } else {
        resolve('');
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function useVoiceInterview({ sessionId, role, candidateName, initialQuestion, onNewQuestion, enabled = true }) {
  const [status, setStatus] = useState('connecting'); // connecting, listening, transcribing, thinking, speaking, interrupted, completed
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0); // 0-100 for visualizer
  const [candidateTranscript, setCandidateTranscript] = useState('');
  const [currentInterviewerSentence, setCurrentInterviewerSentence] = useState('');
  const [speechPhase, setSpeechPhase] = useState('question'); // 'question' | 'feedback' | 'completed'
  const [conversationHistory, setConversationHistory] = useState([]);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const scriptProcessorRef = useRef(null);
  const recognitionRef = useRef(null);
  const animFrameRef = useRef(null);
  const currentAudioSourceRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const pendingStatusRef = useRef(null);

  // PCM recording buffers for candidate turn
  const pcmChunksRef = useRef([]);
  const isListeningRef = useRef(false);
  const isMutedRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const hasSpokenRef = useRef(false);
  const liveTranscriptRef = useRef('');

  const onNewQuestionRef = useRef(onNewQuestion);
  onNewQuestionRef.current = onNewQuestion;
  const initialQuestionRef = useRef(initialQuestion);
  initialQuestionRef.current = initialQuestion;

  // Sync state with refs for event handlers
  isListeningRef.current = status === 'listening';
  isMutedRef.current = isMuted;

  // ── Helper: Play next audio buffer in queue ───────────────────────────────
  const playNextInQueue = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      if (pendingStatusRef.current) {
        setStatus(pendingStatusRef.current);
        pendingStatusRef.current = null;
      }
      return;
    }

    isPlayingRef.current = true;
    const buffer = audioQueueRef.current.shift();

    try {
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);

      currentAudioSourceRef.current = source;

      source.onended = () => {
        currentAudioSourceRef.current = null;
        if (audioQueueRef.current.length > 0) {
          playNextInQueue();
        } else {
          isPlayingRef.current = false;
          // When all interviewer audio has finished playing through the speakers:
          if (pendingStatusRef.current) {
            setStatus(pendingStatusRef.current);
            pendingStatusRef.current = null;
          }
        }
      };

      source.start(0);
    } catch (err) {
      console.warn('[useVoiceInterview] Audio buffer play error:', err);
      isPlayingRef.current = false;
      if (pendingStatusRef.current) {
        setStatus(pendingStatusRef.current);
        pendingStatusRef.current = null;
      }
    }
  }, []);

  const playNextInQueueRef = useRef(playNextInQueue);
  playNextInQueueRef.current = playNextInQueue;

  // ── Helper: Stop all current AI audio playback (Barge-in) ─────────────────
  const stopAudioPlayback = useCallback(() => {
    audioQueueRef.current = [];
    pendingStatusRef.current = null;
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch (err) {
        // Source may already have ended
      }
      currentAudioSourceRef.current = null;
    }
    isPlayingRef.current = false;
  }, []);

  const stopAudioPlaybackRef = useRef(stopAudioPlayback);
  stopAudioPlaybackRef.current = stopAudioPlayback;

  // ── Helper: Send control JSON to WebSocket ────────────────────────────────
  const sendJson = useCallback((payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // ── Turn Control: Candidate Finished Speaking ────────────────────────────
  const finishSpeaking = useCallback(async () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    hasSpokenRef.current = false;
    setStatus('transcribing');

    // Gather recorded PCM samples
    const chunks = pcmChunksRef.current;
    pcmChunksRef.current = [];

    let totalLength = 0;
    for (const chunk of chunks) {
      totalLength += chunk.length;
    }

    let b64Wav = '';
    if (totalLength > 1000 && audioContextRef.current) {
      const merged = new Float32Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      try {
        const wavBlob = encodeWav(merged, audioContextRef.current.sampleRate || 44100);
        b64Wav = await blobToBase64(wavBlob);
      } catch (encodeErr) {
        console.warn('[useVoiceInterview] WAV encoding error:', encodeErr);
      }
    }

    // Send complete turn payload with pristine WAV + live speech recognition fallback
    sendJson({
      type: 'candidate_audio_turn',
      audio: b64Wav,
      mime_type: 'audio/wav',
      fallback_text: liveTranscriptRef.current,
    });
  }, [sendJson]);

  const finishSpeakingRef = useRef(finishSpeaking);
  finishSpeakingRef.current = finishSpeaking;

  // ── Turn Control: Interrupt AI Speech (Barge-in) ─────────────────────────
  const interrupt = useCallback(() => {
    stopAudioPlaybackRef.current();
    sendJson({ type: 'interrupt' });
    setStatus('listening');
  }, [sendJson]);

  // ── Toggle Microphone Mute ───────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !next;
        });
      }
      return next;
    });
  }, []);

  // ── Stable WebSocket & Audio Lifecycle (Runs ONCE per session) ────────────
  useEffect(() => {
    if (!enabled) return;
    let mounted = true;

    // 1. Setup AudioContext for low-latency playback & recording
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContextClass();

    // 2. Derive WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}:8000/api/ws/interview/${sessionId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    let currentSentenceAudioChunks = [];

    ws.onopen = () => {
      if (!mounted) return;
      setIsConnected(true);
      setStatus('connecting');

      // Handshake with current question
      ws.send(JSON.stringify({
        type: 'init_session',
        role: role || 'DevOps Engineer',
        candidate_name: candidateName || 'Candidate',
        initial_question: initialQuestionRef.current || null,
      }));
    };

    ws.onmessage = async (event) => {
      if (!mounted) return;

      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'session_ready':
            // Wait for speaker or start listening
            if (!isPlayingRef.current) {
              setStatus('listening');
            }
            break;

          case 'status':
            if (msg.status === 'listening') {
              // Reset candidate turn state
              pcmChunksRef.current = [];
              hasSpokenRef.current = false;
              liveTranscriptRef.current = '';
              setCandidateTranscript('');

              // If the interviewer's speech audio is still playing through the speakers,
              // defer switching to 'listening' until speakers finish playing!
              if (isPlayingRef.current) {
                pendingStatusRef.current = 'listening';
              } else {
                setStatus('listening');
              }
            } else {
              pendingStatusRef.current = null;
              setStatus(msg.status);
            }
            break;

          case 'candidate_transcript':
            setCandidateTranscript(msg.text);
            liveTranscriptRef.current = msg.text;
            if (msg.text && msg.text !== '(Silence or unclear speech)') {
              setConversationHistory((prev) => [
                ...prev,
                { speaker: 'candidate', text: msg.text, timestamp: new Date() }
              ]);
            }
            break;

          case 'new_question':
            if (onNewQuestionRef.current) {
              onNewQuestionRef.current(msg);
            }
            break;

          case 'interviewer_speech_start':
            setCurrentInterviewerSentence(msg.sentence);
            setSpeechPhase(msg.phase || 'question');
            currentSentenceAudioChunks = [];
            setConversationHistory((prev) => [
              ...prev,
              { speaker: 'interviewer', phase: msg.phase || 'question', text: msg.sentence, timestamp: new Date() }
            ]);
            break;

          case 'audio_chunk':
            if (msg.audio) {
              const binaryString = window.atob(msg.audio);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              currentSentenceAudioChunks.push(bytes);
            }
            break;

          case 'interviewer_speech_end':
            if (msg.cancelled) {
              stopAudioPlaybackRef.current();
              currentSentenceAudioChunks = [];
              break;
            }

            if (currentSentenceAudioChunks.length > 0 && audioContextRef.current) {
              const totalLength = currentSentenceAudioChunks.reduce((acc, c) => acc + c.length, 0);
              const merged = new Uint8Array(totalLength);
              let offset = 0;
              for (const c of currentSentenceAudioChunks) {
                merged.set(c, offset);
                offset += c.length;
              }
              currentSentenceAudioChunks = [];

              try {
                if (audioContextRef.current.state === 'suspended') {
                  await audioContextRef.current.resume();
                }
                const audioBuffer = await audioContextRef.current.decodeAudioData(merged.buffer);
                audioQueueRef.current.push(audioBuffer);

                if (!isPlayingRef.current) {
                  playNextInQueueRef.current();
                }
              } catch (decodeErr) {
                console.warn('[useVoiceInterview] Audio decode error:', decodeErr);
              }
            }
            break;

          case 'interrupted':
            stopAudioPlaybackRef.current();
            currentSentenceAudioChunks = [];
            setStatus('listening');
            break;

          case 'error':
            console.error('[useVoiceInterview] Server error:', msg.message);
            break;

          default:
            break;
        }
      } catch (err) {
        console.warn('[useVoiceInterview] WebSocket message parse error:', err);
      }
    };

    ws.onclose = () => {
      if (mounted) {
        setIsConnected(false);
        setStatus('connecting');
      }
    };

    ws.onerror = (err) => {
      console.warn('[useVoiceInterview] WebSocket error:', err);
    };

    // 3. Initialize Microphone Stream with Echo Cancellation & Web Audio Recording
    async function initMicrophone() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 16000,
          },
          video: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;

        if (audioContextRef.current) {
          const audioCtx = audioContextRef.current;
          const source = audioCtx.createMediaStreamSource(stream);

          // Visualizer analyser node
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          // PCM audio processor for high-fidelity WAV recording
          const processor = audioCtx.createScriptProcessor(4096, 1, 1);
          processor.onaudioprocess = (e) => {
            if (!mounted) return;
            // ONLY record when it's candidate's turn AND AI is NOT speaking through speakers
            if (isListeningRef.current && !isPlayingRef.current && !isMutedRef.current) {
              const inputChannel = e.inputBuffer.getChannelData(0);
              pcmChunksRef.current.push(new Float32Array(inputChannel));
            }
          };

          // Route through zero-gain node so Chrome executes audioprocess without feedback
          const silentGain = audioCtx.createGain();
          silentGain.gain.value = 0;
          source.connect(processor);
          processor.connect(silentGain);
          silentGain.connect(audioCtx.destination);
          scriptProcessorRef.current = processor;

          // Volume meter & smart pause detection
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVolume = () => {
            if (!mounted) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const normalized = Math.min(100, Math.round((average / 128) * 100));
            setAudioVolume(normalized);

            // Turn silence detection:
            // ONLY arm after genuine speech (>20 volume) has occurred while AI is not speaking
            if (isListeningRef.current && !isPlayingRef.current && !isMutedRef.current) {
              if (normalized > 20) {
                hasSpokenRef.current = true;
                if (silenceTimerRef.current) {
                  clearTimeout(silenceTimerRef.current);
                  silenceTimerRef.current = null;
                }
              } else if (hasSpokenRef.current && normalized <= 10) {
                // Generous 4.5s natural pause before auto-submitting (candidate can think)
                if (!silenceTimerRef.current) {
                  silenceTimerRef.current = setTimeout(() => {
                    if (hasSpokenRef.current && isListeningRef.current && !isPlayingRef.current) {
                      finishSpeakingRef.current();
                    }
                  }, 4500);
                }
              }
            }

            animFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        }

        // 4. Client-side Real-time Speech Recognition (Chrome/Edge Native Web Speech API)
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
          try {
            const recognizer = new SpeechRecognition();
            recognizer.continuous = true;
            recognizer.interimResults = true;
            recognizer.lang = 'en-US';

            recognizer.onresult = (event) => {
              // ONLY transcribe candidate words when it's candidate's turn AND AI is NOT speaking
              if (!isListeningRef.current || isPlayingRef.current || isMutedRef.current) return;
              let currentText = '';
              for (let i = event.resultIndex; i < event.results.length; i++) {
                currentText += event.results[i][0].transcript;
              }
              if (currentText.trim()) {
                hasSpokenRef.current = true;
                setCandidateTranscript(currentText.trim());
                liveTranscriptRef.current = currentText.trim();
              }
            };

            recognizer.onerror = (err) => {
              // Ignore non-fatal speech errors (e.g. no-speech when thinking)
              if (err.error !== 'no-speech') {
                console.warn('[useVoiceInterview] Speech recognition warning:', err.error);
              }
            };

            recognizer.onend = () => {
              // Automatically keep recognizer running while listening
              if (mounted && isListeningRef.current && !isPlayingRef.current && !isMutedRef.current) {
                try { recognizer.start(); } catch (e) {}
              }
            };

            recognizer.start();
            recognitionRef.current = recognizer;
          } catch (recErr) {
            console.warn('[useVoiceInterview] Web Speech API initialization notice:', recErr);
          }
        }
      } catch (micErr) {
        console.error('[useVoiceInterview] Microphone init error:', micErr);
      }
    }

    initMicrophone();

    return () => {
      mounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (scriptProcessorRef.current) {
        try { scriptProcessorRef.current.disconnect(); } catch (e) {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      stopAudioPlaybackRef.current();
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
      }
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [sessionId, role, candidateName, enabled]); // Stable dependencies: NEVER reconnects during conversation

  return {
    status,
    isConnected,
    isMuted,
    audioVolume,
    candidateTranscript,
    currentInterviewerSentence,
    speechPhase,
    conversationHistory,
    toggleMute,
    finishSpeaking,
    interrupt,
  };
}
