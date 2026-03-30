export interface ComparisonRound {
  roundIndex: number;
  currentDelta: number | null;
  previousDelta: number | null;
  diffDelta: number | null;
}
