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
  SessionRecord
} from '../infrastructure/storage/types';

class FakeSessionRepository {
  records: SessionRecord[] = [];

  async save(record: SessionRecord): Promise<void> {
    this.records = [...this.records.filter((candidate) => candidate.id !== record.id), record];
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

class FakeHeartRateMonitor implements HeartRateMonitor {
  constructor(private readonly callbacks: HeartRateMonitorCallbacks) {}

  isSupported(): boolean {
    return true;
  }

  async connect(): Promise<void> {
    this.callbacks.onConnected('Polar H10');
  }

  async disconnect(): Promise<void> {
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
    appSettings: new FakeAppSettingsRepository(initialSettings) as unknown as StorageRepositories['appSettings']
  };
}

describe('WorkoutScreen', () => {
  it('restores the saved work duration and blocks start until a monitor is connected', async () => {
    const storage = createStorage({ id: 'app_settings', lastWorkDurationSec: 35 });

    render(
      <WorkoutScreen
        storageFactory={async () => storage}
        monitorFactory={(callbacks) => new FakeHeartRateMonitor(callbacks)}
        now={() => Date.parse('2026-03-30T12:00:00.000Z')}
      />
    );

    expect(await screen.findByText('35s')).toBeTruthy();

    const startButton = await screen.findByRole('button', { name: 'Start Session' });
    expect(startButton.hasAttribute('disabled')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Connect Heart-Rate Monitor' }));

    await waitFor(() => {
      expect(startButton.hasAttribute('disabled')).toBe(false);
    });

    fireEvent.click(startButton);

    expect(await screen.findByText('The session is live. Timer state, current BPM, live round deltas, and previous-session comparison are being driven from the session controller.')).toBeTruthy();
    expect((await screen.findAllByText('running')).length).toBeGreaterThan(0);
  });

  it('renders a broken live trace when heart-rate coverage drops mid-session', async () => {
    const storage = createStorage({ id: 'app_settings', lastWorkDurationSec: 35 });
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
    });
  });
});
