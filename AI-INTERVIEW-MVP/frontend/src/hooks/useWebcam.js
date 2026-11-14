import { useRef, useState, useEffect, useCallback } from 'react';
import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';
import { logEvent } from '../utils/eventLogger';

export function useWebcam() {
  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [faceCount, setFaceCount] = useState(0);
  const [lastEvent, setLastEvent] = useState(null);

  const emitMonitoringEvent = useCallback((type, message) => {
    if (lastEvent === type) return; // Prevent duplicate alerts
    logEvent(type, { message, timestamp: new Date().toISOString() });
    setLastEvent(type);
  }, [lastEvent]);

  useEffect(() => {
    let streamInstance = null;
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
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          minDetectionConfidence: 0.5
        });

        // 2. Initialize Webcam
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false
        });

        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamInstance = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          // Wait for video to be ready before starting detection
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
              // MediaPipe requires increasing timestamps
              if (timestamp <= lastTimestamp) {
                animationFrameRef.current = requestAnimationFrame(detect);
                return;
              }
              lastTimestamp = timestamp;

              try {
                const detections = detectorRef.current.detectForVideo(videoRef.current, timestamp);
                const count = detections.detections.length;
                setFaceCount(count);

                if (count === 0) emitMonitoringEvent('face_absent', 'No face detected');
                else if (count === 1) emitMonitoringEvent('face_detected', 'Face detected');
                else if (count > 1) emitMonitoringEvent('multiple_faces', 'Multiple faces detected');
              } catch (detectionError) {
                console.warn('Detection error:', detectionError);
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
      if (streamInstance) streamInstance.getTracks().forEach(track => track.stop());
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (detectorRef.current) detectorRef.current.close();
    };
  }, [emitMonitoringEvent]);

  return { videoRef, isCameraActive, error, faceCount };
}
