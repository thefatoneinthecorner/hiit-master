import { describe, expect, it } from 'vitest';
import { analyzeSessionRounds } from '../domain/analysis/recovery';
import {
  buildComparisonRounds,
  buildReplayRecoveryAnalysis,
  findPreviousComparableSession,
  getReplayRecoveryVisibleRoundIndexes
} from '../domain/comparison/comparison';
import {
  STARTER_PROFILE,
  deriveBpmTargetsFromSession,
  getDefaultActualWorkDurationSec,
  getLatestCompletedProfileSession
} from '../domain/shared/profile';
import type { SessionRecord } from '../domain/shared/types';
import { createBpmWorkoutPlan, createWorkoutPlan } from '../domain/workout/plan';
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

  it('creates a BPM workout plan with timed warmup and cooldown around target-based rounds', () => {
    const plan = createBpmWorkoutPlan({
      ...STARTER_PROFILE,
      warmupSec: 300,
      cooldownBaseSec: 180,
      baseRestsSec: [90, 75]
    });

    expect(plan.phases.map((phase) => phase.kind)).toEqual(['warmup', 'work', 'rest', 'work', 'rest', 'cooldown']);
    expect(plan.phases[0]).toMatchObject({ kind: 'warmup', durationSec: 300 });
    expect(plan.phases.at(-1)).toMatchObject({ kind: 'cooldown', roundIndex: null, durationSec: 180 });
  });

  it('derives missing BPM targets from the latest completed profile session phase boundaries', () => {
    const profile = {
      ...STARTER_PROFILE,
      id: 'profile-a',
      warmupSec: 300,
      workDurationSec: 30,
      baseRestsSec: [90, 75],
      cooldownBaseSec: 180
    };
    const plan = createWorkoutPlan(profile, 30);
    const session = {
      id: 'session-a',
      startedAt: '2026-05-01T10:00:00.000Z',
      endedAt: '2026-05-01T10:30:00.000Z',
      name: 'session',
      profileId: profile.id,
      profileName: profile.name,
      profileSnapshot: profile,
      actualWorkDurationSec: 30,
      status: 'completed' as const,
      isCompromised: false,
      hrCoverageComplete: true,
      plan,
      samples: [
        { elapsedSec: 330, bpm: 142 },
        { elapsedSec: 420, bpm: 111 },
        { elapsedSec: 450, bpm: 151 },
        { elapsedSec: 480, bpm: 143 }
      ],
      analysis: [
        { roundIndex: 2, peak: 151, trough: 143, delta: 8, recoveryWindowStartSec: 450, recoveryWindowEndSec: 480 }
      ]
    };

    expect(deriveBpmTargetsFromSession(profile, session)).toEqual([
      { maxBpm: 142, minBpm: 111 },
      { maxBpm: 151, minBpm: 143 }
    ]);
  });

  it('selects the latest completed same-profile session for BPM target derivation', () => {
    const plan = createWorkoutPlan(STARTER_PROFILE, 30);
    const baseSession = (id: string, startedAt: string, status: SessionRecord['status'] = 'completed'): SessionRecord => ({
      id,
      startedAt,
      endedAt: startedAt,
      name: id,
      profileId: STARTER_PROFILE.id,
      profileName: STARTER_PROFILE.name,
      profileSnapshot: STARTER_PROFILE,
      actualWorkDurationSec: 30,
      status,
      isCompromised: false,
      hrCoverageComplete: true,
      plan,
      samples: [],
      analysis: []
    });

    const latest = getLatestCompletedProfileSession(STARTER_PROFILE.id, [
      baseSession('old', '2026-05-01T10:00:00.000Z'),
      baseSession('ended-early', '2026-05-03T10:00:00.000Z', 'ended_early'),
      baseSession('new', '2026-05-02T10:00:00.000Z')
    ]);

    expect(latest?.id).toBe('new');
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
      { elapsedSec: 335, bpm: 172 },
      { elapsedSec: 340, bpm: 120 },
      { elapsedSec: 425, bpm: 110 },
      { elapsedSec: 430, bpm: 170 },
      { elapsedSec: 445, bpm: 125 },
      { elapsedSec: 510, bpm: 118 }
    ];

    const analyses = analyzeSessionRounds(plan, samples);

    expect(analyses[0]).toMatchObject({ peak: 172, trough: 110, delta: 62 });
    expect(analyses[1]?.delta).toBe(52);
  });

  it('analyzes BPM plans with a final rest before a separate cooldown', () => {
    const plan = createBpmWorkoutPlan({
      ...STARTER_PROFILE,
      warmupSec: 300,
      cooldownBaseSec: 180,
      baseRestsSec: [90, 75]
    });
    const samples = [
      { elapsedSec: 320, bpm: 145 },
      { elapsedSec: 410, bpm: 112 },
      { elapsedSec: 440, bpm: 151 },
      { elapsedSec: 510, bpm: 118 }
    ];

    const analyses = analyzeSessionRounds(plan, samples);

    expect(analyses).toHaveLength(2);
    expect(analyses[1]).toMatchObject({
      roundIndex: 2,
      peak: 151,
      trough: 118
    });
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

  it('does not reveal the first replay recovery bar before parity', () => {
    const currentAnalysis = [
      { roundIndex: 1, peak: 101, trough: 82, delta: 19, recoveryWindowStartSec: 329, recoveryWindowEndSec: 449 }
    ];
    const previousAnalysis = [
      { roundIndex: 1, peak: 101, trough: 84, delta: 17, recoveryWindowStartSec: 328, recoveryWindowEndSec: 448 }
    ];

    const visibleRoundIndexes = getReplayRecoveryVisibleRoundIndexes({
      elapsedSec: 430,
      currentBpm: 86,
      currentAnalysis,
      previousAnalysis
    });

    expect(visibleRoundIndexes).toEqual([]);
  });

  it('reveals the first replay recovery bar at parity and renders the live zero delta', () => {
    const currentAnalysis = [
      { roundIndex: 1, peak: 101, trough: 82, delta: 19, recoveryWindowStartSec: 329, recoveryWindowEndSec: 449 }
    ];
    const previousAnalysis = [
      { roundIndex: 1, peak: 101, trough: 84, delta: 17, recoveryWindowStartSec: 328, recoveryWindowEndSec: 448 }
    ];

    const visibleRoundIndexes = getReplayRecoveryVisibleRoundIndexes({
      elapsedSec: 440,
      currentBpm: 84,
      currentAnalysis,
      previousAnalysis
    });
    const replayAnalysis = buildReplayRecoveryAnalysis({
      elapsedSec: 440,
      currentBpm: 84,
      currentAnalysis,
      visibleRoundIndexes
    });

    expect(visibleRoundIndexes).toEqual([1]);
    expect(buildComparisonRounds(replayAnalysis, previousAnalysis)).toEqual([
      { roundIndex: 1, currentDelta: 17, previousDelta: 17, diffDelta: 0 }
    ]);
  });

  it('updates a visible replay recovery bar with its live delta', () => {
    const currentAnalysis = [
      { roundIndex: 1, peak: 101, trough: 82, delta: 19, recoveryWindowStartSec: 329, recoveryWindowEndSec: 449 }
    ];
    const previousAnalysis = [
      { roundIndex: 1, peak: 101, trough: 84, delta: 17, recoveryWindowStartSec: 328, recoveryWindowEndSec: 448 }
    ];

    const replayAnalysis = buildReplayRecoveryAnalysis({
      elapsedSec: 445,
      currentBpm: 82,
      currentAnalysis,
      visibleRoundIndexes: [1]
    });

    expect(buildComparisonRounds(replayAnalysis, previousAnalysis)).toEqual([
      { roundIndex: 1, currentDelta: 19, previousDelta: 17, diffDelta: 2 }
    ]);
  });

  it('uses the lowest observed bpm through the next work phase for live replay recovery', () => {
    const currentAnalysis = [
      { roundIndex: 1, peak: 101, trough: 82, delta: 19, recoveryWindowStartSec: 329, recoveryWindowEndSec: 449 }
    ];
    const previousAnalysis = [
      { roundIndex: 1, peak: 101, trough: 84, delta: 17, recoveryWindowStartSec: 328, recoveryWindowEndSec: 448 }
    ];

    const replayAnalysis = buildReplayRecoveryAnalysis({
      elapsedSec: 423,
      currentBpm: 85,
      currentAnalysis,
      visibleRoundIndexes: [1],
      samples: [
        { elapsedSec: 329, bpm: 101 },
        { elapsedSec: 420, bpm: 82 },
        { elapsedSec: 423, bpm: 85 }
      ]
    });

    expect(buildComparisonRounds(replayAnalysis, previousAnalysis)).toEqual([
      { roundIndex: 1, currentDelta: 19, previousDelta: 17, diffDelta: 2 }
    ]);
  });

  it('does not jump to an unobserved completed trough at the replay recovery window end', () => {
    const currentAnalysis = [
      { roundIndex: 2, peak: 110, trough: 94, delta: 16, recoveryWindowStartSec: 449, recoveryWindowEndSec: 554 }
    ];
    const previousAnalysis = [
      { roundIndex: 2, peak: 115, trough: 95, delta: 20, recoveryWindowStartSec: 448, recoveryWindowEndSec: 553 }
    ];

    const replayAnalysis = buildReplayRecoveryAnalysis({
      elapsedSec: 554,
      currentBpm: 120,
      currentAnalysis,
      visibleRoundIndexes: [2],
      samples: [
        { elapsedSec: 449, bpm: 110 },
        { elapsedSec: 525, bpm: 96 },
        { elapsedSec: 554, bpm: 120 }
      ]
    });

    expect(buildComparisonRounds(replayAnalysis, previousAnalysis)).toEqual([
      { roundIndex: 2, currentDelta: 14, previousDelta: 20, diffDelta: -6 }
    ]);
  });

  it('only applies scale-based replay recovery reveal after another bar is visible', () => {
    const currentAnalysis = [
      { roundIndex: 1, peak: 101, trough: 82, delta: 19, recoveryWindowStartSec: 329, recoveryWindowEndSec: 449 },
      { roundIndex: 2, peak: 110, trough: 94, delta: 16, recoveryWindowStartSec: 449, recoveryWindowEndSec: 554 }
    ];
    const previousAnalysis = [
      { roundIndex: 1, peak: 101, trough: 84, delta: 17, recoveryWindowStartSec: 328, recoveryWindowEndSec: 448 },
      { roundIndex: 2, peak: 115, trough: 95, delta: 20, recoveryWindowStartSec: 448, recoveryWindowEndSec: 553 }
    ];

    expect(
      getReplayRecoveryVisibleRoundIndexes({
        elapsedSec: 500,
        currentBpm: 92,
        currentAnalysis: currentAnalysis.slice(1),
        previousAnalysis
      })
    ).toEqual([]);
    expect(
      getReplayRecoveryVisibleRoundIndexes({
        elapsedSec: 500,
        currentBpm: 92,
        currentAnalysis,
        previousAnalysis,
        visibleRoundIndexes: [1]
      })
    ).toEqual([1, 2]);
    expect(
      getReplayRecoveryVisibleRoundIndexes({
        elapsedSec: 500,
        currentBpm: 93,
        currentAnalysis,
        previousAnalysis,
        visibleRoundIndexes: [1]
      })
    ).toEqual([1]);
  });

  it('uses the displayed live magnitude when revealing later replay recovery bars', () => {
    const currentAnalysis = [
      { roundIndex: 1, peak: 101, trough: 82, delta: 19, recoveryWindowStartSec: 329, recoveryWindowEndSec: 449 },
      { roundIndex: 2, peak: 110, trough: 94, delta: 16, recoveryWindowStartSec: 449, recoveryWindowEndSec: 554 },
      { roundIndex: 3, peak: 120, trough: 105, delta: 15, recoveryWindowStartSec: 554, recoveryWindowEndSec: 644 }
    ];
    const previousAnalysis = [
      { roundIndex: 1, peak: 101, trough: 84, delta: 17, recoveryWindowStartSec: 328, recoveryWindowEndSec: 448 },
      { roundIndex: 2, peak: 115, trough: 95, delta: 20, recoveryWindowStartSec: 448, recoveryWindowEndSec: 553 },
      { roundIndex: 3, peak: 122, trough: 107, delta: 15, recoveryWindowStartSec: 553, recoveryWindowEndSec: 643 }
    ];

    expect(
      getReplayRecoveryVisibleRoundIndexes({
        elapsedSec: 600,
        currentBpm: 111,
        currentAnalysis,
        previousAnalysis,
        visibleRoundIndexes: [1, 2],
        samples: [
          { elapsedSec: 329, bpm: 101 },
          { elapsedSec: 420, bpm: 82 },
          { elapsedSec: 449, bpm: 110 },
          { elapsedSec: 525, bpm: 96 },
          { elapsedSec: 554, bpm: 120 },
          { elapsedSec: 600, bpm: 111 }
        ],
        revealElapsedSec: [420, 525, 615]
      })
    ).toEqual([1, 2, 3]);
  });

  it('reveals replay recovery bars at the next work phase start even when still below threshold', () => {
    const currentAnalysis = [
      { roundIndex: 2, peak: 110, trough: 94, delta: 16, recoveryWindowStartSec: 449, recoveryWindowEndSec: 554 }
    ];
    const previousAnalysis = [
      { roundIndex: 2, peak: 115, trough: 95, delta: 20, recoveryWindowStartSec: 448, recoveryWindowEndSec: 553 }
    ];

    expect(
      getReplayRecoveryVisibleRoundIndexes({
        elapsedSec: 524,
        currentBpm: 96,
        currentAnalysis,
        previousAnalysis,
        revealElapsedSec: [undefined, 525]
      })
    ).toEqual([]);
    expect(
      getReplayRecoveryVisibleRoundIndexes({
        elapsedSec: 525,
        currentBpm: 96,
        currentAnalysis,
        previousAnalysis,
        revealElapsedSec: [undefined, 525]
      })
    ).toEqual([2]);
  });

  it('reveals replay recovery bars at the recovery window end as a fallback', () => {
    const currentAnalysis = [
      { roundIndex: 1, peak: 101, trough: 82, delta: 19, recoveryWindowStartSec: 329, recoveryWindowEndSec: 449 }
    ];
    const previousAnalysis = [
      { roundIndex: 1, peak: 101, trough: 84, delta: 17, recoveryWindowStartSec: 328, recoveryWindowEndSec: 448 }
    ];

    expect(
      getReplayRecoveryVisibleRoundIndexes({
        elapsedSec: 449,
        currentBpm: 86,
        currentAnalysis,
        previousAnalysis
      })
    ).toEqual([1]);
  });
});
