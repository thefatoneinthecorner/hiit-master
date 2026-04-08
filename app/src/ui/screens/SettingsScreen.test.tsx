import { act, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppStateProvider } from '../../application/session/AppStateContext';
import type { Profile, SessionRecord } from '../../domain/shared/types';
import { HistoryScreen } from './HistoryScreen';
import { SettingsScreen } from './SettingsScreen';
import { downloadBackupFile } from '../../infrastructure/storage/backupFile';

vi.mock('../../infrastructure/storage/backupFile', async () => {
  const actual = await vi.importActual<typeof import('../../infrastructure/storage/backupFile')>(
    '../../infrastructure/storage/backupFile',
  );

  return {
    ...actual,
    downloadBackupFile: vi.fn(),
  };
});

const ellipticalProfile: Profile = {
  id: 'profile-elliptical',
  name: 'Elliptical',
  workDurationSec: 24,
  nominalPeakHeartrate: 152,
  warmupSec: 90,
  baseRestsSec: [40, 35, 30],
  cooldownBaseSec: 75,
  notes: 'Cross trainer',
};

const starterSession: SessionRecord = {
  id: 'session-1',
  startedAt: '2026-04-07T19:00:00.000Z',
  profileId: 'profile-my-profile',
  profileName: 'My Profile',
  profileSnapshot: {
    id: 'profile-my-profile',
    name: 'My Profile',
    workDurationSec: 30,
    nominalPeakHeartrate: 160,
    warmupSec: 120,
    baseRestsSec: [60, 50, 40, 30],
    cooldownBaseSec: 90,
    notes: 'Starter profile',
  },
  actualWorkDurationSec: 20,
  nominalWorkDurationSec: 30,
  status: 'completed',
  isCompromised: false,
  heartRateCoverageComplete: true,
  samples: [
    { elapsedSec: 0, bpm: 92 },
    { elapsedSec: 1, bpm: 105 },
    { elapsedSec: 2, bpm: 130 },
    { elapsedSec: 3, bpm: 116 },
    { elapsedSec: 4, bpm: 110 },
  ],
};

describe('SettingsScreen', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('shows import export and the starter profile by default', () => {
    render(
      <AppStateProvider>
        <SettingsScreen />
      </AppStateProvider>,
    );

    expect(screen.getByRole('button', { name: 'Import' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export' })).toBeTruthy();
    expect(screen.getByDisplayValue('My Profile')).toBeTruthy();
    expect(screen.getByText('Selected Profile')).toBeTruthy();
  });

  it('exports and imports backup data through a file flow', async () => {
    render(
      <AppStateProvider initialProfiles={[{ ...ellipticalProfile, id: 'profile-my-profile', name: 'My Profile' }, ellipticalProfile]}>
        <SettingsScreen />
      </AppStateProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(downloadBackupFile).toHaveBeenCalledTimes(1);
    const exported = vi.mocked(downloadBackupFile).mock.calls[0]?.[0] ?? '';
    expect(exported).toContain('"profiles"');
    expect(exported).toContain('"Elliptical"');

    fireEvent.input(screen.getByDisplayValue('My Profile'), { target: { value: 'Temporary Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(screen.getByDisplayValue('Temporary Name')).toBeTruthy();

    const backupInput = screen.getByLabelText('Backup File') as HTMLInputElement;
    const backupFile = new File([exported], 'backup.json', { type: 'application/json' });

    fireEvent.change(backupInput, { target: { files: [backupFile] } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('My Profile')).toBeTruthy();
    });
    expect(screen.getByText('Backup imported.')).toBeTruthy();
    expect(screen.getByText(/Selected backup: backup\.json/i)).toBeTruthy();
  });

  it('lets the user select a different profile and uses it for the next session', () => {
    render(
      <AppStateProvider initialProfiles={[{ ...ellipticalProfile, id: 'profile-my-profile', name: 'My Profile' }, ellipticalProfile]}>
        <SettingsScreen />
      </AppStateProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Elliptical/ }));

    expect(screen.getAllByText('Selected Profile').length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Elliptical')).toBeTruthy();
    expect(screen.getByDisplayValue('Cross trainer')).toBeTruthy();
  });

  it('copies a profile with a unique name', () => {
    render(
      <AppStateProvider>
        <SettingsScreen />
      </AppStateProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy Profile' }));

    expect(screen.getByRole('button', { name: /My Profile Copy/ })).toBeTruthy();
    expect(screen.getByDisplayValue('My Profile Copy')).toBeTruthy();
  });

  it('keeps timing fields read-only for referenced profiles and updates session names when renamed', () => {
    render(
      <AppStateProvider initialSessions={[starterSession]}>
        <SettingsScreen />
        <HistoryScreen />
      </AppStateProvider>,
    );

    expect(screen.getByText(/Timing fields are read-only because saved sessions already reference this profile/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Warmup' }));

    const stepperButtons = screen.getAllByRole('button', { name: '-' });
    expect(stepperButtons[0]?.hasAttribute('disabled')).toBe(true);

    fireEvent.input(screen.getByDisplayValue('My Profile'), { target: { value: 'Elliptical' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(screen.getByText(/Profile: Elliptical/)).toBeTruthy();
  });

  it('blocks deleting the last remaining profile', () => {
    render(
      <AppStateProvider>
        <SettingsScreen />
      </AppStateProvider>,
    );

    expect(screen.getByRole('button', { name: 'Delete Profile' }).hasAttribute('disabled')).toBe(true);
  });

  it('supports long-press repetition on steppers for editable profiles', () => {
    vi.useFakeTimers();

    render(
      <AppStateProvider>
        <SettingsScreen />
      </AppStateProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Warmup' }));

    const decrementButton = screen.getAllByRole('button', { name: '-' })[0] as HTMLElement;
    expect(screen.getAllByText('120s').length).toBeGreaterThan(0);

    fireEvent.pointerDown(decrementButton);

    act(() => {
      vi.advanceTimersByTime(400);
    });

    fireEvent.pointerUp(decrementButton);

    expect(screen.getAllByText('114s').length).toBeGreaterThan(0);
  });

  it('marks recovery rows as expanded when opened and reveals their controls', () => {
    render(
      <AppStateProvider>
        <SettingsScreen />
      </AppStateProvider>,
    );

    const warmupToggle = screen.getByRole('button', { name: 'Warmup' });
    fireEvent.click(warmupToggle);

    expect(warmupToggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('button', { name: '-' }).length).toBeGreaterThan(0);

    const roundToggle = screen.getByRole('button', { name: 'Round 1' });
    fireEvent.click(roundToggle);

    expect(roundToggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('button', { name: 'Clone' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
  });
});
