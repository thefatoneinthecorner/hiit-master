import type { ComparisonRound } from '../../domain/shared/types';

interface RecoveryHistogramProps {
  rounds: ComparisonRound[];
  selectedRoundIndex?: number | null;
  onClick?: () => void;
  heightClassName?: string;
  showEmptyState?: boolean;
}

export function RecoveryHistogram({
  rounds,
  selectedRoundIndex = null,
  onClick,
  heightClassName = 'h-24',
  showEmptyState = false
}: RecoveryHistogramProps) {
  const hasComparableData = rounds.some((round) => round.previousDelta !== null);
  const diffs = rounds.map((round) => round.diffDelta ?? 0);
  const maxAbs = Math.max(1, ...diffs.map((diff) => Math.abs(diff)));

  return (
    <div class="graph-surface rounded-[1.2rem] border border-[color:var(--line)] p-3" onClick={onClick}>
      <svg viewBox="0 0 100 36" class={`${heightClassName} w-full`}>
        <line x1="0" x2="100" y1="18" y2="18" stroke="var(--line)" />
        {(showEmptyState && !hasComparableData ? [] : rounds).map((round, index) => {
          const width = 100 / Math.max(1, rounds.length);
          const x = index * width + 1;
          const diff = round.diffDelta ?? 0;
          const height = (Math.abs(diff) / maxAbs) * 15;
          const y = diff >= 0 ? 18 - height : 18;
          const fill = diff > 0 ? 'var(--accent)' : diff < 0 ? 'var(--danger)' : 'var(--line)';

          return (
            <g key={round.roundIndex}>
              <rect x={String(x)} y={String(y)} width={String(Math.max(4, width - 2))} height={String(Math.max(1, height))} fill={fill} rx="1.5" />
              {selectedRoundIndex === round.roundIndex ? (
                <text x={String(x + width / 2)} y="5" text-anchor="middle" font-size="3.5" fill="var(--muted)">
                  {round.roundIndex}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
