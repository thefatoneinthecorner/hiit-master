import type { HeartRateSample, RoundAnalysis, SessionRecord, WorkoutPhaseSegment } from '../../../domain/shared/types';

function formatElapsedTime(elapsedSec: number): string {
  return `${Math.floor(elapsedSec / 60)}:${String(Math.floor(elapsedSec % 60)).padStart(2, '0')}`;
}

function formatPhaseLabel(phase: WorkoutPhaseSegment | undefined): string {
  if (!phase) {
    return '';
  }

  if (phase.kind === 'warmup') {
    return 'Warmup';
  }

  if (phase.kind === 'cooldown') {
    return 'Cooldown';
  }

  if (phase.kind === 'work' && phase.roundIndex !== null) {
    return `R${phase.roundIndex} W`;
  }

  if (phase.kind === 'rest' && phase.roundIndex !== null) {
    return `R${phase.roundIndex} R`;
  }

  return '';
}

function findPhase(
  phases: WorkoutPhaseSegment[],
  kind: WorkoutPhaseSegment['kind'],
  roundIndex: number
): WorkoutPhaseSegment | undefined {
  return phases.find((phase) => phase.kind === kind && phase.roundIndex === roundIndex);
}

function getBpmRange(samples: HeartRateSample[], startSec: number, endSec: number) {
  const matchingSamples = samples
    .filter((sample) => sample.bpm !== null && sample.elapsedSec >= startSec && sample.elapsedSec <= endSec)
    .map((sample) => ({ elapsedSec: sample.elapsedSec, bpm: sample.bpm as number }));

  if (matchingSamples.length === 0) {
    return null;
  }

  const firstSample = matchingSamples[0] as { elapsedSec: number; bpm: number };

  return matchingSamples.reduce(
    (range, sample) => ({
      min: sample.bpm < range.min ? sample.bpm : range.min,
      max: sample.bpm > range.max ? sample.bpm : range.max,
      minElapsedSec: sample.bpm < range.min ? sample.elapsedSec : range.minElapsedSec,
      maxElapsedSec: sample.bpm > range.max ? sample.elapsedSec : range.maxElapsedSec,
    }),
    {
      min: firstSample.bpm,
      max: firstSample.bpm,
      minElapsedSec: firstSample.elapsedSec,
      maxElapsedSec: firstSample.elapsedSec,
    }
  );
}

function getPhaseDelta(
  phase: WorkoutPhaseSegment | undefined,
  samples: HeartRateSample[],
  phases: WorkoutPhaseSegment[],
  analysis: RoundAnalysis[]
): number | null {
  if (!phase || phase.roundIndex === null) {
    return null;
  }

  const workPhase = findPhase(phases, 'work', phase.roundIndex);
  const restPhase = findPhase(phases, 'rest', phase.roundIndex) ?? findPhase(phases, 'cooldown', phase.roundIndex);

  if (!workPhase || !restPhase) {
    return analysis.find((round) => round.roundIndex === phase.roundIndex)?.delta ?? null;
  }

  const laggedPeakRange = getBpmRange(samples, workPhase.startSec, restPhase.endSec);
  if (!laggedPeakRange) {
    return analysis.find((round) => round.roundIndex === phase.roundIndex)?.delta ?? null;
  }

  if (phase.kind === 'work') {
    const workRange = getBpmRange(samples, workPhase.startSec, workPhase.endSec);

    return workRange ? laggedPeakRange.max - workRange.min : analysis.find((round) => round.roundIndex === phase.roundIndex)?.delta ?? null;
  }

  if (phase.kind === 'rest' || phase.kind === 'cooldown') {
    const nextWorkPhase = findPhase(phases, 'work', phase.roundIndex + 1);
    const recoveryRange = getBpmRange(samples, restPhase.startSec, nextWorkPhase?.endSec ?? restPhase.endSec);

    return recoveryRange ? laggedPeakRange.max - recoveryRange.min : analysis.find((round) => round.roundIndex === phase.roundIndex)?.delta ?? null;
  }

  return null;
}

export function formatCrosshairTimeLabel(
  session: SessionRecord,
  elapsedSec: number,
  previousSessionOrSessions?: SessionRecord | SessionRecord[] | null
): string {
  const phase = session.plan.phases.find((item) => elapsedSec >= item.startSec && elapsedSec < item.endSec) ?? session.plan.phases.at(-1);
  const phaseLabel = formatPhaseLabel(phase);

  if (!phaseLabel) {
    return formatElapsedTime(elapsedSec);
  }

  const delta = getPhaseDelta(phase, session.samples, session.plan.phases, session.analysis);
  if (delta === null) {
    return `${formatElapsedTime(elapsedSec)} ${phaseLabel}`;
  }

  const previousSessions = Array.isArray(previousSessionOrSessions)
    ? previousSessionOrSessions
    : previousSessionOrSessions
      ? [previousSessionOrSessions]
      : [];
  const previousDelta = phase?.roundIndex !== null && phase?.roundIndex !== undefined
    ? previousSessions
      .map((previousSession) => {
        const previousPhase = previousSession.plan.phases.find(
          (candidate) => candidate.kind === phase.kind && candidate.roundIndex === phase.roundIndex
        );

        return getPhaseDelta(previousPhase, previousSession.samples, previousSession.plan.phases, previousSession.analysis);
      })
      .find((candidate): candidate is number => candidate !== null) ?? null
    : null;

  if (previousDelta === null) {
    return `${formatElapsedTime(elapsedSec)} ${phaseLabel} Δ${delta}`;
  }

  const deltaDiff = delta - previousDelta;
  const deltaDiffLabel = deltaDiff > 0 ? ` ↑${deltaDiff}` : deltaDiff < 0 ? ` ↓${Math.abs(deltaDiff)}` : ' 0';

  return `${formatElapsedTime(elapsedSec)} ${phaseLabel} Δ${delta}${deltaDiffLabel}`;
}
