import type { Interval } from '../../../domain/shared/types';
import { SvgLayerPortal } from './LayeredHeartGraph';

interface IntervalHighlightProps {
  interval: Interval;
  totalDurationSec: number;
  width?: number;
  height?: number;
}

function getX(elapsedSec: number, totalDurationSec: number, width: number): number {
  return (elapsedSec / Math.max(totalDurationSec, 1)) * width;
}

export function IntervalHighlight({
  interval,
  totalDurationSec,
  width = 100,
  height = 42,
}: IntervalHighlightProps) {
  const startX = getX(interval.start.elapsedSec, totalDurationSec, width);
  const endX = getX(interval.end.elapsedSec, totalDurationSec, width);
  const minX = getX(interval.min.elapsedSec, totalDurationSec, width);
  const maxX = getX(interval.max.elapsedSec, totalDurationSec, width);
  const leftX = Math.min(startX, endX);
  const highlightWidth = Math.abs(endX - startX);

  return (
    <SvgLayerPortal>
      <rect
        x={String(leftX)}
        y="0"
        width={String(highlightWidth)}
        height={String(height)}
        fill="var(--accent)"
        opacity="0.1"
        data-testid="layered-heart-graph-interval-highlight"
      />
      <line
        x1={String(maxX)}
        x2={String(maxX)}
        y1="0"
        y2={String(height)}
        stroke="var(--accent)"
        stroke-width="1"
        stroke-dasharray="2 2"
        vector-effect="non-scaling-stroke"
        data-testid="layered-heart-graph-interval-max-line"
      />
      <line
        x1={String(minX)}
        x2={String(minX)}
        y1="0"
        y2={String(height)}
        stroke="var(--muted)"
        stroke-width="1"
        stroke-dasharray="2 2"
        vector-effect="non-scaling-stroke"
        data-testid="layered-heart-graph-interval-min-line"
      />
    </SvgLayerPortal>
  );
}
