import type { SessionStatus, SessionSummary } from './types';

export interface SessionEligibilityInput {
  status: SessionStatus;
  endedEarly: boolean;
  isCompromised: boolean;
  hrCoverageComplete: boolean;
  intervalsWithDeltaCount: number;
}

export function isComparisonEligible(input: SessionEligibilityInput): boolean {
  return input.status === 'completed'
    && input.endedEarly === false
    && input.isCompromised === false
    && input.hrCoverageComplete === true
    && input.intervalsWithDeltaCount > 0;
}

export function markSessionCompromised(session: SessionSummary): SessionSummary {
  return {
    ...session,
    isCompromised: true,
    comparisonEligible: false,
    hrCoverageComplete: false
  };
}
