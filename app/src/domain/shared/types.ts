export type SessionStatus =
  | 'idle'
  | 'connecting_hr'
  | 'ready'
  | 'countdown'
  | 'running'
  | 'paused'
  | 'completed'
  | 'ended_early'
  | 'error';

export type WorkoutPhaseKind = 'countdown' | 'warmup' | 'work' | 'rest' | 'cooldown';
export type SettingsMode = 'duration' | 'bpm';

/** An exercise profile */
export interface SessionProfile {
  id: string;
  name: string;
  workDurationSec: number;
  nominalPeakHeartrate: number;
  bpmTargets?: BPMRoundTarget[];
  warmupSec: number; /** in seconds */
  baseRestsSec: number[];
  cooldownBaseSec: number;
  notes: string;
}

export interface BPMRoundTarget {
  minBpm: number;
  maxBpm: number;
}

export interface WorkoutRoundPlan {
  roundIndex: number;
  workDurationSec: number;
  restDurationSec: number;
  nominalRoundDurationSec: number;
}

export interface WorkoutPhaseSegment {
  key: string;
  kind: WorkoutPhaseKind;
  roundIndex: number | null;
  startSec: number;
  endSec: number;
  durationSec: number;
  label: string;
}

export interface WorkoutPlan {
  nominalWorkDurationSec: number;
  actualWorkDurationSec: number;
  warmupSec: number;
  cooldownSec: number;
  rounds: WorkoutRoundPlan[];
  phases: WorkoutPhaseSegment[];
  totalDurationSec: number;
}

export interface HeartRateSample {
  elapsedSec: number;
  bpm: number | null;
}

export interface RoundAnalysis {
  roundIndex: number;
  peak: number | null;
  trough: number | null;
  delta: number | null;
  recoveryWindowStartSec: number;
  recoveryWindowEndSec: number;
}

export interface SessionRecord {
  id: string;
  startedAt: string;
  endedAt: string | null;
  name: string;
  profileId: string;
  profileName: string;
  profileSnapshot: SessionProfile;
  actualWorkDurationSec: number;
  settingsMode?: SettingsMode;
  status: Extract<SessionStatus, 'completed' | 'ended_early'>;
  isCompromised: boolean;
  hrCoverageComplete: boolean;
  plan: WorkoutPlan;
  samples: HeartRateSample[];
  analysis: RoundAnalysis[];
}

export interface ComparisonRound {
  roundIndex: number;
  currentDelta: number | null;
  previousDelta: number | null;
  diffDelta: number | null;
}

export interface SessionIntegrity {
  isCompromised: boolean;
  hrCoverageComplete: boolean;
  comparisonEligible: boolean;
}
