import { act, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppStateProvider, useAppState } from './AppStateContext';
import type { Profile } from '../../domain/shared/types';
import type {
  ConnectedMonitor,
  HeartRateMonitorAdapter,
  MonitorEventHandlers,
} from '../../infrastructure/bluetooth/heartRateMonitorAdapter';

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
  let connectionCount = 0;

  const adapter: HeartRateMonitorAdapter = {
    mode: 'live',
    connect: async (nextHandlers): Promise<ConnectedMonitor> => {
      handlers = nextHandlers;
      connectionCount += 1;

      return {
        batteryPercent: 76,
        deviceId: `ble-monitor-${connectionCount}`,
        name: connectionCount === 1 ? 'BLE Monitor Alpha' : 'BLE Monitor Beta',
      };
    },
    disconnect: async () => {
      handlers = null;
    },
  };

  return {
    adapter,
    emitSample(bpm: number) {
      handlers?.onSample(bpm);
    },
    emitDisconnect() {
      handlers?.onDisconnect();
    },
  };
}

function BluetoothLifecycleHarness() {
  const {
    connectMonitor,
    currentSamples,
    historySessions,
    isCurrentSessionCompromised,
    reconnectMonitor,
    deviceName,
    stage,
    startSession,
  } = useAppState();

  const latestHistorySession = historySessions[0] ?? null;

  return (
    <div>
      <button type="button" onClick={connectMonitor}>
        Harness Connect
      </button>
      <button type="button" onClick={startSession}>
        Harness Start
      </button>
      <button type="button" onClick={reconnectMonitor}>
        Harness Reconnect
      </button>
      <p>Harness Stage: {stage}</p>
      <p>Harness Device: {deviceName ?? 'none'}</p>
      <p>Harness Compromised: {isCurrentSessionCompromised ? 'yes' : 'no'}</p>
      <p>Harness Samples: {JSON.stringify(currentSamples)}</p>
      <p>
        Harness Saved Coverage:{' '}
        {latestHistorySession === null ? 'none' : latestHistorySession.heartRateCoverageComplete ? 'complete' : 'incomplete'}
      </p>
      <p>
        Harness Saved Compromised:{' '}
        {latestHistorySession === null ? 'none' : latestHistorySession.isCompromised ? 'yes' : 'no'}
      </p>
    </div>
  );
}

describe('AppStateProvider bluetooth lifecycle', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists null gap samples across an unexpected live-monitor dropout and saves incomplete coverage', async () => {
    vi.useFakeTimers();
    const monitor = createControlledLiveMonitorAdapter();

    render(
      <AppStateProvider initialProfile={compactProfile} monitorAdapter={monitor.adapter} tickMs={10}>
        <BluetoothLifecycleHarness />
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
      monitor.emitSample(138);
    });

    act(() => {
      vi.advanceTimersToNextTimer();
    });

    act(() => {
      monitor.emitDisconnect();
    });

    await waitFor(() => {
      expect(screen.getByText('Harness Compromised: yes')).toBeTruthy();
    });

    for (let step = 0; step < 3; step += 1) {
      act(() => {
        vi.advanceTimersToNextTimer();
      });
    }

    expect(screen.getByText(/"elapsedSec":1,"bpm":138/)).toBeTruthy();
    expect(screen.getByText(/"elapsedSec":2,"bpm":null/)).toBeTruthy();
    expect(screen.getByText(/"elapsedSec":3,"bpm":null/)).toBeTruthy();
    expect(screen.getByText(/"elapsedSec":4,"bpm":null/)).toBeTruthy();

    for (let step = 0; step < 6; step += 1) {
      act(() => {
        vi.advanceTimersToNextTimer();
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Harness Stage: completed')).toBeTruthy();
    });

    expect(screen.getByText('Harness Saved Coverage: incomplete')).toBeTruthy();
    expect(screen.getByText('Harness Saved Compromised: yes')).toBeTruthy();
  });

  it('keeps a compromised active session running through reconnect and resumes live sampling', async () => {
    vi.useFakeTimers();
    const monitor = createControlledLiveMonitorAdapter();

    render(
      <AppStateProvider initialProfile={compactProfile} monitorAdapter={monitor.adapter} tickMs={10}>
        <BluetoothLifecycleHarness />
      </AppStateProvider>,
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Harness Connect' }));
      await Promise.resolve();
    });

    expect(screen.getByText('Harness Device: BLE Monitor Alpha')).toBeTruthy();

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
      monitor.emitSample(142);
    });

    act(() => {
      vi.advanceTimersToNextTimer();
    });

    act(() => {
      monitor.emitDisconnect();
    });

    await waitFor(() => {
      expect(screen.getByText('Harness Device: none')).toBeTruthy();
    });
    expect(screen.getByText('Harness Compromised: yes')).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Harness Reconnect' }));
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText('Harness Device: BLE Monitor Beta')).toBeTruthy();
    });
    expect(screen.getByText('Harness Stage: running')).toBeTruthy();
    expect(screen.getByText('Harness Compromised: yes')).toBeTruthy();

    act(() => {
      vi.advanceTimersToNextTimer();
    });

    act(() => {
      monitor.emitSample(136);
    });

    expect(screen.getByText(/"elapsedSec":1,"bpm":142/)).toBeTruthy();
    expect(screen.getByText(/"elapsedSec":2,"bpm":null/)).toBeTruthy();
    expect(screen.getByText(/"elapsedSec":3,"bpm":136/)).toBeTruthy();
  });
});
