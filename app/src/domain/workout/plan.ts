import type { Profile } from '../shared/types';

export type WorkoutPhaseKind = 'warmup' | 'work' | 'recovery' | 'cooldown';

export type WorkoutPhase = {
  kind: WorkoutPhaseKind;
  label: string;
  roundIndex: number | null;
  startSec: number;
  endSec: number;
  durationSec: number;
};

export type WorkoutPlan = {
  actualWorkDurationSec: number;
  phases: WorkoutPhase[];
  totalDurationSec: number;
};

export function buildWorkoutPlan(profile: Profile, actualWorkDurationSec: number): WorkoutPlan {
  const adjustmentSec = profile.workDurationSec - actualWorkDurationSec;
  let cursorSec = 0;
  const phases: WorkoutPhase[] = [];

  phases.push(makePhase('warmup', 'Warmup', null, cursorSec, profile.warmupSec));
  cursorSec += profile.warmupSec;

  profile.baseRestsSec.forEach((baseRecoverySec, index) => {
    const roundLabel = `Round ${index + 1}`;
    phases.push(makePhase('work', roundLabel, index + 1, cursorSec, actualWorkDurationSec));
    cursorSec += actualWorkDurationSec;

    const recoveryDurationSec =
      index === profile.baseRestsSec.length - 1
        ? profile.cooldownBaseSec + adjustmentSec
        : baseRecoverySec + adjustmentSec;

    phases.push(
      makePhase(
        index === profile.baseRestsSec.length - 1 ? 'cooldown' : 'recovery',
        index === profile.baseRestsSec.length - 1 ? 'Cooldown' : `Recovery ${index + 1}`,
        index + 1,
        cursorSec,
        recoveryDurationSec,
      ),
    );
    cursorSec += recoveryDurationSec;
  });

  return {
    actualWorkDurationSec,
    phases,
    totalDurationSec: cursorSec,
  };
}

function makePhase(
  kind: WorkoutPhaseKind,
  label: string,
  roundIndex: number | null,
  startSec: number,
  durationSec: number,
): WorkoutPhase {
  return {
    kind,
    label,
    roundIndex,
    startSec,
    endSec: startSec + durationSec,
    durationSec,
  };
}
