import type { ComparisonRound } from './types';
import type { IntervalStat } from '../analysis/types';
import type { SessionSummary } from '../session/types';

export function selectPreviousComparisonEligibleSession(sessions: SessionSummary[], currentSessionId: string): SessionSummary | null {
  return sessions
    .filter((session) => session.id !== currentSessionId)
    .filter((session) => session.comparisonEligible)
    .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))[0] ?? null;
}

export function createComparisonRounds(current: IntervalStat[], previous: IntervalStat[]): ComparisonRound[] {
  const previousByRound = new Map(previous.map((stat) => [stat.roundIndex, stat]));

  return current.map((currentStat) => {
    const previousStat = previousByRound.get(currentStat.roundIndex);
    const previousDelta = previousStat?.deltaBpm ?? null;
    const currentDelta = currentStat.deltaBpm;

    return {
      roundIndex: currentStat.roundIndex,
      currentDelta,
      previousDelta,
      diffDelta: currentDelta !== null && previousDelta !== null ? currentDelta - previousDelta : null
    };
  });
}
