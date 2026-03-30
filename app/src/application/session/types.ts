import type { HeartRateSample, IntervalStat } from '../../domain/analysis/types';
import type { PhaseType, WorkoutPlan } from '../../domain/workout/types';
import type { SessionStatus } from '../../domain/session/types';

export type HeartRateConnectionStatus = 'disconnected' | 'connected';
export type ControllerStatus = 'idle' | SessionStatus;

export interface WorkoutSessionControllerState {
  controllerStatus: ControllerStatus;
  sessionId: string | null;
  sessionStartedAtMs: number | null;
  workDurationSec: number | null;
  elapsedSec: number;
  currentPhaseType: PhaseType | null;
  currentRoundIndex: number | null;
  isComplete: boolean;
  isPaused: boolean;
  isCompromised: boolean;
  comparisonEligible: boolean;
  hrConnectionStatus: HeartRateConnectionStatus;
  connectedDeviceName: string | null;
  currentBpm: number | null;
  previousComparisonSessionId: string | null;
  workoutPlan: WorkoutPlan | null;
  currentIntervalStats: IntervalStat[];
  currentHeartRateSamples: HeartRateSample[];
}
