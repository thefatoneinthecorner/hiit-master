import type { ComparisonRound } from '../domain/comparison/types';
import { createComparisonRounds } from '../domain/comparison/select';
import type { HeartRateSample, IntervalStat } from '../domain/analysis/types';
import type { IntervalStatRecord, SessionRecord } from '../infrastructure/storage/types';

const CURRENT_PEAKS = [117, 123, 128, 132, 135, 140, 142, 144, 145, 145, 145, 145, 146];
const CURRENT_TROUGHS = [85, 95, 110, 118, 120, 130, 132, 135, 135, 135, 136, 135, 135];
const PREVIOUS_PEAKS = [117, 124, 128, 132, 135, 140, 142, 144, 145, 145, 145, 145, 146];
const PREVIOUS_TROUGHS = [85, 95, 111, 118, 120, 130, 132, 136, 135, 137, 136, 134, 135];

export interface DemoComparisonFixture {
  enabled: boolean;
  currentStats: IntervalStat[];
  currentSamples: HeartRateSample[];
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

  const currentSession = createDemoSession('demo-current-session', 'Demo current session');
  const previousSession = createDemoSession('demo-previous-session', 'Demo comparison fixture');

  return {
    enabled: true,
    currentStats,
    currentSamples: createDemoHeartRateSamples(currentSession, CURRENT_PEAKS, CURRENT_TROUGHS),
    previousStats,
    comparisonRounds: createComparisonRounds(currentStats, previousStats),
    currentSession,
    previousSession
  };
}

function createDemoHeartRateSamples(session: SessionRecord, peaks: number[], troughs: number[]): HeartRateSample[] {
  const startedAtMs = Date.parse(session.startedAt);
  const samples: HeartRateSample[] = [
    createHeartRateSample(startedAtMs, 0, 40),
    createHeartRateSample(startedAtMs, 60, 52),
    createHeartRateSample(startedAtMs, 120, 64),
    createHeartRateSample(startedAtMs, 180, 74),
    createHeartRateSample(startedAtMs, 240, 80),
    createHeartRateSample(startedAtMs, session.warmupSec, 80)
  ];

  let roundStartSec = session.warmupSec;

  for (let roundIndex = 0; roundIndex < peaks.length; roundIndex += 1) {
    const workDurationSec = session.workDurationSec;
    const workStartSec = roundStartSec;
    const recoveryDurationSec = session.actualRestsSec[roundIndex] ?? session.cooldownBaseSec;
    const recoveryStartSec = workStartSec + workDurationSec;
    const recoveryEndSec = recoveryStartSec + recoveryDurationSec;
    const peakBpm = peaks[roundIndex]!;
    const troughBpm = troughs[roundIndex]!;
    const startBpm = roundIndex === 0 ? 80 : (troughs[roundIndex - 1] ?? troughBpm);
    const peakAtSec = Math.min(recoveryEndSec - 6, recoveryStartSec + 15);
    const troughAtSec = roundIndex === peaks.length - 1
      ? Math.min(session.totalPlannedDurationSec, recoveryStartSec + 2)
      : Math.min(recoveryEndSec, recoveryEndSec + 2);

    samples.push(createHeartRateSample(startedAtMs, workStartSec, startBpm));
    samples.push(createHeartRateSample(startedAtMs, peakAtSec, peakBpm));
    samples.push(createHeartRateSample(startedAtMs, troughAtSec, troughBpm));

    roundStartSec = recoveryEndSec;
  }

  samples.push(createHeartRateSample(startedAtMs, session.totalPlannedDurationSec, 96));

  return samples.sort((left, right) => left.timestampMs - right.timestampMs);
}

function createHeartRateSample(startedAtMs: number, elapsedSec: number, bpm: number): HeartRateSample {
  return {
    timestampMs: startedAtMs + Math.round(elapsedSec * 1000),
    bpm,
    isMissing: false
  };
}

function createDemoSession(id: string, notes: string): SessionRecord {
  return {
      id,
      startedAt: '2026-03-29T12:00:00.000Z',
      completedAt: '2026-03-29T12:23:05.000Z',
      status: 'completed',
      profileName: 'Profile',
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
