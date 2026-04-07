import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect, useMemo, useState } from 'preact/hooks';
import { analyzeRoundRecoveries, buildDiffDeltas, type RoundRecoveryStats, type RoundWindow } from '../../domain/analysis/recovery';
import { selectPreviousComparisonSession } from '../../domain/session/eligibility';
import { sanitizeHeartRateSample } from '../../domain/session/hrIntegrity';
import type { HeartRateSample, Profile, SessionRecord } from '../../domain/shared/types';
import { getDefaultActualWorkDurationSec } from '../../domain/workout/defaults';
import { buildWorkoutPlan, type WorkoutPhase, type WorkoutPlan } from '../../domain/workout/plan';
import { syncScreenWakeLock } from '../wakelock/screenWakeLock';

type SessionStage = 'idle' | 'countdown' | 'running' | 'paused' | 'completed';
type DiffDelta = ReturnType<typeof buildDiffDeltas>[number];
type AppBackup = {
  profiles: Profile[];
  selectedProfileId: string;
  sessions: SessionRecord[];
};

type AppStateValue = {
  profiles: Profile[];
  selectedProfileId: string;
  profile: Profile;
  actualWorkDurationSec: number;
  availableHistoryCount: number;
  canOpenDevices: boolean;
  canOpenHistory: boolean;
  deviceTestMode: boolean;
  deviceName: string | null;
  batteryPercent: number | null;
  liveBpm: number | null;
  livePulseVersion: number;
  stage: SessionStage;
  isCurrentSessionCompromised: boolean;
  countdownRemainingSec: number;
  elapsedSec: number;
  currentPhase: WorkoutPhase | null;
  phaseRemainingSec: number | null;
  totalRemainingSec: number | null;
  progressPercent: number;
  plan: WorkoutPlan | null;
  currentSamples: HeartRateSample[];
  currentRecoveries: RoundRecoveryStats[];
  diffDeltas: DiffDelta[];
  previousComparisonSession: SessionRecord | null;
  historySessions: SessionRecord[];
  currentHistorySession: SessionRecord | null;
  currentHistoryIndex: number;
  exportBackup: () => string;
  importBackup: (serialized: string) => { ok: boolean; message: string };
  isProfileTimingLocked: (profileId: string) => boolean;
  selectProfile: (profileId: string) => void;
  updateProfile: (profileId: string, nextProfile: Profile) => void;
  copyProfile: (profileId: string) => void;
  deleteProfile: (profileId: string) => void;
  connectMonitor: () => void;
  reconnectMonitor: () => void;
  disconnectMonitor: () => void;
  setActualWorkDurationSec: (durationSec: number) => void;
  startSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  resetSession: () => void;
  showLatestHistorySession: () => void;
  showAdjacentHistorySession: (direction: -1 | 1) => void;
  deleteHistorySession: (sessionId: string) => void;
};

type AppStateProviderProps = {
  children: ComponentChildren;
  initialSessions?: SessionRecord[];
  initialProfile?: Profile;
  initialProfiles?: Profile[];
  deviceTestMode?: boolean;
  tickMs?: number;
};

const starterProfile: Profile = {
  id: 'profile-my-profile',
  name: 'My Profile',
  workDurationSec: 30,
  nominalPeakHeartrate: 160,
  warmupSec: 120,
  baseRestsSec: [60, 50, 40, 30],
  cooldownBaseSec: 90,
  notes: 'Starter profile',
};

