export function logEvent(eventType, metadata = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: eventType,
    details: metadata
  };
  console.info('[PROCTOR_EVENT]', logEntry);
  return logEntry;
}
