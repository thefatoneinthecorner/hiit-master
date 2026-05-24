import type { JSX } from 'preact';
import { useRef } from 'preact/hooks';
import type { HeartRateSample, RoundAnalysis, WorkoutPhaseSegment } from '../../domain/shared/types';

interface HeartGraphProps {
  samples: HeartRateSample[];
  totalDurationSec: number;
  nominalPeakHeartrate: number;
  labelledAxes?: boolean;
  onClick?: () => void;
  clickLabel?: string;
  scrubElapsedSec?: number | null;
  heightClassName?: string;
  lineThickness?: number;
  fillWidth?: boolean;
  timeScale?: 'samples' | 'duration';
  crosshairScrubber?: boolean;
  phases?: WorkoutPhaseSegment[];
  analysis?: RoundAnalysis[];
  previousAnalysis?: RoundAnalysis[];
  previousAnalyses?: RoundAnalysis[][];
  previousSessions?: PreviousHeartGraphSession[];
  onScrubElapsedSecChange?: (elapsedSec: number) => void;
}

interface PreviousHeartGraphSession {
  samples: HeartRateSample[];
  phases?: WorkoutPhaseSegment[];
  analysis?: RoundAnalysis[];
}

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

interface BpmRange {
  min: number;
  max: number;
  minElapsedSec: number;
  maxElapsedSec: number;
}

interface PhaseMeasurement {
  intervalStartSec: number;
  intervalEndSec: number;
  minElapsedSec: number;
  maxElapsedSec: number;
  delta: number | null;
}

function getBpmRange(samples: HeartRateSample[], startSec: number, endSec: number): BpmRange | null {
  const matchingSamples = samples
    .filter((sample) => sample.bpm !== null && sample.elapsedSec >= startSec && sample.elapsedSec <= endSec)
    .map((sample) => ({ elapsedSec: sample.elapsedSec, bpm: sample.bpm as number }));

  if (matchingSamples.length === 0) {
    return null;
  }

  const firstSample = matchingSamples[0] as { elapsedSec: number; bpm: number };

  return matchingSamples.reduce<BpmRange>(
    (range, sample) => ({
      min: sample.bpm < range.min ? sample.bpm : range.min,
      max: sample.bpm > range.max ? sample.bpm : range.max,
      minElapsedSec: sample.bpm < range.min ? sample.elapsedSec : range.minElapsedSec,
      maxElapsedSec: sample.bpm > range.max ? sample.elapsedSec : range.maxElapsedSec
    }),
    {
      min: firstSample.bpm,
      max: firstSample.bpm,
      minElapsedSec: firstSample.elapsedSec,
      maxElapsedSec: firstSample.elapsedSec
    }
  );
}

function findPhase(
  phases: WorkoutPhaseSegment[] | undefined,
  kind: WorkoutPhaseSegment['kind'],
  roundIndex: number
): WorkoutPhaseSegment | undefined {
  return phases?.find((phase) => phase.kind === kind && phase.roundIndex === roundIndex);
}

function getPhaseMeasurement(
  phase: WorkoutPhaseSegment,
  samples: HeartRateSample[],
  phases?: WorkoutPhaseSegment[]
): PhaseMeasurement | null {
  if (phase.roundIndex === null) {
    return null;
  }

  const workPhase = findPhase(phases, 'work', phase.roundIndex);
  const restPhase =
    findPhase(phases, 'rest', phase.roundIndex) ?? findPhase(phases, 'cooldown', phase.roundIndex);

  if (!workPhase || !restPhase) {
    return null;
  }

  const laggedPeakRange = getBpmRange(samples, workPhase.startSec, restPhase.endSec);
  if (!laggedPeakRange) {
    return null;
  }

  if (phase.kind === 'work') {
    const workRange = getBpmRange(samples, workPhase.startSec, workPhase.endSec);
    return workRange
      ? {
          intervalStartSec: phase.startSec,
          intervalEndSec: phase.endSec,
          minElapsedSec: workRange.minElapsedSec,
          maxElapsedSec: laggedPeakRange.maxElapsedSec,
          delta: laggedPeakRange.max - workRange.min
        }
      : null;
  }

  if (phase.kind === 'rest' || phase.kind === 'cooldown') {
    const nextWorkPhase = findPhase(phases, 'work', phase.roundIndex + 1);
    const recoveryRange = getBpmRange(samples, restPhase.startSec, nextWorkPhase?.endSec ?? restPhase.endSec);
    return recoveryRange
      ? {
          intervalStartSec: phase.startSec,
          intervalEndSec: phase.endSec,
          minElapsedSec: recoveryRange.minElapsedSec,
          maxElapsedSec: laggedPeakRange.maxElapsedSec,
          delta: laggedPeakRange.max - recoveryRange.min
        }
      : null;
  }

  return null;
}

