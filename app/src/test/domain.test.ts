import { describe, expect, it } from 'vitest';
import { analyzeSessionRounds } from '../domain/analysis/recovery';
import { buildComparisonRounds, findPreviousComparableSession } from '../domain/comparison/comparison';
import { STARTER_PROFILE, getDefaultActualWorkDurationSec } from '../domain/shared/profile';
import type { SessionRecord } from '../domain/shared/types';
import { createWorkoutPlan } from '../domain/workout/plan';
import { deriveSessionIntegrity, filterPlausibleBpm } from '../domain/session/lifecycle';

describe('domain rules', () => {
  it('defaults actual work duration from the previous same-profile session or two thirds nominal', () => {
    expect(getDefaultActualWorkDurationSec(STARTER_PROFILE, null)).toBe(20);
    expect(getDefaultActualWorkDurationSec(STARTER_PROFILE, { actualWorkDurationSec: 23 })).toBe(23);
  });

  it('preserves nominal round duration by shifting reduced work time into recovery', () => {
    const plan = createWorkoutPlan(STARTER_PROFILE, 20);

    expect(plan.rounds[0]).toMatchObject({
      workDurationSec: 20,
      restDurationSec: 100,
      nominalRoundDurationSec: 120
    });
    const firstRound = plan.rounds[0];
    expect(firstRound).toBeDefined();
    expect((firstRound?.workDurationSec ?? 0) + (firstRound?.restDurationSec ?? 0)).toBe(
      firstRound?.nominalRoundDurationSec
    );
  });

  it('filters implausible bpm values before persistence or charting', () => {
    expect(filterPlausibleBpm(24)).toBeNull();
    expect(filterPlausibleBpm(241)).toBeNull();
    expect(filterPlausibleBpm(160)).toBe(160);
  });

  it('marks ended-early or compromised sessions as comparison-ineligible', () => {
    expect(deriveSessionIntegrity('completed', false, true, [{ delta: 10 }]).comparisonEligible).toBe(true);
    expect(deriveSessionIntegrity('ended_early', false, true, [{ delta: 10 }]).comparisonEligible).toBe(false);
    expect(deriveSessionIntegrity('completed', true, true, [{ delta: 10 }]).comparisonEligible).toBe(false);
    expect(deriveSessionIntegrity('completed', false, false, [{ delta: 10 }]).comparisonEligible).toBe(false);
  });

  it('derives round deltas and handles the final-round recovery heuristic', () => {
    const plan = createWorkoutPlan(
      {
        ...STARTER_PROFILE,
        warmupSec: 300,
        cooldownBaseSec: 30,
        baseRestsSec: [90, 75]
      },
      30
    );
    const samples = [
      { elapsedSec: 301, bpm: 130 },
      { elapsedSec: 320, bpm: 165 },
      { elapsedSec: 340, bpm: 120 },
      { elapsedSec: 425, bpm: 110 },
      { elapsedSec: 430, bpm: 170 },
      { elapsedSec: 445, bpm: 125 },
      { elapsedSec: 510, bpm: 118 }
    ];

    const analyses = analyzeSessionRounds(plan, samples);

    expect(analyses[0]).toMatchObject({ peak: 165, trough: 110, delta: 55 });
    expect(analyses[1]?.delta).toBe(52);
  });

  it('finds the most recent eligible same-profile comparison session', () => {
    const plan = createWorkoutPlan(STARTER_PROFILE, 30);
    const baseSession = (overrides: Partial<SessionRecord>): SessionRecord => ({
      id: 'session',
      startedAt: '2026-04-01T10:00:00.000Z',
      endedAt: '2026-04-01T10:30:00.000Z',
      name: 'session',
      profileId: STARTER_PROFILE.id,
      profileName: STARTER_PROFILE.name,
      profileSnapshot: STARTER_PROFILE,
      actualWorkDurationSec: 30,
      status: 'completed',
      isCompromised: false,
      hrCoverageComplete: true,
      plan,
      samples: [],
      analysis: [{ roundIndex: 1, peak: 160, trough: 120, delta: 40, recoveryWindowStartSec: 0, recoveryWindowEndSec: 1 }],
      ...overrides
    });

    const sessions = [
      baseSession({ id: 'a', startedAt: '2026-04-01T10:00:00.000Z' }),
      baseSession({ id: 'b', startedAt: '2026-04-02T10:00:00.000Z', isCompromised: true }),
      baseSession({ id: 'c', startedAt: '2026-04-03T10:00:00.000Z' })
    ];

    const comparison = findPreviousComparableSession(
      { startedAt: '2026-04-04T10:00:00.000Z', profileId: STARTER_PROFILE.id },
      sessions
    );

    expect(comparison?.id).toBe('c');
  });

  it('builds diff deltas round-by-round', () => {
    const rounds = buildComparisonRounds(
      [
        { roundIndex: 1, peak: 165, trough: 120, delta: 45, recoveryWindowStartSec: 0, recoveryWindowEndSec: 1 },
        { roundIndex: 2, peak: 170, trough: 130, delta: 40, recoveryWindowStartSec: 1, recoveryWindowEndSec: 2 }
      ],
      [
        { roundIndex: 1, peak: 160, trough: 125, delta: 35, recoveryWindowStartSec: 0, recoveryWindowEndSec: 1 },
        { roundIndex: 2, peak: 170, trough: 128, delta: 42, recoveryWindowStartSec: 1, recoveryWindowEndSec: 2 }
      ]
    );

    expect(rounds).toEqual([
      { roundIndex: 1, currentDelta: 45, previousDelta: 35, diffDelta: 10 },
      { roundIndex: 2, currentDelta: 40, previousDelta: 42, diffDelta: -2 }
    ]);
  });
});
