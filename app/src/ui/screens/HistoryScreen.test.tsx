import { fireEvent, render, screen } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { AppStateProvider } from '../../application/session/AppStateContext';
import type { Profile, SessionRecord } from '../../domain/shared/types';
import { HistoryScreen } from './HistoryScreen';

function makeSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  const profileSnapshot: Profile =
    overrides.profileSnapshot ??
    {
      id: overrides.profileId ?? 'profile-my-profile',
      name: overrides.profileName ?? 'My Profile',
      workDurationSec: overrides.nominalWorkDurationSec ?? 30,
      nominalPeakHeartrate: 160,
      warmupSec: 120,
      baseRestsSec: [60, 50, 40, 30],
      cooldownBaseSec: 90,
      notes: '',
    };

  return {
    id: overrides.id ?? 'session-1',
    startedAt: overrides.startedAt ?? '2026-04-07T19:00:00.000Z',
    profileId: overrides.profileId ?? 'profile-my-profile',
    profileName: overrides.profileName ?? 'My Profile',
    profileSnapshot,
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

  it('uses the persisted session profile snapshot instead of the currently selected profile', () => {
    render(
      <AppStateProvider
        initialProfiles={[
          {
            id: 'profile-other',
            name: 'Other',
            workDurationSec: 18,
            nominalPeakHeartrate: 190,
            warmupSec: 30,
            baseRestsSec: [20],
            cooldownBaseSec: 30,
            notes: '',
          },
        ]}
        initialSessions={[
          makeSession({
            profileSnapshot: {
              id: 'profile-my-profile',
              name: 'My Profile',
              workDurationSec: 30,
              nominalPeakHeartrate: 160,
              warmupSec: 120,
              baseRestsSec: [60, 50, 40, 30],
              cooldownBaseSec: 90,
              notes: '',
            },
          }),
        ]}
      >
        <HistoryScreen />
      </AppStateProvider>,
    );

    expect(screen.getByText('160 bpm')).toBeTruthy();
    expect(screen.queryByText('190 bpm')).toBeNull();
  });
});
