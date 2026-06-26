function createAgentState() {
  return {
    status: 'idle',
    activeMissionId: null,
    task: null,
    lastMissionId: null,
    lastStatus: 'never',
    lastUpdatedAt: null,
    lastTokens: 0,
    lastError: null,
  };
}

const FINAL_STATUSES = new Set(['completed', 'failed', 'cancelled']);

export function createMissionStore(agentIds, { historyLimit = 200 } = {}) {
  const missions = new Map();
  const agentStates = new Map(agentIds.map(agentId => [agentId, createAgentState()]));
  let nextMissionId = 1;

  function queueMission({ command, task, agents, type, requestedBy }) {
    const mission = {
      id: `mission-${nextMissionId++}`,
      command,
      task,
      type,
      agents: [...agents],
      requestedBy,
      status: 'queued',
      createdAt: Date.now(),
      startedAt: null,
      endedAt: null,
      tokens: 0,
      results: [],
      failures: [],
      error: null,
      cancelReason: null,
    };

    missions.set(mission.id, mission);
    return mission;
  }

  function markRunning(missionId) {
    const mission = missions.get(missionId);
    if (!mission || FINAL_STATUSES.has(mission.status)) {
      return mission;
    }

    mission.status = 'running';
    mission.startedAt = Date.now();

    for (const agentId of mission.agents) {
      const state = agentStates.get(agentId) || createAgentState();
      state.status = 'running';
      state.activeMissionId = missionId;
      state.task = mission.task;
      state.lastMissionId = missionId;
      state.lastUpdatedAt = mission.startedAt;
      state.lastError = null;
      agentStates.set(agentId, state);
    }

    return mission;
  }

  function finalizeMission(missionId, status, details = {}) {
    const mission = missions.get(missionId);
    if (!mission || FINAL_STATUSES.has(mission.status)) {
      return mission;
    }

    mission.status = status;
    mission.endedAt = Date.now();
    mission.tokens = details.tokens || 0;
    mission.results = details.results || [];
    mission.failures = details.failures || [];
    mission.error = details.error || null;
    mission.cancelReason = details.cancelReason || null;

    for (const agentId of mission.agents) {
      const state = agentStates.get(agentId) || createAgentState();
      if (state.activeMissionId === missionId) {
        state.activeMissionId = null;
        state.task = null;
        state.status = 'idle';
      }
      state.lastMissionId = missionId;
      state.lastStatus = status;
      state.lastUpdatedAt = mission.endedAt;
      state.lastTokens = mission.tokens;
      state.lastError = mission.error || mission.cancelReason;
      agentStates.set(agentId, state);
    }

    trimHistory();
    return mission;
  }

  function trimHistory() {
    const orderedIds = Array.from(missions.values())
      .sort((left, right) => left.createdAt - right.createdAt)
      .map(mission => mission.id);

    while (orderedIds.length > historyLimit) {
      const oldestId = orderedIds.shift();
      const oldestMission = missions.get(oldestId);
      if (oldestMission && FINAL_STATUSES.has(oldestMission.status)) {
        missions.delete(oldestId);
      }
    }
  }

  return {
    queueMission,
    markRunning,
    completeMission(missionId, details) {
      return finalizeMission(missionId, 'completed', details);
    },
    failMission(missionId, details) {
      return finalizeMission(missionId, 'failed', details);
    },
    cancelMission(missionId, cancelReason = 'Cancelled by user.') {
      return finalizeMission(missionId, 'cancelled', { cancelReason });
    },
    cancelAgent(agentId, cancelReason = 'Cancelled by user.') {
      const state = agentStates.get(agentId);
      if (!state?.activeMissionId) {
        return null;
      }

      return finalizeMission(state.activeMissionId, 'cancelled', { cancelReason });
    },
    getMission(missionId) {
      return missions.get(missionId) || null;
    },
    isCancelled(missionId) {
      return this.getMission(missionId)?.status === 'cancelled';
    },
    getActiveMissionCount() {
      return Array.from(missions.values()).filter(mission => ['queued', 'running'].includes(mission.status)).length;
    },
    getAgentSnapshot(agentId) {
      return {
        agentId,
        ...(agentStates.get(agentId) || createAgentState()),
      };
    },
    getHistory(limit = 25) {
      return Array.from(missions.values())
        .sort((left, right) => right.createdAt - left.createdAt)
        .slice(0, limit);
    },
    getTodayUsage(referenceTime = Date.now()) {
      const today = new Date(referenceTime).toDateString();
      const completedToday = Array.from(missions.values()).filter(
        mission => mission.endedAt && new Date(mission.endedAt).toDateString() === today,
      );

      return {
        missions: completedToday.length,
        tokens: completedToday.reduce((sum, mission) => sum + (mission.tokens || 0), 0),
        failures: completedToday.filter(mission => mission.status === 'failed').length,
        cancelled: completedToday.filter(mission => mission.status === 'cancelled').length,
      };
    },
  };
}
