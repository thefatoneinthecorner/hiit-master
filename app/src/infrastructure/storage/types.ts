import type { SessionStatus } from '../../domain/session/types';

export interface SessionRecord {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: SessionStatus;
  profileName: string;
  workDurationSec: number;
  warmupSec: number;
  baseRestsSec: number[];
  actualRestsSec: number[];
  cooldownBaseSec: number;
  totalPlannedDurationSec: number;
  roundsPlanned: number;
  hasHeartRateData: boolean;
  hrCoverageComplete: boolean;
  isCompromised: boolean;
  comparisonEligible: boolean;
  analysisVersion: number;
  deviceName: string | null;
  endedEarly: boolean;
  notes: string | null;
}

export interface HeartRateSampleRecord {
  id: string;
  sessionId: string;
  timestampMs: number;
  bpm: number | null;
  isMissing: boolean;
}

export interface IntervalStatRecord {
  id: string;
  sessionId: string;
  roundIndex: number;
  peakBpm: number | null;
  troughBpm: number | null;
  deltaBpm: number | null;
  analysisVersion: number;
}

export interface AppSettingsRecord {
  id: 'app_settings';
  activeProfileId: string;
  lastWorkDurationSec?: number;
}

export interface SessionProfileRecord {
  id: string;
  name: string;
  workDurationSec: number;
  warmupSec: number;
  baseRestsSec: number[];
  cooldownBaseSec: number;
  notes: string | null;
  isDefault: boolean;
}

export interface StorageBackupRecord {
  version: 1;
  exportedAt: string;
  sessions: SessionRecord[];
  heartRateSamples: HeartRateSampleRecord[];
  intervalStats: IntervalStatRecord[];
  appSettings: AppSettingsRecord | null;
  sessionProfiles: SessionProfileRecord[];
}
