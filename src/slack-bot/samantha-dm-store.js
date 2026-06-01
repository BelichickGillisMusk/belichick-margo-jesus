// Per-Slack-user rolling conversation history for Samantha DMs and
// @mentions. Kept in-memory (process-local) — same constraint as the rest
// of the Slack bot, which restarts wipe state.

export function createSamanthaDmStore({
  historyLimit = 20,
  ttlMs = 24 * 60 * 60 * 1000,
  now = Date.now,
} = {}) {
  const conversations = new Map();

  function cleanup() {
    const cutoff = now() - ttlMs;
    for (const [userId, convo] of conversations) {
      if (convo.updatedAt < cutoff) conversations.delete(userId);
    }
  }

  function getOrCreateConversation(userId) {
    cleanup();
    let convo = conversations.get(userId);
    if (!convo) {
      convo = { history: [], createdAt: now(), updatedAt: now() };
      conversations.set(userId, convo);
    }
    convo.updatedAt = now();
    return convo;
  }

  return {
    getHistory(userId) {
      cleanup();
      const convo = conversations.get(userId);
      return convo ? [...convo.history] : [];
    },
    appendExchange(userId, userMessage, assistantReply) {
      const convo = getOrCreateConversation(userId);
      convo.history.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantReply },
      );
      if (convo.history.length > historyLimit) {
        convo.history.splice(0, convo.history.length - historyLimit);
      }
      convo.updatedAt = now();
      return [...convo.history];
    },
    clear(userId) {
      return conversations.delete(userId);
    },
    activeUserCount() {
      cleanup();
      return conversations.size;
    },
  };
}
