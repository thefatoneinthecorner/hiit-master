import type { JSX } from 'preact';
import { useRef, useState } from 'preact/hooks';

export interface NormalisedCovPoint {
  date: string;
  profileName?: string;
  actualWorkDurationSec?: number | null;
  value: number | null;
}

interface NormalisedCovGraphProps {
  points: NormalisedCovPoint[];
  referenceDate?: string;
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  heightClassName?: string;
}

const displayScale = 10_000;
const shortDateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: '2-digit',
});

function getUtcDay(value: string): number {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function formatNegativeDayGap(date: string, referenceDate: string): string {
  const daysAgo = Math.max(0, Math.round((getUtcDay(referenceDate) - getUtcDay(date)) / 86_400_000));

  return `-${daysAgo}d`;
}

function formatValue(value: number): string {
  return (value * displayScale).toFixed(2);
}

function formatActualWorkDuration(value: number | null | undefined): string {
  return value === null || value === undefined ? '--' : `${value}s work`;
}

export function formatNormalisedCovPointLabel(point: NormalisedCovPoint | null): string {
  if (!point) {
    return '--';
  }

  return `${point.profileName ?? '--'}, ${formatActualWorkDuration(point.actualWorkDurationSec)}`;
}

export function NormalisedCovGraph({
  points,
  referenceDate = new Date().toISOString(),
  selectedIndex,
  onSelectedIndexChange,
  heightClassName = 'h-48',
}: NormalisedCovGraphProps) {
  const [isInfoVisible, setIsInfoVisible] = useState(false);
  const activePointerIdRef = useRef<number | null>(null);
  const validPoints = points
    .map((point, sourceIndex) => ({ ...point, sourceIndex }))
    .filter((point): point is NormalisedCovPoint & { sourceIndex: number; value: number } => point.value !== null && point.value > 0);
  const activeIndex = Math.min(Math.max(selectedIndex ?? validPoints.length - 1, 0), Math.max(validPoints.length - 1, 0));
  const activePoint = validPoints[activeIndex] ?? null;
  const values = validPoints.map((point) => point.value);
  const rawMinValue = values.length > 0 ? Math.min(...values) : 0;
  const rawMaxValue = values.length > 0 ? Math.max(...values) : 1;
  const valueRange = Math.max(rawMaxValue - rawMinValue, 0.0001);
  const minValue = Math.max(0, rawMinValue - valueRange * 0.12);
  const maxValue = rawMaxValue + valueRange * 0.12;
  const width = 100;
  const chartHeight = 46;
  const plotTop = 3;
  const plotHeight = 34;
  const dateLabelY = 41;
  const horizontalInset = 5;
  const plotWidth = width - horizontalInset * 2;
  const times = validPoints.map((point) => new Date(point.date).getTime());
  const firstTime = times[0] ?? 0;
  const lastTime = times[times.length - 1] ?? firstTime;
  const timeRange = Math.max(lastTime - firstTime, 1);
  const getX = (index: number) =>
    validPoints.length === 1 ? 50 : horizontalInset + (((times[index] ?? firstTime) - firstTime) / timeRange) * plotWidth;
  const getY = (value: number) => plotTop + plotHeight - ((value - minValue) / Math.max(maxValue - minValue, 0.0001)) * plotHeight;
  const linePoints = validPoints.map((point, index) => `${getX(index)},${getY(point.value)}`).join(' ');
  const scrubX = activePoint ? getX(activeIndex) : null;
  const scrubY = activePoint ? getY(activePoint.value) : null;
  const scrubLabelTransform =
    scrubX === null
      ? 'translateX(-50%) translateY(-50%)'
      : scrubX < 16
        ? 'translateX(0) translateY(-50%)'
        : scrubX > 84
          ? 'translateX(-100%) translateY(-50%)'
          : 'translateX(-50%) translateY(-50%)';
  const getNearestIndexByTime = (value: number): number => {
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const [index, time] of times.entries()) {
      const distance = Math.abs(time - value);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    }

    return nearestIndex;
  };
  const selectIndex = (index: number) => {
    if (validPoints.length === 0) {
      return;
    }

    onSelectedIndexChange?.(Math.min(Math.max(index, 0), validPoints.length - 1));
  };
  const selectFromClientX = (clientX: number, bounds: DOMRect) => {
    if (validPoints.length === 0) {
      return;
    }

    const ratio = Math.min(Math.max((clientX - bounds.left) / Math.max(bounds.width, 1), 0), 1);
    selectIndex(getNearestIndexByTime(firstTime + ratio * timeRange));
  };
  const scrubInteractionProps: JSX.HTMLAttributes<HTMLDivElement> = {
    role: 'slider',
    tabIndex: validPoints.length === 0 ? -1 : 0,
    'aria-label': 'Normalised CoV scrub position',
    'aria-valuemin': 0,
    'aria-valuemax': Math.max(validPoints.length - 1, 0),
    'aria-valuenow': activeIndex,
    'aria-disabled': validPoints.length === 0 ? 'true' : undefined,
    'aria-valuetext': activePoint
      ? `${shortDateFormatter.format(new Date(activePoint.date))}, ${formatValue(activePoint.value)}`
      : 'No data',
    onPointerDown: (event: PointerEvent) => {
      event.preventDefault();
      const target = event.currentTarget as HTMLDivElement;

      activePointerIdRef.current = event.pointerId;
      target.setPointerCapture?.(event.pointerId);
      selectFromClientX(event.clientX, target.getBoundingClientRect());
    },
    onPointerMove: (event: PointerEvent) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      selectFromClientX(event.clientX, (event.currentTarget as HTMLDivElement).getBoundingClientRect());
    },
    onPointerUp: (event: PointerEvent) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      const target = event.currentTarget as HTMLDivElement;

      activePointerIdRef.current = null;
      target.releasePointerCapture?.(event.pointerId);
    },
    onPointerCancel: (event: PointerEvent) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }

      const target = event.currentTarget as HTMLDivElement;

      activePointerIdRef.current = null;
      target.releasePointerCapture?.(event.pointerId);
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        selectIndex(activeIndex - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        selectIndex(activeIndex + 1);
      }
      if (event.key === 'Home') {
        event.preventDefault();
        selectIndex(0);
      }
      if (event.key === 'End') {
        event.preventDefault();
        selectIndex(validPoints.length - 1);
      }
    },
  };
  const bands: Array<{ startIndex: number; endIndex: number; key: string }> = [];

  for (const [index, point] of validPoints.entries()) {
    const key = `${point.profileName ?? ''}-${point.actualWorkDurationSec ?? ''}`;
    const currentBand = bands[bands.length - 1];

    if (!currentBand || currentBand.key !== key) {
      bands.push({ startIndex: index, endIndex: index, key });
    } else {
      currentBand.endIndex = index;
    }
  }

  const getBandStartX = (index: number) => index === 0 ? horizontalInset : (getX(index - 1) + getX(index)) / 2;
  const getBandEndX = (index: number) =>
    index >= validPoints.length - 1 ? width - horizontalInset : (getX(index) + getX(index + 1)) / 2;

  return (
    <section class="w-full">
      <div class="mb-3">
        <div class="flex items-center gap-2">
          <h2 class="text-sm font-medium tracking-[0.12em] text-[color:var(--muted)]" aria-label="Normalised CoV" data-testid="normalised-cov-title">
            <span>N</span>
            <span class="[font-variant-caps:all-small-caps]" data-testid="normalised-cov-title-smallcaps">ormalised</span>
            <span> C</span>
            <span class="[font-variant-caps:all-small-caps]" data-testid="normalised-cov-title-smallcaps">o</span>
            <span>V</span>
          </h2>
          <button
            type="button"
            class="flex h-6 w-6 items-center justify-center rounded-full border border-[color:var(--line)] text-xs font-semibold text-[color:var(--muted)] transition-colors hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
            aria-controls="normalised-cov-info"
            aria-expanded={isInfoVisible}
            aria-label="Show Normalised CoV information"
            onClick={() => setIsInfoVisible((visible) => !visible)}
          >
            i
          </button>
        </div>
        {isInfoVisible ? (
          <p id="normalised-cov-info" class="mt-2 text-sm leading-6 text-[color:var(--muted)]">
            Normalised CoV tracks how variable your recovery rates are across sessions, scaled to make small changes easier to compare. Lower values indicate more consistent recovery.
          </p>
        ) : null}
      </div>
      <div
        class="graph-surface relative w-full touch-none overflow-hidden rounded-[1.4rem] border border-[color:var(--line)]"
        data-testid="normalised-cov-graph-surface"
        {...scrubInteractionProps}
      >
        <svg viewBox={`0 0 100 ${chartHeight}`} preserveAspectRatio="none" class={`${heightClassName} block w-full`}>
          {bands.map((band, index) => {
            const x = getBandStartX(band.startIndex);
            const bandWidth = getBandEndX(band.endIndex) - x;

            return (
              <rect
                key={`${band.key}-${band.startIndex}`}
                x={String(x)}
                y="0"
                width={String(bandWidth)}
                height={String(chartHeight)}
                fill={index % 2 === 0 ? '#efe3cf' : '#d8e6df'}
                data-testid="normalised-cov-profile-band"
              />
            );
          })}
          {linePoints ? (
            <polyline
              fill="none"
              stroke="var(--accent)"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
              vector-effect="non-scaling-stroke"
              points={linePoints}
            />
          ) : null}
          {scrubX !== null ? (
            <>
              <line
                x1={String(scrubX)}
                x2={String(scrubX)}
                y1="0"
                y2={String(chartHeight)}
                stroke="var(--danger)"
                stroke-width="1"
                vector-effect="non-scaling-stroke"
                data-testid="normalised-cov-scrubber"
              />
              {scrubY !== null ? (
                <line
                  x1={String(horizontalInset)}
                  x2={String(width - horizontalInset)}
                  y1={String(scrubY)}
                  y2={String(scrubY)}
                  stroke="var(--danger)"
                  stroke-width="1"
                  vector-effect="non-scaling-stroke"
                  data-testid="normalised-cov-scrubber-horizontal"
                />
              ) : null}
            </>
          ) : null}
        </svg>
        {activePoint && scrubY !== null ? (
          <span
            class="pointer-events-none absolute z-20 left-2 -translate-y-1/2 rounded-full bg-[color:var(--panel)] px-2 py-1 text-xs font-semibold tabular-nums text-[color:var(--danger)] shadow-sm"
            style={{ top: `${(scrubY / chartHeight) * 100}%` }}
            data-testid="normalised-cov-crosshair-value"
          >
            {formatValue(activePoint.value)}
          </span>
        ) : null}
        {activePoint && scrubX !== null ? (
          <span
            class="pointer-events-none absolute z-20 max-w-[calc(100%_-_1rem)] overflow-hidden text-ellipsis whitespace-nowrap rounded-full bg-[color:var(--panel)] px-2 py-1 text-xs font-semibold tabular-nums text-[color:var(--danger)] shadow-sm"
            style={{ left: `${scrubX}%`, top: `${(dateLabelY / chartHeight) * 100}%`, transform: scrubLabelTransform }}
            data-testid="normalised-cov-crosshair-date"
          >
            {shortDateFormatter.format(new Date(activePoint.date))} ({formatNegativeDayGap(activePoint.date, referenceDate)})
          </span>
        ) : null}
        {validPoints.map((point, index) => (
          <span
            key={`${point.date}-${index}`}
            class="pointer-events-none absolute z-10 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--accent)]"
            style={{ left: `${getX(index)}%`, top: `${(getY(point.value) / chartHeight) * 100}%` }}
            data-testid="normalised-cov-point"
            aria-hidden="true"
          />
        ))}
      </div>
    </section>
  );
}