function formatDeltaLabel(
  phase: WorkoutPhaseSegment | undefined,
  samples: HeartRateSample[],
  phases?: WorkoutPhaseSegment[],
  analysis?: RoundAnalysis[],
  previousAnalysis?: RoundAnalysis[],
  previousAnalyses?: RoundAnalysis[][],
  previousSessions?: PreviousHeartGraphSession[]
): string {
  if (!phase || phase.roundIndex === null) {
    return '';
  }

  const delta =
    getPhaseMeasurement(phase, samples, phases)?.delta ??
    analysis?.find((round) => round.roundIndex === phase.roundIndex)?.delta;

  if (delta === null || delta === undefined) {
    return '';
  }

  const previousDelta =
    previousSessions
      ?.map((session) => {
        const matchingPhase = session.phases?.find((candidate) => candidate.kind === phase.kind && candidate.roundIndex === phase.roundIndex);
        const matchingPhaseDelta = matchingPhase
          ? getPhaseMeasurement(matchingPhase, session.samples, session.phases)?.delta
          : null;

        return matchingPhaseDelta ?? session.analysis?.find((round) => round.roundIndex === phase.roundIndex)?.delta;
      })
      .find((candidate): candidate is number => candidate !== null && candidate !== undefined) ??
    (previousAnalyses ?? (previousAnalysis ? [previousAnalysis] : []))
      .map((candidate) => candidate.find((round) => round.roundIndex === phase.roundIndex)?.delta)
      .find((candidate): candidate is number => candidate !== null && candidate !== undefined);
  if (previousDelta === null || previousDelta === undefined) {
    return ` Δ${delta}`;
  }

  const deltaDiff = delta - previousDelta;
  const deltaDiffLabel = deltaDiff > 0 ? ` ↑${deltaDiff}` : deltaDiff < 0 ? ` ↓${Math.abs(deltaDiff)}` : ' 0';

  return ` Δ${delta}${deltaDiffLabel}`;
}

function formatScrubTimeLabel(
  elapsedSec: number,
  samples: HeartRateSample[],
  phases?: WorkoutPhaseSegment[],
  analysis?: RoundAnalysis[],
  previousAnalysis?: RoundAnalysis[],
  previousAnalyses?: RoundAnalysis[][],
  previousSessions?: PreviousHeartGraphSession[]
): string {
  const phase = phases?.find((item) => elapsedSec >= item.startSec && elapsedSec < item.endSec) ?? phases?.at(-1);
  const phaseLabel = formatPhaseLabel(phase);
  const deltaLabel = formatDeltaLabel(phase, samples, phases, analysis, previousAnalysis, previousAnalyses, previousSessions);

  return phaseLabel ? `${formatElapsedTime(elapsedSec)} ${phaseLabel}${deltaLabel}` : formatElapsedTime(elapsedSec);
}

function getRange(samples: HeartRateSample[], nominalPeakHeartrate: number) {
  const values = samples.filter((sample) => sample.bpm !== null).map((sample) => sample.bpm as number);
  const maxBpm = values.length > 0 ? Math.max(nominalPeakHeartrate, ...values) : nominalPeakHeartrate;
  const minBpm = values.length > 0 ? Math.min(...values) : 50;

  return {
    min: Math.min(50, minBpm),
    max: Math.ceil(maxBpm / 10) * 10
  };
}

