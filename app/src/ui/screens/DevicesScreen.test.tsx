import { act, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppStateProvider, useAppState } from '../../application/session/AppStateContext';
import type { Profile } from '../../domain/shared/types';
import { DevicesScreen } from './DevicesScreen';

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

function DeviceHarness() {
  const {
    canOpenDevices,
    connectMonitor,
    deviceName,
    disconnectMonitor,
    isCurrentSessionCompromised,
    pauseSession,
    reconnectMonitor,
    stage,
    startSession,
  } = useAppState();

  return (
    <div>
      <button type="button" onClick={connectMonitor}>
        Harness Connect
      </button>
      <button type="button" onClick={startSession}>
        Harness Start
      </button>
      <button type="button" onClick={pauseSession}>
        Harness Pause
      </button>
      <button type="button" onClick={reconnectMonitor}>
        Harness Reconnect
      </button>
      <button type="button" onClick={disconnectMonitor}>
        Harness Disconnect
      </button>
      <p>Harness Stage: {stage}</p>
      <p>Harness Device: {deviceName ?? 'none'}</p>
      <p>Harness Devices Tab: {canOpenDevices ? 'enabled' : 'disabled'}</p>
      <p>Harness Compromised: {isCurrentSessionCompromised ? 'yes' : 'no'}</p>
    </div>
  );
}

describe('DevicesScreen', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows an unavailable state before a monitor connects', () => {
    render(
      <AppStateProvider>
        <DevicesScreen />
      </AppStateProvider>,
    );

    expect(screen.getByText('Unavailable')).toBeTruthy();
    expect(screen.getByText(/Connect a heart-rate monitor or start a session/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reconnect' })).toBeNull();
  });

  it('shows current device status when a monitor is connected', () => {
    render(
      <AppStateProvider>
        <DeviceHarness />
        <DevicesScreen />
      </AppStateProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Harness Connect' }));

    expect(screen.getByText('Polar OH1 36F91927')).toBeTruthy();
    expect(screen.getByText('Battery')).toBeTruthy();
    expect(screen.getByText('80%')).toBeTruthy();
    expect(screen.getByText('Live BPM')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeTruthy();
    expect(screen.getByText('Harness Devices Tab: enabled')).toBeTruthy();
  });

  it('hardwires the battery percentage in device-test mode', () => {
    render(
      <AppStateProvider deviceTestMode>
        <DeviceHarness />
        <DevicesScreen />
      </AppStateProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Harness Connect' }));

    expect(screen.getByText('33%')).toBeTruthy();
    expect(screen.getByText(/battery is hardwired to 33%/i)).toBeTruthy();
  });

  it('keeps a paused session resumable after reconnect', () => {
    vi.useFakeTimers();

    render(
      <AppStateProvider initialProfile={compactProfile} tickMs={10}>
        <DeviceHarness />
        <DevicesScreen />
      </AppStateProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Harness Connect' }));
    fireEvent.click(screen.getByRole('button', { name: 'Harness Start' }));

    for (let step = 0; step < 5; step += 1) {
      act(() => {
        vi.advanceTimersToNextTimer();
      });
    }

    fireEvent.click(screen.getByRole('button', { name: 'Harness Pause' }));

    expect(screen.getByText('Harness Stage: paused')).toBeTruthy();
    expect(screen.getByText('Polar OH1 36F91927')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }));

    expect(screen.getByText('Harness Stage: paused')).toBeTruthy();
    expect(screen.getByText('Polar H10 17A5B204')).toBeTruthy();
    expect(
      screen.getByText(/You can reconnect to a different device and still resume the workout/i),
    ).toBeTruthy();
  });

  it('disconnects and compromises an active session', () => {
    vi.useFakeTimers();

    render(
      <AppStateProvider initialProfile={compactProfile} tickMs={10}>
        <DeviceHarness />
        <DevicesScreen />
      </AppStateProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Harness Connect' }));
    fireEvent.click(screen.getByRole('button', { name: 'Harness Start' }));

    for (let step = 0; step < 5; step += 1) {
      act(() => {
        vi.advanceTimersToNextTimer();
      });
    }

    expect(screen.getByText('Harness Stage: running')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));

    expect(screen.getByText('Harness Stage: completed')).toBeTruthy();
    expect(screen.getByText('Harness Device: none')).toBeTruthy();
    expect(screen.getByText('Harness Compromised: yes')).toBeTruthy();
    expect(screen.getByText('Unavailable')).toBeTruthy();
  });
});
