import { beforeEach, describe, expect, it } from 'vitest';
import {
  AppSettingsRepository,
  closeDatabase,
  HeartRateSampleRepository,
  IntervalStatRepository,
  openDatabase,
  SessionRepository
} from '../infrastructure/storage/db';
import type {
  AppSettingsRecord,
  HeartRateSampleRecord,
  IntervalStatRecord,
  SessionRecord
} from '../infrastructure/storage/types';

function createSessionRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 'session-1',
    startedAt: '2026-03-30T00:00:00.000Z',
    completedAt: '2026-03-30T00:25:00.000Z',
    status: 'completed',
    workDurationSec: 20,
    warmupSec: 300,
    baseRestsSec: [90, 75, 60, 45, 35, 30, 30, 30, 30, 30, 30, 30],
    actualRestsSec: [100, 85, 70, 55, 45, 40, 40, 40, 40, 40, 40, 40],
    cooldownBaseSec: 180,
    totalPlannedDurationSec: 1220,
    roundsPlanned: 13,
    hasHeartRateData: true,
    hrCoverageComplete: true,
    isCompromised: false,
    comparisonEligible: true,
    analysisVersion: 1,
    deviceName: 'Polar H10',
    endedEarly: false,
    notes: null,
    ...overrides
  };
}

describe('storage repositories', () => {
  beforeEach(async () => {
    await indexedDB.deleteDatabase('hiit-master-rebuild');
  });

  it('saves and loads sessions in descending time order', async () => {
    const database = await openDatabase();
    const repository = new SessionRepository(database);

    await repository.save(createSessionRecord({ id: 'older', startedAt: '2026-03-29T00:00:00.000Z' }));
    await repository.save(createSessionRecord({ id: 'newer', startedAt: '2026-03-30T00:00:00.000Z' }));

    const sessions = await repository.listAll();

    expect(sessions.map((session) => session.id)).toEqual(['newer', 'older']);
    closeDatabase(database);
  });

  it('selects the previous comparison-eligible session', async () => {
    const database = await openDatabase();
    const repository = new SessionRepository(database);

    await repository.save(createSessionRecord({ id: 'ineligible', startedAt: '2026-03-31T00:00:00.000Z', comparisonEligible: false }));
    await repository.save(createSessionRecord({ id: 'eligible', startedAt: '2026-03-30T00:00:00.000Z', comparisonEligible: true }));

    const previous = await repository.getPreviousComparisonEligibleSession('current');

    expect(previous?.id).toBe('eligible');
    closeDatabase(database);
  });

  it('stores ordered heart-rate samples including missing samples', async () => {
    const database = await openDatabase();
    const repository = new HeartRateSampleRepository(database);
    const records: HeartRateSampleRecord[] = [
      { id: 'sample-2', sessionId: 'session-1', timestampMs: 2_000, bpm: null, isMissing: true },
      { id: 'sample-1', sessionId: 'session-1', timestampMs: 1_000, bpm: 120, isMissing: false }
    ];

    await repository.appendMany(records);
    const samples = await repository.listBySessionId('session-1');

    expect(samples.map((sample) => sample.id)).toEqual(['sample-1', 'sample-2']);
    expect(samples[1]?.isMissing).toBe(true);
    closeDatabase(database);
  });

  it('replaces interval stats for a session', async () => {
    const database = await openDatabase();
    const repository = new IntervalStatRepository(database);
    const firstSet: IntervalStatRecord[] = [
      { id: 'stat-1', sessionId: 'session-1', roundIndex: 0, peakBpm: 150, troughBpm: 120, deltaBpm: 30, analysisVersion: 1 }
    ];
    const secondSet: IntervalStatRecord[] = [
      { id: 'stat-2', sessionId: 'session-1', roundIndex: 0, peakBpm: 152, troughBpm: 119, deltaBpm: 33, analysisVersion: 1 },
      { id: 'stat-3', sessionId: 'session-1', roundIndex: 1, peakBpm: 154, troughBpm: 118, deltaBpm: 36, analysisVersion: 1 }
    ];

    await repository.replaceForSession('session-1', firstSet);
    await repository.replaceForSession('session-1', secondSet);
    const stats = await repository.listBySessionId('session-1');

    expect(stats.map((stat) => stat.id)).toEqual(['stat-2', 'stat-3']);
    closeDatabase(database);
  });

  it('saves and loads app settings', async () => {
    const database = await openDatabase();
    const repository = new AppSettingsRepository(database);
    const settings: AppSettingsRecord = { id: 'app_settings', lastWorkDurationSec: 22 };

    await repository.save(settings);
    const loaded = await repository.get();

    expect(loaded).toEqual(settings);
    closeDatabase(database);
  });
});
