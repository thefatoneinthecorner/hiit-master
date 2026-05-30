import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  buildBpmTargetDurationRows,
  deriveBpmSessionPlan,
  formatElapsedTime,
  type BpmTargetDurationRow
} from '../app/src/domain/analysis/bpmTimeline';
import { analyzeSessionRounds } from '../app/src/domain/analysis/recovery';
import type { RoundAnalysis, SessionRecord } from '../app/src/domain/shared/types';

interface BackupPayload {
  sessions: SessionRecord[];
}

function getArgumentValue(name: string): string | null {
  const prefix = `${name}=`;
  const inlineValue = Bun.argv.find((argument) => argument.startsWith(prefix));
  if (inlineValue) {
    return inlineValue.slice(prefix.length);
  }

  const index = Bun.argv.indexOf(name);
  if (index === -1) {
    return null;
  }

  return Bun.argv[index + 1] ?? null;
}

function loadBackup(path: string): BackupPayload {
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as BackupPayload;
}

function selectSession(sessions: SessionRecord[], sessionId: string | null): SessionRecord {
  const selected = sessionId
    ? sessions.find((session) => session.id === sessionId)
    : [...sessions].sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0];

  if (!selected) {
    throw new Error(sessionId ? `No session found with id ${sessionId}` : 'Backup contains no sessions');
  }

  return selected;
}

function formatDuration(durationSec: number | null): string {
  return durationSec === null ? 'not reached' : `${durationSec}s`;
}

function formatDurationDelta(row: BpmTargetDurationRow): string {
  if (row.targetDurationSec === null) {
    return 'not reached';
  }

  const delta = row.targetDurationSec - row.definedDurationSec;

  if (delta > 0) {
    return `+${delta}s`;
  }

  return `${delta}s`;
}

function roundToDecimals(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

function calculateRecoveryRateBpmPerMinute(round: RoundAnalysis): number | null {
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

function calculateDetrendedCov(values: number[]): {
  slope: number;
  intercept: number;
  residuals: number[];
  cov: number | null;
} {
  const points = values.map((y, index) => ({ x: index + 1, y }));

  if (points.length === 0) {
    return { slope: 0, intercept: 0, residuals: [], cov: null };
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

  return {
    slope,
    intercept,
    residuals,
    cov: Math.sqrt(residualVariance)
  };
}

function buildRecoveryRateByRound(analysis: RoundAnalysis[]): Map<number, number> {
  return new Map(
    analysis
      .map((round) => [round.roundIndex, calculateRecoveryRateBpmPerMinute(round)] as const)
      .filter((entry): entry is readonly [number, number] => entry[1] !== null)
  );
}

function buildNormalisedCovSummary(analysis: RoundAnalysis[]): string[] {
  const recoveryRates = analysis
    .map(calculateRecoveryRateBpmPerMinute)
    .filter((value): value is number => value !== null);
  const totalRecoveryArea = analysis.reduce(
    (total, round) => total + (calculateRecoveryAreaBpmMinutes(round) ?? 0),
    0
  );
  const fit = calculateDetrendedCov(recoveryRates);
  const normalisedCov = fit.cov !== null && totalRecoveryArea > 0 ? fit.cov / totalRecoveryArea : null;

  return [
    'Normalised CoV calculation',
    `Recovery rates (bpm/min): [${recoveryRates.map((value) => roundToDecimals(value, 2)).join(', ')}]`,
    `Linear fit: rate = ${roundToDecimals(fit.slope, 4)} * round + ${roundToDecimals(fit.intercept, 4)}`,
    `Residuals: [${fit.residuals.map((value) => roundToDecimals(value, 2)).join(', ')}]`,
    `CoV of residuals: ${fit.cov === null ? 'n/a' : roundToDecimals(fit.cov, 6)}`,
    `Total recovery area: ${roundToDecimals(totalRecoveryArea, 2)} bpm*min`,
    `Normalised CoV: ${normalisedCov === null ? 'n/a' : roundToDecimals(normalisedCov, 8)}`
  ];
}

function padCell(value: string, width: number, alignment: 'left' | 'right'): string {
  return alignment === 'right' ? value.padStart(width, ' ') : value.padEnd(width, ' ');
}

function buildTtyTable(rows: BpmTargetDurationRow[], recoveryRateByRound: Map<number, number>): string {
  const columns = [
    { label: 'Round', align: 'right' as const, value: (row: BpmTargetDurationRow) => String(row.roundIndex) },
    { label: 'Phase', align: 'left' as const, value: (row: BpmTargetDurationRow) => row.phase === 'work' ? 'Work' : 'Rest' },
    { label: 'Target', align: 'right' as const, value: (row: BpmTargetDurationRow) => `${row.targetComparator}${row.targetBpm}` },
    { label: 'Start', align: 'right' as const, value: (row: BpmTargetDurationRow) => formatElapsedTime(row.startElapsedSec) },
    {
      label: 'Hit at',
      align: 'right' as const,
      value: (row: BpmTargetDurationRow) =>
        row.targetReachedElapsedSec === null ? 'not reached' : formatElapsedTime(row.targetReachedElapsedSec)
    },
    { label: 'Duration', align: 'right' as const, value: (row: BpmTargetDurationRow) => formatDuration(row.targetDurationSec) },
    { label: 'Defined duration', align: 'right' as const, value: (row: BpmTargetDurationRow) => `${row.definedDurationSec}s` },
    { label: 'Duration delta', align: 'right' as const, value: formatDurationDelta },
    {
      label: 'Recovery rate',
      align: 'right' as const,
      value: (row: BpmTargetDurationRow) => {
        const rate = recoveryRateByRound.get(row.roundIndex);

        return row.phase === 'rest' && rate !== undefined ? `${roundToDecimals(rate, 2)} bpm/min` : '';
      }
    }
  ];
  const widths = columns.map((column) =>
    Math.max(column.label.length, ...rows.map((row) => column.value(row).length))
  );
  const header = columns
    .map((column, index) => padCell(column.label, widths[index] ?? column.label.length, column.align))
    .join('  ');
  const separator = widths.map((width) => '-'.repeat(width)).join('  ');
  const body = rows.map((row) =>
    columns
      .map((column, index) => padCell(column.value(row), widths[index] ?? column.label.length, column.align))
      .join('  ')
  );

  return [header, separator, ...body].join('\n');
}

const backupPath = Bun.argv[2] ?? 'hiit-master-backup (1).json';
const sessionId = getArgumentValue('--session-id');
const backup = loadBackup(backupPath);
const session = selectSession(backup.sessions, sessionId);
const rows = buildBpmTargetDurationRows(session);
const actualPlan = deriveBpmSessionPlan(session);
const actualAnalysis = analyzeSessionRounds(actualPlan, session.samples);
const recoveryRateByRound = buildRecoveryRateByRound(actualAnalysis);

if (rows.length === 0) {
  throw new Error(`Session ${session.name} is not a BPM-target session with saved BPM targets`);
}

console.log(`${session.name} / ${session.profileName}`);
console.log(`Started: ${session.startedAt}`);
console.log('');
console.log(buildTtyTable(rows, recoveryRateByRound));
console.log('');
console.log(buildNormalisedCovSummary(actualAnalysis).join('\n'));
