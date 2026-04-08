import type { SessionIntegrity, SessionRecord, SessionStatus } from '../shared/types';

export function isSessionActive(status: SessionStatus): boolean {
  return status === 'running' || status === 'paused';
}

export function isCountdownActive(status: SessionStatus): boolean {
  return status === 'countdown';
}

export function filterPlausibleBpm(bpm: number | null): number | null {
  if (bpm === null) {
    return null;
  }

  return bpm >= 25 && bpm <= 240 ? bpm : null;
}

export function deriveSessionIntegrity(
  status: Extract<SessionStatus, 'completed' | 'ended_early'>,
  isCompromised: boolean,
  hrCoverageComplete: boolean,
  analysis: Array<{ delta: number | null }>
): SessionIntegrity {
  const comparisonEligible =
    status === 'completed' &&
    !isCompromised &&
    hrCoverageComplete &&
    analysis.some((round) => round.delta !== null);

  return {
    isCompromised,
    hrCoverageComplete,
    comparisonEligible
  };
}

export function isComparisonEligibleSession(session: SessionRecord): boolean {
  return deriveSessionIntegrity(
    session.status,
    session.isCompromised,
    session.hrCoverageComplete,
    session.analysis
  ).comparisonEligible;
}
