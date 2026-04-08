import type { HeartRateSample } from '../../domain/shared/types';

interface HeartGraphProps {
  samples: HeartRateSample[];
  totalDurationSec: number;
  nominalPeakHeartrate: number;
  labelledAxes?: boolean;
  onClick?: () => void;
  scrubElapsedSec?: number | null;
  heightClassName?: string;
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
  scrubElapsedSec,
  heightClassName = 'h-44'
}: HeartGraphProps) {
  const width = 100;
  const height = 42;
  const { min, max } = getRange(samples, nominalPeakHeartrate);
  const validSamples = samples.filter((sample) => sample.bpm !== null);

  const points = validSamples
    .map((sample) => {
      const x = (sample.elapsedSec / Math.max(totalDurationSec, 1)) * width;
      const y = height - (((sample.bpm as number) - min) / Math.max(max - min, 1)) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const gridlines = [];
  for (let bpm = 50; bpm <= max; bpm += 50) {
    const y = height - ((bpm - min) / Math.max(max - min, 1)) * height;
    gridlines.push(<line x1="0" x2={String(width)} y1={String(y)} y2={String(y)} stroke="var(--line)" stroke-dasharray="1 2" />);
  }

  const scrubX = scrubElapsedSec !== null && scrubElapsedSec !== undefined ? (scrubElapsedSec / Math.max(totalDurationSec, 1)) * width : null;

  return (
    <div class="graph-surface rounded-[1.4rem] border border-[color:var(--line)] p-3" onClick={onClick}>
      <svg viewBox="-8 -2 116 52" class={`${heightClassName} w-full`}>
        {gridlines}
        {labelledAxes ? (
          <>
            <text x="-1" y="4" font-size="3.5" fill="var(--muted)">
              {max}
            </text>
            <text x="-1" y={String(height)} font-size="3.5" fill="var(--muted)">
              {min}
            </text>
            <text x="88" y="48" font-size="3.5" fill="var(--muted)">
              Time
            </text>
          </>
        ) : null}
        <polyline fill="none" stroke="var(--accent)" stroke-width="1.8" points={points || '0,42'} />
        {scrubX !== null ? <line x1={String(scrubX)} x2={String(scrubX)} y1="0" y2={String(height)} stroke="var(--danger)" stroke-width="1" /> : null}
      </svg>
    </div>
  );
}
