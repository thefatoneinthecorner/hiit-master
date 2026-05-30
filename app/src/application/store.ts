import { batch, computed, signal } from '@preact/signals';
import { Capacitor } from '@capacitor/core';
import { analyzeSessionRounds, getScrubPointData } from '../domain/analysis/recovery';
import {
  buildComparisonRounds,
  buildReplayRecoveryAnalysis,
  findPreviousComparableSession,
  getReplayRecoveryVisibleRoundIndexes
} from '../domain/comparison/comparison';
import {
  createSessionName,
  createUniqueProfileName,
  deriveBpmTargetsFromSession,
  getDefaultActualWorkDurationSec,
  getLatestCompletedProfileSession,
  getProfileBpmTargets
} from '../domain/shared/profile';
import type {
  ComparisonRound,
  HeartRateSample,
  RoundAnalysis,
  SessionProfile,
  SessionRecord,
  SessionStatus,
  SettingsMode,
  WorkoutPhaseSegment
} from '../domain/shared/types';
import { deriveSessionIntegrity, filterPlausibleBpm, isCountdownActive, isSessionActive } from '../domain/session/lifecycle';
import { createBpmWorkoutPlan, createWorkoutPlan, getPhaseAtElapsedSec } from '../domain/workout/plan';
import { playCountdownAudio, playPhaseTransitionAudio } from '../infrastructure/audio/countdownAudio';
import { CapacitorHeartRateMonitor } from '../infrastructure/bluetooth/capacitorHeartRateMonitor';
import { MockHeartRateMonitor } from '../infrastructure/bluetooth/mockHeartRateMonitor';
import type { ConnectedMonitor, HeartRateMonitorAdapter } from '../infrastructure/bluetooth/types';
import { WebBluetoothHeartRateMonitor } from '../infrastructure/bluetooth/webBluetoothHeartRateMonitor';
import {
  createExportPayload,
  loadSnapshot,
  parseImportPayload,
  replaceSnapshot,
  saveSnapshot,
  type AppSnapshot
} from '../infrastructure/storage/db';
import { releaseWakeLock, requestWakeLock } from '../infrastructure/wakelock/wakelock';

export interface SessionRuntime {
  status: SessionStatus;
  startedAt: string | null;
  elapsedSec: number;
  countdownRemainingSec: number;
  isCompromised: boolean;
  hrCoverageComplete: boolean;
  samples: HeartRateSample[];
  bpm: number | null;
  bpmPulseAt: number;
  scrubElapsedSec: number | null;
  actualWorkDurationSec: number;
  phaseIndex: number;
  phaseElapsedSec: number;
}

export interface ProfileDraft extends SessionProfile {
  isDirty: boolean;
}

export type { SettingsMode } from '../domain/shared/types';

const deviceTestMode = new URLSearchParams(window.location.search).get('device-test') === '1';

const runtime = signal<SessionRuntime>({
  status: 'idle',
  startedAt: null,
  elapsedSec: 0,
  countdownRemainingSec: 3,
  isCompromised: false,
  hrCoverageComplete: true,
  samples: [],
  bpm: null,
  bpmPulseAt: 0,
  scrubElapsedSec: null,
  actualWorkDurationSec: 20,
  phaseIndex: 0,
  phaseElapsedSec: 0
});

const profiles = signal<SessionProfile[]>([]);
const sessions = signal<SessionRecord[]>([]);
const selectedProfileId = signal<string>('');
const historyIndex = signal(0);
const trendIndex = signal(0);
const initialized = signal(false);
const activeRoute = signal('/');
const settingsMode = signal<SettingsMode>('duration');
const draftProfileId = signal<string | null>(null);
const profileDraft = signal<ProfileDraft | null>(null);
const pendingProfileSwitchId = signal<string | null>(null);
const pendingEditProfileId = signal<string | null>(null);
const showUnsavedModal = signal(false);
const actualWorkDurationByProfileId = signal<Record<string, number>>({});

let tickTimerId: number | null = null;
let lastPhaseCueKey: string | null = null;
const monitorInfo = signal<ConnectedMonitor | null>(null);

const monitor: HeartRateMonitorAdapter = deviceTestMode
  ? new MockHeartRateMonitor(
      () => getTargetBpm(),
      true,
      () => sessions.value.find((session) => session.samples.some((sample) => sample.bpm !== null))?.samples ?? []
    )
  : Capacitor.isNativePlatform()
    ? new CapacitorHeartRateMonitor()
    : new WebBluetoothHeartRateMonitor();
