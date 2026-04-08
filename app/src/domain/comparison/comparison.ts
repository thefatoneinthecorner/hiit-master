import { isComparisonEligibleSession } from '../session/lifecycle';
import type { ComparisonRound, RoundAnalysis, SessionRecord } from '../shared/types';

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
  return currentAnalysis.map((currentRound, index) => {
    const previousRound = previousAnalysis?.[index] ?? null;
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
