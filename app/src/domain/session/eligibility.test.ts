import { describe, expect, it } from 'vitest';
import { isComparisonEligible, selectPreviousComparisonSession } from './eligibility';
import type { SessionRecord } from '../shared/types';

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    startedAt: overrides.startedAt ?? '2026-04-01T10:00:00.000Z',
    profileId: overrides.profileId ?? 'profile-1',
    profileName: overrides.profileName ?? 'My Profile',
    actualWorkDurationSec: overrides.actualWorkDurationSec ?? 20,
    nominalWorkDurationSec: overrides.nominalWorkDurationSec ?? 30,
    status: overrides.status ?? 'completed',
    isCompromised: overrides.isCompromised ?? false,
    heartRateCoverageComplete: overrides.heartRateCoverageComplete ?? true,
    samples: overrides.samples ?? [{ elapsedSec: 1, bpm: 120 }],
  };
}

describe('comparison eligibility', () => {
  it('rejects compromised, ended early, or incomplete-coverage sessions', () => {
    expect(isComparisonEligible(makeSession())).toBe(true);
    expect(isComparisonEligible(makeSession({ isCompromised: true }))).toBe(false);
    expect(isComparisonEligible(makeSession({ status: 'ended_early' }))).toBe(false);
    expect(isComparisonEligible(makeSession({ heartRateCoverageComplete: false }))).toBe(false);
  });

  it('selects the most recent eligible session on the same profile', () => {
    const current = makeSession({ id: 'current', startedAt: '2026-04-07T10:00:00.000Z' });
    const selected = selectPreviousComparisonSession(current, [
      makeSession({ id: 'a', startedAt: '2026-04-05T10:00:00.000Z', isCompromised: true }),
      makeSession({ id: 'b', startedAt: '2026-04-06T10:00:00.000Z', profileName: 'Bike' }),
      makeSession({ id: 'c', startedAt: '2026-04-04T10:00:00.000Z' }),
      makeSession({ id: 'd', startedAt: '2026-04-06T09:00:00.000Z' }),
    ]);

    expect(selected?.id).toBe('d');
  });
});
