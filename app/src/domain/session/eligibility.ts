import type { SessionRecord } from '../shared/types';

export function isComparisonEligible(session: SessionRecord) {
  return (
    session.status === 'completed' &&
    !session.isCompromised &&
    session.heartRateCoverageComplete &&
    session.samples.some((sample) => sample.bpm !== null)
  );
}

export function selectPreviousComparisonSession(
  currentSession: Pick<SessionRecord, 'id' | 'startedAt' | 'profileName'>,
  earlierSessions: readonly SessionRecord[],
) {
  return earlierSessions
    .filter(
      (session) =>
        session.id !== currentSession.id &&
        session.profileName === currentSession.profileName &&
        session.startedAt < currentSession.startedAt &&
        isComparisonEligible(session),
    )
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0];
}
