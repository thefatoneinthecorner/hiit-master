import type { HeartRateSample, IntervalStat } from './types';
import type { WorkoutPlan } from '../workout/types';
import { getRecoveryWindows, getWorkWindows } from '../workout/plan';

interface TimedSample {
  elapsedSec: number;
  bpm: number;
}

function toElapsedSec(timestampMs: number, sessionStartMs: number): number {
  return (timestampMs - sessionStartMs) / 1000;
}

function getValidSamples(samples: HeartRateSample[], sessionStartMs: number): TimedSample[] {
  return samples
    .filter((sample) => sample.isMissing === false && sample.bpm !== null)
    .map((sample) => ({
      elapsedSec: toElapsedSec(sample.timestampMs, sessionStartMs),
      bpm: sample.bpm as number
    }))
    .sort((left, right) => left.elapsedSec - right.elapsedSec);
}

function getSamplesInWindow(samples: TimedSample[], startSec: number, endSec: number): TimedSample[] {
  return samples.filter((sample) => sample.elapsedSec >= startSec && sample.elapsedSec < endSec);
}

function getPeakBpm(samples: TimedSample[], startSec: number, endSec: number): number | null {
  const windowSamples = getSamplesInWindow(samples, startSec, endSec);
  return windowSamples.length === 0 ? null : Math.max(...windowSamples.map((sample) => sample.bpm));
}

function getMinSample(samples: TimedSample[], startSec: number, endSec: number): TimedSample | null {
  const windowSamples = getSamplesInWindow(samples, startSec, endSec);
  if (windowSamples.length === 0) {
    return null;
  }

  return windowSamples.reduce((lowest, sample) => sample.bpm < lowest.bpm ? sample : lowest);
}

function estimateBpmAtElapsedSec(samples: TimedSample[], targetSec: number): number | null {
  if (samples.length === 0) {
    return null;
  }

  const exactSample = samples.find((sample) => sample.elapsedSec === targetSec);
  if (exactSample !== undefined) {
    return exactSample.bpm;
  }

  const nextIndex = samples.findIndex((sample) => sample.elapsedSec > targetSec);
  if (nextIndex <= 0) {
    const first = samples[0];
    const second = samples[1];
    if (first === undefined) {
      return null;
    }
    if (second === undefined) {
      return first.bpm;
    }
    return interpolateBpm(first, second, targetSec);
  }

  const previous = samples[nextIndex - 1];
  const next = samples[nextIndex];
  if (previous !== undefined && next !== undefined) {
    return interpolateBpm(previous, next, targetSec);
  }

  const last = samples[samples.length - 1];
  const beforeLast = samples[samples.length - 2];
  if (last === undefined) {
    return null;
  }
  if (beforeLast === undefined) {
    return last.bpm;
  }
  return interpolateBpm(beforeLast, last, targetSec);
}

function interpolateBpm(left: TimedSample, right: TimedSample, targetSec: number): number {
  if (right.elapsedSec === left.elapsedSec) {
    return left.bpm;
  }

  const ratio = (targetSec - left.elapsedSec) / (right.elapsedSec - left.elapsedSec);
  return left.bpm + ((right.bpm - left.bpm) * ratio);
}

export function analyzeIntervals(plan: WorkoutPlan, samples: HeartRateSample[], sessionStartMs: number): IntervalStat[] {
  const validSamples = getValidSamples(samples, sessionStartMs);
  const workWindows = getWorkWindows(plan);
  const recoveryWindows = getRecoveryWindows(plan);

  return workWindows.map((workWindow, roundIndex, workArray) => {
    const recoveryWindow = recoveryWindows.find((candidateWindow) => candidateWindow.roundIndex === workWindow.roundIndex) ?? null;
    const nextWorkWindow = workArray[roundIndex + 1] ?? null;

    const peakWindowEndSec = recoveryWindow?.endSec ?? plan.totalDurationSec;
    const peakBpm = getPeakBpm(validSamples, workWindow.startSec, peakWindowEndSec);

    let troughBpm: number | null = null;

    if (recoveryWindow !== null && nextWorkWindow !== null) {
      const troughSample = getMinSample(validSamples, recoveryWindow.startSec, nextWorkWindow.endSec);
      troughBpm = troughSample?.bpm ?? null;
    } else if (recoveryWindow === null && roundIndex > 0) {
      const previousRecoveryWindow = recoveryWindows.find((candidateWindow) => candidateWindow.roundIndex === workWindow.roundIndex - 1) ?? null;
      if (previousRecoveryWindow !== null) {
        const previousNextWorkStartSec = workWindow.startSec;
        const previousTroughSample = getMinSample(validSamples, previousRecoveryWindow.startSec, workWindow.endSec);
        if (previousTroughSample !== null) {
          const troughOffsetSec = previousTroughSample.elapsedSec - previousNextWorkStartSec;
          const estimatedTroughSec = (plan.totalDurationSec - plan.cooldownSec) + troughOffsetSec;
          const estimatedBpm = estimateBpmAtElapsedSec(validSamples, estimatedTroughSec);
          troughBpm = estimatedBpm === null ? null : Math.round(estimatedBpm);
        }
      }
    }

    const deltaBpm = peakBpm !== null && troughBpm !== null ? peakBpm - troughBpm : null;

    return {
      roundIndex: workWindow.roundIndex,
      peakBpm,
      troughBpm,
      deltaBpm
    };
  });
}
