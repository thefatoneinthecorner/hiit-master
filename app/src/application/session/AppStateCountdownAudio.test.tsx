import { act, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppStateProvider, useAppState } from './AppStateContext';
import type { CountdownAudioController } from '../audio/countdownAudio';

function CountdownAudioHarness() {
  const { connectMonitor, stage, startSession } = useAppState();

  return (
    <div>
      <button type="button" onClick={connectMonitor}>
        Harness Connect
      </button>
      <button type="button" onClick={startSession}>
        Harness Start
      </button>
      <p>Harness Stage: {stage}</p>
    </div>
  );
}

describe('AppStateProvider countdown audio', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('plays the startup countdown cue once when a session enters countdown and stops it when countdown exits', async () => {
    vi.useFakeTimers();
    const stopCountdownCue = vi.fn();
    const countdownAudioController: CountdownAudioController = {
      playCountdownCue: vi.fn(() => stopCountdownCue),
    };

    render(
      <AppStateProvider countdownAudioController={countdownAudioController} tickMs={10}>
        <CountdownAudioHarness />
      </AppStateProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Harness Connect' }));
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Harness Start' }));

    await waitFor(() => {
      expect(screen.getByText('Harness Stage: countdown')).toBeTruthy();
    });
    expect(countdownAudioController.playCountdownCue).toHaveBeenCalledTimes(1);

    for (let step = 0; step < 4; step += 1) {
      act(() => {
        vi.advanceTimersToNextTimer();
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Harness Stage: running')).toBeTruthy();
    });
    expect(stopCountdownCue).toHaveBeenCalledTimes(1);
  });
});
