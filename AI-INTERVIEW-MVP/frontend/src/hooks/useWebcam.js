import { useRef, useState, useEffect, useCallback } from 'react';
import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';
import { logEvent } from '../utils/eventLogger';

// False-positive prevention thresholds
const ABSENCE_THRESHOLD_MS = 3000;    // Must persist for continuous 3.0s
const MULTIPLE_THRESHOLD_MS = 2000;   // Must persist for continuous 2.0s
const RECOVERY_THRESHOLD_MS = 1000;   // 1.0s of continuous stable 1 face to re-arm for next incident

export function useWebcam(onCameraStrike = null) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [faceCount, setFaceCount] = useState(0);

  // Timestamps for duration validation
  const absenceStartRef = useRef(null);
  const multipleFacesStartRef = useRef(null);
  const normalStartRef = useRef(null);
  const strikeFiredForEpisodeRef = useRef(null); // 'face_absent' | 'multiple_faces' | null
  const onCameraStrikeRef = useRef(onCameraStrike);
  onCameraStrikeRef.current = onCameraStrike;

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) { /* ignore */ }
      });
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // 1. Initialize MediaPipe FaceDetector with VIDEO mode
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        detectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/blaze_face_short_range.tflite",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5,
        });

        // 2. Initialize Webcam
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          videoRef.current.onloadeddata = () => {
            if (!mounted) return;
            setIsCameraActive(true);

            // 3. Start Detection Loop
            let lastTimestamp = -1;

            const detect = () => {
              if (!videoRef.current || !detectorRef.current || !mounted) return;
              if (videoRef.current.readyState < 2) {
                animationFrameRef.current = requestAnimationFrame(detect);
                return;
              }

              const timestamp = performance.now();
              if (timestamp <= lastTimestamp) {
                animationFrameRef.current = requestAnimationFrame(detect);
                return;
              }
              lastTimestamp = timestamp;

              try {
                const detections = detectorRef.current.detectForVideo(videoRef.current, timestamp);
                const count = detections.detections.length;
                setFaceCount(count);

                const now = Date.now();

                // ── A. Face Absence Evaluation (>= 3.0s continuous) ──
                if (count === 0) {
                  normalStartRef.current = null;
                  multipleFacesStartRef.current = null;

                  if (!absenceStartRef.current) {
                    absenceStartRef.current = now;
                  } else if (
                    now - absenceStartRef.current >= ABSENCE_THRESHOLD_MS &&
                    strikeFiredForEpisodeRef.current !== 'face_absent'
                  ) {
                    // Continuous 3.0s absence verified
                    strikeFiredForEpisodeRef.current = 'face_absent';
                    logEvent('face_absent', 'No face detected in camera for over 3 seconds');
                    if (onCameraStrikeRef.current) {
                      onCameraStrikeRef.current('face_absent', 'No face detected for over 3 seconds');
                    }
                  }
                }

                // ── B. Multiple Faces Evaluation (>= 2.0s continuous) ──
                else if (count > 1) {
                  normalStartRef.current = null;
                  absenceStartRef.current = null;

                  if (!multipleFacesStartRef.current) {
                    multipleFacesStartRef.current = now;
                  } else if (
                    now - multipleFacesStartRef.current >= MULTIPLE_THRESHOLD_MS &&
                    strikeFiredForEpisodeRef.current !== 'multiple_faces'
                  ) {
                    // Continuous 2.0s multiple faces verified
                    strikeFiredForEpisodeRef.current = 'multiple_faces';
                    logEvent('multiple_faces', 'Multiple faces detected in camera for over 2 seconds');
                    if (onCameraStrikeRef.current) {
                      onCameraStrikeRef.current('multiple_faces', 'Multiple faces detected for over 2 seconds');
                    }
                  }
                }

                // ── C. Normal Single Face Present (Recovery & Re-arming) ──
                else if (count === 1) {
                  absenceStartRef.current = null;
                  multipleFacesStartRef.current = null;

                  if (!normalStartRef.current) {
                    normalStartRef.current = now;
                  } else if (now - normalStartRef.current >= RECOVERY_THRESHOLD_MS) {
                    // Sustained stable state achieved: re-arm incident detector
                    strikeFiredForEpisodeRef.current = null;
                  }
                }
              } catch (detectionError) {
                console.warn('MediaPipe Detection error:', detectionError);
              }

              // Throttled loop (~5 FPS)
              setTimeout(() => {
                if (mounted) {
                  animationFrameRef.current = requestAnimationFrame(detect);
                }
              }, 200);
            };

            animationFrameRef.current = requestAnimationFrame(detect);
          };
        }
      } catch (err) {
        console.error('Camera/MediaPipe init error:', err);
        setError(err.message);
        setIsCameraActive(false);
      }
    }

    init();

    return () => {
      mounted = false;
      stopWebcam();
      if (detectorRef.current) {
        try { detectorRef.current.close(); } catch (e) { /* ignore */ }
      }
    };
  }, [stopWebcam]);

  return { videoRef, isCameraActive, error, faceCount, stopWebcam };
}
