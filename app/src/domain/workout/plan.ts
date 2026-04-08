import type { SessionProfile, WorkoutPhaseSegment, WorkoutPlan, WorkoutPhaseKind } from '../shared/types';

function buildPhase(
  kind: WorkoutPhaseKind,
  label: string,
  roundIndex: number | null,
  startSec: number,
  durationSec: number
): WorkoutPhaseSegment {
  return {
    key: `${kind}-${roundIndex ?? 'x'}-${startSec}`,
    kind,
    roundIndex,
    startSec,
    endSec: startSec + durationSec,
    durationSec,
    label
  };
}

export function createWorkoutPlan(profile: SessionProfile, actualWorkDurationSec: number): WorkoutPlan {
  const workDeltaSec = profile.workDurationSec - actualWorkDurationSec;
  const rounds = profile.baseRestsSec.map((baseRestSec, index) => {
    const adjustedRestSec = baseRestSec + workDeltaSec;
    return {
      roundIndex: index + 1,
      workDurationSec: actualWorkDurationSec,
      restDurationSec: adjustedRestSec,
      nominalRoundDurationSec: profile.workDurationSec + baseRestSec
    };
  });

  const phases: WorkoutPhaseSegment[] = [];
  let cursorSec = 0;

  phases.push(buildPhase('warmup', 'Warmup', null, cursorSec, profile.warmupSec));
  cursorSec += profile.warmupSec;

  for (const round of rounds) {
    phases.push(buildPhase('work', `Round ${round.roundIndex}`, round.roundIndex, cursorSec, round.workDurationSec));
    cursorSec += round.workDurationSec;

    const isFinalRound = round.roundIndex === rounds.length;
    phases.push(
      buildPhase(
        isFinalRound ? 'cooldown' : 'rest',
        isFinalRound ? 'Cooldown' : `Round ${round.roundIndex}`,
        round.roundIndex,
        cursorSec,
        isFinalRound ? profile.cooldownBaseSec + round.restDurationSec : round.restDurationSec
      )
    );
    cursorSec += isFinalRound ? profile.cooldownBaseSec + round.restDurationSec : round.restDurationSec;
  }

  return {
    nominalWorkDurationSec: profile.workDurationSec,
    actualWorkDurationSec,
    warmupSec: profile.warmupSec,
    cooldownSec: profile.cooldownBaseSec,
    rounds,
    phases,
    totalDurationSec: cursorSec
  };
}

export function getPhaseAtElapsedSec(plan: WorkoutPlan, elapsedSec: number): WorkoutPhaseSegment {
  const clampedElapsedSec = Math.max(0, Math.min(plan.totalDurationSec, elapsedSec));
  const phase =
    plan.phases.find((item) => clampedElapsedSec >= item.startSec && clampedElapsedSec < item.endSec) ??
    plan.phases.at(-1);

  if (!phase) {
    throw new Error('Workout plan must contain at least one phase');
  }

  return phase;
}
