interface RoundTimingProps {
  roundName: string;
  countdownSeconds: number;
  remainingSeconds: number;
  emphasis?: 'work' | 'recovery';
}

function formatSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function RoundTiming({
  roundName,
  countdownSeconds,
  remainingSeconds,
  emphasis = 'recovery'
}: RoundTimingProps) {
  const emphasisClass = emphasis === 'work' ? 'text-[color:var(--danger)]' : 'text-[color:var(--accent)]';
  const labelClass = 'text-sm uppercase tracking-[0.18em]';
  const secondaryValueClass = 'text-4xl font-semibold leading-none';

  return (
    <div class="grid min-h-56 grid-rows-[auto_minmax(0,1fr)_auto_auto] rounded-[1.8rem] border border-[color:var(--line)] bg-[color:var(--panel)] px-5 py-4 text-center">
      <div class={`${labelClass} ${emphasisClass}`}>{roundName}</div>
      <div class="flex items-center justify-center text-6xl font-semibold leading-none">{formatSeconds(countdownSeconds)}</div>
      <div class={`${labelClass} text-[color:var(--muted)]`}>Remaining</div>
      <div class={`mt-1 ${secondaryValueClass}`} data-testid="round-timing-remaining-time">{formatSeconds(remainingSeconds)}</div>
    </div>
  );
}
