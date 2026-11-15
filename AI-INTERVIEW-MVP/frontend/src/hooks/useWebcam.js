import { useRef, useState, useEffect, useCallback } from 'react';
import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';
import { logEvent } from '../utils/eventLogger';

// False-positive prevention thresholds
const ABSENCE_THRESHOLD_MS = 3000;    // Must persist for continuous 3.0s
const MULTIPLE_THRESHOLD_MS = 2000;   // Must persist for continuous 2.0s
const RECOVERY_THRESHOLD_MS = 1000;   // 1.0s of continuous stable 1 face to re-arm for next incident

export function useWebcam(onCameraStrike = null) {
  const videoNodeRef = useRef(null);
  const streamRef = useRef(null);
  const detectorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isDetectingRef = useRef(false);
  const mountedRef = useRef(true);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [faceCount, setFaceCount] = useState(0);

  // Timestamps for duration validation
  const absenceStartRef = useRef(null);
  const multipleFacesStartRef = useRef(null);
  const normalStartRef = useRef(null);
  const strikeFiredForEpisodeRef = useRef(null);
  const onCameraStrikeRef = useRef(onCameraStrike);
  onCameraStrikeRef.current = onCameraStrike;

  const startDetectionLoop = useCallback(() => {
    if (isDetectingRef.current || !detectorRef.current || !videoNodeRef.current) return;
    isDetectingRef.current = true;
    let lastTimestamp = -1;

    const detect = () => {
      if (!videoNodeRef.current || !detectorRef.current || !mountedRef.current) {
        isDetectingRef.current = false;
        return;
      }
      if (videoNodeRef.current.readyState < 2) {
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
        const detections = detectorRef.current.detectForVideo(videoNodeRef.current, timestamp);
        const count = detections.detections.length;
        setFaceCount(count);

        const now = Date.now();

        // A. Face Absence Evaluation (>= 3.0s continuous)
        if (count === 0) {
          normalStartRef.current = null;
          multipleFacesStartRef.current = null;

          if (!absenceStartRef.current) {
            absenceStartRef.current = now;
          } else if (
            now - absenceStartRef.current >= ABSENCE_THRESHOLD_MS &&
            strikeFiredForEpisodeRef.current !== 'face_absent'
          ) {
            strikeFiredForEpisodeRef.current = 'face_absent';
            logEvent('face_absent', 'No face detected in camera for over 3 seconds');
            if (onCameraStrikeRef.current) {
              onCameraStrikeRef.current('face_absent', 'No face detected for over 3 seconds');
            }
          }
        }
        // B. Multiple Faces Evaluation (>= 2.0s continuous)
        else if (count > 1) {
          normalStartRef.current = null;
          absenceStartRef.current = null;

          if (!multipleFacesStartRef.current) {
            multipleFacesStartRef.current = now;
          } else if (
            now - multipleFacesStartRef.current >= MULTIPLE_THRESHOLD_MS &&
            strikeFiredForEpisodeRef.current !== 'multiple_faces'
          ) {
            strikeFiredForEpisodeRef.current = 'multiple_faces';
            logEvent('multiple_faces', 'Multiple faces detected in camera for over 2 seconds');
            if (onCameraStrikeRef.current) {
              onCameraStrikeRef.current('multiple_faces', 'Multiple faces detected for over 2 seconds');
            }
          }
        }
        // C. Normal Single Face Present (Recovery & Re-arming)
        else if (count === 1) {
          absenceStartRef.current = null;
          multipleFacesStartRef.current = null;

          if (!normalStartRef.current) {
            normalStartRef.current = now;
          } else if (now - normalStartRef.current >= RECOVERY_THRESHOLD_MS) {
            strikeFiredForEpisodeRef.current = null;
          }
        }
      } catch (detectionError) {
        // Ignore single-frame capture glitches
      }

      setTimeout(() => {
        if (mountedRef.current) {
          animationFrameRef.current = requestAnimationFrame(detect);
        }
      }, 200);
    };

    animationFrameRef.current = requestAnimationFrame(detect);
  }, []);

  const attachStreamToVideo = useCallback((node) => {
    if (!node || !streamRef.current) return;

    if (node.srcObject !== streamRef.current) {
      node.srcObject = streamRef.current;
    }

    node.play().catch(() => {});

    node.onloadeddata = () => {
      if (!mountedRef.current) return;
      setIsCameraActive(true);
      if (detectorRef.current && !isDetectingRef.current) {
        startDetectionLoop();
      }
    };

    if (node.readyState >= 2) {
      setIsCameraActive(true);
      if (detectorRef.current && !isDetectingRef.current) {
        startDetectionLoop();
      }
    }
  }, [startDetectionLoop]);

  // Reactive callback ref passed to <video ref={videoRef} />
  const videoRef = useCallback((node) => {
    videoNodeRef.current = node;
    videoRef.current = node; // maintain compatibility with any code reading videoRef.current
    if (node) {
      attachStreamToVideo(node);
    } else {
      isDetectingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [attachStreamToVideo]);
  videoRef.current = null;

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) {}
      });
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    isDetectingRef.current = false;
    setIsCameraActive(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    async function init() {
      try {
        // 1. Initialize MediaPipe FaceDetector
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

        if (videoNodeRef.current && videoNodeRef.current.readyState >= 2 && !isDetectingRef.current) {
          startDetectionLoop();
        }

        // 2. Initialize Webcam
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });

        if (!mountedRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        // If video element is already in the DOM, attach immediately
        if (videoNodeRef.current) {
          attachStreamToVideo(videoNodeRef.current);
        }
      } catch (err) {
        console.error('Camera/MediaPipe init error:', err);
        if (mountedRef.current) {
          setError(err.message);
          setIsCameraActive(false);
        }
      }
    }

    init();

    return () => {
      mountedRef.current = false;
      stopWebcam();
      if (detectorRef.current) {
        try { detectorRef.current.close(); } catch (e) {}
      }
    };
  }, [attachStreamToVideo, startDetectionLoop, stopWebcam]);

  return { videoRef, isCameraActive, error, faceCount, stopWebcam };
}
