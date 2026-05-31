import { OverlayLayerPortal, SvgLayerPortal } from './LayeredHeartGraph';

interface CrosshairsProps {
  x: number;
  y: number;
  xLabel: string;
  yLabel: string;
  width?: number;
  height?: number;
}

export function Crosshairs({
  x,
  y,
  xLabel,
  yLabel,
  width = 100,
  height = 42,
}: CrosshairsProps) {
  const left = `${(x / Math.max(width, 1)) * 100}%`;
  const top = `${(y / Math.max(height, 1)) * 100}%`;
  const xLabelTransform =
    x < width * 0.16
      ? 'translateX(0) translateY(-50%)'
      : x > width * 0.84
        ? 'translateX(-100%) translateY(-50%)'
        : 'translateX(-50%) translateY(-50%)';

  return (
    <>
      <SvgLayerPortal>
        <line
          x1={String(x)}
          x2={String(x)}
          y1="0"
          y2={String(height)}
          stroke="var(--danger)"
          stroke-width="1"
          vector-effect="non-scaling-stroke"
          data-testid="layered-heart-graph-crosshair-vertical"
        />
        <line
          x1="0"
          x2={String(width)}
          y1={String(y)}
          y2={String(y)}
          stroke="var(--danger)"
          stroke-width="1"
          vector-effect="non-scaling-stroke"
          data-testid="layered-heart-graph-crosshair-horizontal"
        />
      </SvgLayerPortal>
      <OverlayLayerPortal>
        <span
          class="absolute left-2 -translate-y-1/2 rounded-full bg-[color:var(--panel)] px-2 py-1 text-xs font-semibold tabular-nums text-[color:var(--danger)] shadow-sm"
          style={{ top }}
          data-testid="layered-heart-graph-crosshair-y-label"
        >
          {yLabel}
        </span>
        <span
          class="absolute max-w-[calc(100%_-_1rem)] overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-[color:var(--panel)] px-2 py-1 text-xs font-semibold tabular-nums text-[color:var(--danger)] shadow-sm"
          style={{ left, top: '88%', transform: xLabelTransform }}
          data-testid="layered-heart-graph-crosshair-x-label"
        >
          {xLabel}
        </span>
      </OverlayLayerPortal>
    </>
  );
}
