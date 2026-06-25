function createSession(sessionId) {
  return {
    sessionId,
    history: [],
    leads: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function createSessionStore({ ttlMs, historyLimit, maxActiveSessions, leadRetentionLimit }) {
  const sessions = new Map();
  const leads = [];

  function cleanupExpiredSessions() {
    const cutoff = Date.now() - ttlMs;
    for (const [sessionId, session] of sessions.entries()) {
      if (session.updatedAt < cutoff) {
        sessions.delete(sessionId);
      }
    }
  }

  function evictOldestSessionIfNeeded() {
    if (sessions.size < maxActiveSessions) {
      return;
    }

    const oldest = Array.from(sessions.values()).sort((left, right) => left.updatedAt - right.updatedAt)[0];
    if (oldest) {
      sessions.delete(oldest.sessionId);
    }
  }

  function getSession(sessionId) {
    cleanupExpiredSessions();
    if (!sessions.has(sessionId)) {
      evictOldestSessionIfNeeded();
      sessions.set(sessionId, createSession(sessionId));
    }

    const session = sessions.get(sessionId);
    session.updatedAt = Date.now();
    return session;
  }

  return {
    addMessage(sessionId, message) {
      const session = getSession(sessionId);
      session.history.push(message);
      if (session.history.length > historyLimit) {
        session.history.splice(0, session.history.length - historyLimit);
      }
      session.updatedAt = Date.now();
      return [...session.history];
    },
    captureLead(sessionId, lead) {
      const session = getSession(sessionId);
      const entry = {
        ...lead,
        sessionId,
        capturedAt: new Date().toISOString(),
      };

      session.leads.push(entry);
      leads.unshift(entry);
      if (leads.length > leadRetentionLimit) {
        leads.length = leadRetentionLimit;
      }
      session.updatedAt = Date.now();
      return entry;
    },
    clearSession(sessionId) {
      return sessions.delete(sessionId);
    },
    getStats() {
      cleanupExpiredSessions();
      const orderedSessions = Array.from(sessions.values()).sort((left, right) => left.updatedAt - right.updatedAt);
      return {
        activeSessions: sessions.size,
        storedLeads: leads.length,
        oldestSessionAgeMs: orderedSessions[0] ? Date.now() - orderedSessions[0].createdAt : 0,
      };
    },
    listLeads(limit = 20) {
      return leads.slice(0, limit);
    },
  };
}