function getTargetBpm(): number {
  const currentRuntime = runtime.value;
  if (currentRuntime.status === 'idle' || currentRuntime.status === 'ready' || currentRuntime.status === 'connecting_hr') {
    return 58;
  }

  if (currentRuntime.status === 'countdown') {
    return 70;
  }

  const phase = currentPhase.value;
  if (!phase) {
    return 90;
  }

  if (phase.kind === 'warmup') {
    return 95;
  }
  if (phase.kind === 'work') {
    return 160;
  }
  if (phase.kind === 'rest' || phase.kind === 'cooldown') {
    return 120;
  }
  return 70;
}

monitor.onSample((incomingBpm) => {
  const bpm = filterPlausibleBpm(incomingBpm);
  if (bpm === null) {
    return;
  }

  const currentRuntime = runtime.value;
  const shouldPersist = currentRuntime.status === 'running' || currentRuntime.status === 'paused';
  const elapsedSec = currentRuntime.status === 'completed' ? currentRuntime.elapsedSec : getLiveElapsedSec();

  runtime.value = {
    ...currentRuntime,
    bpm,
    bpmPulseAt: Date.now(),
    samples: shouldPersist ? [...currentRuntime.samples, { elapsedSec, bpm }] : currentRuntime.samples
  };

  if (shouldPersist && settingsMode.value === 'bpm') {
    advanceBpmTargetPhase(bpm);
  }
});

monitor.onDisconnect(() => {
  monitorInfo.value = null;

  if (isSessionActive(runtime.value.status)) {
    void appStore.markConnectionLost();
    return;
  }

  runtime.value = {
    ...runtime.value,
    status: 'idle',
    bpm: null
  };
});

function getLiveElapsedSec(): number {
  return runtime.value.status === 'countdown' ? 0 : runtime.value.elapsedSec;
}

async function persistSnapshot(): Promise<void> {
  if (!initialized.value) {
    return;
  }

  await saveSnapshot({
    profiles: profiles.value,
    sessions: sessions.value,
    settings: {
      selectedProfileId: selectedProfileId.value,
      settingsMode: settingsMode.value,
      actualWorkDurationByProfileId: actualWorkDurationByProfileId.value
    }
  });
}

