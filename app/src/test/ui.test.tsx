import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { act } from 'preact/test-utils';
import { describe, expect, it } from 'vitest';
import { WorkoutScreen } from '../ui/screens/WorkoutScreen';
import type { HeartRateMonitor, HeartRateMonitorCallbacks } from '../infrastructure/bluetooth/monitor';
import type { StorageRepositories } from '../infrastructure/storage/db';
import type {
  AppSettingsRecord,
  HeartRateSampleRecord,
  IntervalStatRecord,
  SessionProfileRecord,
  SessionRecord
} from '../infrastructure/storage/types';
import { createDefaultSessionProfile, DEFAULT_PROFILE_ID } from '../domain/workout/profile';

class FakeSessionRepository {
  records: SessionRecord[] = [];

  async save(record: SessionRecord): Promise<void> {
    this.records = [...this.records.filter((candidate) => candidate.id !== record.id), record];
  }

  async deleteById(id: string): Promise<void> {
    this.records = this.records.filter((record) => record.id !== id);
  }

  async getById(id: string): Promise<SessionRecord | null> {
    return this.records.find((record) => record.id === id) ?? null;
  }

  async listAll(): Promise<SessionRecord[]> {
    return [...this.records].sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt));
  }

  async getPreviousComparisonEligibleSession(currentSessionId: string): Promise<SessionRecord | null> {
    return (await this.listAll()).find((record) => record.id !== currentSessionId && record.comparisonEligible) ?? null;
  }
}

class FakeHeartRateSampleRepository {
  records: HeartRateSampleRecord[] = [];

  async append(record: HeartRateSampleRecord): Promise<void> {
    this.records.push(record);
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    this.records = this.records.filter((record) => record.sessionId !== sessionId);
  }

  async appendMany(records: HeartRateSampleRecord[]): Promise<void> {
    this.records.push(...records);
  }

  async listBySessionId(sessionId: string): Promise<HeartRateSampleRecord[]> {
    return this.records.filter((record) => record.sessionId === sessionId).sort((left, right) => left.timestampMs - right.timestampMs);
  }
}

class FakeIntervalStatRepository {
  records: IntervalStatRecord[] = [];

  async replaceForSession(sessionId: string, records: IntervalStatRecord[]): Promise<void> {
    this.records = [...this.records.filter((record) => record.sessionId !== sessionId), ...records];
  }

  async deleteBySessionId(sessionId: string): Promise<void> {
    this.records = this.records.filter((record) => record.sessionId !== sessionId);
  }

  async listBySessionId(sessionId: string): Promise<IntervalStatRecord[]> {
    return this.records.filter((record) => record.sessionId === sessionId).sort((left, right) => left.roundIndex - right.roundIndex);
  }
}

class FakeAppSettingsRepository {
  record: AppSettingsRecord | null;

  constructor(initialRecord: AppSettingsRecord | null) {
    this.record = initialRecord;
  }

  async save(record: AppSettingsRecord): Promise<void> {
    this.record = record;
  }

  async get(): Promise<AppSettingsRecord | null> {
    return this.record;
  }
}

class FakeSessionProfileRepository {
  records: SessionProfileRecord[];

  constructor(initialProfiles: SessionProfileRecord[]) {
    this.records = initialProfiles;
  }

  async listAll(): Promise<SessionProfileRecord[]> {
    return [...this.records];
  }

  async replaceAll(records: SessionProfileRecord[]): Promise<void> {
    this.records = [...records];
  }
}

class FakeHeartRateMonitor implements HeartRateMonitor {
  constructor(private readonly callbacks: HeartRateMonitorCallbacks) {}

  isSupported(): boolean {
    return true;
  }

  connectCount = 0;
  disconnectCount = 0;

  async connect(): Promise<void> {
    this.connectCount += 1;
    this.callbacks.onConnected('Polar H10');
  }

  async disconnect(): Promise<void> {
    this.disconnectCount += 1;
    await this.callbacks.onDisconnected();
  }

  async emitHeartRateSample(bpm: number): Promise<void> {
    await this.callbacks.onHeartRateSample(bpm);
  }

  async forceDisconnect(): Promise<void> {
    await this.callbacks.onDisconnected();
  }

  async dispose(): Promise<void> {}
}

