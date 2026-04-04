import {
  BASE_RESTS_SEC,
  COOLDOWN_BASE_SEC,
  MAX_WORK_DURATION_SEC,
  MIN_WORK_DURATION_SEC,
  WARMUP_SEC
} from './constants';
import type { PhaseAtElapsed, PhaseSegment, RecoveryWindow, WorkoutPlan, WorkWindow, WorkoutProfileTiming } from './types';

export function calculateActualRestSec(baseRestSec: number, workDurationSec: number): number {
  return Math.max(5, baseRestSec + 30 - workDurationSec);
}

export function clampWorkDurationSec(workDurationSec: number): number {
  return Math.min(MAX_WORK_DURATION_SEC, Math.max(MIN_WORK_DURATION_SEC, workDurationSec));
}

export function createWorkoutPlan(workout: number | WorkoutProfileTiming): WorkoutPlan {
  const profile = typeof workout === 'number'
    ? {
      workDurationSec: workout,
      warmupSec: WARMUP_SEC,
      baseRestsSec: [...BASE_RESTS_SEC],
      cooldownBaseSec: COOLDOWN_BASE_SEC
    }
    : workout;
  const clampedWorkDurationSec = clampWorkDurationSec(profile.workDurationSec);
  const actualRestsSec = profile.baseRestsSec.map((baseRestSec) => calculateActualRestSec(baseRestSec, clampedWorkDurationSec));
  const cooldownSec = calculateActualRestSec(profile.cooldownBaseSec, clampedWorkDurationSec);
  const phases: PhaseSegment[] = [];
  const roundsPlanned = profile.baseRestsSec.length + 1;

  let elapsedSec = 0;
  phases.push({ phaseType: 'warmup', roundIndex: null, startSec: elapsedSec, endSec: elapsedSec + profile.warmupSec });
  elapsedSec += profile.warmupSec;

  for (let roundIndex = 0; roundIndex < roundsPlanned; roundIndex += 1) {
    phases.push({ phaseType: 'work', roundIndex, startSec: elapsedSec, endSec: elapsedSec + clampedWorkDurationSec });
    elapsedSec += clampedWorkDurationSec;

    if (roundIndex < actualRestsSec.length) {
      const restSec = actualRestsSec[roundIndex] ?? 0;
      phases.push({ phaseType: 'rest', roundIndex, startSec: elapsedSec, endSec: elapsedSec + restSec });
      elapsedSec += restSec;
    }
  }

  phases.push({ phaseType: 'cooldown', roundIndex: null, startSec: elapsedSec, endSec: elapsedSec + cooldownSec });
  elapsedSec += cooldownSec;

  return {
    workDurationSec: clampedWorkDurationSec,
    warmupSec: profile.warmupSec,
    baseRestsSec: [...profile.baseRestsSec],
    actualRestsSec,
    cooldownSec,
    totalDurationSec: elapsedSec,
    roundsPlanned,
    phases
  };
}

export function getPhaseAtElapsedSec(plan: WorkoutPlan, elapsedSec: number): PhaseAtElapsed {
  if (elapsedSec < 0) {
    return { phase: plan.phases[0] ?? null, isComplete: false };
  }

  const phase = plan.phases.find((candidatePhase) => elapsedSec >= candidatePhase.startSec && elapsedSec < candidatePhase.endSec) ?? null;
  if (phase !== null) {
    return { phase, isComplete: false };
  }

  return { phase: null, isComplete: elapsedSec >= plan.totalDurationSec };
}

export function getWorkWindows(plan: WorkoutPlan): WorkWindow[] {
  return plan.phases
    .filter((phase): phase is PhaseSegment & { phaseType: 'work'; roundIndex: number } => phase.phaseType === 'work' && phase.roundIndex !== null)
    .map((phase) => ({ roundIndex: phase.roundIndex, startSec: phase.startSec, endSec: phase.endSec }));
}

export function getRecoveryWindows(plan: WorkoutPlan): RecoveryWindow[] {
  return plan.phases
    .filter((phase): phase is PhaseSegment & { phaseType: 'rest'; roundIndex: number } => phase.phaseType === 'rest' && phase.roundIndex !== null)
    .map((phase) => ({ roundIndex: phase.roundIndex, startSec: phase.startSec, endSec: phase.endSec }));
}
