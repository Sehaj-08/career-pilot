import { useState, useEffect, useRef, useCallback } from 'react';

export function useVoiceInterview({ sessionId, role, candidateName }) {
  const [status, setStatus] = useState('connecting'); // connecting, listening, transcribing, thinking, speaking, interrupted
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0); // 0-100 for visualizer
  const [candidateTranscript, setCandidateTranscript] = useState('');
  const [currentInterviewerSentence, setCurrentInterviewerSentence] = useState('');
  const [conversationHistory, setConversationHistory] = useState([]);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const animFrameRef = useRef(null);
  const currentAudioSourceRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const hasSpokenRef = useRef(false);

  // ── Helper: Play next audio buffer in queue ───────────────────────────────
  const playNextInQueue = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
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
        }
      };

      source.start(0);
    } catch (err) {
      console.warn('[useVoiceInterview] Audio buffer play error:', err);
      isPlayingRef.current = false;
    }
  }, []);

  // ── Helper: Stop all current AI audio playback (Barge-in) ─────────────────
  const stopAudioPlayback = useCallback(() => {
    audioQueueRef.current = [];
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

  // ── Helper: Send control JSON to WebSocket ────────────────────────────────
  const sendJson = useCallback((payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // ── Turn Control: Candidate Finished Speaking ────────────────────────────
  const finishSpeaking = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    hasSpokenRef.current = false;

    // Flush final audio slice from recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.requestData();
      } catch (err) {
        console.warn('requestData error:', err);
      }
    }

    sendJson({ type: 'finish_speaking' });
    setStatus('transcribing');
  }, [sendJson]);

  // ── Turn Control: Interrupt AI Speech (Barge-in) ─────────────────────────
  const interrupt = useCallback(() => {
    stopAudioPlayback();
    sendJson({ type: 'interrupt' });
    setStatus('listening');
  }, [sendJson, stopAudioPlayback]);

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

  // ── Initialize WebSocket & MediaStream ───────────────────────────────────
  useEffect(() => {
    let mounted = true;

    // 1. Setup AudioContext for low-latency playback
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContextClass();

    // 2. Derive WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const wsUrl = `${protocol}//${host}:8000/api/ws/interview/${sessionId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    // Buffer for collecting audio chunks of the current sentence
    let currentSentenceAudioChunks = [];

    ws.onopen = () => {
      if (!mounted) return;
      setIsConnected(true);
      setStatus('connecting');

      // Send initial handshake
      ws.send(JSON.stringify({
        type: 'init_session',
        role: role || 'DevOps Engineer',
        candidate_name: candidateName || 'Candidate',
      }));
    };

    ws.onmessage = async (event) => {
      if (!mounted) return;
      try {
        const msg = JSON.parse(event.data);

        switch (msg.type) {
          case 'session_ready':
            setStatus('listening');
            break;

          case 'status':
            setStatus(msg.status);
            break;

          case 'candidate_transcript':
            setCandidateTranscript(msg.text);
            if (msg.text && msg.text !== '(Silence or unclear speech)') {
              setConversationHistory((prev) => [
                ...prev,
                { speaker: 'candidate', text: msg.text, timestamp: new Date() }
              ]);
            }
            break;

          case 'interviewer_speech_start':
            setCurrentInterviewerSentence(msg.sentence);
            currentSentenceAudioChunks = [];
            setConversationHistory((prev) => [
              ...prev,
              { speaker: 'interviewer', text: msg.sentence, timestamp: new Date() }
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
              stopAudioPlayback();
              currentSentenceAudioChunks = [];
              break;
            }

            if (currentSentenceAudioChunks.length > 0 && audioContextRef.current) {
              // Merge chunks into single ArrayBuffer and decode
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
                  playNextInQueue();
                }
              } catch (decodeErr) {
                console.warn('[useVoiceInterview] Audio decode error:', decodeErr);
              }
            }
            break;

          case 'interrupted':
            stopAudioPlayback();
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

    // 3. Initialize Microphone Stream with Echo Cancellation
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

        // Visualizer audio analyser node
        if (audioContextRef.current) {
          const source = audioContextRef.current.createMediaStreamSource(stream);
          const analyser = audioContextRef.current.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

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

            // Silence detection when candidate is in 'listening' turn
            if (normalized > 12) {
              hasSpokenRef.current = true;
              if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
                silenceTimerRef.current = null;
              }
            } else if (hasSpokenRef.current && normalized <= 8) {
              // If candidate spoke and has now gone quiet for 1.8 seconds, auto-finish turn
              if (!silenceTimerRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                  if (hasSpokenRef.current) {
                    finishSpeaking();
                  }
                }, 1800);
              }
            }

            animFrameRef.current = requestAnimationFrame(updateVolume);
          };
          updateVolume();
        }

        // Setup MediaRecorder for streaming candidate audio chunks to ElevenLabs STT
        let mimeType = 'audio/webm;codecs=opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
        }

        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = async (e) => {
          if (e.data && e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                const b64 = reader.result.split(',')[1];
                if (b64) {
                  ws.send(JSON.stringify({ type: 'audio_chunk', data: b64 }));
                }
              }
            };
            reader.readAsDataURL(e.data);
          }
        };

        // Emit slice every 250ms
        recorder.start(250);
      } catch (micErr) {
        console.error('[useVoiceInterview] Microphone init error:', micErr);
      }
    }

    initMicrophone();

    return () => {
      mounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch (e) {}
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      stopAudioPlayback();
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
      }
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [sessionId, role, candidateName, playNextInQueue, stopAudioPlayback, finishSpeaking]);

  return {
    status,
    isConnected,
    isMuted,
    audioVolume,
    candidateTranscript,
    currentInterviewerSentence,
    conversationHistory,
    toggleMute,
    finishSpeaking,
    interrupt,
  };
}
