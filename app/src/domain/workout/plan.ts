import {
  BASE_RESTS_SEC,
  COOLDOWN_BASE_SEC,
  MAX_WORK_DURATION_SEC,
  MIN_WORK_DURATION_SEC,
  ROUNDS_PLANNED,
  WARMUP_SEC
} from './constants';
import type { PhaseAtElapsed, PhaseSegment, RecoveryWindow, WorkoutPlan, WorkWindow } from './types';

export function calculateActualRestSec(baseRestSec: number, workDurationSec: number): number {
  return Math.max(5, baseRestSec + 30 - workDurationSec);
}

export function clampWorkDurationSec(workDurationSec: number): number {
  return Math.min(MAX_WORK_DURATION_SEC, Math.max(MIN_WORK_DURATION_SEC, workDurationSec));
}

export function createWorkoutPlan(workDurationSec: number): WorkoutPlan {
  const clampedWorkDurationSec = clampWorkDurationSec(workDurationSec);
  const actualRestsSec = BASE_RESTS_SEC.map((baseRestSec) => calculateActualRestSec(baseRestSec, clampedWorkDurationSec));
  const cooldownSec = calculateActualRestSec(COOLDOWN_BASE_SEC, clampedWorkDurationSec);
  const phases: PhaseSegment[] = [];

  let elapsedSec = 0;
  phases.push({ phaseType: 'warmup', roundIndex: null, startSec: elapsedSec, endSec: elapsedSec + WARMUP_SEC });
  elapsedSec += WARMUP_SEC;

  for (let roundIndex = 0; roundIndex < ROUNDS_PLANNED; roundIndex += 1) {
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
    warmupSec: WARMUP_SEC,
    baseRestsSec: [...BASE_RESTS_SEC],
    actualRestsSec,
    cooldownSec,
    totalDurationSec: elapsedSec,
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
