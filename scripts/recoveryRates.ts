import { latestSessionReplayFixture } from '../stories/fixtures/latestSessionReplay';
import type { RoundAnalysis } from '../app/src/domain/shared/types';

type RecoveryAnalysisRow = {
  round: number;
  peak: number | null;
  trough: number | null;
  delta: number | null;
  recoveryWindowSec: number;
  recoveryRateBpm: number | null;
  recoveryAreaBpmMinutes: number | null;
};

type StraightLineFit = {
  slope: number;
  intercept: number;
  fittedRecoveryRateBpm: Array<number | null>;
  residuals: Array<number | null>;
  coefficientOfVariation: number | null;
  normalizedCoefficientOfVariation: number | null;
};

function calculateRecoveryRateBpm({
  delta,
  recoveryWindowStartSec,
  recoveryWindowEndSec,
}: {
  delta: number | null;
  recoveryWindowStartSec: number;
  recoveryWindowEndSec: number;
}): number | null {
  const durationMinutes = (recoveryWindowEndSec - recoveryWindowStartSec) / 60;

  if (delta === null || durationMinutes <= 0) {
    return null;
  }

  return delta / durationMinutes;
}

function calculateRecoveryAreaBpmMinutes({
  peak,
  trough,
  recoveryWindowStartSec,
  recoveryWindowEndSec,
}: {
  peak: number | null;
  trough: number | null;
  recoveryWindowStartSec: number;
  recoveryWindowEndSec: number;
}): number | null {
  const durationMinutes = (recoveryWindowEndSec - recoveryWindowStartSec) / 60;

  if (peak === null || trough === null || durationMinutes <= 0) {
    return null;
  }

  return ((peak + trough) / 2) * durationMinutes;
}

function analyzeRecovery(analysis: RoundAnalysis[]): RecoveryAnalysisRow[] {
  return analysis.map((round) => {
    const recoveryWindowSec = round.recoveryWindowEndSec - round.recoveryWindowStartSec;
    const recoveryRateBpm = calculateRecoveryRateBpm(round);
    const recoveryAreaBpmMinutes = calculateRecoveryAreaBpmMinutes(round);

    return {
      round: round.roundIndex,
      peak: round.peak,
      trough: round.trough,
      delta: round.delta,
      recoveryWindowSec,
      recoveryRateBpm: recoveryRateBpm === null ? null : Number(recoveryRateBpm.toFixed(2)),
      recoveryAreaBpmMinutes: recoveryAreaBpmMinutes === null ? null : Number(recoveryAreaBpmMinutes.toFixed(2)),
    };
  });
}

function roundToTwoDecimals(value: number): number {
  return Number(value.toFixed(2));
}

function calculateStraightLineFit(rows: RecoveryAnalysisRow[]): StraightLineFit {
  const points = rows
    .filter((row): row is RecoveryAnalysisRow & { recoveryRateBpm: number } => row.recoveryRateBpm !== null)
    .map((row) => ({ x: row.round, y: row.recoveryRateBpm }));

  if (points.length === 0) {
    return {
      slope: 0,
      intercept: 0,
      fittedRecoveryRateBpm: rows.map(() => null),
      residuals: rows.map(() => null),
      coefficientOfVariation: null,
      normalizedCoefficientOfVariation: null,
    };
  }

  const meanX = points.reduce((total, point) => total + point.x, 0) / points.length;
  const meanY = points.reduce((total, point) => total + point.y, 0) / points.length;
  const varianceX = points.reduce((total, point) => total + (point.x - meanX) ** 2, 0);
  const covariance = points.reduce((total, point) => total + (point.x - meanX) * (point.y - meanY), 0);
  const slope = varianceX === 0 ? 0 : covariance / varianceX;
  const intercept = meanY - slope * meanX;
  const fittedRecoveryRateBpm = rows.map((row) =>
    row.recoveryRateBpm === null ? null : roundToTwoDecimals(intercept + slope * row.round)
  );
  const residuals = rows.map((row, index) => {
    const fitted = fittedRecoveryRateBpm[index];

    return row.recoveryRateBpm === null || fitted === null ? null : roundToTwoDecimals(row.recoveryRateBpm - fitted);
  });
  const validResiduals = residuals.filter((residual): residual is number => residual !== null);
  const meanResidual = validResiduals.reduce((total, residual) => total + residual, 0) / validResiduals.length;
  const residualVariance =
    validResiduals.reduce((total, residual) => total + (residual - meanResidual) ** 2, 0) / validResiduals.length;

  return {
    slope: roundToTwoDecimals(slope),
    intercept: roundToTwoDecimals(intercept),
    fittedRecoveryRateBpm,
    residuals,
    coefficientOfVariation: roundToTwoDecimals(Math.sqrt(residualVariance)),
    normalizedCoefficientOfVariation: null,
  };
}

function summarize(rows: RecoveryAnalysisRow[]) {
  const totalRecoveryAreaBpmMinutes = rows.reduce(
    (total, row) => total + (row.recoveryAreaBpmMinutes ?? 0),
    0
  );
  const straightLineFit = calculateStraightLineFit(rows);
  const normalizedCoefficientOfVariation =
    straightLineFit.coefficientOfVariation === null || totalRecoveryAreaBpmMinutes <= 0
      ? null
      : straightLineFit.coefficientOfVariation / totalRecoveryAreaBpmMinutes;

  return {
    recoveryRateBpm: rows.map((row) => row.recoveryRateBpm),
    recoveryAreaBpmMinutes: rows.map((row) => row.recoveryAreaBpmMinutes),
    totalRecoveryAreaBpmMinutes: Number(totalRecoveryAreaBpmMinutes.toFixed(2)),
    straightLineFit: {
      ...straightLineFit,
      normalizedCoefficientOfVariation:
        normalizedCoefficientOfVariation === null ? null : Number(normalizedCoefficientOfVariation.toFixed(6)),
    },
  };
}

const latestRows = analyzeRecovery(latestSessionReplayFixture.latest.analysis);
const previousComparableRows = analyzeRecovery(latestSessionReplayFixture.previousComparable.analysis);
const latestSummary = summarize(latestRows);
const previousComparableSummary = summarize(previousComparableRows);

console.log('latest');
console.table(latestRows);
console.log(JSON.stringify(latestSummary.recoveryRateBpm));
console.log(JSON.stringify(latestSummary.recoveryAreaBpmMinutes));
console.log(JSON.stringify({ totalRecoveryAreaBpmMinutes: latestSummary.totalRecoveryAreaBpmMinutes }));
console.log(JSON.stringify(latestSummary.straightLineFit));

console.log('previousComparable');
console.table(previousComparableRows);
console.log(JSON.stringify(previousComparableSummary.recoveryRateBpm));
console.log(JSON.stringify(previousComparableSummary.recoveryAreaBpmMinutes));
console.log(JSON.stringify({ totalRecoveryAreaBpmMinutes: previousComparableSummary.totalRecoveryAreaBpmMinutes }));
console.log(JSON.stringify(previousComparableSummary.straightLineFit));

console.log(JSON.stringify({
  latest: latestSummary,
  previousComparable: previousComparableSummary,
}, null, 2));
