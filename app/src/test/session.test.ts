import { describe, expect, it } from 'vitest';
import { isComparisonEligible, markSessionCompromised } from '../domain/session/rules';

describe('session eligibility', () => {
  it('marks completed clean sessions as comparison-eligible', () => {
    expect(
      isComparisonEligible({
        status: 'completed',
        endedEarly: false,
        isCompromised: false,
        hrCoverageComplete: true,
        intervalsWithDeltaCount: 3
      })
    ).toBe(true);
  });

  it('rejects compromised or incomplete sessions', () => {
    expect(
      isComparisonEligible({
        status: 'completed',
        endedEarly: false,
        isCompromised: true,
        hrCoverageComplete: true,
        intervalsWithDeltaCount: 3
      })
    ).toBe(false);

    expect(
      isComparisonEligible({
        status: 'ended_early',
        endedEarly: true,
        isCompromised: false,
        hrCoverageComplete: true,
        intervalsWithDeltaCount: 3
      })
    ).toBe(false);
  });

  it('marks a session compromised and not eligible', () => {
    const updated = markSessionCompromised({
      id: 'session-1',
      startedAt: '2026-03-30T00:00:00.000Z',
      status: 'running',
      isCompromised: false,
      comparisonEligible: true,
      workDurationSec: 20,
      hrCoverageComplete: true
    });

    expect(updated.isCompromised).toBe(true);
    expect(updated.comparisonEligible).toBe(false);
    expect(updated.hrCoverageComplete).toBe(false);
  });
});
