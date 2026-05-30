import type { HeartRateSample, RoundAnalysis, SessionProfile, SettingsMode, WorkoutPlan } from '../../app/src/domain/shared/types';

export type LatestSessionReplayFixture = {
  latest: {
    id: string;
    startedAt: string;
    endedAt: string;
    name: string;
    profileName: string;
    profileSnapshot: SessionProfile;
    settingsMode?: SettingsMode;
    plan: WorkoutPlan;
    samples: HeartRateSample[];
    analysis: RoundAnalysis[];
  };
  previousComparable: {
    id: string;
    startedAt: string;
    endedAt: string;
    name: string;
    analysis: RoundAnalysis[];
  };
};

const profileSnapshot: SessionProfile = {
  id: '1b6ae07e-acda-4963-a689-9f1542cdd121',
  name: 'Full Timer 2',
  notes: '',
  workDurationSec: 30,
  nominalPeakHeartrate: 160,
  bpmTargets: [
    { maxBpm: 101, minBpm: 82 },
    { maxBpm: 110, minBpm: 94 },
    { maxBpm: 120, minBpm: 105 },
    { maxBpm: 126, minBpm: 114 },
    { maxBpm: 132, minBpm: 124 },
    { maxBpm: 138, minBpm: 128 },
    { maxBpm: 142, minBpm: 137 },
    { maxBpm: 145, minBpm: 139 },
    { maxBpm: 146, minBpm: 142 },
    { maxBpm: 149, minBpm: 144 },
    { maxBpm: 151, minBpm: 145 },
    { maxBpm: 152, minBpm: 146 },
    { maxBpm: 153, minBpm: 150 },
  ],
  warmupSec: 300,
  baseRestsSec: [90, 75, 60, 45, 35, 30, 30, 30, 30, 30, 30, 30, 30],
  cooldownBaseSec: 180,
};

