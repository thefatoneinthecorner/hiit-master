import type { HeartRateSample, RoundAnalysis, WorkoutPlan } from '../shared/types';

function minBpmInWindow(samples: HeartRateSample[], startSec: number, endSec: number): number | null {
  const values = samples
    .filter((sample) => sample.bpm !== null && sample.elapsedSec >= startSec && sample.elapsedSec <= endSec)
    .map((sample) => sample.bpm as number);

  return values.length > 0 ? Math.min(...values) : null;
}

function maxBpmInWindow(samples: HeartRateSample[], startSec: number, endSec: number): number | null {
  const values = samples
    .filter((sample) => sample.bpm !== null && sample.elapsedSec >= startSec && sample.elapsedSec <= endSec)
    .map((sample) => sample.bpm as number);

  return values.length > 0 ? Math.max(...values) : null;
}

function findPhaseWindow(
  plan: WorkoutPlan,
  kind: 'work' | 'rest' | 'cooldown',
  roundIndex: number
): { startSec: number; endSec: number } {
  const phase = plan.phases.find((item) => item.kind === kind && item.roundIndex === roundIndex);

  if (!phase) {
    throw new Error(`Missing ${kind} phase for round ${roundIndex}`);
  }

  return {
    startSec: phase.startSec,
    endSec: phase.endSec
  };
}

function getLastTwoKnownTroughTimes(analyses: RoundAnalysis[]): number[] {
  return analyses
    .filter((analysis) => analysis.trough !== null)
    .map((analysis) => analysis.recoveryWindowEndSec)
    .slice(-2);
}

export function analyzeSessionRounds(plan: WorkoutPlan, samples: HeartRateSample[]): RoundAnalysis[] {
  const analyses: RoundAnalysis[] = [];

  for (const round of plan.rounds) {
    const workWindow = findPhaseWindow(plan, 'work', round.roundIndex);
    const isFinalRound = round.roundIndex === plan.rounds.length;
    const restWindow = isFinalRound
      ? findPhaseWindow(plan, 'cooldown', round.roundIndex)
      : findPhaseWindow(plan, 'rest', round.roundIndex);
    const peak = maxBpmInWindow(samples, workWindow.startSec, restWindow.endSec);

    let recoveryWindowStartSec = restWindow.startSec;
    let recoveryWindowEndSec = restWindow.endSec;

    if (!isFinalRound) {
      const nextWorkWindow = findPhaseWindow(plan, 'work', round.roundIndex + 1);
      recoveryWindowEndSec = nextWorkWindow.endSec;
    } else {
      const previousTroughMarkers = getLastTwoKnownTroughTimes(analyses);
      if (previousTroughMarkers.length === 2) {
        const previousMarker = previousTroughMarkers[0] as number;
        const currentMarker = previousTroughMarkers[1] as number;
        const finalInterTroughGap = currentMarker - previousMarker;
        recoveryWindowEndSec = Math.min(
          plan.totalDurationSec,
          recoveryWindowStartSec + Math.max(0, finalInterTroughGap - plan.nominalWorkDurationSec)
        );
      }
    }

    const trough = minBpmInWindow(samples, recoveryWindowStartSec, recoveryWindowEndSec);
    analyses.push({
      roundIndex: round.roundIndex,
      peak,
      trough,
      delta: peak !== null && trough !== null ? peak - trough : null,
      recoveryWindowStartSec,
      recoveryWindowEndSec
    });
  }

  return analyses;
}

export function getScrubPointData(
  samples: HeartRateSample[],
  elapsedSec: number
): { elapsedSec: number; bpm: number | null } {
  const sortedSamples = [...samples].sort((a, b) => a.elapsedSec - b.elapsedSec);
  let current = sortedSamples[0] ?? { elapsedSec: 0, bpm: null };

  for (const sample of sortedSamples) {
    if (sample.elapsedSec > elapsedSec) {
      break;
    }
    current = sample;
  }

  return current;
}
