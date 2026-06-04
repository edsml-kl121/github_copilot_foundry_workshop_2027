export function trimHistory(history, maxItems) {
  return history.slice(-maxItems);
}

export function addMessage(history, role, content) {
  const next = [...history, { role, content, timestamp: new Date() }];
  return trimHistory(next, 10);
}

export function formatForAPI(history) {
  return history.map(({ role, content }) => ({ role, content }));
}
