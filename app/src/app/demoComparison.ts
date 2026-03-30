import type { ComparisonRound } from '../domain/comparison/types';
import { createComparisonRounds } from '../domain/comparison/select';
import type { IntervalStat } from '../domain/analysis/types';
import type { IntervalStatRecord, SessionRecord } from '../infrastructure/storage/types';

const CURRENT_PEAKS = [117, 123, 128, 132, 135, 140, 142, 144, 145, 145, 145, 145, 146];
const CURRENT_TROUGHS = [85, 95, 110, 118, 120, 130, 132, 135, 135, 135, 136, 135, 135];
const PREVIOUS_PEAKS = [117, 124, 128, 132, 135, 140, 142, 144, 145, 145, 145, 145, 146];
const PREVIOUS_TROUGHS = [85, 95, 111, 118, 120, 130, 132, 136, 135, 137, 136, 134, 135];

export interface DemoComparisonFixture {
  enabled: boolean;
  currentStats: IntervalStat[];
  previousStats: IntervalStatRecord[];
  comparisonRounds: ComparisonRound[];
  currentSession: SessionRecord;
  previousSession: SessionRecord;
}

export function isDemoComparisonEnabled(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get('demo_comparison') === '1';
}

export function createDemoComparisonFixture(): DemoComparisonFixture {
  const currentStats = createIntervalStats(CURRENT_PEAKS, CURRENT_TROUGHS);
  const previousStats = createIntervalStatRecords('demo-previous-session', PREVIOUS_PEAKS, PREVIOUS_TROUGHS);

  return {
    enabled: true,
    currentStats,
    previousStats,
    comparisonRounds: createComparisonRounds(currentStats, previousStats),
    currentSession: createDemoSession('demo-current-session', 'Demo current session'),
    previousSession: createDemoSession('demo-previous-session', 'Demo comparison fixture')
  };
}

function createDemoSession(id: string, notes: string): SessionRecord {
  return {
      id,
      startedAt: '2026-03-29T12:00:00.000Z',
      completedAt: '2026-03-29T12:23:05.000Z',
      status: 'completed',
      workDurationSec: 35,
      warmupSec: 300,
      baseRestsSec: [90, 75, 60, 45, 35, 30, 30, 30, 30, 30, 30, 30],
      actualRestsSec: [85, 70, 55, 40, 30, 25, 25, 25, 25, 25, 25, 25],
      cooldownBaseSec: 175,
      totalPlannedDurationSec: 1385,
      roundsPlanned: 13,
      hasHeartRateData: true,
      hrCoverageComplete: true,
      isCompromised: false,
      comparisonEligible: true,
      analysisVersion: 1,
      deviceName: 'Demo Polar H10',
      endedEarly: false,
      notes
    };
}

function createIntervalStats(peaks: number[], troughs: number[]): IntervalStat[] {
  return peaks.map((peakBpm, roundIndex) => {
    const troughBpm = troughs[roundIndex] ?? null;
    return {
      roundIndex,
      peakBpm,
      troughBpm,
      deltaBpm: troughBpm === null ? null : peakBpm - troughBpm
    };
  });
}

function createIntervalStatRecords(sessionId: string, peaks: number[], troughs: number[]): IntervalStatRecord[] {
  return createIntervalStats(peaks, troughs).map((stat) => ({
    id: sessionId + '-round-' + String(stat.roundIndex + 1),
    sessionId,
    roundIndex: stat.roundIndex,
    peakBpm: stat.peakBpm,
    troughBpm: stat.troughBpm,
    deltaBpm: stat.deltaBpm,
    analysisVersion: 1
  }));
}
