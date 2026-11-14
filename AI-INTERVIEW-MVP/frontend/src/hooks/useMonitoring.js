import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  logEvent, 
  computeMonitoringSummary, 
  getStoredEvents, 
  EVENT_TYPES 
} from '../utils/eventLogger';

export function useMonitoring() {
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [tabActive, setTabActive] = useState(!document.hidden);
  const [warning, setWarning] = useState('');
  const [summary, setSummary] = useState(() => computeMonitoringSummary());

  const warningTimeoutRef = useRef(null);
  const wasFullscreenRef = useRef(!!document.fullscreenElement);

  // Helper to show temporary toast alert
  const showWarning = useCallback((message) => {
    setWarning(message);
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    warningTimeoutRef.current = setTimeout(() => {
      setWarning('');
    }, 3500);
  }, []);

  const clearWarning = useCallback(() => {
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }
    setWarning('');
  }, []);

  // Update summary state from storage
  const refreshSummary = useCallback(() => {
    setSummary(computeMonitoringSummary());
  }, []);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request error:', err);
      showWarning('Browser prevented fullscreen request.');
    }
  }, [showWarning]);

  useEffect(() => {
    // 1. Fullscreen Change Listener
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);

      if (wasFullscreenRef.current && !active) {
        logEvent(EVENT_TYPES.FULLSCREEN_EXIT);
        showWarning('⚠️ Fullscreen exited! Please remain in fullscreen mode.');
        refreshSummary();
      } else if (!wasFullscreenRef.current && active) {
        logEvent(EVENT_TYPES.FULLSCREEN_ENTER);
        refreshSummary();
      }

      wasFullscreenRef.current = active;
    };

    // 2. Tab Visibility Listener
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabActive(false);
        logEvent(EVENT_TYPES.TAB_SWITCH);
        showWarning('⚠️ Tab switch detected! Please stay focused on the interview.');
        refreshSummary();
      } else {
        setTabActive(true);
      }
    };

    // 3. Window Blur Listener (e.g. clicking outside browser onto other windows)
    const handleWindowBlur = () => {
      logEvent(EVENT_TYPES.WINDOW_BLUR);
      showWarning('⚠️ Window focus lost! Please return to the interview window.');
      refreshSummary();
    };

    // 4. Clipboard Event Listeners (copy, paste, cut)
    const handleCopy = (e) => {
      logEvent(EVENT_TYPES.CLIPBOARD_COPY);
      showWarning('⚠️ Copy action detected.');
      refreshSummary();
    };

    const handlePaste = (e) => {
      logEvent(EVENT_TYPES.CLIPBOARD_PASTE);
      showWarning('⚠️ Paste action detected. Answers should be articulated directly.');
      refreshSummary();
    };

    const handleCut = (e) => {
      logEvent(EVENT_TYPES.CLIPBOARD_CUT);
      showWarning('⚠️ Cut action detected.');
      refreshSummary();
    };

    // 5. Context Menu (Right Click) Listener
    const handleContextMenu = (e) => {
      logEvent(EVENT_TYPES.RIGHT_CLICK);
      showWarning('⚠️ Right-click context menu detected.');
      refreshSummary();
    };

    // Attach listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      // Clean up all listeners on unmount
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);

      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [showWarning, refreshSummary]);

  return {
    isFullscreen,
    tabActive,
    warning,
    summary,
    toggleFullscreen,
    clearWarning,
    refreshSummary
  };
}
