export type Profile = {
  id: string;
  name: string;
  workDurationSec: number;
  nominalPeakHeartrate: number;
  warmupSec: number;
  baseRestsSec: number[];
  cooldownBaseSec: number;
  notes: string;
};

export type SessionStatus = 'completed' | 'ended_early' | 'running' | 'paused';

export type HeartRateSample = {
  elapsedSec: number;
  bpm: number | null;
};

export type SessionRecord = {
  id: string;
  startedAt: string;
  profileId: string;
  profileName: string;
  profileSnapshot: Profile;
  actualWorkDurationSec: number;
  nominalWorkDurationSec: number;
  status: SessionStatus;
  isCompromised: boolean;
  heartRateCoverageComplete: boolean;
  samples: HeartRateSample[];
};