function createStorage(initialSettings: AppSettingsRecord | null): StorageRepositories {
  return {
    sessions: new FakeSessionRepository() as unknown as StorageRepositories['sessions'],
    heartRateSamples: new FakeHeartRateSampleRepository() as unknown as StorageRepositories['heartRateSamples'],
    intervalStats: new FakeIntervalStatRepository() as unknown as StorageRepositories['intervalStats'],
    appSettings: new FakeAppSettingsRepository(initialSettings) as unknown as StorageRepositories['appSettings'],
    sessionProfiles: new FakeSessionProfileRepository([createDefaultSessionProfile(initialSettings?.lastWorkDurationSec ?? 35)]) as unknown as StorageRepositories['sessionProfiles']
  };
}

describe('WorkoutScreen', () => {
  it('restores the saved work duration and blocks start until a monitor is connected', async () => {
    const storage = createStorage({ id: 'app_settings', activeProfileId: DEFAULT_PROFILE_ID, lastWorkDurationSec: 35 });

    render(
      <WorkoutScreen
        storageFactory={async () => storage}
        monitorFactory={(callbacks) => new FakeHeartRateMonitor(callbacks)}
        now={() => Date.parse('2026-03-30T12:00:00.000Z')}
      />
    );

    expect(screen.queryByText('35s')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Start Session' })).toBeNull();

    fireEvent.click(await screen.findByRole('button', { name: 'Connect Heart-Rate Monitor' }));

    expect(await screen.findByText('35s')).toBeTruthy();

    const startButton = await screen.findByRole('button', { name: 'Start Session' });
    await waitFor(() => {
      expect(startButton.hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(startButton);

    expect(await screen.findByText('The session is live. Timer state, current BPM, live round deltas, and previous-session comparison are being driven from the session controller.', {}, { timeout: 5000 })).toBeTruthy();
    expect((await screen.findAllByText('running', {}, { timeout: 5000 })).length).toBeGreaterThan(0);
  });

  it('shows live BPM before the session starts and can reconnect the monitor', async () => {
    const storage = createStorage({ id: 'app_settings', activeProfileId: DEFAULT_PROFILE_ID, lastWorkDurationSec: 35 });
    let monitor: FakeHeartRateMonitor | null = null;

    render(
      <WorkoutScreen
        storageFactory={async () => storage}
        monitorFactory={(callbacks) => {
          monitor = new FakeHeartRateMonitor(callbacks);
          return monitor;
        }}
        now={() => Date.parse('2026-03-30T12:00:00.000Z')}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Connect Heart-Rate Monitor' }));

    await waitFor(() => {
      expect(screen.getByText('Monitor connected. Waiting for a live BPM sample before you start the session.')).toBeTruthy();
    });

    await act(async () => {
      await monitor!.emitHeartRateSample(76);
    });

    await waitFor(() => {
      expect(screen.getByText('76')).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reconnect Monitor' }));

    await waitFor(() => {
      expect(monitor?.disconnectCount).toBe(1);
      expect(monitor?.connectCount).toBe(2);
    });
  });

  it('renders a broken live trace when heart-rate coverage drops mid-session', async () => {
    const storage = createStorage({ id: 'app_settings', activeProfileId: DEFAULT_PROFILE_ID, lastWorkDurationSec: 35 });
    let nowMs = Date.parse('2026-03-30T12:00:00.000Z');
    let monitor: FakeHeartRateMonitor | null = null;

    render(
      <WorkoutScreen
        storageFactory={async () => storage}
        monitorFactory={(callbacks) => {
          monitor = new FakeHeartRateMonitor(callbacks);
          return monitor;
        }}
        now={() => nowMs}
      />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Connect Heart-Rate Monitor' }));
    const startButton = await screen.findByRole('button', { name: 'Start Session' });

    await waitFor(() => {
      expect(startButton.hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(startButton);
    expect(monitor).not.toBeNull();

    await screen.findByText('The session is live. Timer state, current BPM, live round deltas, and previous-session comparison are being driven from the session controller.', {}, { timeout: 5000 });

    await act(async () => {
      nowMs += 301_000;
      await monitor!.emitHeartRateSample(142);
      nowMs += 4_000;
      await monitor!.emitHeartRateSample(148);
      nowMs += 1_000;
      await monitor!.forceDisconnect();
      nowMs += 6_000;
      await monitor!.emitHeartRateSample(132);
    });

    await waitFor(() => {
      const chart = document.querySelector('.comparison-chart');
      expect(chart?.querySelectorAll('polyline').length).toBeGreaterThan(1);
    }, { timeout: 5000 });
  });

});
