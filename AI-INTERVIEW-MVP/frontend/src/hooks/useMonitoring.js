import { useState, useEffect } from 'react';
import { logEvent } from '../utils/eventLogger';

export function useMonitoring() {
  const [metrics, setMetrics] = useState({
    faceDetected: true,
    multipleFaces: false,
    tabSwitches: 0,
    integrityScore: 100
  });
  const [warning, setWarning] = useState('');

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setMetrics((prev) => {
          const tabSwitches = prev.tabSwitches + 1;
          const integrityScore = Math.max(0, prev.integrityScore - 5);
          logEvent('TAB_SWITCH', { tabSwitches });
          return { ...prev, tabSwitches, integrityScore };
        });
        setWarning('Tab switch detected! Please stay focused on the interview.');
      } else {
        setTimeout(() => setWarning(''), 3000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return { metrics, warning, setMetrics, setWarning };
}
