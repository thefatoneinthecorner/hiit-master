import { useEffect, useMemo, useState } from 'preact/hooks';
import { analyzeRoundRecoveries, buildDiffDeltas, type RoundWindow } from '../../domain/analysis/recovery';
import { selectPreviousComparisonSession } from '../../domain/session/eligibility';
import { buildWorkoutPlan } from '../../domain/workout/plan';
import { useAppState } from '../../application/session/AppStateContext';

export function HistoryScreen() {
  const {
    currentHistoryIndex,
    currentHistorySession,
    deleteHistorySession,
    historySessions,
    profile,
    showAdjacentHistorySession,
  } = useAppState();
  const [scrubIndex, setScrubIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    setScrubIndex(0);
  }, [currentHistorySession?.id]);

  const historyPlan = useMemo(() => {
    if (currentHistorySession === null) {
      return null;
    }

    return buildWorkoutPlan(profile, currentHistorySession.actualWorkDurationSec);
  }, [currentHistorySession, profile]);

  const roundWindows = useMemo(() => {
    if (historyPlan === null) {
      return [] as RoundWindow[];
    }

    const workPhases = historyPlan.phases.filter((phase) => phase.kind === 'work');

    return workPhases.map((phase, index) => ({
      roundIndex: phase.roundIndex ?? index + 1,
      workStartSec: phase.startSec,
      workEndSec: phase.endSec,
      recoveryStartSec: phase.endSec,
      nextWorkEndSec: workPhases[index + 1]?.endSec ?? null,
    }));
  }, [historyPlan]);

  const previousSession = useMemo(() => {
    if (currentHistorySession === null) {
      return null;
    }

    return selectPreviousComparisonSession(currentHistorySession, historySessions) ?? null;
  }, [currentHistorySession, historySessions]);

  const currentRecoveries = useMemo(() => {
    if (currentHistorySession === null) {
      return [];
    }

    return analyzeRoundRecoveries(
      currentHistorySession.samples,
      roundWindows,
      currentHistorySession.nominalWorkDurationSec,
    );
  }, [currentHistorySession, roundWindows]);

  const previousRecoveries = useMemo(() => {
    if (previousSession === null || currentHistorySession === null) {
      return [];
    }

    return analyzeRoundRecoveries(
      previousSession.samples,
      roundWindows,
      currentHistorySession.nominalWorkDurationSec,
    );
  }, [currentHistorySession, previousSession, roundWindows]);

  const diffDeltas = useMemo(
    () => buildDiffDeltas(currentRecoveries, previousRecoveries),
    [currentRecoveries, previousRecoveries],
  );

  const samples = currentHistorySession?.samples ?? [];
  const selectedSample = samples[Math.min(scrubIndex, Math.max(0, samples.length - 1))] ?? null;
  const selectedRound =
    historyPlan === null || selectedSample === null
      ? null
      : historyPlan.phases.find(
          (phase) =>
            phase.roundIndex !== null &&
            selectedSample.elapsedSec >= phase.startSec &&
            selectedSample.elapsedSec < phase.endSec,
        )?.roundIndex ?? null;

  const selectedRoundRecovery =
    selectedRound === null ? null : currentRecoveries.find((entry) => entry.roundIndex === selectedRound) ?? null;
  const selectedRoundDiff =
    selectedRound === null ? null : diffDeltas.find((entry) => entry.roundIndex === selectedRound) ?? null;

  if (currentHistorySession === null) {
    return (
      <section class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
        <h2 class="font-display text-3xl">History</h2>
        <p class="mt-3 text-sm leading-6 text-app-muted">
          No completed sessions yet. Finish a workout from Home to unlock History.
        </p>
      </section>
    );
  }

  const histogramBars = buildHistoryHistogramBars(diffDeltas);
  const heartBars = buildHistoryHeartBars(samples, profile.nominalPeakHeartrate);

  return (
    <section
      class="mx-auto max-w-5xl space-y-5"
      onTouchStart={(event) => {
        setTouchStartX(event.changedTouches[0]?.clientX ?? null);
      }}
      onTouchEnd={(event) => {
        const endX = event.changedTouches[0]?.clientX ?? null;

        if (touchStartX === null || endX === null) {
          return;
        }

        const deltaX = endX - touchStartX;

        if (deltaX > 60) {
          showAdjacentHistorySession(1);
        } else if (deltaX < -60) {
          showAdjacentHistorySession(-1);
        }
      }}
    >
      <header class="flex flex-wrap items-start justify-between gap-4 rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
        <div>
          <p class="text-xs uppercase tracking-[0.28em] text-app-muted">History</p>
          <h2 class="mt-3 font-display text-4xl">{formatSessionTitle(currentHistorySession.startedAt)}</h2>
          <p class="mt-3 text-sm leading-6 text-app-muted">
            Profile: {currentHistorySession.profileName}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous session"
            onClick={() => showAdjacentHistorySession(1)}
            disabled={currentHistoryIndex >= historySessions.length - 1}
            class="inline-flex h-12 w-12 items-center justify-center rounded-full border border-app-line bg-app-canvas text-lg disabled:opacity-35"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next session"
            onClick={() => showAdjacentHistorySession(-1)}
            disabled={currentHistoryIndex <= 0}
            class="inline-flex h-12 w-12 items-center justify-center rounded-full border border-app-line bg-app-canvas text-lg disabled:opacity-35"
          >
            ›
          </button>
          <button
            type="button"
            aria-label="Delete session"
            onClick={() => deleteHistorySession(currentHistorySession.id)}
            class="inline-flex min-h-12 items-center justify-center rounded-[1.2rem] bg-rose-700 px-4 text-sm font-semibold text-white"
          >
            Trash
          </button>
        </div>
      </header>

      <section class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
        <div class="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-app-muted">
          <span>Heart Graph</span>
          <span>Axes: BPM x Time</span>
        </div>
        <div class="mt-4 grid grid-cols-[auto_1fr] gap-4">
          <div class="flex flex-col justify-between text-xs text-app-muted">
            <span>{profile.nominalPeakHeartrate} bpm</span>
            <span>{Math.max(40, profile.nominalPeakHeartrate - 100)} bpm</span>
          </div>
          <div class="rounded-[1.5rem] bg-app-canvas p-4">
            <div class="flex h-44 items-end gap-2">
              {heartBars.map((height, index) => (
                <div key={`history-heart-${index + 1}`} class="flex-1 rounded-t-2xl bg-app-accent/80" style={{ height: `${height}%` }} />
              ))}
            </div>
            <div class="mt-3 flex justify-between text-xs text-app-muted">
              <span>Time</span>
              <span>{formatSeconds(samples.at(-1)?.elapsedSec ?? 0)}</span>
            </div>
          </div>
        </div>

        {samples.length > 0 ? (
          <input
            type="range"
            min="0"
            max={`${Math.max(0, samples.length - 1)}`}
            value={`${Math.min(scrubIndex, Math.max(0, samples.length - 1))}`}
            onInput={(event) => {
              const nextValue = Number((event.currentTarget as HTMLInputElement).value);
              setScrubIndex(nextValue);
            }}
            class="mt-5 w-full accent-[rgb(var(--app-accent))]"
          />
        ) : null}

        <div class="mt-5 grid gap-3 sm:grid-cols-3">
          <ReadoutCard label="Round" value={selectedRound === null ? '--' : `Round ${selectedRound}`} />
          <ReadoutCard label="Time" value={selectedSample === null ? '--:--' : formatSeconds(selectedSample.elapsedSec)} />
          <ReadoutCard label="BPM" value={selectedSample?.bpm === null || selectedSample === null ? '--' : `${selectedSample.bpm}`} />
        </div>
      </section>

      <section class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
        <p class="text-xs uppercase tracking-[0.28em] text-app-muted">Recovery Delta Histogram</p>
        <div class="relative mt-5 rounded-[1.5rem] bg-app-canvas p-4">
          <div class="pointer-events-none absolute left-4 right-4 top-1/2 h-px bg-app-line/80" />
          <div class="flex h-40 items-end gap-3">
            {histogramBars.length > 0
              ? histogramBars.map((bar) => (
                  <button
                    key={`history-histogram-${bar.roundIndex}`}
                    type="button"
                    onClick={() => {
                      const sampleIndex = samples.findIndex((sample) => {
                        const phase = historyPlan?.phases.find(
                          (candidate) =>
                            candidate.roundIndex === bar.roundIndex &&
                            sample.elapsedSec >= candidate.startSec &&
                            sample.elapsedSec < candidate.endSec,
                        );

                        return phase !== undefined;
                      });

                      if (sampleIndex >= 0) {
                        setScrubIndex(sampleIndex);
                      }
                    }}
                    class="flex h-full flex-1 items-end justify-center"
                    aria-label={`Round ${bar.roundIndex}`}
                  >
                    <div class={`w-full rounded-t-2xl ${bar.tone}`} style={{ height: `${bar.height}%` }} />
                  </button>
                ))
              : currentRecoveries.map((entry) => (
                  <div key={`history-histogram-empty-${entry.roundIndex}`} class="flex h-full flex-1 items-end justify-center">
                    <div class="w-full rounded-t-2xl bg-stone-300" style={{ height: '0%' }} />
                  </div>
                ))}
          </div>
        </div>
      </section>

      <section class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
        <p class="text-xs uppercase tracking-[0.28em] text-app-muted">Selected Round Stats</p>
        <div class="mt-5 grid gap-3 sm:grid-cols-4">
          <ReadoutCard label="Peak" value={formatMetric(selectedRoundRecovery?.peak ?? null)} />
          <ReadoutCard label="Trough" value={formatMetric(selectedRoundRecovery?.trough ?? null)} />
          <ReadoutCard label="Delta" value={formatMetric(selectedRoundRecovery?.delta ?? null)} />
          <ReadoutCard label="Delta Diff" value={formatSignedMetric(selectedRoundDiff?.diffDelta ?? null)} />
        </div>
      </section>

      <section class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
        <p class="text-xs uppercase tracking-[0.28em] text-app-muted">Round Data</p>
        <div class="mt-5 overflow-x-auto">
          <table class="min-w-full text-left text-sm">
            <thead class="text-app-muted">
              <tr>
                <th class="pb-3 pr-4 font-medium">Round</th>
                <th class="pb-3 pr-4 font-medium">Peak</th>
                <th class="pb-3 pr-4 font-medium">Trough</th>
                <th class="pb-3 pr-4 font-medium">Delta</th>
                <th class="pb-3 font-medium">Delta Diff</th>
              </tr>
            </thead>
            <tbody>
              {currentRecoveries.map((recovery) => {
                const diffEntry = diffDeltas.find((entry) => entry.roundIndex === recovery.roundIndex);

                return (
                  <tr key={`round-row-${recovery.roundIndex}`} class="border-t border-app-line/60">
                    <td class="py-3 pr-4">Round {recovery.roundIndex}</td>
                    <td class="py-3 pr-4">{formatMetric(recovery.peak)}</td>
                    <td class="py-3 pr-4">{formatMetric(recovery.trough)}</td>
                    <td class="py-3 pr-4">{formatMetric(recovery.delta)}</td>
                    <td class="py-3">{formatSignedMetric(diffEntry?.diffDelta ?? null)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

type ReadoutCardProps = {
  label: string;
  value: string;
};

function ReadoutCard({ label, value }: ReadoutCardProps) {
  return (
    <div class="rounded-[1.4rem] bg-app-canvas px-4 py-4">
      <p class="text-xs uppercase tracking-[0.28em] text-app-muted">{label}</p>
      <p class="mt-3 font-display text-2xl">{value}</p>
    </div>
  );
}

function buildHistoryHeartBars(
  samples: readonly { bpm: number | null }[],
  nominalPeakHeartrate: number,
) {
  if (samples.length === 0) {
    return Array.from({ length: 10 }, () => 0);
  }

  const bucketSize = Math.max(1, Math.ceil(samples.length / 10));
  const chartCeiling = Math.max(
    nominalPeakHeartrate,
    ...samples.map((sample) => sample.bpm ?? nominalPeakHeartrate),
  );

  return Array.from({ length: 10 }, (_, index) => {
    const bucket = samples.slice(index * bucketSize, (index + 1) * bucketSize);

    if (bucket.length === 0) {
      return 0;
    }

    const bucketPeak = Math.max(...bucket.map((sample) => sample.bpm ?? 0));
    return Math.max(5, Math.round((bucketPeak / chartCeiling) * 100));
  });
}

function buildHistoryHistogramBars(
  diffDeltas: readonly { roundIndex: number; diffDelta: number | null }[],
) {
  return diffDeltas.map((entry) => ({
    roundIndex: entry.roundIndex,
    height: Math.min(100, Math.round(Math.abs(entry.diffDelta ?? 0) * 2.4)),
    tone:
      entry.diffDelta === null
        ? 'bg-stone-300'
        : entry.diffDelta > 0
          ? 'bg-emerald-700'
          : entry.diffDelta < 0
            ? 'bg-rose-700'
            : 'bg-stone-500',
  }));
}

function formatSessionTitle(startedAt: string) {
  const date = new Date(startedAt);

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`;
}

function formatMetric(value: number | null) {
  return value === null ? '--' : `${value} bpm`;
}

function formatSignedMetric(value: number | null) {
  if (value === null) {
    return '--';
  }

  return `${value > 0 ? '+' : ''}${value} bpm`;
}
