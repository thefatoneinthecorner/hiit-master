import type { JSX } from 'preact';
import type { HeartRateSample } from '../../domain/shared/types';

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
  timeScale = 'samples'
}: HeartGraphProps) {
  const width = 100;
  const height = 42;
  const viewBox = '0 -2 100 46';
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

  const points = validSamples.length === 0
    ? `0,${height} ${width},${height}`
    : validSamples
    .flatMap((sample) => {
      const x = getSampleX(sample);
      const y = height - (((sample.bpm as number) - min) / Math.max(max - min, 1)) * height;
      return validSamples.length === 1 && timeScale === 'samples' ? [`0,${y}`, `${width},${y}`] : `${x},${y}`;
    })
    .join(' ');

  const gridlines = [];
  for (let bpm = 50; bpm <= max; bpm += 50) {
    const y = height - ((bpm - min) / Math.max(max - min, 1)) * height;
    gridlines.push(<line key={bpm} x1="0" x2={String(width)} y1={String(y)} y2={String(y)} stroke="var(--line)" stroke-dasharray="1 2" vector-effect="non-scaling-stroke" />);
  }

  const scrubX = scrubElapsedSec !== null && scrubElapsedSec !== undefined ? (scrubElapsedSec / Math.max(totalDurationSec, 1)) * width : null;
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

  return (
    <div class="graph-surface relative w-full overflow-hidden rounded-[1.4rem] border border-[color:var(--line)]" onClick={onClick} {...interactiveProps}>
      <svg viewBox={viewBox} preserveAspectRatio={fillWidth ? 'none' : 'xMidYMid meet'} class={`block ${heightClassName} w-full`}>
        {gridlines}
        <polyline fill="none" stroke="var(--accent)" stroke-width={String(lineThickness)} stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" points={points} />
        {scrubX !== null ? <line x1={String(scrubX)} x2={String(scrubX)} y1="0" y2={String(height)} stroke="var(--danger)" stroke-width="1" vector-effect="non-scaling-stroke" data-testid="heart-graph-scrubber" /> : null}
      </svg>
      {labelledAxes ? (
        <div class="pointer-events-none absolute inset-0 text-sm font-medium text-[color:var(--muted)]" aria-hidden="true">
          <span class="absolute left-3 top-3">{max}</span>
          <span class="absolute bottom-7 left-3">{min}</span>
          <span class="absolute bottom-3 right-5">Time</span>
        </div>
      ) : null}
    </div>
  );
}
