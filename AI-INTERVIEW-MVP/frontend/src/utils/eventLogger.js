/**
 * Centralized Proctoring Event Logger for AI Interview MVP
 *
 * Handles both browser security events (Hour 6) and webcam proctoring events (Hour 5).
 * Enforces session isolation, sliding-window deduplication, persistent storage,
 * and integrity score computation.
 */

export const EVENT_TYPES = {
  // Browser events
  FULLSCREEN_ENTER: 'fullscreen_enter',
  FULLSCREEN_EXIT: 'fullscreen_exit',
  TAB_SWITCH: 'tab_switch',
  WINDOW_BLUR: 'window_blur',
  COPY_ATTEMPT: 'copy_attempt',
  PASTE_ATTEMPT: 'paste_attempt',
  CUT_ATTEMPT: 'cut_attempt',
  RIGHT_CLICK_ATTEMPT: 'right_click_attempt',
  // Webcam events (Hour 5 integration)
  FACE_ABSENT: 'face_absent',
  MULTIPLE_FACES: 'multiple_faces',
  FACE_DETECTED: 'face_detected',
  // Lifecycle events
  MONITORING_STARTED: 'monitoring_started',
  MONITORING_STOPPED: 'monitoring_stopped',
};

export const SUSPICIOUS_EVENT_TYPES = new Set([
  EVENT_TYPES.FULLSCREEN_EXIT,
  EVENT_TYPES.TAB_SWITCH,
  EVENT_TYPES.WINDOW_BLUR,
  EVENT_TYPES.COPY_ATTEMPT,
  EVENT_TYPES.PASTE_ATTEMPT,
  EVENT_TYPES.CUT_ATTEMPT,
  EVENT_TYPES.RIGHT_CLICK_ATTEMPT,
  EVENT_TYPES.FACE_ABSENT,
  EVENT_TYPES.MULTIPLE_FACES,
]);

export const EVENT_PENALTIES = {
  [EVENT_TYPES.FULLSCREEN_EXIT]: 10,
  [EVENT_TYPES.TAB_SWITCH]: 10,
  [EVENT_TYPES.WINDOW_BLUR]: 5,
  [EVENT_TYPES.COPY_ATTEMPT]: 5,
  [EVENT_TYPES.PASTE_ATTEMPT]: 10,
  [EVENT_TYPES.CUT_ATTEMPT]: 5,
  [EVENT_TYPES.RIGHT_CLICK_ATTEMPT]: 5,
  [EVENT_TYPES.FACE_ABSENT]: 5,
  [EVENT_TYPES.MULTIPLE_FACES]: 15,
};

export const DEFAULT_MESSAGES = {
  [EVENT_TYPES.FULLSCREEN_ENTER]: 'Entered fullscreen mode',
  [EVENT_TYPES.FULLSCREEN_EXIT]: 'Exited fullscreen mode during interview',
  [EVENT_TYPES.TAB_SWITCH]: 'Switched browser tab or minimized window',
  [EVENT_TYPES.WINDOW_BLUR]: 'Browser window lost focus',
  [EVENT_TYPES.COPY_ATTEMPT]: 'Attempted to copy interview content (Blocked)',
  [EVENT_TYPES.PASTE_ATTEMPT]: 'Attempted to paste external content (Blocked)',
  [EVENT_TYPES.CUT_ATTEMPT]: 'Attempted to cut content (Blocked)',
  [EVENT_TYPES.RIGHT_CLICK_ATTEMPT]: 'Right-click context menu triggered (Blocked)',
  [EVENT_TYPES.FACE_ABSENT]: 'No face detected in camera feed',
  [EVENT_TYPES.MULTIPLE_FACES]: 'Multiple faces detected in camera feed',
  [EVENT_TYPES.FACE_DETECTED]: 'Candidate face verified in frame',
  [EVENT_TYPES.MONITORING_STARTED]: 'Security monitoring initialized',
  [EVENT_TYPES.MONITORING_STOPPED]: 'Security monitoring terminated',
};

