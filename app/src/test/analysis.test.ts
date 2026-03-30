import { describe, expect, it } from 'vitest';
import { analyzeIntervals } from '../domain/analysis/analyze';
import type { HeartRateSample } from '../domain/analysis/types';
import { createWorkoutPlan } from '../domain/workout/plan';

const sessionStartMs = Date.parse('2026-03-30T00:00:00.000Z');

describe('interval analysis', () => {
  it('derives peak and trough from work and recovery windows', () => {
    const plan = createWorkoutPlan(20);
    const samples: HeartRateSample[] = [
      { timestampMs: sessionStartMs + 301_000, bpm: 120, isMissing: false },
      { timestampMs: sessionStartMs + 315_000, bpm: 150, isMissing: false },
      { timestampMs: sessionStartMs + 330_000, bpm: 132, isMissing: false },
      { timestampMs: sessionStartMs + 390_000, bpm: 118, isMissing: false },
      { timestampMs: sessionStartMs + 410_000, bpm: null, isMissing: true }
    ];

    const stats = analyzeIntervals(plan, samples, sessionStartMs);

    expect(stats[0]?.peakBpm).toBe(150);
    expect(stats[0]?.troughBpm).toBe(118);
    expect(stats[0]?.deltaBpm).toBe(32);
  });

  it('returns nulls when windows have no valid data', () => {
    const plan = createWorkoutPlan(20);
    const samples: HeartRateSample[] = [
      { timestampMs: sessionStartMs + 301_000, bpm: null, isMissing: true }
    ];

    const stats = analyzeIntervals(plan, samples, sessionStartMs);

    expect(stats[0]?.peakBpm).toBeNull();
    expect(stats[0]?.troughBpm).toBeNull();
    expect(stats[0]?.deltaBpm).toBeNull();
  });
});
