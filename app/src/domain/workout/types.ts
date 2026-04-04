export type PhaseType = 'warmup' | 'work' | 'rest' | 'cooldown';

export interface PhaseSegment {
  phaseType: PhaseType;
  roundIndex: number | null;
  startSec: number;
  endSec: number;
}

export interface WorkoutPlan {
  workDurationSec: number;
  warmupSec: number;
  baseRestsSec: number[];
  actualRestsSec: number[];
  cooldownSec: number;
  totalDurationSec: number;
  roundsPlanned: number;
  phases: PhaseSegment[];
}

export interface WorkoutProfileTiming {
  workDurationSec: number;
  warmupSec: number;
  baseRestsSec: number[];
  cooldownBaseSec: number;
}

export interface WorkWindow {
  roundIndex: number;
  startSec: number;
  endSec: number;
}

export interface RecoveryWindow {
  roundIndex: number;
  startSec: number;
  endSec: number;
}

export interface PhaseAtElapsed {
  phase: PhaseSegment | null;
  isComplete: boolean;
}