const countdownLeadInSec = 4;
const connectedRestingBpm = 48;
const deviceCatalog = ['Polar OH1 36F91927', 'Polar H10 17A5B204'] as const;

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({
  children,
  initialSessions = [],
  initialProfile = starterProfile,
  initialProfiles,
  deviceTestMode = false,
  tickMs = 1000,
}: AppStateProviderProps) {
  const seededProfiles = initialProfiles ?? [initialProfile];

  const [savedSessions, setSavedSessions] = useState<SessionRecord[]>(initialSessions);
  const [profiles, setProfiles] = useState<Profile[]>(() =>
    seededProfiles.length > 0 ? seededProfiles : [starterProfile],
  );
  const [selectedProfileId, setSelectedProfileId] = useState<string>(
    (seededProfiles[0] ?? starterProfile).id,
  );
  const [connectedDeviceIndex, setConnectedDeviceIndex] = useState(0);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [batteryPercent] = useState<number | null>(deviceTestMode ? 33 : 80);
  const profile =
    profiles.find((candidate) => candidate.id === selectedProfileId) ?? profiles[0] ?? starterProfile;
  const latestSessionForProfile = savedSessions
    .filter((session) => session.profileId === profile.id)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0];
  const [actualWorkDurationSec, setActualWorkDurationSec] = useState(() =>
    getDefaultActualWorkDurationSec(profile.workDurationSec, latestSessionForProfile),
  );
  const [stage, setStage] = useState<SessionStage>('idle');
  const [isCurrentSessionCompromised, setIsCurrentSessionCompromised] = useState(false);
  const [countdownRemainingSec, setCountdownRemainingSec] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [liveBpm, setLiveBpm] = useState<number | null>(null);
  const [livePulseVersion, setLivePulseVersion] = useState(0);
  const [activeSessionStartedAt, setActiveSessionStartedAt] = useState<string | null>(null);
  const [activeSessionPersisted, setActiveSessionPersisted] = useState(false);
  const [currentHistorySessionId, setCurrentHistorySessionId] = useState<string | null>(
    initialSessions.find((session) => session.status === 'completed')?.id ?? null,
  );

  const updateLiveBpm = (nextBpm: number | null) => {
    setLiveBpm(nextBpm);
    setLivePulseVersion((current) => current + 1);
  };

  useEffect(() => {
    setActualWorkDurationSec(getDefaultActualWorkDurationSec(profile.workDurationSec, latestSessionForProfile));
  }, [latestSessionForProfile, profile.id, profile.workDurationSec]);

  useEffect(() => {
    if (deviceName === null || stage !== 'idle') {
      return;
    }

    updateLiveBpm(connectedRestingBpm);
  }, [deviceName, stage]);

  useEffect(() => {
    if (stage !== 'countdown') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (countdownRemainingSec > 1) {
        setCountdownRemainingSec((current) => current - 1);
        return;
      }

      setCountdownRemainingSec(0);
      setStage('running');
      updateLiveBpm(124);
    }, tickMs);

    return () => window.clearTimeout(timeoutId);
  }, [countdownRemainingSec, stage, tickMs]);

  useEffect(() => {
    if (stage !== 'running' || plan === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setElapsedSec((current) => {
        const nextElapsedSec = current + 1;

        if (nextElapsedSec >= plan.totalDurationSec) {
          setStage('completed');
          updateLiveBpm(connectedRestingBpm + 4);
          return plan.totalDurationSec;
        }

        return nextElapsedSec;
      });
    }, tickMs);

    return () => window.clearTimeout(timeoutId);
  }, [plan, stage, elapsedSec, tickMs]);

  const currentPhase = useMemo(() => {
    if (plan === null) {
      return null;
    }

    if (stage === 'countdown') {
      return plan.phases[0] ?? null;
    }

    return (
      plan.phases.find((phase) => elapsedSec >= phase.startSec && elapsedSec < phase.endSec) ??
      plan.phases.at(-1) ??
      null
    );
  }, [elapsedSec, plan, stage]);

  const roundWindows = useMemo(() => {
    if (plan === null) {
      return [] as RoundWindow[];
    }

    return buildRoundWindows(plan);
  }, [plan]);

  const allPlannedSamples = useMemo(() => {
    if (plan === null) {
      return [] as HeartRateSample[];
    }

    return simulateHeartRateSamples(plan, profile);
  }, [plan, profile]);

  const currentSamples = useMemo(() => {
    if (plan === null || stage === 'idle' || stage === 'countdown') {
      return [] as HeartRateSample[];
    }

    const visibleElapsedSec = Math.min(elapsedSec, plan.totalDurationSec);

    return allPlannedSamples.filter((sample) => sample.elapsedSec <= visibleElapsedSec);
  }, [allPlannedSamples, elapsedSec, plan, stage]);

  const currentRecoveries = useMemo(
    () =>
      plan === null
        ? []
        : analyzeRoundRecoveries(currentSamples, roundWindows, profile.workDurationSec),
    [currentSamples, plan, profile.workDurationSec, roundWindows],
  );

  const currentSessionForComparison = useMemo(() => {
    if (activeSessionStartedAt === null) {
      return null;
    }

    return {
      id: 'active-session',
      startedAt: activeSessionStartedAt,
      profileName: profile.name,
    };
  }, [activeSessionStartedAt, profile.name]);

  const previousComparisonSession = useMemo(() => {
    if (currentSessionForComparison === null) {
      return null;
    }

    return selectPreviousComparisonSession(currentSessionForComparison, savedSessions) ?? null;
  }, [currentSessionForComparison, savedSessions]);

  const previousRecoveries = useMemo(() => {
    if (previousComparisonSession === null || plan === null) {
      return [] as RoundRecoveryStats[];
    }

    return analyzeRoundRecoveries(
      previousComparisonSession.samples,
      roundWindows,
      profile.workDurationSec,
    );
  }, [plan, previousComparisonSession, profile.workDurationSec, roundWindows]);

  const diffDeltas = useMemo(
    () => buildDiffDeltas(currentRecoveries, previousRecoveries),
    [currentRecoveries, previousRecoveries],
  );

  const historySessions = useMemo(
    () =>
      savedSessions
        .filter((session) => session.status === 'completed')
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt)),
    [savedSessions],
  );

  const currentHistorySession =
    historySessions.find((session) => session.id === currentHistorySessionId) ?? historySessions[0] ?? null;

  const currentHistoryIndex =
    currentHistorySession === null ? -1 : historySessions.findIndex((session) => session.id === currentHistorySession.id);

  useEffect(() => {
    if (
      stage !== 'completed' ||
      plan === null ||
      activeSessionStartedAt === null ||
      activeSessionPersisted
    ) {
      return;
    }

    setSavedSessions((current) => {
      const nextSessionId = `session-${current.length + 1}`;

      setCurrentHistorySessionId(nextSessionId);

      return [
        {
          id: nextSessionId,
          startedAt: activeSessionStartedAt,
          profileId: profile.id,
          profileName: profile.name,
          actualWorkDurationSec,
          nominalWorkDurationSec: profile.workDurationSec,
          status: 'completed',
          isCompromised: false,
          heartRateCoverageComplete: true,
          samples: currentSamples,
        },
        ...current,
      ];
    });
    setActiveSessionPersisted(true);
  }, [
    activeSessionPersisted,
    activeSessionStartedAt,
    actualWorkDurationSec,
    currentSamples,
    profile.id,
    profile.name,
    profile.workDurationSec,
    plan,
    stage,
  ]);

  useEffect(() => {
    if (historySessions.length === 0) {
      if (currentHistorySessionId !== null) {
        setCurrentHistorySessionId(null);
      }
      return;
    }

    if (currentHistorySession === null) {
      setCurrentHistorySessionId(historySessions[0]?.id ?? null);
    }
  }, [currentHistorySession, currentHistorySessionId, historySessions]);

  useEffect(() => {
    if (stage === 'idle' || stage === 'completed') {
      return;
    }

    const baseBpmByPhase = {
      warmup: 102,
      work: 156,
      recovery: 118,
      cooldown: 96,
    } as const;

    const phaseKind = currentPhase?.kind ?? 'warmup';
    const drift = phaseKind === 'work' ? elapsedSec % 6 : elapsedSec % 4;
    updateLiveBpm(baseBpmByPhase[phaseKind] + drift);
  }, [currentPhase, elapsedSec, stage]);

  useEffect(() => {
    void syncScreenWakeLock(stage === 'running');

    return () => {
      void syncScreenWakeLock(false);
    };
  }, [stage]);

  const phaseRemainingSec =
    currentPhase === null
      ? null
      : stage === 'countdown'
        ? currentPhase.durationSec
        : Math.max(0, currentPhase.endSec - elapsedSec);

  const totalRemainingSec =
    plan === null
      ? null
      : stage === 'countdown'
        ? plan.totalDurationSec
        : Math.max(0, plan.totalDurationSec - elapsedSec);

  const progressPercent =
    plan === null || plan.totalDurationSec === 0
      ? 0
      : Math.min(100, Math.round((elapsedSec / plan.totalDurationSec) * 100));

  const value = useMemo<AppStateValue>(
    () => ({
      profiles,
      selectedProfileId,
      profile,
      actualWorkDurationSec,
      availableHistoryCount: savedSessions.filter((session) => session.status === 'completed').length,
      canOpenDevices:
        (deviceName !== null || stage === 'running' || stage === 'paused') && stage !== 'countdown',
      canOpenHistory: savedSessions.some((session) => session.status === 'completed'),
      deviceTestMode,
      deviceName,
      batteryPercent,
      liveBpm,
      livePulseVersion,
      stage,
      isCurrentSessionCompromised,
      countdownRemainingSec,
      elapsedSec,
      currentPhase,
      phaseRemainingSec,
      totalRemainingSec,
      progressPercent,
      plan,
      currentSamples,
      currentRecoveries,
      diffDeltas,
      previousComparisonSession,
      historySessions,
      currentHistorySession,
      currentHistoryIndex,
      exportBackup: () =>
        JSON.stringify(
          {
            profiles,
            selectedProfileId,
            sessions: savedSessions,
          } satisfies AppBackup,
          null,
          2,
        ),
      importBackup: (serialized: string) => {
        try {
          const parsed = JSON.parse(serialized) as Partial<AppBackup>;
          const nextProfiles = Array.isArray(parsed.profiles)
            ? parsed.profiles.filter(isValidProfile)
            : [];
          const nextSessions = Array.isArray(parsed.sessions)
            ? parsed.sessions.filter(isValidSessionRecord)
            : [];

          if (nextProfiles.length === 0) {
            return { ok: false, message: 'Import failed: no valid profiles were found.' };
          }

          const nextSelectedProfileId = nextProfiles.some(
            (candidate) => candidate.id === parsed.selectedProfileId,
          )
            ? (parsed.selectedProfileId as string)
            : nextProfiles[0]?.id ?? starterProfile.id;

          setProfiles(nextProfiles);
          setSelectedProfileId(nextSelectedProfileId);
          setSavedSessions(nextSessions);
          setCurrentHistorySessionId(
            nextSessions
              .filter((session) => session.status === 'completed')
              .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0]?.id ?? null,
          );
          setStage('idle');
          setCountdownRemainingSec(0);
          setElapsedSec(0);
          setPlan(null);
          setActiveSessionStartedAt(null);
          setActiveSessionPersisted(false);
          setIsCurrentSessionCompromised(false);
          updateLiveBpm(deviceName === null ? null : connectedRestingBpm);

          return { ok: true, message: 'Backup imported.' };
        } catch {
          return { ok: false, message: 'Import failed: backup JSON could not be parsed.' };
        }
      },
      isProfileTimingLocked: (profileId: string) =>
        savedSessions.some((session) => session.profileId === profileId),
      selectProfile: (profileId: string) => {
        if (!profiles.some((candidate) => candidate.id === profileId)) {
          return;
        }

        setSelectedProfileId(profileId);
      },
      updateProfile: (profileId: string, nextProfile: Profile) => {
        const previousProfile = profiles.find((candidate) => candidate.id === profileId);

        setProfiles((current) =>
          current.map((candidate) => (candidate.id === profileId ? nextProfile : candidate)),
        );

        if (previousProfile !== undefined && nextProfile.name !== previousProfile.name) {
          setSavedSessions((current) =>
            current.map((session) =>
              session.profileId === profileId ? { ...session, profileName: nextProfile.name } : session,
            ),
          );
        }
      },
      copyProfile: (profileId: string) => {
        const sourceProfile = profiles.find((candidate) => candidate.id === profileId);

        if (sourceProfile === undefined) {
          return;
        }

        const copyName = makeUniqueProfileName(sourceProfile.name, profiles);
        const copyId = `${profileId}-copy-${profiles.length + 1}`;

        setProfiles((current) => [
          ...current,
          {
            ...sourceProfile,
            id: copyId,
            name: copyName,
          },
        ]);
        setSelectedProfileId(copyId);
      },
      deleteProfile: (profileId: string) => {
        if (profiles.length <= 1) {
          return;
        }

        const remainingProfiles = profiles.filter((candidate) => candidate.id !== profileId);
        setProfiles(remainingProfiles);

        if (selectedProfileId === profileId) {
          setSelectedProfileId(remainingProfiles[0]?.id ?? starterProfile.id);
        }
      },
      connectMonitor: () => {
        setDeviceName(deviceCatalog[connectedDeviceIndex] ?? deviceCatalog[0]);
        updateLiveBpm(connectedRestingBpm);
      },
      reconnectMonitor: () => {
        setConnectedDeviceIndex((current) => {
          const nextIndex = (current + 1) % deviceCatalog.length;
          setDeviceName(deviceCatalog[nextIndex] ?? deviceCatalog[0]);
          updateLiveBpm(stage === 'paused' ? connectedRestingBpm : Math.max(liveBpm ?? 0, connectedRestingBpm));
          return nextIndex;
        });
      },
      disconnectMonitor: () => {
        if (stage === 'running' || stage === 'paused') {
          setSavedSessions((current) => [
            {
              id: `session-${current.length + 1}`,
              startedAt: activeSessionStartedAt ?? new Date().toISOString(),
              profileId: profile.id,
              profileName: profile.name,
              actualWorkDurationSec,
              nominalWorkDurationSec: profile.workDurationSec,
              status: 'ended_early',
              isCompromised: true,
              heartRateCoverageComplete: currentSamples.length > 0,
              samples: currentSamples,
            },
            ...current,
          ]);
          setActiveSessionPersisted(true);
          setIsCurrentSessionCompromised(true);
          setStage('completed');
        } else {
          setStage('idle');
          setCountdownRemainingSec(0);
          setElapsedSec(0);
          setPlan(null);
          setActiveSessionStartedAt(null);
          setActiveSessionPersisted(false);
          setIsCurrentSessionCompromised(false);
        }

        setDeviceName(null);
        updateLiveBpm(null);
      },
      setActualWorkDurationSec: (durationSec: number) => {
        setActualWorkDurationSec(Math.max(1, Math.min(profile.workDurationSec, durationSec)));
      },
      startSession: () => {
        if (deviceName === null) {
          return;
        }

        const nextPlan = buildWorkoutPlan(profile, actualWorkDurationSec);
        setPlan(nextPlan);
        setElapsedSec(0);
        setCountdownRemainingSec(countdownLeadInSec);
        setActiveSessionStartedAt(new Date().toISOString());
        setActiveSessionPersisted(false);
        setIsCurrentSessionCompromised(false);
        setStage('countdown');
      },
      pauseSession: () => {
        if (stage === 'running') {
          setStage('paused');
        }
      },
      resumeSession: () => {
        if (stage === 'paused') {
          setStage('running');
        }
      },
      resetSession: () => {
        setStage('idle');
        setCountdownRemainingSec(0);
        setElapsedSec(0);
        setPlan(null);
        setActiveSessionStartedAt(null);
        setActiveSessionPersisted(false);
        setIsCurrentSessionCompromised(false);
        updateLiveBpm(deviceName === null ? null : connectedRestingBpm);
      },
      showLatestHistorySession: () => {
        setCurrentHistorySessionId(historySessions[0]?.id ?? null);
      },
      showAdjacentHistorySession: (direction: -1 | 1) => {
        if (historySessions.length === 0) {
          setCurrentHistorySessionId(null);
          return;
        }

        if (currentHistoryIndex < 0) {
          setCurrentHistorySessionId(historySessions[0]?.id ?? null);
          return;
        }

        const nextIndex = Math.min(
          Math.max(0, currentHistoryIndex + direction),
          historySessions.length - 1,
        );
        setCurrentHistorySessionId(historySessions[nextIndex]?.id ?? null);
      },
      deleteHistorySession: (sessionId: string) => {
        const remainingHistory = historySessions.filter((session) => session.id !== sessionId);
        setSavedSessions((current) => current.filter((session) => session.id !== sessionId));

        if (currentHistorySessionId === sessionId) {
          setCurrentHistorySessionId(remainingHistory[0]?.id ?? null);
        }
      },
    }),
    [
      actualWorkDurationSec,
      activeSessionPersisted,
      activeSessionStartedAt,
      batteryPercent,
      connectedDeviceIndex,
      countdownRemainingSec,
      currentHistoryIndex,
      currentHistorySession,
      currentHistorySessionId,
      currentPhase,
      currentRecoveries,
      currentSamples,
      deviceTestMode,
      deviceName,
      diffDeltas,
      elapsedSec,
      historySessions,
      profile,
      profiles,
      selectedProfileId,
      isCurrentSessionCompromised,
      liveBpm,
      livePulseVersion,
      phaseRemainingSec,
      plan,
      previousComparisonSession,
      progressPercent,
      savedSessions,
      stage,
      totalRemainingSec,
    ],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);

  if (value === null) {
    throw new Error('useAppState must be used within AppStateProvider');
  }

  return value;
}

