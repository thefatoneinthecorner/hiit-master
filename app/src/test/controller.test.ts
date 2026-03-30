import { describe, expect, it } from 'vitest';
import { WorkoutSessionController } from '../application/session/controller';
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
  record: AppSettingsRecord | null = null;

  async save(record: AppSettingsRecord): Promise<void> {
    this.record = record;
  }

  async get(): Promise<AppSettingsRecord | null> {
    return this.record;
  }
}

function createStorage(): StorageRepositories {
  return {
    sessions: new FakeSessionRepository() as unknown as StorageRepositories['sessions'],
    heartRateSamples: new FakeHeartRateSampleRepository() as unknown as StorageRepositories['heartRateSamples'],
    intervalStats: new FakeIntervalStatRepository() as unknown as StorageRepositories['intervalStats'],
    appSettings: new FakeAppSettingsRepository() as unknown as StorageRepositories['appSettings']
  };
}

describe('WorkoutSessionController', () => {
  it('blocks session start until heart rate is connected', async () => {
    const controller = new WorkoutSessionController({
      storage: createStorage(),
      createId: (() => {
        let counter = 0;
        return () => `id-${counter += 1}`;
      })()
    });

    await expect(controller.startSession(20, Date.parse('2026-03-30T00:00:00.000Z'))).rejects.toThrow(
      'Cannot start session without a connected heart-rate monitor'
    );
  });

  it('starts a session and persists session metadata', async () => {
    const storage = createStorage();
    const controller = new WorkoutSessionController({
      storage,
      createId: (() => {
        let counter = 0;
        return () => `id-${counter += 1}`;
      })()
    });

    controller.connectHeartRate('Polar H10');
    await controller.startSession(20, Date.parse('2026-03-30T00:00:00.000Z'));

    const state = controller.getState();
    const sessions = await storage.sessions.listAll();

    expect(state.controllerStatus).toBe('running');
    expect(state.hrConnectionStatus).toBe('connected');
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.workDurationSec).toBe(20);
  });

  it('marks the session compromised and records missing samples during dropout', async () => {
    const storage = createStorage();
    const controller = new WorkoutSessionController({
      storage,
      createId: (() => {
        let counter = 0;
        return () => `id-${counter += 1}`;
      })()
    });

    controller.connectHeartRate('Polar H10');
    const startedAtMs = Date.parse('2026-03-30T00:00:00.000Z');
    await controller.startSession(20, startedAtMs);
    await controller.recordHeartRateSample(startedAtMs + 301_000, 140);
    await controller.disconnectHeartRate(startedAtMs + 302_000);
    await controller.tick(303, startedAtMs + 303_000);

    const state = controller.getState();
    const samples = await storage.heartRateSamples.listBySessionId(state.sessionId!);

    expect(state.isCompromised).toBe(true);
    expect(samples.some((sample) => sample.isMissing)).toBe(true);
  });

  it('continues on the same timeline after reconnect and completes as ineligible when compromised', async () => {
    const storage = createStorage();
    const controller = new WorkoutSessionController({
      storage,
      createId: (() => {
        let counter = 0;
        return () => `id-${counter += 1}`;
      })()
    });

    controller.connectHeartRate('Polar H10');
    const startedAtMs = Date.parse('2026-03-30T00:00:00.000Z');
    await controller.startSession(20, startedAtMs);
    await controller.recordHeartRateSample(startedAtMs + 301_000, 145);
    await controller.disconnectHeartRate(startedAtMs + 302_000);
    controller.reconnectHeartRate('Polar H10');
    await controller.recordHeartRateSample(startedAtMs + 390_000, 118);
    await controller.tick(2000, startedAtMs + 2_000_000);

    const state = controller.getState();
    const sessions = await storage.sessions.listAll();

    expect(state.controllerStatus).toBe('completed');
    expect(state.comparisonEligible).toBe(false);
    expect(sessions[0]?.comparisonEligible).toBe(false);
    expect(sessions[0]?.isCompromised).toBe(true);
  });
});
