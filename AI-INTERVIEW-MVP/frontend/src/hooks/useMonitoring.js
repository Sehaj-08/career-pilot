import { useState, useEffect, useCallback, useRef } from 'react';
import {
  logEvent,
  getStoredEvents,
  computeIntegritySummary,
  EVENT_TYPES,
} from '../utils/eventLogger';

export function useMonitoring() {
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [warning, setWarning] = useState('');
  const [events, setEvents] = useState(() => getStoredEvents());

  const [metrics, setMetrics] = useState(() => {
    const summary = computeIntegritySummary();
    return {
      faceDetected: true,
      multipleFaces: false,
      tabSwitches: summary.countsByType[EVENT_TYPES.TAB_SWITCH] || 0,
      suspiciousCount: summary.suspiciousCount,
      integrityScore: summary.integrityScore,
      isFullscreen: Boolean(document.fullscreenElement),
    };
  });

  const warningTimeoutRef = useRef(null);
  const isMonitoringRef = useRef(isMonitoring);
  isMonitoringRef.current = isMonitoring;

  // Sync state with latest stored events
  const refreshMetrics = useCallback(() => {
    const stored = getStoredEvents();
    setEvents(stored);
    const summary = computeIntegritySummary();
    setMetrics((prev) => ({
      ...prev,
      tabSwitches: summary.countsByType[EVENT_TYPES.TAB_SWITCH] || 0,
      suspiciousCount: summary.suspiciousCount,
      integrityScore: summary.integrityScore,
      isFullscreen: Boolean(document.fullscreenElement),
    }));
  }, []);

  // Display a temporary or persistent warning
  const triggerWarning = useCallback((message, autoDismiss = true) => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    setWarning(message);
    if (autoDismiss) {
      warningTimeoutRef.current = setTimeout(() => {
        setWarning('');
      }, 4000);
    }
  }, []);

  const clearWarning = useCallback(() => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    setWarning('');
  }, []);

  // ── Fullscreen Request & Exit ──────────────────────────────────────────────
  const requestFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
      }
      setIsFullscreen(true);
      return true;
    } catch (err) {
      console.warn('[useMonitoring] Fullscreen request rejected or unavailable:', err);
      triggerWarning('Fullscreen request was blocked by browser. Please enable permissions.', true);
      return false;
    }
  }, [triggerWarning]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn('[useMonitoring] Fullscreen exit error:', err);
    }
  }, []);

  // ── Start / Stop Monitoring Lifecycle ──────────────────────────────────────
  const startMonitoring = useCallback(async () => {
    setIsMonitoring(true);
    isMonitoringRef.current = true;
    logEvent(EVENT_TYPES.MONITORING_STARTED, 'Interview security monitoring active');
    refreshMetrics();
  }, [refreshMetrics]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    isMonitoringRef.current = false;
    clearWarning();
    logEvent(EVENT_TYPES.MONITORING_STOPPED, 'Interview security monitoring stopped');
    refreshMetrics();
  }, [clearWarning, refreshMetrics]);

  // ── Update Face Metrics from Hour 5 Webcam Hook ────────────────────────────
  const updateFaceMetrics = useCallback((count) => {
    if (!isMonitoringRef.current) return;
    setMetrics((prev) => ({
      ...prev,
      faceDetected: count > 0,
      multipleFaces: count > 1,
    }));
  }, []);

  // ── Clipboard & Context Menu Restrictions (Blocked) ─────────────────────────
  const handleCopy = useCallback((e) => {
    if (!isMonitoringRef.current) return;
    e.preventDefault();
    logEvent(EVENT_TYPES.COPY_ATTEMPT, 'Copying interview content is prohibited');
    triggerWarning('Copying text is disabled during the interview assessment.');
  }, [triggerWarning]);

  const handlePaste = useCallback((e) => {
    if (!isMonitoringRef.current) return;
    e.preventDefault();
    logEvent(EVENT_TYPES.PASTE_ATTEMPT, 'Pasting external content is prohibited');
    triggerWarning('Pasting content is blocked. Please type your answers directly.');
  }, [triggerWarning]);

  const handleCut = useCallback((e) => {
    if (!isMonitoringRef.current) return;
    e.preventDefault();
    logEvent(EVENT_TYPES.CUT_ATTEMPT, 'Cutting interview content is prohibited');
    triggerWarning('Cutting text is disabled during the interview assessment.');
  }, [triggerWarning]);

  const handleContextMenu = useCallback((e) => {
    if (!isMonitoringRef.current) return;
    e.preventDefault();
    logEvent(EVENT_TYPES.RIGHT_CLICK_ATTEMPT, 'Right-click context menu is restricted');
    triggerWarning('Right-click context menu is disabled during the interview.');
  }, [triggerWarning]);

  // ── Browser Event Listeners Setup ──────────────────────────────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      setMetrics((prev) => ({ ...prev, isFullscreen: active }));

      if (isMonitoringRef.current) {
        if (!active) {
          logEvent(EVENT_TYPES.FULLSCREEN_EXIT, 'Candidate exited fullscreen mode');
          triggerWarning('Warning: Fullscreen exited! Please click Re-enter Fullscreen to resume.', false);
        } else {
          logEvent(EVENT_TYPES.FULLSCREEN_ENTER, 'Candidate re-entered fullscreen mode');
          clearWarning();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!isMonitoringRef.current) return;

      if (document.hidden || document.visibilityState === 'hidden') {
        logEvent(EVENT_TYPES.TAB_SWITCH, 'Candidate switched tabs or minimized window');
        triggerWarning('Tab switch detected! Please keep the interview window focused.');
      }
    };

    const handleWindowBlur = () => {
      if (!isMonitoringRef.current) return;
      // When window loses focus (e.g. clicking external app or second screen)
      logEvent(EVENT_TYPES.WINDOW_BLUR, 'Browser window lost focus');
      triggerWarning('Window focus lost! Please stay focused on the interview.');
    };

    const handleCustomLogEvent = () => {
      refreshMetrics();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('monitoring-event-logged', handleCustomLogEvent);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('monitoring-event-logged', handleCustomLogEvent);
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
    };
  }, [triggerWarning, clearWarning, refreshMetrics]);

  return {
    isMonitoring,
    isFullscreen,
    warning,
    metrics,
    events,
    startMonitoring,
    stopMonitoring,
    requestFullscreen,
    exitFullscreen,
    clearWarning,
    updateFaceMetrics,
    handleCopy,
    handlePaste,
    handleCut,
    handleContextMenu,
    refreshMetrics,
  };
}
