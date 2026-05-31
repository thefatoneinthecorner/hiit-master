import type { HeartRateSample, Interval, Sample, SessionRecord, WorkoutPhaseSegment } from '../../../domain/shared/types';

function getValidSamples(session: SessionRecord): Sample[] {
  return session.samples
    .filter((sample): sample is Sample => sample.bpm !== null)
    .sort((left, right) => left.elapsedSec - right.elapsedSec);
}

function getNearestSample(session: SessionRecord, elapsedSec: number): Sample {
  const nearest = getValidSamples(session).reduce<Sample | null>((candidate, sample) => {
    if (!candidate) {
      return sample;
    }

    return Math.abs(sample.elapsedSec - elapsedSec) < Math.abs(candidate.elapsedSec - elapsedSec)
      ? sample
      : candidate;
  }, null);

  if (!nearest) {
    throw new Error('Session must contain valid heart-rate samples');
  }

  return nearest;
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
    .filter((sample): sample is Sample => sample.bpm !== null && sample.elapsedSec >= startSec && sample.elapsedSec <= endSec)
    .sort((left, right) => left.elapsedSec - right.elapsedSec);

  if (matchingSamples.length === 0) {
    return null;
  }

  return matchingSamples.reduce(
    (range, sample) => ({
      min: sample.bpm < range.min.bpm ? sample : range.min,
      max: sample.bpm > range.max.bpm ? sample : range.max,
    }),
    {
      min: matchingSamples[0] as Sample,
      max: matchingSamples[0] as Sample,
    }
  );
}

export function buildSessionIntervalAtElapsed(session: SessionRecord, elapsedSec: number): Interval {
  const phase =
    session.plan.phases.find((item) => elapsedSec >= item.startSec && elapsedSec < item.endSec) ??
    session.plan.phases.at(-1);

  if (!phase || phase.kind === 'countdown') {
    throw new Error('Session must contain a highlightable interval');
  }

  const fallbackRange = getBpmRange(session.samples, phase.startSec, phase.endSec);
  let min = fallbackRange?.min ?? getNearestSample(session, phase.startSec);
  let max = fallbackRange?.max ?? getNearestSample(session, phase.startSec);

  if (phase.roundIndex !== null) {
    const workPhase = findPhase(session.plan.phases, 'work', phase.roundIndex);
    const restPhase =
      findPhase(session.plan.phases, 'rest', phase.roundIndex) ??
      findPhase(session.plan.phases, 'cooldown', phase.roundIndex);

    if (workPhase && restPhase) {
      const laggedPeakRange = getBpmRange(session.samples, workPhase.startSec, restPhase.endSec);

      if (phase.kind === 'work') {
        const workRange = getBpmRange(session.samples, workPhase.startSec, workPhase.endSec);
        min = workRange?.min ?? min;
        max = laggedPeakRange?.max ?? max;
      }

      if (phase.kind === 'rest' || phase.kind === 'cooldown') {
        const nextWorkPhase = findPhase(session.plan.phases, 'work', phase.roundIndex + 1);
        const recoveryRange = getBpmRange(session.samples, restPhase.startSec, nextWorkPhase?.endSec ?? restPhase.endSec);
        min = recoveryRange?.min ?? min;
        max = laggedPeakRange?.max ?? max;
      }
    }
  }

  return {
    kind: phase.kind,
    start: getNearestSample(session, phase.startSec),
    end: getNearestSample(session, phase.endSec),
    max,
    min,
  };
}

export function buildSessionIntervalAtX(session: SessionRecord, x: number): Interval {
  return buildSessionIntervalAtElapsed(session, Math.round((session.plan.totalDurationSec * x) / 100));
}
