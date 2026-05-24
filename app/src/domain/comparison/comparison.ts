import { isComparisonEligibleSession } from '../session/lifecycle';
import type { ComparisonRound, HeartRateSample, RoundAnalysis, SessionRecord } from '../shared/types';

export function findPreviousComparableSession(
  currentSession: Pick<SessionRecord, 'startedAt' | 'profileId'>,
  sessions: SessionRecord[]
): SessionRecord | null {
  return (
    [...sessions]
      .filter(
        (session) =>
          session.profileId === currentSession.profileId &&
          new Date(session.startedAt).getTime() < new Date(currentSession.startedAt).getTime() &&
          isComparisonEligibleSession(session)
      )
      .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime())[0] ?? null
  );
}

export function buildComparisonRounds(
  currentAnalysis: RoundAnalysis[],
  previousAnalysis: RoundAnalysis[] | null
): ComparisonRound[] {
  return currentAnalysis.map((currentRound) => {
    const previousRound = previousAnalysis?.find((round) => round.roundIndex === currentRound.roundIndex) ?? null;
    const previousDelta = previousRound?.delta ?? null;
    const currentDelta = currentRound.delta;

    return {
      roundIndex: currentRound.roundIndex,
      currentDelta,
      previousDelta,
      diffDelta:
        currentDelta !== null && previousDelta !== null ? currentDelta - previousDelta : previousDelta === null ? null : null
    };
  });
}

export function getRoundVisibleByElapsedSec(
  roundIndex: number,
  elapsedSec: number,
  currentAnalysis: RoundAnalysis[],
  previousAnalysis: RoundAnalysis[] | null
): boolean {
  const current = currentAnalysis[roundIndex - 1];
  if (!current) {
    return false;
  }

  if (roundIndex === currentAnalysis.length) {
    return elapsedSec >= current.recoveryWindowEndSec;
  }

  if (elapsedSec >= current.recoveryWindowEndSec) {
    return true;
  }

  const previous = previousAnalysis?.[roundIndex - 1];
  if (!previous || previous.delta === null || current.peak === null) {
    return false;
  }

  const thresholdBpm = current.peak - previous.delta;
  return elapsedSec >= current.recoveryWindowStartSec && thresholdBpm >= (current.trough ?? Number.POSITIVE_INFINITY);
}

interface ReplayRecoveryInput {
  elapsedSec: number;
  currentBpm: number | null;
  currentAnalysis: RoundAnalysis[];
  previousAnalysis: RoundAnalysis[] | null;
  visibleRoundIndexes?: number[];
  samples?: HeartRateSample[];
  revealElapsedSec?: Array<number | undefined>;
}

function getPreviousDelta(roundIndex: number, previousAnalysis: RoundAnalysis[] | null): number | null {
  return previousAnalysis?.find((round) => round.roundIndex === roundIndex)?.delta ?? null;
}

function getLiveRecoveryTroughBpm(
  currentRound: RoundAnalysis,
  elapsedSec: number,
  currentBpm: number | null,
  samples?: HeartRateSample[]
): number | null {
  if (elapsedSec < currentRound.recoveryWindowStartSec) {
    return null;
  }

  const windowEndSec = Math.min(elapsedSec, currentRound.recoveryWindowEndSec);
  const sampleBpms = samples
    ?.filter(
      (sample) =>
        sample.bpm !== null &&
        sample.elapsedSec >= currentRound.recoveryWindowStartSec &&
        sample.elapsedSec <= windowEndSec
    )
    .map((sample) => sample.bpm as number);

  if (sampleBpms && sampleBpms.length > 0) {
    return Math.min(...sampleBpms);
  }

  return currentBpm;
}