// Memory cache for recent events and deduplication timestamps
const recentEventTimestamps = new Map();
const DEDUPLICATION_WINDOW_MS = 1500; // 1.5 second throttle for identical event types

/**
 * Get active storage key for current candidate session
 */
export function getStorageKey(sessionId = null) {
  const activeSessionId = sessionId || localStorage.getItem('interview_session_id') || 'default';
  return `interview_monitoring_events_${activeSessionId}`;
}

/**
 * Log a proctoring event. Compatible with both simple (type, metadata) and detailed signatures.
 */
export function logEvent(eventType, metadata = {}, sessionId = null) {
  const normalizedType = String(eventType).toLowerCase();
  const now = Date.now();
  const lastTime = recentEventTimestamps.get(normalizedType) || 0;

  // Deduplication: suppress identical event spam within throttle window
  if (now - lastTime < DEDUPLICATION_WINDOW_MS) {
    return null;
  }
  recentEventTimestamps.set(normalizedType, now);

  const isSuspicious = SUSPICIOUS_EVENT_TYPES.has(normalizedType);
  const penalty = EVENT_PENALTIES[normalizedType] || 0;

  let message = DEFAULT_MESSAGES[normalizedType] || `Event: ${normalizedType}`;
  let details = {};

  if (typeof metadata === 'string') {
    message = metadata;
  } else if (typeof metadata === 'object' && metadata !== null) {
    if (metadata.message) message = metadata.message;
    details = { ...metadata };
  }

  const logEntry = {
    id: `evt_${now}_${Math.random().toString(36).substring(2, 7)}`,
    type: normalizedType,
    message,
    timestamp: details.timestamp || new Date(now).toISOString(),
    isSuspicious,
    penalty,
    details,
  };

  try {
    const key = getStorageKey(sessionId);
    const stored = getStoredEvents(sessionId);
    stored.push(logEntry);
    localStorage.setItem(key, JSON.stringify(stored));
    // Also mirror to global key for backward compatibility
    localStorage.setItem('interview_monitoring_events', JSON.stringify(stored));

    // Dispatch custom event for real-time reactivity within the tab
    window.dispatchEvent(new CustomEvent('monitoring-event-logged', { detail: logEntry }));
  } catch (err) {
    console.warn('[eventLogger] Failed to write event to localStorage:', err);
  }

  console.info(`[PROCTOR_EVENT] [${normalizedType.toUpperCase()}]`, logEntry);
  return logEntry;
}

/**
 * Retrieve all stored events for the session
 */
export function getStoredEvents(sessionId = null) {
  try {
    if (sessionId) {
      const key = getStorageKey(sessionId);
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    const key = getStorageKey(null);
    const raw = localStorage.getItem(key) || localStorage.getItem('interview_monitoring_events');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('[eventLogger] Failed to read events from localStorage:', err);
    return [];
  }
}

/**
 * Clear stored events for a specific session or fresh start
 */
export function clearStoredEvents(sessionId = null) {
  try {
    const key = getStorageKey(sessionId);
    localStorage.removeItem(key);
    localStorage.removeItem('interview_monitoring_events');
    recentEventTimestamps.clear();
  } catch (err) {
    console.warn('[eventLogger] Failed to clear events:', err);
  }
}

/**
 * Calculate proctoring summary and integrity score
 */
export function computeIntegritySummary(sessionId = null) {
  const events = getStoredEvents(sessionId);
  const suspiciousEvents = events.filter((e) => e.isSuspicious);

  let totalPenalty = 0;
  const countsByType = {};

  for (const event of suspiciousEvents) {
    totalPenalty += event.penalty || 5;
    countsByType[event.type] = (countsByType[event.type] || 0) + 1;
  }

  const integrityScore = Math.max(0, 100 - totalPenalty);

  return {
    totalEvents: events.length,
    suspiciousCount: suspiciousEvents.length,
    integrityScore,
    countsByType,
    events,
  };
}
