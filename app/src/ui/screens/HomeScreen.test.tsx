import { act, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppStateProvider } from '../../application/session/AppStateContext';
import type { Profile } from '../../domain/shared/types';
import { HomeScreen } from './HomeScreen';

const compactProfile: Profile = {
  id: 'profile-test',
  name: 'Compact',
  workDurationSec: 3,
  nominalPeakHeartrate: 150,
  warmupSec: 2,
  baseRestsSec: [2],
  cooldownBaseSec: 2,
  notes: '',
};

describe('HomeScreen', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a sparse disconnected state before a monitor connects', () => {
    render(
      <AppStateProvider>
        <HomeScreen />
      </AppStateProvider>,
    );

    expect(screen.getByRole('button', { name: 'Connect' })).toBeTruthy();
    expect(screen.queryByText('Live BPM')).toBeNull();
    expect(screen.queryByText('Round')).toBeNull();
    expect(screen.queryByText('Remaining')).toBeNull();
  });

  it('shows connected setup details after connecting', async () => {
    render(
      <AppStateProvider>
        <HomeScreen />
      </AppStateProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
    });
    expect(screen.getByText('Live BPM')).toBeTruthy();
    expect(screen.getByText('Selected Profile')).toBeTruthy();
    expect(screen.getByText('Actual Work Duration')).toBeTruthy();
    expect(screen.getByText('20s')).toBeTruthy();
  });

  it('shows the session layout immediately during countdown and advances the countdown timer', async () => {
    vi.useFakeTimers();

    render(
      <AppStateProvider>
        <HomeScreen />
      </AppStateProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => {
      expect(screen.getByText(/Countdown 4/i)).toBeTruthy();
    });
    expect(screen.getAllByText('Warmup').length).toBeGreaterThan(0);
    expect(screen.getByText('Remaining')).toBeTruthy();
    expect(screen.getByText('Heart Graph')).toBeTruthy();
    expect(screen.getByText('Recovery Delta Histogram')).toBeTruthy();
    expect(screen.getByText('Recovery Snapshot')).toBeTruthy();
    expect(screen.getAllByText('Delta').length).toBeGreaterThan(0);

    act(() => {
      vi.advanceTimersToNextTimer();
    });

    await waitFor(() => {
      expect(screen.getByText(/Countdown 3/i)).toBeTruthy();
    });
  });

  it('advances through the workout and exposes completed-session actions', async () => {
    vi.useFakeTimers();

    render(
      <AppStateProvider initialProfile={compactProfile} tickMs={10}>
        <HomeScreen />
      </AppStateProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    for (let step = 0; step < 16; step += 1) {
      act(() => {
        vi.advanceTimersToNextTimer();
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeTruthy();
    });
    expect(screen.getByText(/Tap a graph below to inspect this session in History/i)).toBeTruthy();
    expect(screen.getByText(/No prior comparison session yet/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Return To Setup' })).toBeTruthy();
  });
});
