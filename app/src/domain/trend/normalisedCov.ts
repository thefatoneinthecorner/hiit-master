import { isComparisonEligibleSession } from '../session/lifecycle';
import type { RoundAnalysis, SessionRecord } from '../shared/types';

export interface NormalisedCovTrendPoint {
  date: string;
  profileName: string;
  actualWorkDurationSec: number;
  value: number | null;
}

function calculateRecoveryRateBpm(round: RoundAnalysis): number | null {
  const durationMinutes = (round.recoveryWindowEndSec - round.recoveryWindowStartSec) / 60;

  if (round.delta === null || durationMinutes <= 0) {
    return null;
  }

  return round.delta / durationMinutes;
}

function calculateRecoveryAreaBpmMinutes(round: RoundAnalysis): number | null {
  const durationMinutes = (round.recoveryWindowEndSec - round.recoveryWindowStartSec) / 60;

  if (round.peak === null || round.trough === null || durationMinutes <= 0) {
    return null;
  }

  return ((round.peak + round.trough) / 2) * durationMinutes;
}

function calculateCoefficientOfVariation(values: number[]): number | null {
  const points = values.map((y, index) => ({ x: index + 1, y }));

  if (points.length === 0) {
    return null;
  }

  const meanX = points.reduce((total, point) => total + point.x, 0) / points.length;
  const meanY = points.reduce((total, point) => total + point.y, 0) / points.length;
  const varianceX = points.reduce((total, point) => total + (point.x - meanX) ** 2, 0);
  const covariance = points.reduce((total, point) => total + (point.x - meanX) * (point.y - meanY), 0);
  const slope = varianceX === 0 ? 0 : covariance / varianceX;
  const intercept = meanY - slope * meanX;
  const residuals = points.map((point) => point.y - (intercept + slope * point.x));
  const meanResidual = residuals.reduce((total, residual) => total + residual, 0) / residuals.length;
  const residualVariance =
    residuals.reduce((total, residual) => total + (residual - meanResidual) ** 2, 0) / residuals.length;

  return Math.sqrt(residualVariance);
}

export function buildNormalisedCovTrendPoints(sessions: SessionRecord[]): NormalisedCovTrendPoint[] {
  return [...sessions]
    .sort((left, right) => new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime())
    .map((session) => {
      const recoveryRates = session.analysis
        .map(calculateRecoveryRateBpm)
        .filter((value): value is number => value !== null);
      const totalArea = session.analysis.reduce((total, round) => total + (calculateRecoveryAreaBpmMinutes(round) ?? 0), 0);
      const coefficientOfVariation = isComparisonEligibleSession(session)
        ? calculateCoefficientOfVariation(recoveryRates)
        : null;
      const value =
        coefficientOfVariation !== null && totalArea > 0 ? coefficientOfVariation / totalArea : null;

      return {
        date: session.startedAt,
        profileName: session.profileName,
        actualWorkDurationSec: session.actualWorkDurationSec,
        value,
      };
    });
}

