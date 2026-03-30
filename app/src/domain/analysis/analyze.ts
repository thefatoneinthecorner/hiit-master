import type { HeartRateSample, IntervalStat } from './types';
import type { WorkoutPlan } from '../workout/types';
import { getRecoveryWindows, getWorkWindows } from '../workout/plan';

function toElapsedSec(timestampMs: number, sessionStartMs: number): number {
  return (timestampMs - sessionStartMs) / 1000;
}

function getValidBpmsInWindow(samples: HeartRateSample[], sessionStartMs: number, startSec: number, endSec: number): number[] {
  return samples
    .filter((sample) => sample.isMissing === false && sample.bpm !== null)
    .filter((sample) => {
      const elapsedSec = toElapsedSec(sample.timestampMs, sessionStartMs);
      return elapsedSec >= startSec && elapsedSec < endSec;
    })
    .map((sample) => sample.bpm)
    .filter((bpm): bpm is number => bpm !== null);
}

export function analyzeIntervals(plan: WorkoutPlan, samples: HeartRateSample[], sessionStartMs: number): IntervalStat[] {
  const workWindows = getWorkWindows(plan);
  const recoveryWindows = getRecoveryWindows(plan);

  return workWindows.map((workWindow) => {
    const recoveryWindow = recoveryWindows.find((candidateWindow) => candidateWindow.roundIndex === workWindow.roundIndex) ?? null;
    const peakBpms = getValidBpmsInWindow(samples, sessionStartMs, workWindow.startSec, workWindow.endSec);
    const troughBpms = recoveryWindow === null
      ? []
      : getValidBpmsInWindow(samples, sessionStartMs, recoveryWindow.startSec, recoveryWindow.endSec);

    const peakBpm = peakBpms.length > 0 ? Math.max(...peakBpms) : null;
    const troughBpm = troughBpms.length > 0 ? Math.min(...troughBpms) : null;
    const deltaBpm = peakBpm !== null && troughBpm !== null ? peakBpm - troughBpm : null;

    return {
      roundIndex: workWindow.roundIndex,
      peakBpm,
      troughBpm,
      deltaBpm
    };
  });
}
