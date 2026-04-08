import { act, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppStateProvider, useAppState } from '../../application/session/AppStateContext';
import type { Profile } from '../../domain/shared/types';
import type {
  ConnectedMonitor,
  HeartRateMonitorAdapter,
  MonitorEventHandlers,
} from '../../infrastructure/bluetooth/heartRateMonitorAdapter';
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

function createControlledLiveMonitorAdapter() {
  let handlers: MonitorEventHandlers | null = null;

  const adapter: HeartRateMonitorAdapter = {
    mode: 'live',
    connect: async (nextHandlers): Promise<ConnectedMonitor> => {
      handlers = nextHandlers;

      return {
        batteryPercent: 76,
        deviceId: 'ble-monitor-1',
        name: 'BLE Monitor',
      };
    },
    disconnect: async () => {
      handlers = null;
    },
  };

  return {
    adapter,
    emitDisconnect() {
      handlers?.onDisconnect();
    },
  };
}

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

  it('shows current device status when a monitor is connected', async () => {
    render(
      <AppStateProvider>
        <DeviceHarness />
        <DevicesScreen />
      </AppStateProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Harness Connect' }));

    await waitFor(() => {
      expect(screen.getByText('Polar OH1 36F91927')).toBeTruthy();
    });
    expect(screen.getByText('Polar OH1 36F91927')).toBeTruthy();
    expect(screen.getByText('Battery')).toBeTruthy();
    expect(screen.getByText('80%')).toBeTruthy();
    expect(screen.getByText('Live BPM')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeTruthy();
    expect(screen.getByText('Harness Devices Tab: enabled')).toBeTruthy();
  });

  it('hardwires the battery percentage in device-test mode', async () => {
    render(
      <AppStateProvider deviceTestMode>
        <DeviceHarness />
        <DevicesScreen />
      </AppStateProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Harness Connect' }));

    await waitFor(() => {
      expect(screen.getByText('33%')).toBeTruthy();
    });
    expect(screen.getByText('33%')).toBeTruthy();
    expect(screen.getByText(/battery is hardwired to 33%/i)).toBeTruthy();
  });

  it('keeps a paused session resumable after reconnect', async () => {
    vi.useFakeTimers();

    render(
      <AppStateProvider initialProfile={compactProfile} tickMs={10}>
        <DeviceHarness />
        <DevicesScreen />
      </AppStateProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Harness Connect' }));
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Harness Start' }));

    for (let step = 0; step < 5; step += 1) {
      act(() => {
        vi.advanceTimersToNextTimer();
      });
    }

    fireEvent.click(screen.getByRole('button', { name: 'Harness Pause' }));

    expect(screen.getByText('Harness Stage: paused')).toBeTruthy();
    expect(screen.getByText('Polar OH1 36F91927')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reconnect' }));
      await Promise.resolve();
    });
    expect(screen.getByText('Harness Stage: paused')).toBeTruthy();
    expect(screen.getByText('Polar H10 17A5B204')).toBeTruthy();
    expect(
      screen.getByText(/You can reconnect to a different device and still resume the workout/i),
    ).toBeTruthy();
  });

  it('disconnects and compromises an active session', async () => {
    vi.useFakeTimers();

    render(
      <AppStateProvider initialProfile={compactProfile} tickMs={10}>
        <DeviceHarness />
        <DevicesScreen />
      </AppStateProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Harness Connect' }));
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(screen.getByText('Harness Devices Tab: enabled')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Harness Start' }));

    for (let step = 0; step < 5; step += 1) {
      act(() => {
        vi.advanceTimersToNextTimer();
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Harness Stage: running')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));

    await waitFor(() => {
      expect(screen.getByText('Harness Stage: completed')).toBeTruthy();
    });
    expect(screen.getByText('Harness Device: none')).toBeTruthy();
    expect(screen.getByText('Harness Compromised: yes')).toBeTruthy();
    expect(screen.getByText('Unavailable')).toBeTruthy();
  });

  it('shows active-session reconnect guidance after an unexpected monitor loss', async () => {
    vi.useFakeTimers();
    const monitor = createControlledLiveMonitorAdapter();

    render(
      <AppStateProvider initialProfile={compactProfile} monitorAdapter={monitor.adapter} tickMs={10}>
        <DeviceHarness />
        <DevicesScreen />
      </AppStateProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Harness Connect' }));
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Harness Start' }));

    for (let step = 0; step < 5; step += 1) {
      act(() => {
        vi.advanceTimersToNextTimer();
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Harness Stage: running')).toBeTruthy();
    });

    act(() => {
      monitor.emitDisconnect();
    });

    await waitFor(() => {
      expect(screen.getByText(/The workout is still active, but heart-rate coverage is compromised until you reconnect a monitor/i)).toBeTruthy();
    });
    expect(screen.getByText('Connection Lost')).toBeTruthy();
  });
});
