/**
 * Two-Strike Cheating Detection & Automatic Termination Manager
 *
 * Implements the approved Category-Specific Two-Strike Policy:
 * 1. tab_switch (Tab Switching): max 2 strikes
 * 2. fullscreen_exit (Fullscreen Exit): max 2 strikes
 * 3. multiple_faces (Multiple Faces): max 2 strikes
 * 4. face_absent (No Face Detected): max 2 strikes
 *
 * When any category hits 2 strikes, the interview is immediately terminated.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { logEvent } from '../utils/eventLogger.js';

export const MAX_STRIKES_PER_CATEGORY = 2;

export const STRIKE_CATEGORIES = {
  TAB_SWITCH: 'tab_switch',
  FULLSCREEN_EXIT: 'fullscreen_exit',
  MULTIPLE_FACES: 'multiple_faces',
  FACE_ABSENT: 'face_absent',
};

export const CATEGORY_LABELS = {
  [STRIKE_CATEGORIES.TAB_SWITCH]: 'Tab Switching',
  [STRIKE_CATEGORIES.FULLSCREEN_EXIT]: 'Fullscreen Exit',
  [STRIKE_CATEGORIES.MULTIPLE_FACES]: 'Multiple Faces',
  [STRIKE_CATEGORIES.FACE_ABSENT]: 'No Face Detected',
};

export function useStrikeManager(sessionId = null, onTerminate = null) {
  const getStorageKey = () => `interview_strikes_${sessionId || localStorage.getItem('interview_session_id') || 'default'}`;

  // Restore existing strikes from localStorage
  const [strikes, setStrikes] = useState(() => {
    try {
      const saved = localStorage.getItem(getStorageKey()) || localStorage.getItem('interview_strikes');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse strikes:', e);
    }
    return {
      [STRIKE_CATEGORIES.TAB_SWITCH]: 0,
      [STRIKE_CATEGORIES.FULLSCREEN_EXIT]: 0,
      [STRIKE_CATEGORIES.MULTIPLE_FACES]: 0,
      [STRIKE_CATEGORIES.FACE_ABSENT]: 0,
    };
  });

  const [isTerminated, setIsTerminated] = useState(() => {
    return localStorage.getItem('interview_status') === 'terminated';
  });

  const [terminationReason, setTerminationReason] = useState(() => {
    return localStorage.getItem('interview_termination_reason') || '';
  });

  const [lastViolationWarning, setLastViolationWarning] = useState('');
  const activeIncidentRef = useRef(new Set()); // Prevents counting continuous single incident repeatedly
  const strikesRef = useRef(strikes);
  strikesRef.current = strikes;
  const isTerminatedRef = useRef(isTerminated);
  isTerminatedRef.current = isTerminated;

  // Persist strikes changes
  useEffect(() => {
    try {
      const data = JSON.stringify(strikes);
      localStorage.setItem(getStorageKey(), data);
      localStorage.setItem('interview_strikes', data);
    } catch (e) {
      console.warn('Failed to save strikes:', e);
    }
  }, [strikes]);

  /**
   * Register a security infraction under Category-Specific Two-Strike Policy.
   * Returns: { isTerminated: boolean, currentStrikes: number, warning: string }
   */
  const registerViolation = useCallback((category, customMessage = '') => {
    if (isTerminatedRef.current) return { isTerminated: true, currentStrikes: MAX_STRIKES_PER_CATEGORY };

    const validCategory = Object.values(STRIKE_CATEGORIES).includes(category) ? category : null;
    if (!validCategory) return { isTerminated: false, currentStrikes: 0 };

    // Prevent counting the same active uninterrupted incident twice
    if (activeIncidentRef.current.has(validCategory)) {
      return { isTerminated: false, currentStrikes: strikesRef.current[validCategory] };
    }
    activeIncidentRef.current.add(validCategory);

    const prevCount = strikesRef.current[validCategory] || 0;
    const newCount = prevCount + 1;
    const categoryLabel = CATEGORY_LABELS[validCategory] || validCategory;

    const updatedStrikes = {
      ...strikesRef.current,
      [validCategory]: newCount,
    };
    setStrikes(updatedStrikes);
    strikesRef.current = updatedStrikes;

    // Also log to centralized event logger with strike metadata
    logEvent(validCategory, {
      message: customMessage || `Security Infraction: ${categoryLabel} (Strike ${newCount}/${MAX_STRIKES_PER_CATEGORY})`,
      strikeNumber: newCount,
      category: validCategory,
    });

    if (newCount >= MAX_STRIKES_PER_CATEGORY) {
      const reason = `Exceeded allowed limit (2/2 strikes) for ${categoryLabel}.`;
      setIsTerminated(true);
      isTerminatedRef.current = true;
      setTerminationReason(reason);
      localStorage.setItem('interview_status', 'terminated');
      localStorage.setItem('interview_termination_reason', reason);

      if (onTerminate) {
        onTerminate(validCategory, reason, updatedStrikes);
      }

      return { isTerminated: true, currentStrikes: newCount, reason };
    }

    // Strike 1 Warning
    const warn = `Warning: Strike ${newCount}/2 in ${categoryLabel}! A second violation in this category will terminate your interview immediately.`;
    setLastViolationWarning(warn);
    return { isTerminated: false, currentStrikes: newCount, warning: warn };
  }, [onTerminate]);

  /**
   * Mark that a previously active incident has ended and returned to normal.
   * e.g., candidate re-enters fullscreen, refocuses tab, or face is verified again.
   */
  const clearActiveIncident = useCallback((category) => {
    activeIncidentRef.current.delete(category);
  }, []);

  const resetStrikes = useCallback(() => {
    const fresh = {
      [STRIKE_CATEGORIES.TAB_SWITCH]: 0,
      [STRIKE_CATEGORIES.FULLSCREEN_EXIT]: 0,
      [STRIKE_CATEGORIES.MULTIPLE_FACES]: 0,
      [STRIKE_CATEGORIES.FACE_ABSENT]: 0,
    };
    setStrikes(fresh);
    setIsTerminated(false);
    setTerminationReason('');
    activeIncidentRef.current.clear();
    localStorage.removeItem(getStorageKey());
    localStorage.removeItem('interview_strikes');
    localStorage.removeItem('interview_status');
    localStorage.removeItem('interview_termination_reason');
  }, []);

  return {
    strikes,
    isTerminated,
    terminationReason,
    lastViolationWarning,
    registerViolation,
    clearActiveIncident,
    resetStrikes,
    setLastViolationWarning,
  };
}