function hasSameAnalysis(left: RoundAnalysis[], right: RoundAnalysis[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function reanalyzeSessions(savedSessions: SessionRecord[]): { sessions: SessionRecord[]; changed: boolean } {
  let changed = false;
  const reanalyzedSessions = savedSessions.map((session) => {
    const analysis = analyzeSessionRounds(session.plan, session.samples);

    if (hasSameAnalysis(session.analysis, analysis)) {
      return session;
    }

    changed = true;
    return {
      ...session,
      analysis
    };
  });

  return { sessions: reanalyzedSessions, changed };
}

function getSelectedProfile(): SessionProfile {
  return profiles.value.find((profile) => profile.id === selectedProfileId.value) ?? profiles.value[0]!;
}

const selectedProfile = computed(() => getSelectedProfile());
const currentPlan = computed(() =>
  settingsMode.value === 'bpm'
    ? createBpmWorkoutPlan(selectedProfile.value)
    : createWorkoutPlan(selectedProfile.value, runtime.value.actualWorkDurationSec)
);
const currentPhase = computed<WorkoutPhaseSegment | null>(() => {
  const status = runtime.value.status;
  if (status === 'idle' || status === 'connecting_hr' || status === 'ready') {
    return null;
  }
  if (status === 'countdown') {
    return {
      key: 'countdown',
      kind: 'countdown',
      label: 'Warmup',
      roundIndex: null,
      startSec: 0,
      endSec: 4,
      durationSec: 4
    };
  }
  if (settingsMode.value === 'bpm' && ['running', 'paused'].includes(status)) {
    return currentPlan.value.phases[Math.max(0, Math.min(runtime.value.phaseIndex, currentPlan.value.phases.length - 1))] ?? null;
  }

  return getPhaseAtElapsedSec(currentPlan.value, runtime.value.elapsedSec);
});

const previousComparisonSession = computed(() =>
  findPreviousComparableSession(
    {
      startedAt: runtime.value.startedAt ?? new Date().toISOString(),
      profileId: selectedProfile.value.id
    },
    sessions.value
  )
);
const shouldWarnNoComparableSession = computed(() => sessions.value.length > 0 && previousComparisonSession.value === null);

const currentAnalysis = computed<RoundAnalysis[]>(() => analyzeSessionRounds(currentPlan.value, runtime.value.samples));
const comparisonRounds = computed<ComparisonRound[]>(() =>
  buildComparisonRounds(currentAnalysis.value, previousComparisonSession.value?.analysis ?? null)
);
const homeComparison = computed<ComparisonRound[]>(() => {
  const currentRuntime = runtime.value;
  const previousAnalysis = previousComparisonSession.value?.analysis ?? null;

  if (currentRuntime.status === 'completed') {
    return comparisonRounds.value;
  }

  if (!['running', 'paused'].includes(currentRuntime.status)) {
    return [];
  }

  const visibleRoundIndexes = getReplayRecoveryVisibleRoundIndexes({
    elapsedSec: currentRuntime.elapsedSec,
    currentBpm: currentRuntime.bpm,
    currentAnalysis: currentAnalysis.value,
    previousAnalysis,
    samples: currentRuntime.samples
  });
  const liveAnalysis = buildReplayRecoveryAnalysis({
    elapsedSec: currentRuntime.elapsedSec,
    currentBpm: currentRuntime.bpm,
    currentAnalysis: currentAnalysis.value,
    visibleRoundIndexes,
    samples: currentRuntime.samples
  });

  return buildComparisonRounds(liveAnalysis, previousAnalysis);
});
const completedSessions = computed(() =>
  sessions.value
    .filter((session) => session.status === 'completed')
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())
);
const historySession = computed(() => completedSessions.value[historyIndex.value] ?? null);
const historyComparison = computed(() =>
  historySession.value
    ? buildComparisonRounds(
        historySession.value.analysis,
        findPreviousComparableSession(historySession.value, sessions.value)?.analysis ?? null
      )
    : []
);

function syncActualWorkDuration(): void {
  const savedActualWorkDurationSec = actualWorkDurationByProfileId.value[selectedProfile.value.id];
  const recentSameProfile = sessions.value
    .filter((session) => session.profileId === selectedProfile.value.id)
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())[0];

  runtime.value = {
    ...runtime.value,
    actualWorkDurationSec:
      savedActualWorkDurationSec !== undefined
        ? Math.max(1, savedActualWorkDurationSec)
        : getDefaultActualWorkDurationSec(selectedProfile.value, recentSameProfile ?? null)
  };
}

function hasConfiguredBpmTargets(profile: SessionProfile): boolean {
  return (
    profile.bpmTargets?.length === profile.baseRestsSec.length &&
    profile.bpmTargets.every((target) => Number.isFinite(target.minBpm) && Number.isFinite(target.maxBpm))
  );
}

function ensureBpmTargetsForProfile(profileId: string): void {
  const profile = profiles.value.find((item) => item.id === profileId);
  if (!profile || hasConfiguredBpmTargets(profile)) {
    return;
  }

  const latestSession = getLatestCompletedProfileSession(profile.id, sessions.value);
  if (!latestSession) {
    return;
  }

  const nextProfile = {
    ...profile,
    bpmTargets: deriveBpmTargetsFromSession(profile, latestSession)
  };

  profiles.value = profiles.value.map((item) => (item.id === profile.id ? nextProfile : item));
  if (draftProfileId.value === profile.id) {
    profileDraft.value = {
      ...nextProfile,
      isDirty: profileDraft.value?.isDirty ?? false
    };
  }
  void persistSnapshot();
}

function ensureReadyState(): void {
  runtime.value = {
    ...runtime.value,
    status: monitor.isConnected() ? 'ready' : 'idle'
  };
}