export function HeartGraph({
  samples,
  totalDurationSec,
  nominalPeakHeartrate,
  labelledAxes = false,
  onClick,
  clickLabel = 'Open heart graph details',
  scrubElapsedSec,
  heightClassName = 'h-44',
  lineThickness = 1.8,
  fillWidth = true,
  timeScale = 'samples',
  crosshairScrubber = false,
  phases,
  analysis,
  previousAnalysis,
  previousAnalyses,
  previousSessions,
  onScrubElapsedSecChange
}: HeartGraphProps) {
  const activeScrubPointerIdRef = useRef<number | null>(null);
  const width = 100;
  const height = crosshairScrubber ? 36 : 42;
  const chartHeight = crosshairScrubber ? 48 : 42;
  const viewBox = crosshairScrubber ? '0 -2 100 52' : '0 -2 100 46';
  const { min, max } = getRange(samples, nominalPeakHeartrate);
  const validSamples = samples.filter((sample) => sample.bpm !== null);
  const firstValidElapsedSec = validSamples[0]?.elapsedSec ?? 0;
  const lastValidElapsedSec = validSamples[validSamples.length - 1]?.elapsedSec ?? firstValidElapsedSec;
  const validElapsedRangeSec = Math.max(lastValidElapsedSec - firstValidElapsedSec, 1);
  const getSampleX = (sample: HeartRateSample) => {
    if (timeScale === 'duration') {
      return (sample.elapsedSec / Math.max(totalDurationSec, 1)) * width;
    }

    return validSamples.length === 1 ? 0 : ((sample.elapsedSec - firstValidElapsedSec) / validElapsedRangeSec) * width;
  };
  const getSampleY = (sample: HeartRateSample) => height - (((sample.bpm as number) - min) / Math.max(max - min, 1)) * height;

  const points = validSamples.length === 0
    ? `0,${height} ${width},${height}`
    : validSamples
    .flatMap((sample) => {
      const x = getSampleX(sample);
      const y = getSampleY(sample);
      return validSamples.length === 1 && timeScale === 'samples' ? [`0,${y}`, `${width},${y}`] : `${x},${y}`;
    })
    .join(' ');

  const gridlines = [];
  for (let bpm = 50; bpm <= max; bpm += 50) {
    const y = height - ((bpm - min) / Math.max(max - min, 1)) * height;
    gridlines.push(<line key={bpm} x1="0" x2={String(width)} y1={String(y)} y2={String(y)} stroke="var(--line)" stroke-dasharray="1 2" vector-effect="non-scaling-stroke" />);
  }

  const scrubX = scrubElapsedSec !== null && scrubElapsedSec !== undefined ? (scrubElapsedSec / Math.max(totalDurationSec, 1)) * width : null;
  const scrubSample = scrubElapsedSec !== null && scrubElapsedSec !== undefined && validSamples.length > 0
    ? validSamples.reduce((nearest, sample) =>
      Math.abs(sample.elapsedSec - scrubElapsedSec) < Math.abs(nearest.elapsedSec - scrubElapsedSec) ? sample : nearest
    )
    : null;
  const scrubY = scrubSample ? getSampleY(scrubSample) : null;
  const scrubPhase =
    scrubElapsedSec !== null && scrubElapsedSec !== undefined
      ? phases?.find((item) => scrubElapsedSec >= item.startSec && scrubElapsedSec < item.endSec) ?? phases?.at(-1)
      : undefined;
  const phaseMeasurement = scrubPhase && crosshairScrubber ? getPhaseMeasurement(scrubPhase, samples, phases) : null;
  const getElapsedX = (elapsedSec: number) => (elapsedSec / Math.max(totalDurationSec, 1)) * width;
  const phaseIntervalX = phaseMeasurement ? getElapsedX(phaseMeasurement.intervalStartSec) : null;
  const phaseIntervalWidth = phaseMeasurement
    ? Math.max(0, getElapsedX(phaseMeasurement.intervalEndSec) - getElapsedX(phaseMeasurement.intervalStartSec))
    : null;
  const minMarkerX = phaseMeasurement ? getElapsedX(phaseMeasurement.minElapsedSec) : null;
  const maxMarkerX = phaseMeasurement ? getElapsedX(phaseMeasurement.maxElapsedSec) : null;
  const scrubTimeLabel = scrubElapsedSec !== null && scrubElapsedSec !== undefined
    ? formatScrubTimeLabel(scrubElapsedSec, samples, phases, analysis, previousAnalysis, previousAnalyses, previousSessions)
    : null;
  const scrubLabelTransform =
    scrubX === null
      ? 'translateX(-50%) translateY(-50%)'
      : scrubX < 16
        ? 'translateX(0) translateY(-50%)'
        : scrubX > 84
          ? 'translateX(-100%) translateY(-50%)'
          : 'translateX(-50%) translateY(-50%)';
  const interactiveProps: JSX.HTMLAttributes<HTMLDivElement> = onClick
    ? {
        role: 'button',
        tabIndex: 0,
        'aria-label': clickLabel,
        onKeyDown: (event: KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onClick();
          }
        }
      }
    : {};
  const getElapsedSecFromPointerEvent = (event: PointerEvent) => {
    const bounds = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientX - bounds.left) / Math.max(bounds.width, 1), 0), 1);

    return Math.round(ratio * Math.max(totalDurationSec, 1));
  };
  const scrubPointerProps: JSX.HTMLAttributes<HTMLDivElement> = onScrubElapsedSecChange
    ? {
        onPointerDown: (event: PointerEvent) => {
          event.preventDefault();
          activeScrubPointerIdRef.current = event.pointerId;
          try {
            (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
          } catch {
            // Some test environments dispatch synthetic pointer events without an active pointer.
          }
          onScrubElapsedSecChange(getElapsedSecFromPointerEvent(event));
        },
        onPointerMove: (event: PointerEvent) => {
          if (event.buttons !== 1 || activeScrubPointerIdRef.current !== event.pointerId) {
            return;
          }

          onScrubElapsedSecChange(getElapsedSecFromPointerEvent(event));
        },
        onPointerUp: (event: PointerEvent) => {
          activeScrubPointerIdRef.current = null;
          if ((event.currentTarget as HTMLDivElement).hasPointerCapture(event.pointerId)) {
            (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
          }
        },
        onPointerCancel: (event: PointerEvent) => {
          activeScrubPointerIdRef.current = null;
          if ((event.currentTarget as HTMLDivElement).hasPointerCapture(event.pointerId)) {
            (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
          }
        }
      }
    : {};

  return (
    <div class="graph-surface relative w-full touch-none overflow-hidden rounded-[1.4rem] border border-[color:var(--line)]" onClick={onClick} {...interactiveProps} {...scrubPointerProps}>
      <svg viewBox={viewBox} preserveAspectRatio={fillWidth ? 'none' : 'xMidYMid meet'} class={`block ${heightClassName} w-full`}>
        {crosshairScrubber && phaseIntervalX !== null && phaseIntervalWidth !== null ? (
          <rect
            x={String(phaseIntervalX)}
            y="0"
            width={String(phaseIntervalWidth)}
            height={String(chartHeight)}
            fill="var(--accent)"
            opacity="0.1"
            data-testid="heart-graph-phase-interval"
          />
        ) : null}
        {crosshairScrubber ? null : gridlines}
        <polyline fill="none" stroke="var(--accent)" stroke-width={String(lineThickness)} stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" points={points} />
        {crosshairScrubber && minMarkerX !== null ? (
          <line
            x1={String(minMarkerX)}
            x2={String(minMarkerX)}
            y1="0"
            y2={String(chartHeight)}
            stroke="var(--muted)"
            stroke-width="1"
            stroke-dasharray="2 2"
            vector-effect="non-scaling-stroke"
            data-testid="heart-graph-min-marker"
          />
        ) : null}
        {crosshairScrubber && maxMarkerX !== null ? (
          <line
            x1={String(maxMarkerX)}
            x2={String(maxMarkerX)}
            y1="0"
            y2={String(chartHeight)}
            stroke="var(--accent)"
            stroke-width="1"
            stroke-dasharray="2 2"
            vector-effect="non-scaling-stroke"
            data-testid="heart-graph-max-marker"
          />
        ) : null}
        {scrubX !== null ? <line x1={String(scrubX)} x2={String(scrubX)} y1="0" y2={String(crosshairScrubber ? chartHeight : height)} stroke="var(--danger)" stroke-width="1" vector-effect="non-scaling-stroke" data-testid="heart-graph-scrubber" /> : null}
        {crosshairScrubber && scrubY !== null ? (
          <line
            x1="0"
            x2={String(width)}
            y1={String(scrubY)}
            y2={String(scrubY)}
            stroke="var(--danger)"
            stroke-width="1"
            vector-effect="non-scaling-stroke"
            data-testid="heart-graph-scrubber-horizontal"
          />
        ) : null}
      </svg>
      {crosshairScrubber && scrubSample && scrubY !== null ? (
        <span
          class="pointer-events-none absolute z-20 left-2 -translate-y-1/2 rounded-full bg-[color:var(--panel)] px-2 py-1 text-xs font-semibold tabular-nums text-[color:var(--danger)] shadow-sm"
          style={{ top: `${(scrubY / chartHeight) * 100}%` }}
          data-testid="heart-graph-crosshair-bpm"
        >
          {scrubSample.bpm} bpm
        </span>
      ) : null}
      {crosshairScrubber && scrubX !== null && scrubTimeLabel ? (
        <span
          class="pointer-events-none absolute z-20 max-w-[calc(100%_-_1rem)] overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-[color:var(--panel)] px-2 py-1 text-xs font-semibold tabular-nums text-[color:var(--danger)] shadow-sm"
          style={{ left: `${scrubX}%`, top: `${((height + 6) / chartHeight) * 100}%`, transform: scrubLabelTransform }}
          data-testid="heart-graph-crosshair-time"
        >
          {scrubTimeLabel}
        </span>
      ) : null}
      {labelledAxes && !crosshairScrubber ? (
        <div class="pointer-events-none absolute inset-0 text-sm font-medium text-[color:var(--muted)]" aria-hidden="true">
          <span class="absolute left-3 top-3">{max}</span>
          <span class="absolute bottom-7 left-3">{min}</span>
          <span class="absolute bottom-3 right-5">Time</span>
        </div>
      ) : null}
    </div>
  );
}
