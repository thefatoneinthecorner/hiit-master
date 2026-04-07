import { describe, expect, it } from 'vitest';
import { analyzeRoundRecoveries, buildDiffDeltas, type RoundWindow } from './recovery';
import type { HeartRateSample } from '../shared/types';

describe('analyzeRoundRecoveries', () => {
  it('computes delta as peak minus trough for each round', () => {
    const samples: HeartRateSample[] = [
      { elapsedSec: 1, bpm: 110 },
      { elapsedSec: 3, bpm: 140 },
      { elapsedSec: 5, bpm: 115 },
      { elapsedSec: 9, bpm: 100 },
      { elapsedSec: 12, bpm: 145 },
      { elapsedSec: 16, bpm: 102 },
    ];

    const rounds: RoundWindow[] = [
      { roundIndex: 1, workStartSec: 0, workEndSec: 4, recoveryStartSec: 4, nextWorkEndSec: 14 },
    ];

    const [round] = analyzeRoundRecoveries(samples, rounds, 4);
    expect(round).toBeDefined();

    expect(round!.peak).toBe(140);
    expect(round!.trough).toBe(100);
    expect(round!.delta).toBe(40);
  });

  it('uses a final-round heuristic when no following work phase exists', () => {
    const samples: HeartRateSample[] = [
      { elapsedSec: 2, bpm: 150 },
      { elapsedSec: 7, bpm: 110 },
      { elapsedSec: 12, bpm: 155 },
      { elapsedSec: 17, bpm: 108 },
      { elapsedSec: 22, bpm: 160 },
      { elapsedSec: 27, bpm: 104 },
    ];

    const rounds: RoundWindow[] = [
      { roundIndex: 1, workStartSec: 0, workEndSec: 4, recoveryStartSec: 4, nextWorkEndSec: 14 },
      { roundIndex: 2, workStartSec: 10, workEndSec: 14, recoveryStartSec: 14, nextWorkEndSec: 24 },
      { roundIndex: 3, workStartSec: 20, workEndSec: 24, recoveryStartSec: 24, nextWorkEndSec: null },
    ];

    const results = analyzeRoundRecoveries(samples, rounds, 4);
    const finalRound = results.at(-1);

    expect(finalRound?.trough).toBe(104);
    expect(finalRound?.delta).toBe(56);
    expect(finalRound?.revealAtSec).toBe(28);
  });
});

describe('buildDiffDeltas', () => {
  it('compares current and previous deltas by round', () => {
    expect(
      buildDiffDeltas(
        [{ roundIndex: 4, delta: 25 }],
        [{ roundIndex: 4, delta: 20 }],
      ),
    ).toEqual([
      { roundIndex: 4, currentDelta: 25, previousDelta: 20, diffDelta: 5 },
    ]);
  });
});