function buildRoundWindows(plan: WorkoutPlan) {
  const workPhases = plan.phases.filter((phase) => phase.kind === 'work');

  return workPhases.map((phase, index) => ({
    roundIndex: phase.roundIndex ?? index + 1,
    workStartSec: phase.startSec,
    workEndSec: phase.endSec,
    recoveryStartSec: phase.endSec,
    nextWorkEndSec: workPhases[index + 1]?.endSec ?? null,
  }));
}

function makeUniqueProfileName(baseName: string, profiles: readonly Profile[]) {
  const existingNames = new Set(profiles.map((profile) => profile.name));
  let suffix = 2;
  let candidate = `${baseName} Copy`;

  while (existingNames.has(candidate)) {
    candidate = `${baseName} Copy ${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function isValidProfile(value: unknown): value is Profile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.workDurationSec === 'number' &&
    typeof candidate.nominalPeakHeartrate === 'number' &&
    typeof candidate.warmupSec === 'number' &&
    Array.isArray(candidate.baseRestsSec) &&
    candidate.baseRestsSec.every((entry) => typeof entry === 'number') &&
    typeof candidate.cooldownBaseSec === 'number' &&
    typeof candidate.notes === 'string'
  );
}

function isValidSessionRecord(value: unknown): value is SessionRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.startedAt === 'string' &&
    typeof candidate.profileId === 'string' &&
    typeof candidate.profileName === 'string' &&
    typeof candidate.actualWorkDurationSec === 'number' &&
    typeof candidate.nominalWorkDurationSec === 'number' &&
    typeof candidate.status === 'string' &&
    typeof candidate.isCompromised === 'boolean' &&
    typeof candidate.heartRateCoverageComplete === 'boolean' &&
    Array.isArray(candidate.samples)
  );
}

function simulateHeartRateSamples(plan: WorkoutPlan, profile: Profile) {
  const samples: HeartRateSample[] = [];
  const restingBpm = Math.max(44, profile.nominalPeakHeartrate - 112);
  let previousBpm = restingBpm;

  for (let elapsedSec = 0; elapsedSec <= plan.totalDurationSec; elapsedSec += 1) {
    const phase =
      plan.phases.find((candidate) => elapsedSec >= candidate.startSec && elapsedSec < candidate.endSec) ??
      plan.phases.at(-1) ??
      null;

    if (phase === null) {
      continue;
    }

    const offsetSec = Math.max(0, elapsedSec - phase.startSec);
    const progress = phase.durationSec <= 1 ? 1 : offsetSec / Math.max(1, phase.durationSec - 1);
    const roundIndex = phase.roundIndex ?? 0;
    let bpm = previousBpm;

    if (phase.kind === 'warmup') {
      bpm = Math.round(restingBpm + 42 * progress + (elapsedSec % 3));
    } else if (phase.kind === 'work') {
      bpm = Math.round(profile.nominalPeakHeartrate - 10 + roundIndex * 2 + 12 * progress + (elapsedSec % 4));
    } else if (phase.kind === 'recovery') {
      const floorBpm = restingBpm + 30 - roundIndex * 2;
      bpm = Math.round(floorBpm + (1 - progress) * 26 + ((elapsedSec + roundIndex) % 3));
    } else {
      bpm = Math.round(restingBpm + 6 + (1 - progress) * 18 + (elapsedSec % 2));
    }

    const sanitized = sanitizeHeartRateSample({ elapsedSec, bpm });

    if (sanitized !== null) {
      samples.push(sanitized);
      previousBpm = sanitized.bpm ?? previousBpm;
    }
  }

  return samples;
}
