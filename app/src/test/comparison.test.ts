import { describe, expect, it } from 'vitest';
import { createComparisonRounds, selectPreviousComparisonEligibleSession } from '../domain/comparison/select';

describe('comparison selection', () => {
  it('chooses the most recent comparison-eligible session', () => {
    const selected = selectPreviousComparisonEligibleSession(
      [
        {
          id: 'session-a',
          startedAt: '2026-03-28T00:00:00.000Z',
          status: 'completed',
          isCompromised: false,
          comparisonEligible: true,
          workDurationSec: 20
        },
        {
          id: 'session-b',
          startedAt: '2026-03-29T00:00:00.000Z',
          status: 'completed',
          isCompromised: true,
          comparisonEligible: false,
          workDurationSec: 20
        },
        {
          id: 'session-c',
          startedAt: '2026-03-27T00:00:00.000Z',
          status: 'completed',
          isCompromised: false,
          comparisonEligible: true,
          workDurationSec: 20
        }
      ],
      'current-session'
    );

    expect(selected?.id).toBe('session-a');
  });

  it('creates per-round comparison diffs', () => {
    const rounds = createComparisonRounds(
      [
        { roundIndex: 0, peakBpm: 150, troughBpm: 120, deltaBpm: 30 },
        { roundIndex: 1, peakBpm: 155, troughBpm: 121, deltaBpm: 34 }
      ],
      [
        { roundIndex: 0, peakBpm: 148, troughBpm: 122, deltaBpm: 26 },
        { roundIndex: 1, peakBpm: 150, troughBpm: 122, deltaBpm: 28 }
      ]
    );

    expect(rounds[0]?.diffDelta).toBe(4);
    expect(rounds[1]?.diffDelta).toBe(6);
  });
});