function startTicking(): void {
  stopTicking();
  lastPhaseCueKey = null;
  tickTimerId = window.setInterval(async () => {
    const currentRuntime = runtime.value;

    if (currentRuntime.status === 'countdown') {
      const remaining = currentRuntime.countdownRemainingSec - 1;
      runtime.value = {
        ...currentRuntime,
        countdownRemainingSec: remaining
      };

      if (remaining <= 0) {
        runtime.value = {
          ...runtime.value,
          status: 'running',
          countdownRemainingSec: 3,
          elapsedSec: 0,
          phaseIndex: 0,
          phaseElapsedSec: 0
        };
        await requestWakeLock();
      }
      return;
    }

    if (currentRuntime.status !== 'running') {
      return;
    }

    if (settingsMode.value === 'bpm') {
      await tickBpmMode(currentRuntime);
      return;
    }

    const nextElapsed = Math.min(currentPlan.value.totalDurationSec, currentRuntime.elapsedSec + 1);
    const nextPhase = getPhaseAtElapsedSec(currentPlan.value, nextElapsed);
    runtime.value = {
      ...currentRuntime,
      elapsedSec: nextElapsed,
      scrubElapsedSec: null
    };

    const phaseRemainingSec = nextPhase.endSec - nextElapsed;
    if (
      nextPhase.endSec < currentPlan.value.totalDurationSec &&
      phaseRemainingSec === 3 &&
      lastPhaseCueKey !== nextPhase.key
    ) {
      lastPhaseCueKey = nextPhase.key;
      void playPhaseTransitionAudio();
    }

    if (nextElapsed >= currentPlan.value.totalDurationSec) {
      await finishSession('completed');
    }
  }, 1000);
}

async function tickBpmMode(currentRuntime: SessionRuntime): Promise<void> {
  const plan = currentPlan.value;
  const phaseIndex = Math.max(0, Math.min(currentRuntime.phaseIndex, plan.phases.length - 1));
  const phase = plan.phases[phaseIndex];
  if (!phase) {
    await finishSession('completed');
    return;
  }

  const nextElapsed = currentRuntime.elapsedSec + 1;
  const nextPhaseElapsedSec = currentRuntime.phaseElapsedSec + 1;
  const timedPhaseComplete = (phase.kind === 'warmup' || phase.kind === 'cooldown') && nextPhaseElapsedSec >= phase.durationSec;
  const shouldAdvancePhase = timedPhaseComplete;

  if (!shouldAdvancePhase) {
    runtime.value = {
      ...currentRuntime,
      elapsedSec: nextElapsed,
      phaseElapsedSec: nextPhaseElapsedSec,
      scrubElapsedSec: null
    };
    return;
  }

  const nextPhaseIndex = phaseIndex + 1;
  if (nextPhaseIndex >= plan.phases.length) {
    runtime.value = {
      ...currentRuntime,
      elapsedSec: nextElapsed,
      phaseElapsedSec: nextPhaseElapsedSec,
      scrubElapsedSec: null
    };
    await finishSession('completed');
    return;
  }

  lastPhaseCueKey = plan.phases[nextPhaseIndex]?.key ?? null;
  void playPhaseTransitionAudio();
  runtime.value = {
    ...currentRuntime,
    elapsedSec: nextElapsed,
    phaseIndex: nextPhaseIndex,
    phaseElapsedSec: 0,
    scrubElapsedSec: null
  };
}

function advanceBpmTargetPhase(bpm: number): void {
  const currentRuntime = runtime.value;
  if (currentRuntime.status !== 'running') {
    return;
  }

  const plan = currentPlan.value;
  const phaseIndex = Math.max(0, Math.min(currentRuntime.phaseIndex, plan.phases.length - 1));
  const phase = plan.phases[phaseIndex];
  const target = phase?.roundIndex ? getProfileBpmTargets(selectedProfile.value)[phase.roundIndex - 1] ?? null : null;
  const reachedTarget =
    phase?.kind === 'work'
      ? target !== null && bpm >= target.maxBpm
      : phase?.kind === 'rest'
        ? target !== null && bpm <= target.minBpm
        : false;

  if (!reachedTarget) {
    return;
  }

  const nextPhaseIndex = phaseIndex + 1;
  if (nextPhaseIndex >= plan.phases.length) {
    void finishSession('completed');
    return;
  }

  lastPhaseCueKey = plan.phases[nextPhaseIndex]?.key ?? null;
  void playPhaseTransitionAudio();
  runtime.value = {
    ...currentRuntime,
    phaseIndex: nextPhaseIndex,
    phaseElapsedSec: 0,
    scrubElapsedSec: null
  };
}

function stopTicking(): void {
  if (tickTimerId !== null) {
    window.clearInterval(tickTimerId);
    tickTimerId = null;
  }
  lastPhaseCueKey = null;
}

