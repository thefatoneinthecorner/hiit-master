import type { HeartRateSample, SessionRecord } from '../../../domain/shared/types';
import { SvgLayerPortal } from './LayeredHeartGraph';

export function getSessionGraphRange(samples: HeartRateSample[], nominalPeakHeartrate: number) {
  const values = samples.filter((sample) => sample.bpm !== null).map((sample) => sample.bpm as number);
  const maxBpm = values.length > 0 ? Math.max(nominalPeakHeartrate, ...values) : nominalPeakHeartrate;
  const minBpm = values.length > 0 ? Math.min(...values) : 50;

  return {
    min: Math.min(50, minBpm),
    max: Math.ceil(maxBpm / 10) * 10,
  };
}

export function getSessionSampleY(session: SessionRecord, sample: HeartRateSample, height = 42): number {
  const { min, max } = getSessionGraphRange(session.samples, session.profileSnapshot.nominalPeakHeartrate);

  return height - (((sample.bpm as number) - min) / Math.max(max - min, 1)) * height;
}

function buildHeartRatePoints(session: SessionRecord): string {
  const validSamples = session.samples.filter((sample) => sample.bpm !== null);
  const width = 100;
  const height = 42;

  return validSamples
    .map((sample) => {
      const x = (sample.elapsedSec / Math.max(session.plan.totalDurationSec, 1)) * width;
      const y = getSessionSampleY(session, sample, height);

      return `${x},${y}`;
    })
    .join(' ');
}

export function SessionHeartRateLine({ session }: { session: SessionRecord }) {
  return (
    <SvgLayerPortal>
      <polyline
        data-testid="layered-heart-graph-heart-rate-line"
        fill="none"
        stroke="var(--accent)"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
        points={buildHeartRatePoints(session)}
      />
    </SvgLayerPortal>
  );
}
