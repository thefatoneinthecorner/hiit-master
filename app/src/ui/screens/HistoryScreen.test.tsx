import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { AppStateProvider } from '../../application/session/AppStateContext';
import type { SessionRecord } from '../../domain/shared/types';
import { HistoryScreen } from './HistoryScreen';

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: overrides.id ?? 'session-1',
    startedAt: overrides.startedAt ?? '2026-04-07T19:00:00.000Z',
    profileId: overrides.profileId ?? 'profile-my-profile',
    profileName: overrides.profileName ?? 'My Profile',
    actualWorkDurationSec: overrides.actualWorkDurationSec ?? 20,
    nominalWorkDurationSec: overrides.nominalWorkDurationSec ?? 30,
    status: overrides.status ?? 'completed',
    isCompromised: overrides.isCompromised ?? false,
    heartRateCoverageComplete: overrides.heartRateCoverageComplete ?? true,
    samples:
      overrides.samples ??
      [
        { elapsedSec: 0, bpm: 92 },
        { elapsedSec: 1, bpm: 105 },
        { elapsedSec: 2, bpm: 130 },
        { elapsedSec: 3, bpm: 116 },
        { elapsedSec: 4, bpm: 110 },
      ],
  };
}

describe('HistoryScreen', () => {
  it('shows session details and an empty histogram when there is no previous comparison session', () => {
    render(
      <AppStateProvider initialSessions={[makeSession()]}>
        <HistoryScreen />
      </AppStateProvider>,
    );

    expect(screen.getByText('History')).toBeTruthy();
    expect(screen.getByText(/Profile: My Profile/)).toBeTruthy();
    expect(screen.getByText('Heart Graph')).toBeTruthy();
    expect(screen.getByText('Recovery Delta Histogram')).toBeTruthy();
    expect(screen.getAllByText('Round').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Time').length).toBeGreaterThan(0);
    expect(screen.getByText('BPM')).toBeTruthy();
    expect(screen.getAllByText('Peak').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Trough').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Delta').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Delta Diff').length).toBeGreaterThan(0);
    expect(screen.getByText('Round Data')).toBeTruthy();
  });

  it('deletes the current session from history', () => {
    render(
      <AppStateProvider initialSessions={[makeSession()]}>
        <HistoryScreen />
      </AppStateProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete session' }));

    expect(screen.getByText(/No completed sessions yet/i)).toBeTruthy();
  });
});