async function finishSession(status: 'completed' | 'ended_early'): Promise<void> {
  stopTicking();
  await releaseWakeLock();

  const finishedAt = new Date().toISOString();
  const analysis = analyzeSessionRounds(currentPlan.value, runtime.value.samples);
  const integrity = deriveSessionIntegrity(status, runtime.value.isCompromised, runtime.value.hrCoverageComplete, analysis);
  const startedAt = runtime.value.startedAt ?? finishedAt;

  const record: SessionRecord = {
    id: crypto.randomUUID(),
    startedAt,
    endedAt: finishedAt,
    name: createSessionName(startedAt),
    profileId: selectedProfile.value.id,
    profileName: selectedProfile.value.name,
    profileSnapshot: selectedProfile.value,
    actualWorkDurationSec: runtime.value.actualWorkDurationSec,
    settingsMode: settingsMode.value,
    status,
    isCompromised: integrity.isCompromised,
    hrCoverageComplete: integrity.hrCoverageComplete,
    plan: currentPlan.value,
    samples: runtime.value.samples,
    analysis
  };

  sessions.value = [record, ...sessions.value];
  historyIndex.value = 0;
  await persistSnapshot();

  runtime.value = {
    ...runtime.value,
    status,
    elapsedSec: currentPlan.value.totalDurationSec,
    scrubElapsedSec: currentPlan.value.totalDurationSec
  };
}

async function initialize(): Promise<void> {
  if (initialized.value) {
    return;
  }

  const snapshot = await loadSnapshot();
  const reanalyzed = reanalyzeSessions(snapshot.sessions);
  batch(() => {
    profiles.value = snapshot.profiles;
    sessions.value = reanalyzed.sessions;
    selectedProfileId.value = snapshot.settings.selectedProfileId || snapshot.profiles[0]?.id || '';
    settingsMode.value = snapshot.settings.settingsMode ?? 'duration';
    actualWorkDurationByProfileId.value = snapshot.settings.actualWorkDurationByProfileId ?? {};
    historyIndex.value = 0;
    trendIndex.value = 0;
    initialized.value = true;
  });
  if (reanalyzed.changed) {
    await persistSnapshot();
  }
  syncActualWorkDuration();
  if (settingsMode.value === 'bpm' && selectedProfileId.value) {
    ensureBpmTargetsForProfile(selectedProfileId.value);
  }
}

function getHistorySessionIndex(sessionId: string): number {
  return Math.max(
    0,
    completedSessions.value.findIndex((session) => session.id === sessionId)
  );
}

