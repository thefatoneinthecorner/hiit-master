import type { HeartRateSample } from '../shared/types';

export type RoundWindow = {
  roundIndex: number;
  workStartSec: number;
  workEndSec: number;
  recoveryStartSec: number;
  nextWorkEndSec: number | null;
};

export type RoundRecoveryStats = {
  roundIndex: number;
  peak: number | null;
  trough: number | null;
  delta: number | null;
  revealAtSec: number | null;
};

export function analyzeRoundRecoveries(
  samples: readonly HeartRateSample[],
  roundWindows: readonly RoundWindow[],
  nominalWorkDurationSec: number,
): RoundRecoveryStats[] {
  const sortedSamples = [...samples].sort((left, right) => left.elapsedSec - right.elapsedSec);
  const results: RoundRecoveryStats[] = [];
  const troughTimes: number[] = [];

  for (const window of roundWindows) {
    const peak = getPeak(sortedSamples, window.workStartSec, window.workEndSec);

    const recoveryEndSec =
      window.nextWorkEndSec === null
        ? deriveFinalRecoveryEndSec(window, troughTimes, nominalWorkDurationSec)
        : window.nextWorkEndSec;

    const troughSample = getTroughSample(sortedSamples, window.recoveryStartSec, recoveryEndSec);
    const trough = troughSample?.bpm ?? null;

    if (troughSample) {
      troughTimes.push(troughSample.elapsedSec);
    }

    results.push({
      roundIndex: window.roundIndex,
      peak,
      trough,
      delta: peak !== null && trough !== null ? peak - trough : null,
      revealAtSec: recoveryEndSec,
    });
  }

  return results;
}

function getPeak(
  samples: readonly HeartRateSample[],
  startSec: number,
  endSec: number,
) {
  const values = samples
    .filter((sample) => sample.bpm !== null && sample.elapsedSec >= startSec && sample.elapsedSec < endSec)
    .map((sample) => sample.bpm as number);

  return values.length > 0 ? Math.max(...values) : null;
}

function getTroughSample(
  samples: readonly HeartRateSample[],
  startSec: number,
  endSec: number,
) {
  const values = samples.filter(
    (sample) => sample.bpm !== null && sample.elapsedSec >= startSec && sample.elapsedSec <= endSec,
  );

  if (values.length === 0) {
    return null;
  }

  return values.reduce((lowest, sample) => ((sample.bpm as number) < (lowest.bpm as number) ? sample : lowest));
}

function deriveFinalRecoveryEndSec(
  window: RoundWindow,
  troughTimes: readonly number[],
  nominalWorkDurationSec: number,
) {
  if (troughTimes.length < 2) {
    return window.recoveryStartSec + nominalWorkDurationSec;
  }

  const lastTroughSec = troughTimes[troughTimes.length - 1] as number;
  const previousTroughSec = troughTimes[troughTimes.length - 2] as number;
  const finalInterTroughGapSec = lastTroughSec - previousTroughSec;
  const estimatedRecoveryDurationSec = Math.max(1, finalInterTroughGapSec - nominalWorkDurationSec);

  return window.recoveryStartSec + Math.min(nominalWorkDurationSec, estimatedRecoveryDurationSec);
}

export function buildDiffDeltas(
  current: readonly Pick<RoundRecoveryStats, 'roundIndex' | 'delta'>[],
  previous: readonly Pick<RoundRecoveryStats, 'roundIndex' | 'delta'>[],
) {
  const previousByRound = new Map(previous.map((entry) => [entry.roundIndex, entry.delta]));

  return current.map((entry) => {
    const previousDelta = previousByRound.get(entry.roundIndex) ?? null;

    return {
      roundIndex: entry.roundIndex,
      currentDelta: entry.delta,
      previousDelta,
      diffDelta:
        entry.delta !== null && previousDelta !== null ? entry.delta - previousDelta : null,
    };
  });
}
