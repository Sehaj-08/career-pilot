/**
 * eventLogger.js
 * Centralized logging utility for recording and persisting browser security and activity events.
 */

const STORAGE_KEY = 'interview_monitoring_events';

export const EVENT_TYPES = {
  TAB_SWITCH: 'TAB_SWITCH',
  WINDOW_BLUR: 'WINDOW_BLUR',
  FULLSCREEN_ENTER: 'FULLSCREEN_ENTER',
  FULLSCREEN_EXIT: 'FULLSCREEN_EXIT',
  CLIPBOARD_COPY: 'CLIPBOARD_COPY',
  CLIPBOARD_PASTE: 'CLIPBOARD_PASTE',
  CLIPBOARD_CUT: 'CLIPBOARD_CUT',
  RIGHT_CLICK: 'RIGHT_CLICK'
};

const EVENT_DESCRIPTIONS = {
  [EVENT_TYPES.TAB_SWITCH]: 'Tab switched or window minimized',
  [EVENT_TYPES.WINDOW_BLUR]: 'Browser window lost focus',
  [EVENT_TYPES.FULLSCREEN_ENTER]: 'Entered fullscreen mode',
  [EVENT_TYPES.FULLSCREEN_EXIT]: 'Exited fullscreen mode',
  [EVENT_TYPES.CLIPBOARD_COPY]: 'Copy action detected',
  [EVENT_TYPES.CLIPBOARD_PASTE]: 'Paste action detected',
  [EVENT_TYPES.CLIPBOARD_CUT]: 'Cut action detected',
  [EVENT_TYPES.RIGHT_CLICK]: 'Right-click context menu opened'
};

const PENALTIES = {
  [EVENT_TYPES.TAB_SWITCH]: 5,
  [EVENT_TYPES.WINDOW_BLUR]: 3,
  [EVENT_TYPES.FULLSCREEN_EXIT]: 5,
  [EVENT_TYPES.CLIPBOARD_COPY]: 3,
  [EVENT_TYPES.CLIPBOARD_PASTE]: 4,
  [EVENT_TYPES.CLIPBOARD_CUT]: 3,
  [EVENT_TYPES.RIGHT_CLICK]: 2
};

/**
 * Retrieve all persisted monitoring events from localStorage.
 */
export function getStoredEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to parse monitoring events from localStorage:', e);
    return [];
  }
}

/**
 * Clear stored events (e.g., when a fresh interview begins).
 */
export function clearStoredEvents() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear monitoring events:', e);
  }
}

/**
 * Log a new monitoring event, attach ISO and readable timestamps, and persist to localStorage.
 */
export function logEvent(eventType, metadata = {}) {
  const existingEvents = getStoredEvents();
  const now = new Date();

  const newEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: eventType,
    description: EVENT_DESCRIPTIONS[eventType] || 'Suspicious browser activity detected',
    timestamp: now.toISOString(),
    timeFormatted: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    penalty: PENALTIES[eventType] || 0,
    metadata
  };

  const updatedEvents = [newEvent, ...existingEvents]; // newest first

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
  } catch (e) {
    console.warn('Failed to persist monitoring event to localStorage:', e);
  }

  console.info('[PROCTOR_EVENT]', newEvent);
  return newEvent;
}

/**
 * Compute aggregate statistics and integrity score from events.
 */
export function computeMonitoringSummary(events = null) {
  const currentEvents = events || getStoredEvents();

  let tabSwitches = 0;
  let clipboardActions = 0;
  let fullscreenExits = 0;
  let rightClicks = 0;
  let totalPenalty = 0;

  for (const evt of currentEvents) {
    if (evt.type === EVENT_TYPES.TAB_SWITCH || evt.type === EVENT_TYPES.WINDOW_BLUR) {
      tabSwitches++;
    } else if (
      evt.type === EVENT_TYPES.CLIPBOARD_COPY ||
      evt.type === EVENT_TYPES.CLIPBOARD_PASTE ||
      evt.type === EVENT_TYPES.CLIPBOARD_CUT
    ) {
      clipboardActions++;
    } else if (evt.type === EVENT_TYPES.FULLSCREEN_EXIT) {
      fullscreenExits++;
    } else if (evt.type === EVENT_TYPES.RIGHT_CLICK) {
      rightClicks++;
    }
    totalPenalty += evt.penalty || 0;
  }

  const suspiciousCount = currentEvents.length;
  const integrityScore = Math.max(0, 100 - totalPenalty);

  return {
    suspiciousCount,
    tabSwitches,
    clipboardActions,
    fullscreenExits,
    rightClicks,
    integrityScore,
    recentEvents: currentEvents.slice(0, 10) // 10 most recent
  };
}