export const appStore = {
  initialized,
  runtime,
  activeRoute,
  settingsMode,
  profiles,
  sessions,
  selectedProfile,
  currentPlan,
  currentPhase,
  comparisonRounds,
  completedSessions,
  historySession,
  historyComparison,
  trendIndex,
  shouldWarnNoComparableSession,
  profileDraft,
  draftProfileId,
  pendingProfileSwitchId,
  pendingEditProfileId,
  showUnsavedModal,
  actualWorkDurationByProfileId,
  device: computed(() => monitorInfo.value),
  isHomeSessionVisible: computed(() => !['idle', 'connecting_hr', 'ready'].includes(runtime.value.status)),
  canOpenDevices: computed(() => monitor.isConnected() || isSessionActive(runtime.value.status)),
  canOpenTrend: computed(() => !isSessionActive(runtime.value.status) && !isCountdownActive(runtime.value.status) && sessions.value.length > 0),
  canOpenHistory: computed(() => !isSessionActive(runtime.value.status) && !isCountdownActive(runtime.value.status) && completedSessions.value.length > 0),
  canOpenSettings: computed(() => !isSessionActive(runtime.value.status) && !isCountdownActive(runtime.value.status)),
  homeComparison,
  currentSessionScrub: computed(() => getScrubPointData(runtime.value.samples, runtime.value.scrubElapsedSec ?? runtime.value.elapsedSec)),
  historyScrub: computed(() => {
    const session = historySession.value;
    if (!session) {
      return { elapsedSec: 0, bpm: null };
    }
    return getScrubPointData(session.samples, runtime.value.scrubElapsedSec ?? session.plan.totalDurationSec);
  }),

  async initialize() {
    await initialize();
  },

  setRoute(path: string) {
    activeRoute.value = path;
  },

  setSettingsMode(mode: SettingsMode) {
    if (mode === 'bpm') {
      ensureBpmTargetsForProfile(selectedProfile.value.id);
    }
    settingsMode.value = mode;
    void persistSnapshot();
  },

  async connectDevice() {
    runtime.value = { ...runtime.value, status: 'connecting_hr' };
    try {
      monitorInfo.value = await monitor.connect();
      ensureReadyState();
    } catch (error) {
      console.error('Failed to connect to monitor', error);
      monitorInfo.value = null;
      runtime.value = {
        ...runtime.value,
        status: 'idle'
      };
    }
  },

  async reconnectDevice() {
    try {
      await monitor.disconnect();
      monitorInfo.value = await monitor.connect();
      if (!isSessionActive(runtime.value.status)) {
        ensureReadyState();
      }
    } catch (error) {
      console.error('Failed to reconnect to monitor', error);
      monitorInfo.value = null;
      if (!isSessionActive(runtime.value.status)) {
        runtime.value = {
          ...runtime.value,
          status: 'idle'
        };
      }
    }
  },

  async disconnectDevice() {
    await monitor.disconnect();
    monitorInfo.value = null;

    if (isSessionActive(runtime.value.status)) {
      runtime.value = {
        ...runtime.value,
        isCompromised: true,
        hrCoverageComplete: false
      };
      await finishSession('ended_early');
      return;
    }

    runtime.value = {
      ...runtime.value,
      status: 'idle',
      bpm: null
    };
  },

  async stopSessionAndDisconnect() {
    stopTicking();
    await releaseWakeLock();
    await monitor.disconnect();
    monitorInfo.value = null;
    runtime.value = {
      ...runtime.value,
      status: 'idle',
      startedAt: null,
      elapsedSec: 0,
      phaseIndex: 0,
      phaseElapsedSec: 0,
      countdownRemainingSec: 3,
      isCompromised: false,
      hrCoverageComplete: true,
      samples: [],
      bpm: null,
      scrubElapsedSec: null
    };
  },

  setActualWorkDuration(value: number) {
    const actualWorkDurationSec = Math.max(1, value);
    runtime.value = {
      ...runtime.value,
      actualWorkDurationSec
    };
    actualWorkDurationByProfileId.value = {
      ...actualWorkDurationByProfileId.value,
      [selectedProfile.value.id]: actualWorkDurationSec
    };
    void persistSnapshot();
  },

  async startSession() {
    runtime.value = {
      ...runtime.value,
      status: 'countdown',
      startedAt: new Date().toISOString(),
      elapsedSec: 0,
      phaseIndex: 0,
      phaseElapsedSec: 0,
      countdownRemainingSec: 3,
      isCompromised: false,
      hrCoverageComplete: true,
      samples: [],
      scrubElapsedSec: null
    };
    void playCountdownAudio();
    startTicking();
  },

  togglePauseResume() {
    const status = runtime.value.status;
    if (status === 'running') {
      runtime.value = { ...runtime.value, status: 'paused' };
      void releaseWakeLock();
    } else if (status === 'paused') {
      runtime.value = { ...runtime.value, status: 'running' };
      void requestWakeLock();
    }
  },

  async markConnectionLost() {
    runtime.value = {
      ...runtime.value,
      isCompromised: true,
      hrCoverageComplete: false,
      samples: [...runtime.value.samples, { elapsedSec: runtime.value.elapsedSec, bpm: null }]
    };
    await finishSession('ended_early');
  },

  setScrubElapsedSec(value: number | null) {
    runtime.value = {
      ...runtime.value,
      scrubElapsedSec: value
    };
  },

  setTrendIndex(index: number) {
    trendIndex.value = Math.max(0, index);
  },

  openCompletedSessionInHistory(sessionId?: string) {
    const selectedSessionId = sessionId ?? completedSessions.value[0]?.id;
    if (!selectedSessionId) {
      return;
    }
    historyIndex.value = getHistorySessionIndex(selectedSessionId);
    activeRoute.value = '/history';
    window.history.pushState({}, '', '/history');
    window.dispatchEvent(new PopStateEvent('popstate'));
  },

  stepHistory(direction: -1 | 1) {
    historyIndex.value = Math.max(0, Math.min(completedSessions.value.length - 1, historyIndex.value + direction));
    runtime.value = {
      ...runtime.value,
      scrubElapsedSec: historySession.value?.plan.totalDurationSec ?? null
    };
  },

  deleteHistorySession(sessionId: string) {
    sessions.value = sessions.value.filter((session) => session.id !== sessionId);
    historyIndex.value = Math.min(historyIndex.value, Math.max(0, completedSessions.value.length - 1));
    void persistSnapshot();
  },

  beginEditingProfile(profileId: string) {
    if (settingsMode.value === 'bpm') {
      ensureBpmTargetsForProfile(profileId);
    }
    const profile = profiles.value.find((item) => item.id === profileId);
    if (!profile) {
      return;
    }
    draftProfileId.value = profileId;
    profileDraft.value = { ...profile, isDirty: false };
  },

  requestSelectProfile(profileId: string) {
    if (profileDraft.value?.isDirty && draftProfileId.value && draftProfileId.value !== profileId) {
      pendingProfileSwitchId.value = profileId;
      pendingEditProfileId.value = null;
      showUnsavedModal.value = true;
      return;
    }

    selectedProfileId.value = profileId;
    if (!draftProfileId.value || draftProfileId.value !== profileId) {
      this.beginEditingProfile(profileId);
    }
    syncActualWorkDuration();
    void persistSnapshot();
  },

  confirmDiscardAndSwitchProfile() {
    const nextProfileId = pendingProfileSwitchId.value;
    const nextEditProfileId = pendingEditProfileId.value;
    showUnsavedModal.value = false;
    pendingProfileSwitchId.value = null;
    pendingEditProfileId.value = null;

    if (nextEditProfileId) {
      this.beginEditingProfile(nextEditProfileId);
      return;
    }

    if (!nextProfileId) {
      return;
    }
    this.beginEditingProfile(nextProfileId);
    selectedProfileId.value = nextProfileId;
    syncActualWorkDuration();
    void persistSnapshot();
  },

  cancelDiscardSwitch() {
    showUnsavedModal.value = false;
    pendingProfileSwitchId.value = null;
    pendingEditProfileId.value = null;
  },

  requestEditProfile(profileId: string) {
    if (profileDraft.value?.isDirty && draftProfileId.value && draftProfileId.value !== profileId) {
      pendingProfileSwitchId.value = null;
      pendingEditProfileId.value = profileId;
      showUnsavedModal.value = true;
      return;
    }

    this.beginEditingProfile(profileId);
  },

  updateDraftProfile(patch: Partial<SessionProfile>) {
    const draft = profileDraft.value;
    if (!draft) {
      return;
    }
    profileDraft.value = {
      ...draft,
      ...patch,
      isDirty: true
    };
  },

  updateDraftRecovery(index: number, value: number) {
    const draft = profileDraft.value;
    if (!draft) {
      return;
    }
    const nextBaseRestsSec = [...draft.baseRestsSec];
    nextBaseRestsSec[index] = Math.max(1, value);
    profileDraft.value = {
      ...draft,
      baseRestsSec: nextBaseRestsSec,
      isDirty: true
    };
  },

  cloneDraftRecovery(index: number) {
    const draft = profileDraft.value;
    if (!draft) {
      return;
    }
    const nextBaseRestsSec = [...draft.baseRestsSec];
    nextBaseRestsSec.splice(index + 1, 0, nextBaseRestsSec[index] ?? 30);
    const nextBpmTargets = getProfileBpmTargets(draft);
    nextBpmTargets.splice(index + 1, 0, nextBpmTargets[index] ?? { minBpm: 1, maxBpm: draft.nominalPeakHeartrate });
    profileDraft.value = {
      ...draft,
      baseRestsSec: nextBaseRestsSec,
      bpmTargets: nextBpmTargets,
      isDirty: true
    };
  },

  deleteDraftRecovery(index: number) {
    const draft = profileDraft.value;
    if (!draft || draft.baseRestsSec.length <= 1) {
      return;
    }
    const nextBaseRestsSec = [...draft.baseRestsSec];
    nextBaseRestsSec.splice(index, 1);
    const nextBpmTargets = getProfileBpmTargets(draft);
    nextBpmTargets.splice(index, 1);
    profileDraft.value = {
      ...draft,
      baseRestsSec: nextBaseRestsSec,
      bpmTargets: nextBpmTargets,
      isDirty: true
    };
  },

  updateDraftBpmTarget(index: number, patch: { minBpm?: number; maxBpm?: number }) {
    const draft = profileDraft.value;
    if (!draft) {
      return;
    }
    const nextTargets = getProfileBpmTargets(draft);
    const current = nextTargets[index];
    if (!current) {
      return;
    }
    const requestedMax = Math.max(1, patch.maxBpm ?? current.maxBpm);
    const requestedMin = Math.max(1, patch.minBpm ?? current.minBpm);
    const nextMax = patch.maxBpm !== undefined ? Math.max(requestedMax, current.minBpm) : current.maxBpm;
    const nextMin = patch.minBpm !== undefined ? Math.min(requestedMin, nextMax) : current.minBpm;
    nextTargets[index] = {
      minBpm: nextMin,
      maxBpm: nextMax
    };
    profileDraft.value = {
      ...draft,
      bpmTargets: nextTargets,
      isDirty: true
    };
  },

  async saveDraftProfile() {
    const draft = profileDraft.value;
    if (!draft) {
      return;
    }

    const referenced = this.hasProfileReferences(draft.id);
    const original = profiles.value.find((profile) => profile.id === draft.id);
    const uniqueName = createUniqueProfileName(
      profiles.value.filter((profile) => profile.id !== draft.id).map((profile) => profile.name),
      draft.name
    );
    const nextProfile: SessionProfile = {
      id: draft.id,
      name: uniqueName,
      notes: draft.notes,
      workDurationSec: referenced ? original?.workDurationSec ?? draft.workDurationSec : draft.workDurationSec,
      nominalPeakHeartrate: referenced ? original?.nominalPeakHeartrate ?? draft.nominalPeakHeartrate : draft.nominalPeakHeartrate,
      ...(draft.bpmTargets ? { bpmTargets: draft.bpmTargets } : {}),
      warmupSec: referenced ? original?.warmupSec ?? draft.warmupSec : draft.warmupSec,
      baseRestsSec: referenced ? original?.baseRestsSec ?? draft.baseRestsSec : draft.baseRestsSec,
      cooldownBaseSec: referenced ? original?.cooldownBaseSec ?? draft.cooldownBaseSec : draft.cooldownBaseSec
    };

    profiles.value = profiles.value.map((profile) => (profile.id === draft.id ? nextProfile : profile));

    sessions.value = sessions.value.map((session) =>
      session.profileId === draft.id ? { ...session, profileName: nextProfile.name } : session
    );
    profileDraft.value = { ...nextProfile, isDirty: false };
    await persistSnapshot();
    syncActualWorkDuration();
  },

  copyProfile(profileId: string) {
    const source = profiles.value.find((profile) => profile.id === profileId);
    if (!source) {
      return;
    }

    const name = createUniqueProfileName(
      profiles.value.map((profile) => profile.name),
      source.name
    );
    const copy = {
      ...source,
      id: crypto.randomUUID(),
      name
    };
    profiles.value = [...profiles.value, copy];
    this.beginEditingProfile(copy.id);
    void persistSnapshot();
  },

  deleteProfile(profileId: string) {
    if (profiles.value.length <= 1 || this.hasProfileReferences(profileId)) {
      return;
    }
    profiles.value = profiles.value.filter((profile) => profile.id !== profileId);
    if (selectedProfileId.value === profileId) {
      selectedProfileId.value = profiles.value[0]?.id ?? '';
    }
    if (draftProfileId.value === profileId) {
      this.beginEditingProfile(selectedProfileId.value);
    }
    syncActualWorkDuration();
    void persistSnapshot();
  },

  hasProfileReferences(profileId: string): boolean {
    return sessions.value.some((session) => session.profileId === profileId);
  },

  async exportBackup() {
    const snapshot: AppSnapshot = {
      profiles: profiles.value,
      sessions: sessions.value,
      settings: {
        selectedProfileId: selectedProfileId.value,
        settingsMode: settingsMode.value,
        actualWorkDurationByProfileId: actualWorkDurationByProfileId.value
      }
    };
    const blob = new Blob([createExportPayload(snapshot)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.download = 'hiit-master-backup.json';
    anchor.click();
    URL.revokeObjectURL(href);
  },

  async importBackup(file: File) {
    const payload = parseImportPayload(await file.text());
    const reanalyzed = reanalyzeSessions(payload.sessions);
    const normalizedPayload = {
      ...payload,
      sessions: reanalyzed.sessions
    };
    profiles.value = payload.profiles;
    sessions.value = normalizedPayload.sessions;
    selectedProfileId.value = payload.settings.selectedProfileId;
    settingsMode.value = payload.settings.settingsMode ?? 'duration';
    actualWorkDurationByProfileId.value = payload.settings.actualWorkDurationByProfileId ?? {};
    await replaceSnapshot(normalizedPayload);
    this.beginEditingProfile(selectedProfileId.value);
    syncActualWorkDuration();
  }
};
