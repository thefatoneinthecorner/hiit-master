import { appStore } from '../../application/store';
import { HeartGraph } from '../components/HeartGraph';
import { RecoveryHistogram } from '../components/RecoveryHistogram';

function formatSeconds(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function HistoryScreen() {
  const session = appStore.historySession.value;
  const scrub = appStore.historyScrub.value;

  if (!session) {
    return <section class="px-1 py-10 text-center text-[color:var(--muted)]"> </section>;
  }

  const selectedRound =
    session.analysis.find((round) => scrub.elapsedSec >= round.recoveryWindowStartSec && scrub.elapsedSec <= round.recoveryWindowEndSec) ??
    session.analysis.at(-1) ??
    null;

  let touchStartX = 0;

  return (
    <section
      class="space-y-4 pb-8"
      onTouchStart={(event) => {
        touchStartX = event.changedTouches[0]?.clientX ?? 0;
      }}
      onTouchEnd={(event) => {
        const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartX;
        if (Math.abs(delta) > 48) {
          appStore.stepHistory(delta > 0 ? 1 : -1);
        }
      }}
    >
      <header class="flex items-start justify-between gap-3">
        <div>
          <div class="text-2xl font-semibold">{session.name}</div>
          <div class="text-sm text-[color:var(--muted)]">{session.profileName}</div>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="hidden rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-2 md:block" onClick={() => appStore.stepHistory(1)}>
            ‹
          </button>
          <button
            type="button"
            class="rounded-full bg-[color:var(--danger)] px-4 py-2 text-sm font-semibold text-[color:var(--danger-ink)]"
            onClick={() => appStore.deleteHistorySession(session.id)}
            aria-label="Delete session"
          >
            🗑
          </button>
          <button type="button" class="hidden rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] px-3 py-2 md:block" onClick={() => appStore.stepHistory(-1)}>
            ›
          </button>
        </div>
      </header>
      <HeartGraph
        samples={session.samples}
        totalDurationSec={session.plan.totalDurationSec}
        nominalPeakHeartrate={session.profileSnapshot.nominalPeakHeartrate}
        labelledAxes
        scrubElapsedSec={appStore.runtime.value.scrubElapsedSec ?? session.plan.totalDurationSec}
      />
      <input
        class="w-full accent-[color:var(--accent)]"
        type="range"
        min="0"
        max={String(session.plan.totalDurationSec)}
        value={String(appStore.runtime.value.scrubElapsedSec ?? session.plan.totalDurationSec)}
        onInput={(event) => appStore.setScrubElapsedSec(Number((event.currentTarget as HTMLInputElement).value))}
      />
      <div class="grid grid-cols-3 gap-3 rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
        <div>
          <div class="text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">Round</div>
          <div class="mt-1 text-xl font-semibold">{selectedRound?.roundIndex ?? '-'}</div>
        </div>
        <div>
          <div class="text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">Time</div>
          <div class="mt-1 text-xl font-semibold">{formatSeconds(Math.round(scrub.elapsedSec))}</div>
        </div>
        <div>
          <div class="text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">BPM</div>
          <div class="mt-1 text-xl font-semibold">{scrub.bpm ?? '--'}</div>
        </div>
      </div>
      <RecoveryHistogram
        rounds={appStore.historyComparison.value}
        roundDurationsSec={session.plan.rounds.map((round) => round.nominalRoundDurationSec)}
        selectedRoundIndex={selectedRound?.roundIndex ?? null}
        showEmptyState
      />
      <div class="grid grid-cols-2 gap-3 rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
        <div>
          <div class="text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">Peak</div>
          <div class="mt-1 text-xl font-semibold">{selectedRound?.peak ?? '--'}</div>
        </div>
        <div>
          <div class="text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">Trough</div>
          <div class="mt-1 text-xl font-semibold">{selectedRound?.trough ?? '--'}</div>
        </div>
        <div>
          <div class="text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">Delta</div>
          <div class="mt-1 text-xl font-semibold">{selectedRound?.delta ?? '--'}</div>
        </div>
        <div>
          <div class="text-xs uppercase tracking-[0.14em] text-[color:var(--muted)]">Delta Diff</div>
          <div class="mt-1 text-xl font-semibold">{appStore.historyComparison.value[(selectedRound?.roundIndex ?? 1) - 1]?.diffDelta ?? '--'}</div>
        </div>
      </div>
      <table class="w-full text-left text-sm">
        <thead class="text-[color:var(--muted)]">
          <tr>
            <th class="py-2">Round</th>
            <th class="py-2">Peak</th>
            <th class="py-2">Trough</th>
            <th class="py-2">Delta</th>
            <th class="py-2">Delta Diff</th>
          </tr>
        </thead>
        <tbody>
          {session.analysis.map((round, index) => (
            <tr key={round.roundIndex} class="border-t border-[color:var(--line)]">
              <td class="py-2">{round.roundIndex}</td>
              <td class="py-2">{round.peak ?? '--'}</td>
              <td class="py-2">{round.trough ?? '--'}</td>
              <td class="py-2">{round.delta ?? '--'}</td>
              <td class="py-2">{appStore.historyComparison.value[index]?.diffDelta ?? '--'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