export const latestSessionReplayFixture: LatestSessionReplayFixture = {
  latest: {
    id: '5304a30a-09c4-4339-ba9f-cee2f2f0cf2b',
    startedAt: '2026-05-24T11:43:17.177Z',
    endedAt: '2026-05-24T12:06:55.218Z',
    name: '24 May 2026, 12:43',
    profileName: 'Full Timer 2',
    profileSnapshot,
    settingsMode: 'bpm',
    plan: {
      nominalWorkDurationSec: 30,
      actualWorkDurationSec: 29,
      warmupSec: 300,
      cooldownSec: 180,
      rounds: [
        { roundIndex: 1, workDurationSec: 29, restDurationSec: 91, nominalRoundDurationSec: 120 },
        { roundIndex: 2, workDurationSec: 29, restDurationSec: 76, nominalRoundDurationSec: 105 },
        { roundIndex: 3, workDurationSec: 29, restDurationSec: 61, nominalRoundDurationSec: 90 },
        { roundIndex: 4, workDurationSec: 29, restDurationSec: 46, nominalRoundDurationSec: 75 },
        { roundIndex: 5, workDurationSec: 29, restDurationSec: 36, nominalRoundDurationSec: 65 },
        { roundIndex: 6, workDurationSec: 29, restDurationSec: 31, nominalRoundDurationSec: 60 },
        { roundIndex: 7, workDurationSec: 29, restDurationSec: 31, nominalRoundDurationSec: 60 },
        { roundIndex: 8, workDurationSec: 29, restDurationSec: 31, nominalRoundDurationSec: 60 },
        { roundIndex: 9, workDurationSec: 29, restDurationSec: 31, nominalRoundDurationSec: 60 },
        { roundIndex: 10, workDurationSec: 29, restDurationSec: 31, nominalRoundDurationSec: 60 },
        { roundIndex: 11, workDurationSec: 29, restDurationSec: 31, nominalRoundDurationSec: 60 },
        { roundIndex: 12, workDurationSec: 29, restDurationSec: 31, nominalRoundDurationSec: 60 },
        { roundIndex: 13, workDurationSec: 29, restDurationSec: 31, nominalRoundDurationSec: 60 },
      ],
      phases: [
        { key: 'warmup-x-0', kind: 'warmup', roundIndex: null, startSec: 0, endSec: 300, durationSec: 300, label: 'Warmup' },
        { key: 'work-1-300', kind: 'work', roundIndex: 1, startSec: 300, endSec: 329, durationSec: 29, label: 'Round 1' },
        { key: 'rest-1-329', kind: 'rest', roundIndex: 1, startSec: 329, endSec: 420, durationSec: 91, label: 'Round 1' },
        { key: 'work-2-420', kind: 'work', roundIndex: 2, startSec: 420, endSec: 449, durationSec: 29, label: 'Round 2' },
        { key: 'rest-2-449', kind: 'rest', roundIndex: 2, startSec: 449, endSec: 525, durationSec: 76, label: 'Round 2' },
        { key: 'work-3-525', kind: 'work', roundIndex: 3, startSec: 525, endSec: 554, durationSec: 29, label: 'Round 3' },
        { key: 'rest-3-554', kind: 'rest', roundIndex: 3, startSec: 554, endSec: 615, durationSec: 61, label: 'Round 3' },
        { key: 'work-4-615', kind: 'work', roundIndex: 4, startSec: 615, endSec: 644, durationSec: 29, label: 'Round 4' },
        { key: 'rest-4-644', kind: 'rest', roundIndex: 4, startSec: 644, endSec: 690, durationSec: 46, label: 'Round 4' },
        { key: 'work-5-690', kind: 'work', roundIndex: 5, startSec: 690, endSec: 719, durationSec: 29, label: 'Round 5' },
        { key: 'rest-5-719', kind: 'rest', roundIndex: 5, startSec: 719, endSec: 755, durationSec: 36, label: 'Round 5' },
        { key: 'work-6-755', kind: 'work', roundIndex: 6, startSec: 755, endSec: 784, durationSec: 29, label: 'Round 6' },
        { key: 'rest-6-784', kind: 'rest', roundIndex: 6, startSec: 784, endSec: 815, durationSec: 31, label: 'Round 6' },
        { key: 'work-7-815', kind: 'work', roundIndex: 7, startSec: 815, endSec: 844, durationSec: 29, label: 'Round 7' },
        { key: 'rest-7-844', kind: 'rest', roundIndex: 7, startSec: 844, endSec: 875, durationSec: 31, label: 'Round 7' },
        { key: 'work-8-875', kind: 'work', roundIndex: 8, startSec: 875, endSec: 904, durationSec: 29, label: 'Round 8' },
        { key: 'rest-8-904', kind: 'rest', roundIndex: 8, startSec: 904, endSec: 935, durationSec: 31, label: 'Round 8' },
        { key: 'work-9-935', kind: 'work', roundIndex: 9, startSec: 935, endSec: 964, durationSec: 29, label: 'Round 9' },
        { key: 'rest-9-964', kind: 'rest', roundIndex: 9, startSec: 964, endSec: 995, durationSec: 31, label: 'Round 9' },
        { key: 'work-10-995', kind: 'work', roundIndex: 10, startSec: 995, endSec: 1024, durationSec: 29, label: 'Round 10' },
        { key: 'rest-10-1024', kind: 'rest', roundIndex: 10, startSec: 1024, endSec: 1055, durationSec: 31, label: 'Round 10' },
        { key: 'work-11-1055', kind: 'work', roundIndex: 11, startSec: 1055, endSec: 1084, durationSec: 29, label: 'Round 11' },
        { key: 'rest-11-1084', kind: 'rest', roundIndex: 11, startSec: 1084, endSec: 1115, durationSec: 31, label: 'Round 11' },
        { key: 'work-12-1115', kind: 'work', roundIndex: 12, startSec: 1115, endSec: 1144, durationSec: 29, label: 'Round 12' },
        { key: 'rest-12-1144', kind: 'rest', roundIndex: 12, startSec: 1144, endSec: 1175, durationSec: 31, label: 'Round 12' },
        { key: 'work-13-1175', kind: 'work', roundIndex: 13, startSec: 1175, endSec: 1204, durationSec: 29, label: 'Round 13' },
        { key: 'cooldown-13-1204', kind: 'cooldown', roundIndex: 13, startSec: 1204, endSec: 1415, durationSec: 211, label: 'Cooldown' },
      ],
      totalDurationSec: 1415,
    },
    samples: [
      { elapsedSec: 0, bpm: 55 },
      { elapsedSec: 60, bpm: 77 },
      { elapsedSec: 120, bpm: 76 },
      { elapsedSec: 180, bpm: 78 },
      { elapsedSec: 240, bpm: 77 },
      { elapsedSec: 300, bpm: 79 },
      { elapsedSec: 329, bpm: 101 },
      { elapsedSec: 420, bpm: 82 },
      { elapsedSec: 449, bpm: 110 },
      { elapsedSec: 525, bpm: 94 },
      { elapsedSec: 554, bpm: 120 },
      { elapsedSec: 615, bpm: 105 },
      { elapsedSec: 644, bpm: 126 },
      { elapsedSec: 690, bpm: 114 },
      { elapsedSec: 719, bpm: 132 },
      { elapsedSec: 755, bpm: 124 },
      { elapsedSec: 784, bpm: 138 },
      { elapsedSec: 815, bpm: 128 },
      { elapsedSec: 844, bpm: 142 },
      { elapsedSec: 875, bpm: 137 },
      { elapsedSec: 904, bpm: 145 },
      { elapsedSec: 935, bpm: 139 },
      { elapsedSec: 964, bpm: 146 },
      { elapsedSec: 995, bpm: 142 },
      { elapsedSec: 1024, bpm: 149 },
      { elapsedSec: 1055, bpm: 145 },
      { elapsedSec: 1084, bpm: 151 },
      { elapsedSec: 1115, bpm: 145 },
      { elapsedSec: 1144, bpm: 152 },
      { elapsedSec: 1175, bpm: 149 },
      { elapsedSec: 1204, bpm: 153 },
      { elapsedSec: 1215, bpm: 156 },
      { elapsedSec: 1234, bpm: 150 },
      { elapsedSec: 1414, bpm: 123 },
    ],
    analysis: [
      { roundIndex: 1, peak: 101, trough: 82, delta: 19, recoveryWindowStartSec: 329, recoveryWindowEndSec: 449 },
      { roundIndex: 2, peak: 110, trough: 94, delta: 16, recoveryWindowStartSec: 449, recoveryWindowEndSec: 554 },
      { roundIndex: 3, peak: 120, trough: 105, delta: 15, recoveryWindowStartSec: 554, recoveryWindowEndSec: 644 },
      { roundIndex: 4, peak: 126, trough: 114, delta: 12, recoveryWindowStartSec: 644, recoveryWindowEndSec: 719 },
      { roundIndex: 5, peak: 132, trough: 124, delta: 8, recoveryWindowStartSec: 719, recoveryWindowEndSec: 784 },
      { roundIndex: 6, peak: 138, trough: 128, delta: 10, recoveryWindowStartSec: 784, recoveryWindowEndSec: 844 },
      { roundIndex: 7, peak: 142, trough: 137, delta: 5, recoveryWindowStartSec: 844, recoveryWindowEndSec: 904 },
      { roundIndex: 8, peak: 145, trough: 139, delta: 6, recoveryWindowStartSec: 904, recoveryWindowEndSec: 964 },
      { roundIndex: 9, peak: 146, trough: 142, delta: 4, recoveryWindowStartSec: 964, recoveryWindowEndSec: 1024 },
      { roundIndex: 10, peak: 149, trough: 144, delta: 5, recoveryWindowStartSec: 1024, recoveryWindowEndSec: 1084 },
      { roundIndex: 11, peak: 151, trough: 145, delta: 6, recoveryWindowStartSec: 1084, recoveryWindowEndSec: 1144 },
      { roundIndex: 12, peak: 152, trough: 146, delta: 6, recoveryWindowStartSec: 1144, recoveryWindowEndSec: 1204 },
      { roundIndex: 13, peak: 153, trough: 150, delta: 3, recoveryWindowStartSec: 1204, recoveryWindowEndSec: 1234 },
    ],
  },
  previousComparable: {
    id: 'dbbf93d4-4033-4fbe-bfdf-5af6536a4c39',
    startedAt: '2026-05-23T10:36:38.890Z',
    endedAt: '2026-05-23T11:00:17.123Z',
    name: '23 May 2026, 11:36',
    analysis: [
      { roundIndex: 1, peak: 101, trough: 84, delta: 17, recoveryWindowStartSec: 328, recoveryWindowEndSec: 448 },
      { roundIndex: 2, peak: 115, trough: 95, delta: 20, recoveryWindowStartSec: 448, recoveryWindowEndSec: 553 },
      { roundIndex: 3, peak: 122, trough: 107, delta: 15, recoveryWindowStartSec: 553, recoveryWindowEndSec: 643 },
      { roundIndex: 4, peak: 125, trough: 117, delta: 8, recoveryWindowStartSec: 643, recoveryWindowEndSec: 718 },
      { roundIndex: 5, peak: 131, trough: 127, delta: 4, recoveryWindowStartSec: 718, recoveryWindowEndSec: 783 },
      { roundIndex: 6, peak: 137, trough: 130, delta: 7, recoveryWindowStartSec: 783, recoveryWindowEndSec: 843 },
      { roundIndex: 7, peak: 143, trough: 137, delta: 6, recoveryWindowStartSec: 843, recoveryWindowEndSec: 903 },
      { roundIndex: 8, peak: 145, trough: 140, delta: 5, recoveryWindowStartSec: 903, recoveryWindowEndSec: 963 },
      { roundIndex: 9, peak: 148, trough: 141, delta: 7, recoveryWindowStartSec: 963, recoveryWindowEndSec: 1023 },
      { roundIndex: 10, peak: 149, trough: 144, delta: 5, recoveryWindowStartSec: 1023, recoveryWindowEndSec: 1083 },
      { roundIndex: 11, peak: 151, trough: 145, delta: 6, recoveryWindowStartSec: 1083, recoveryWindowEndSec: 1143 },
      { roundIndex: 12, peak: 151, trough: 147, delta: 4, recoveryWindowStartSec: 1143, recoveryWindowEndSec: 1203 },
      { roundIndex: 13, peak: 153, trough: 150, delta: 3, recoveryWindowStartSec: 1203, recoveryWindowEndSec: 1233 },
    ],
  },
};
