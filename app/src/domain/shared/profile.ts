import type { BPMRoundTarget, HeartRateSample, SessionProfile, SessionRecord, WorkoutPhaseSegment } from './types';

export const STARTER_PROFILE: SessionProfile = {
  id: 'starter-profile',
  name: 'My Profile',
  workDurationSec: 30,
  nominalPeakHeartrate: 160,
  warmupSec: 300,
  baseRestsSec: [90, 75, 60, 45, 35, 30, 30, 30, 30, 30, 30, 30],
  cooldownBaseSec: 180,
  notes: ''
};

export function createUniqueProfileName(existingNames: string[], baseName: string): string {
  if (!existingNames.includes(baseName)) {
    return baseName;
  }

  let counter = 2;
  while (existingNames.includes(`${baseName} ${counter}`)) {
    counter += 1;
  }
  return `${baseName} ${counter}`;
}

export function createSessionName(startedAtIso: string): string {
  const startedAt = new Date(startedAtIso);
  return startedAt.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getDefaultActualWorkDurationSec(
  profile: SessionProfile,
  recentSameProfileSession: { actualWorkDurationSec: number } | null
): number {
  if (recentSameProfileSession) {
    return recentSameProfileSession.actualWorkDurationSec;
  }

  return Math.max(1, Math.round((profile.workDurationSec * 2) / 3));
}

export function getProfileBpmTargets(profile: SessionProfile): BPMRoundTarget[] {
  return profile.baseRestsSec.map((_, index) => {
    const fallbackMax = Math.max(1, profile.nominalPeakHeartrate - index * 2);
    const target = profile.bpmTargets?.[index];
    if (!target) {
      return {
        minBpm: Math.max(1, fallbackMax - 20),
        maxBpm: fallbackMax
      };
    }

    const maxBpm = Math.max(1, target.maxBpm);
    return {
      minBpm: Math.max(1, Math.min(target.minBpm, maxBpm)),
      maxBpm
    };
  });
}

function getInterpolatedBpmAtElapsedSec(samples: HeartRateSample[], elapsedSec: number): number | null {
  const sortedSamples = samples
    .filter((sample) => sample.bpm !== null)
    .sort((left, right) => left.elapsedSec - right.elapsedSec);

  if (sortedSamples.length === 0) {
    return null;
  }

  const exactSample = sortedSamples.find((sample) => sample.elapsedSec === elapsedSec);
  if (exactSample) {
    return exactSample.bpm;
  }

  const previous = sortedSamples.filter((sample) => sample.elapsedSec < elapsedSec).at(-1);
  const next = sortedSamples.find((sample) => sample.elapsedSec > elapsedSec);

  if (!previous && !next) {
    return null;
  }
  if (!previous) {
    return next?.bpm ?? null;
  }
  if (!next) {
    return previous.bpm;
  }
  if (previous.bpm === null || next.bpm === null || previous.elapsedSec === next.elapsedSec) {
    return previous.bpm ?? next.bpm;
  }

  const progress = (elapsedSec - previous.elapsedSec) / (next.elapsedSec - previous.elapsedSec);
  return Math.round(previous.bpm + (next.bpm - previous.bpm) * progress);
}

function findRoundPhase(phases: WorkoutPhaseSegment[], kind: 'work' | 'rest', roundIndex: number): WorkoutPhaseSegment | null {
  return phases.find((phase) => phase.kind === kind && phase.roundIndex === roundIndex) ?? null;
}

export function deriveBpmTargetsFromSession(profile: SessionProfile, session: SessionRecord): BPMRoundTarget[] {
  return profile.baseRestsSec.map((_, index) => {
    const roundIndex = index + 1;
    const workPhase = findRoundPhase(session.plan.phases, 'work', roundIndex);
    const restPhase = findRoundPhase(session.plan.phases, 'rest', roundIndex);
    const cooldownPhase = session.plan.phases.find((phase) => phase.kind === 'cooldown');
    const roundAnalysis = session.analysis.find((analysis) => analysis.roundIndex === roundIndex);
    const fallbackTarget = getProfileBpmTargets(profile)[index] ?? {
      minBpm: Math.max(1, profile.nominalPeakHeartrate - index * 2 - 20),
      maxBpm: Math.max(1, profile.nominalPeakHeartrate - index * 2)
    };
    const workEndBpm = workPhase ? getInterpolatedBpmAtElapsedSec(session.samples, workPhase.endSec) : null;
    const restEndBpm = restPhase
      ? getInterpolatedBpmAtElapsedSec(session.samples, restPhase.endSec)
      : roundAnalysis
        ? getInterpolatedBpmAtElapsedSec(session.samples, roundAnalysis.recoveryWindowEndSec) ?? roundAnalysis.trough
        : cooldownPhase
          ? getInterpolatedBpmAtElapsedSec(session.samples, cooldownPhase.startSec)
          : null;
    const maxBpm = Math.max(1, workEndBpm ?? fallbackTarget.maxBpm);

    return {
      maxBpm,
      minBpm: Math.max(1, Math.min(restEndBpm ?? fallbackTarget.minBpm, maxBpm))
    };
  });
}

export function getLatestCompletedProfileSession(profileId: string, sessions: SessionRecord[]): SessionRecord | null {
  return sessions
    .filter((session) => session.profileId === profileId && session.status === 'completed')
    .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())[0] ?? null;
}
