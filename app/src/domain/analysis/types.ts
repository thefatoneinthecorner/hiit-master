export interface HeartRateSample {
  timestampMs: number;
  bpm: number | null;
  isMissing: boolean;
}

export interface IntervalStat {
  roundIndex: number;
  peakBpm: number | null;
  troughBpm: number | null;
  deltaBpm: number | null;
}
