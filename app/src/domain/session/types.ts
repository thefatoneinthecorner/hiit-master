export type SessionStatus = 'ready' | 'countdown' | 'running' | 'paused' | 'completed' | 'ended_early' | 'failed';

export interface SessionSummary {
  id: string;
  startedAt: string;
  status: SessionStatus;
  isCompromised: boolean;
  comparisonEligible: boolean;
  workDurationSec: number;
  endedEarly?: boolean;
  hrCoverageComplete?: boolean;
}
