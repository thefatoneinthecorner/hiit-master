import { describe, expect, it } from 'vitest';
import { analyzeIntervals } from '../domain/analysis/analyze';
import type { HeartRateSample } from '../domain/analysis/types';
import { createWorkoutPlan } from '../domain/workout/plan';

const sessionStartMs = Date.parse('2026-03-30T00:00:00.000Z');

function sampleAt(sec: number, bpm: number): HeartRateSample {
  return { timestampMs: sessionStartMs + (sec * 1000), bpm, isMissing: false };
}

describe('interval analysis', () => {
  it('captures the peak across work plus following recovery', () => {
    const plan = createWorkoutPlan(20);
    const samples: HeartRateSample[] = [
      sampleAt(305, 148),
      sampleAt(316, 150),
      sampleAt(329, 156),
      sampleAt(360, 140),
      sampleAt(396, 118)
    ];

    const stats = analyzeIntervals(plan, samples, sessionStartMs);

    expect(stats[0]?.peakBpm).toBe(156);
  });

  it('captures the trough across recovery plus the next work phase', () => {
    const plan = createWorkoutPlan(20);
    const samples: HeartRateSample[] = [
      sampleAt(315, 150),
      sampleAt(350, 122),
      sampleAt(401, 116),
      sampleAt(410, 121)
    ];

    const stats = analyzeIntervals(plan, samples, sessionStartMs);

    expect(stats[0]?.troughBpm).toBe(116);
    expect(stats[0]?.deltaBpm).toBe(34);
  });

  it('estimates the final-round trough from the previous round trough offset', () => {
    const plan = createWorkoutPlan(20);
    const lastWork = [...plan.phases].reverse().find((phase) => phase.phaseType === 'work');
    const cooldown = plan.phases.find((phase) => phase.phaseType === 'cooldown');
    const previousRest = plan.phases.find((phase) => phase.phaseType === 'rest' && phase.roundIndex === 11);
    const finalWork = plan.phases.find((phase) => phase.phaseType === 'work' && phase.roundIndex === 12);

    if (lastWork === undefined || cooldown === undefined || previousRest === undefined || finalWork === undefined) {
      throw new Error('expected workout phases to exist');
    }

    const samples: HeartRateSample[] = [
      sampleAt(previousRest.startSec + 10, 118),
      sampleAt(finalWork.startSec + 2, 112),
      sampleAt(finalWork.startSec + 12, 138),
      sampleAt(lastWork.startSec + 12, 144),
      sampleAt(cooldown.startSec + 1, 111),
      sampleAt(cooldown.startSec + 3, 109),
      sampleAt(cooldown.startSec + 5, 110)
    ];

    const stats = analyzeIntervals(plan, samples, sessionStartMs);
    const lastStat = stats[12];

    expect(lastStat?.peakBpm).toBe(144);
    expect(lastStat?.troughBpm).toBe(110);
    expect(lastStat?.deltaBpm).toBe(34);
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
