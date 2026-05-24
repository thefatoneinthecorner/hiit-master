import type { JSX } from 'preact';
import type { ComparisonRound } from '../../domain/shared/types';

interface RecoveryHistogramProps {
  rounds: ComparisonRound[];
  roundDurationsSec?: number[];
  roundEndElapsedSec?: number[];
  timelineDurationSec?: number;
  scrubElapsedSec?: number | null;
  selectedRoundIndex?: number | null;
  onClick?: () => void;
  clickLabel?: string;
  heightClassName?: string;
  showEmptyState?: boolean;
  scaleMaxAbs?: number;
}

export function RecoveryHistogram({
  rounds,
  roundDurationsSec,
  roundEndElapsedSec,
  timelineDurationSec,
  scrubElapsedSec,
  selectedRoundIndex = null,
  onClick,
  clickLabel = 'Open recovery comparison details',
  heightClassName = 'h-24',
  showEmptyState = false,
  scaleMaxAbs
}: RecoveryHistogramProps) {
  const hasComparableData = rounds.some((round) => round.previousDelta !== null);
  const diffs = rounds.map((round) => round.diffDelta ?? 0);
  const maxAbs = scaleMaxAbs !== undefined ? Math.max(1, scaleMaxAbs) : Math.max(1, ...diffs.map((diff) => Math.abs(diff)));
  const magnitudeLabel = showEmptyState && !hasComparableData ? 0 : maxAbs;
  const fallbackDurations = rounds.map(() => 1);
  const durations = (roundDurationsSec && roundDurationsSec.length > 0 ? roundDurationsSec : fallbackDurations)
    .map((duration) => Math.max(1, duration));
  const totalDurationSec = Math.max(1, timelineDurationSec ?? durations.reduce((total, duration) => total + duration, 0));
  const scrubX = scrubElapsedSec !== null && scrubElapsedSec !== undefined ? (scrubElapsedSec / totalDurationSec) * 100 : null;
  const minRoundDurationSec = Math.min(...durations);
  const barWidth = (minRoundDurationSec / totalDurationSec) * 100 * 0.9;
  const getRoundEndSec = (round: ComparisonRound, index: number) => {
    const explicitRoundEndSec = roundEndElapsedSec?.[round.roundIndex - 1];
    if (explicitRoundEndSec !== undefined) {
      return explicitRoundEndSec;
    }

    if (roundDurationsSec && roundDurationsSec.length > 0) {
      return durations
        .slice(0, Math.max(0, round.roundIndex))
        .reduce((total, duration) => total + duration, 0);
    }

    return index + 1;
  };

  const plottedRounds = (showEmptyState && !hasComparableData ? [] : rounds).map((round, index) => {
    const endX = (getRoundEndSec(round, index) / totalDurationSec) * 100;
    const x = Math.max(0, endX - barWidth);
    const diff = round.diffDelta ?? 0;
    const height = (Math.abs(diff) / maxAbs) * 15;
    const y = diff >= 0 ? 18 - height : 18;
    const fill = diff > 0 ? 'var(--accent)' : diff < 0 ? 'var(--danger)' : 'var(--line)';

    return {
      round,
      x,
      endX,
      width: barWidth,
      y,
      height: Math.max(1, height),
      fill,
      selected: selectedRoundIndex === round.roundIndex
    };
  });

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
    <div class="graph-surface relative w-full overflow-hidden rounded-[1.2rem] border border-[color:var(--line)]" onClick={onClick} {...interactiveProps}>
      <span class="pointer-events-none absolute left-4 top-3 z-10 text-sm font-semibold tabular-nums leading-none text-[color:var(--muted)]" data-testid="recovery-histogram-magnitude">
        {magnitudeLabel}
      </span>
      <svg viewBox="0 0 100 36" preserveAspectRatio="none" class={`${heightClassName} block w-full`}>
        <line x1="0" x2="100" y1="18" y2="18" stroke="var(--line)" vector-effect="non-scaling-stroke" />
        {plottedRounds.map((plot) => (
          <rect
            key={plot.round.roundIndex}
            x={String(plot.x)}
            y={String(plot.y)}
            width={String(plot.width)}
            height={String(plot.height)}
            fill={plot.fill}
            vector-effect="non-scaling-stroke"
          />
        ))}
        {scrubX !== null ? <line x1={String(scrubX)} x2={String(scrubX)} y1="0" y2="36" stroke="var(--danger)" stroke-width="1" vector-effect="non-scaling-stroke" data-testid="recovery-histogram-scrubber" /> : null}
      </svg>
      {plottedRounds.map((plot) =>
        plot.selected ? (
          <span
            key={plot.round.roundIndex}
            class="pointer-events-none absolute top-2 -translate-x-1/2 text-sm font-medium text-[color:var(--muted)]"
            style={{ left: `${plot.x + plot.width / 2}%` }}
            aria-hidden="true"
          >
            {plot.round.roundIndex}
          </span>
        ) : null
      )}
    </div>
  );
}