function getLiveDiffDelta(
  currentRound: RoundAnalysis,
  previousDelta: number | null,
  elapsedSec: number,
  currentBpm: number | null,
  samples?: HeartRateSample[]
): number | null {
  const liveTroughBpm = getLiveRecoveryTroughBpm(currentRound, elapsedSec, currentBpm, samples);

  if (currentRound.peak === null || previousDelta === null || liveTroughBpm === null) {
    return null;
  }

  return Math.max(0, currentRound.peak - liveTroughBpm) - previousDelta;
}

function getCompletedDiffDelta(currentRound: RoundAnalysis, previousDelta: number | null): number | null {
  if (currentRound.delta === null || previousDelta === null) {
    return null;
  }

  return currentRound.delta - previousDelta;
}

export function getReplayRecoveryVisibleRoundIndexes({
  elapsedSec,
  currentBpm,
  currentAnalysis,
  previousAnalysis,
  visibleRoundIndexes = [],
  samples,
  revealElapsedSec
}: ReplayRecoveryInput): number[] {
  const next = new Set(visibleRoundIndexes);
  let visibleMaxAbs: number | null = null;

  for (const roundIndex of next) {
    const round = currentAnalysis.find((candidate) => candidate.roundIndex === roundIndex);
    const previousDelta = round ? getPreviousDelta(round.roundIndex, previousAnalysis) : null;
    const displayedDiffDelta = round
      ? (samples !== undefined ? getLiveDiffDelta(round, previousDelta, elapsedSec, currentBpm, samples) : null) ??
        getCompletedDiffDelta(round, previousDelta)
      : null;
    if (displayedDiffDelta !== null) {
      visibleMaxAbs = Math.max(visibleMaxAbs ?? 0, Math.abs(displayedDiffDelta));
    }
  }

  for (const round of currentAnalysis) {
    if (elapsedSec < round.recoveryWindowStartSec) {
      continue;
    }

    const previousDelta = getPreviousDelta(round.roundIndex, previousAnalysis);
    const liveDiffDelta = getLiveDiffDelta(round, previousDelta, elapsedSec, currentBpm, samples);
    const reachedParity = liveDiffDelta !== null && liveDiffDelta >= 0;
    const reachedVisibleScale =
      liveDiffDelta !== null && visibleMaxAbs !== null && visibleMaxAbs > 0 && Math.abs(liveDiffDelta) <= visibleMaxAbs;
    const reachedDisplayEnd = elapsedSec >= (revealElapsedSec?.[round.roundIndex - 1] ?? Number.POSITIVE_INFINITY);
    const reachedRecoveryEnd = elapsedSec >= round.recoveryWindowEndSec;

    if (reachedParity || reachedVisibleScale || reachedDisplayEnd || reachedRecoveryEnd) {
      next.add(round.roundIndex);

      const displayedDiffDelta = (samples !== undefined ? liveDiffDelta : null) ?? getCompletedDiffDelta(round, previousDelta);
      if (displayedDiffDelta !== null) {
        visibleMaxAbs = Math.max(visibleMaxAbs ?? 0, Math.abs(displayedDiffDelta));
      }
    }
  }

  return [...next].sort((left, right) => left - right);
}

export function buildReplayRecoveryAnalysis({
  elapsedSec,
  currentBpm,
  currentAnalysis,
  visibleRoundIndexes = [],
  samples
}: Omit<ReplayRecoveryInput, 'previousAnalysis'>): RoundAnalysis[] {
  return currentAnalysis
    .filter((round) => visibleRoundIndexes.includes(round.roundIndex))
    .map((round) => {
      const liveTroughBpm = getLiveRecoveryTroughBpm(round, elapsedSec, currentBpm, samples);
      if (
        (elapsedSec >= round.recoveryWindowEndSec && samples === undefined) ||
        elapsedSec < round.recoveryWindowStartSec ||
        round.peak === null ||
        liveTroughBpm === null
      ) {
        return round;
      }

      return {
        ...round,
        trough: liveTroughBpm,
        delta: Math.max(0, round.peak - liveTroughBpm)
      };
    });
}
