import { useLocation } from 'preact-iso';
import { useAppState } from '../../application/session/AppStateContext';

export function HomeScreen() {
  const { route } = useLocation();
  const {
    actualWorkDurationSec,
    availableHistoryCount,
    canOpenHistory,
    connectMonitor,
    countdownRemainingSec,
    currentPhase,
    currentRecoveries,
    currentSamples,
    diffDeltas,
    elapsedSec,
    liveBpm,
    phaseRemainingSec,
    plan,
    previousComparisonSession,
    profile,
    progressPercent,
    resetSession,
    resumeSession,
    setActualWorkDurationSec,
    stage,
    startSession,
    pauseSession,
    showLatestHistorySession,
    totalRemainingSec,
  } = useAppState();

  const isDisconnected = stage === 'idle' && liveBpm === null;
  const showSessionLayout = stage === 'countdown' || stage === 'running' || stage === 'paused' || stage === 'completed';
  const isConnectedSetup = stage === 'idle' && liveBpm !== null;
  const heartGraphBars = buildHeartGraphBars(currentSamples, profile.nominalPeakHeartrate, stage);
  const recoveryBars = buildRecoveryBars(diffDeltas, currentRecoveries, elapsedSec, stage);
  const activeRoundRecovery =
    currentPhase?.roundIndex === null || currentPhase?.roundIndex === undefined
      ? null
      : currentRecoveries.find((recovery) => recovery.roundIndex === currentPhase.roundIndex) ?? null;
  const activeRoundDiff =
    currentPhase?.roundIndex === null || currentPhase?.roundIndex === undefined
      ? null
      : diffDeltas.find((entry) => entry.roundIndex === currentPhase.roundIndex) ?? null;

  if (isDisconnected) {
    return (
      <section class="flex min-h-[70vh] items-center justify-center">
        <div class="w-full max-w-md rounded-[2rem] border border-app-line bg-app-panel px-8 py-12 text-center shadow-card">
          <p class="text-xs uppercase tracking-[0.34em] text-app-muted">Disconnected</p>
          <h2 class="mt-4 font-display text-5xl leading-none">Home</h2>
          <p class="mt-5 text-sm leading-6 text-app-muted">
            Connect a heart-rate monitor to prepare the next session.
          </p>
          <button
            type="button"
            onClick={connectMonitor}
            class="mt-10 inline-flex min-h-14 w-full items-center justify-center rounded-[1.5rem] bg-app-accent px-6 text-base font-semibold text-app-canvas"
          >
            Connect
          </button>
        </div>
      </section>
    );
  }

  if (isConnectedSetup) {
    return (
      <section class="mx-auto grid max-w-3xl gap-5 md:grid-cols-[1.4fr_0.9fr]">
        <div class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
          <p class="text-xs uppercase tracking-[0.34em] text-app-muted">Ready</p>
          <h2 class="mt-3 font-display text-4xl leading-none">Start Session</h2>
          <div class="mt-8 grid gap-4 sm:grid-cols-2">
            <MetricCard label="Live BPM" value={liveBpm === null ? '--' : `${liveBpm}`} accent="text-app-accent" />
            <MetricCard label="Selected Profile" value={profile.name} />
          </div>
          <div class="mt-8 rounded-[1.75rem] bg-app-canvas p-5">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-[0.28em] text-app-muted">Actual Work Duration</p>
                <p class="mt-2 font-display text-4xl">{actualWorkDurationSec}s</p>
              </div>
              <div class="flex gap-3">
                <StepperButton
                  label="Decrease actual work duration"
                  onClick={() => setActualWorkDurationSec(actualWorkDurationSec - 1)}
                >
                  -
                </StepperButton>
                <StepperButton
                  label="Increase actual work duration"
                  onClick={() => setActualWorkDurationSec(actualWorkDurationSec + 1)}
                >
                  +
                </StepperButton>
              </div>
            </div>
            <p class="mt-3 text-sm leading-6 text-app-muted">
              Nominal work duration is {profile.workDurationSec}s. Recovery phases absorb the difference.
            </p>
          </div>
          <button
            type="button"
            onClick={startSession}
            class="mt-8 inline-flex min-h-14 w-full items-center justify-center rounded-[1.5rem] bg-app-accent px-6 text-base font-semibold text-app-canvas"
          >
            Start
          </button>
        </div>

        <aside class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
          <p class="text-xs uppercase tracking-[0.28em] text-app-muted">Session Shape</p>
          <ul class="mt-5 space-y-3 text-sm leading-6">
            <li class="rounded-2xl bg-app-canvas px-4 py-3">Warmup: {profile.warmupSec}s</li>
            <li class="rounded-2xl bg-app-canvas px-4 py-3">Rounds: {profile.baseRestsSec.length}</li>
            <li class="rounded-2xl bg-app-canvas px-4 py-3">Nominal Peak: {profile.nominalPeakHeartrate} bpm</li>
          </ul>
        </aside>
      </section>
    );
  }

  if (!showSessionLayout) {
    return null;
  }

  return (
    <section class="mx-auto max-w-4xl space-y-5">
      <div class="grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <div class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class={`text-xs uppercase tracking-[0.34em] ${stage === 'countdown' ? 'text-app-accent' : 'text-app-muted'}`}>
                {stage === 'countdown' ? `Countdown ${countdownRemainingSec}` : stageLabel(stage)}
              </p>
              <h2 class="mt-3 font-display text-5xl leading-none">
                {formatSeconds(phaseRemainingSec)}
              </h2>
            </div>
            <MetricPill label="BPM" value={liveBpm === null ? '--' : `${liveBpm}`} />
          </div>

          <div class="mt-8 grid gap-3 sm:grid-cols-3">
            <SessionReadout label="Round" value={currentPhase?.label ?? 'Warmup'} />
            <SessionReadout label="Remaining" value={formatSeconds(totalRemainingSec)} />
            <SessionReadout label="Workout" value={plan === null ? '--' : `${plan.actualWorkDurationSec}s`} />
          </div>

          <div class="mt-6 rounded-[1.5rem] bg-app-canvas p-4">
            <div class="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.28em] text-app-muted">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div class="mt-3 h-3 overflow-hidden rounded-full bg-app-panel">
              <div
                class={`h-full rounded-full ${stage === 'countdown' ? 'bg-app-accent/70' : 'bg-app-accent'}`}
                style={{ width: `${Math.max(progressPercent, stage === 'countdown' ? 2 : 0)}%` }}
              />
            </div>
          </div>

          {stage === 'countdown' ? (
            <p class="mt-6 rounded-2xl bg-app-canvas px-4 py-3 text-sm leading-6 text-app-muted">
              Session layout is already visible before the startup beeps finish.
            </p>
          ) : null}

          {stage === 'completed' ? (
            <p class="mt-6 rounded-2xl bg-app-canvas px-4 py-3 text-sm leading-6 text-app-muted">
              Timer remains on zero and the graph is frozen. Tap a graph below to inspect this session in History.
            </p>
          ) : null}

          <div class="mt-8 flex flex-wrap gap-3">
            {stage === 'running' ? (
              <button
                type="button"
                onClick={pauseSession}
                class="inline-flex min-h-12 items-center justify-center rounded-[1.2rem] border border-app-line bg-app-canvas px-5 text-sm font-semibold"
              >
                Pause
              </button>
            ) : null}
            {stage === 'paused' ? (
              <button
                type="button"
                onClick={resumeSession}
                class="inline-flex min-h-12 items-center justify-center rounded-[1.2rem] border border-app-line bg-app-canvas px-5 text-sm font-semibold"
              >
                Resume
              </button>
            ) : null}
            {(stage === 'paused' || stage === 'completed') ? (
              <button
                type="button"
                onClick={resetSession}
                class="inline-flex min-h-12 items-center justify-center rounded-[1.2rem] bg-app-accent px-5 text-sm font-semibold text-app-canvas"
              >
                Return To Setup
              </button>
            ) : null}
          </div>
        </div>

        <div class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
          <p class="text-xs uppercase tracking-[0.28em] text-app-muted">Current Phase</p>
          <h3 class="mt-3 font-display text-3xl">{currentPhase?.label ?? 'Warmup'}</h3>
          <p class="mt-4 text-sm leading-6 text-app-muted">
            {currentPhase?.kind === 'warmup' && 'Warmup is active before the first work interval.'}
            {currentPhase?.kind === 'work' && 'Work interval in progress. Recovery will stretch to preserve round duration.'}
            {currentPhase?.kind === 'recovery' && 'Recovery interval in progress. Histogram updates against the previous session.'}
            {currentPhase?.kind === 'cooldown' && 'Cooldown is active. The workout is winding down to completion.'}
          </p>
          {plan !== null ? <PhaseTimeline phases={plan.phases} activePhaseLabel={currentPhase?.label ?? null} elapsedSec={elapsedSec} /> : null}
        </div>
      </div>

      <div class="grid gap-5 md:grid-cols-[1.6fr_1fr]">
        <GraphPanel
          eyebrow="Heart Graph"
          title={`Nominal Peak ${profile.nominalPeakHeartrate} bpm`}
          description={
            currentSamples.length > 0
              ? `Showing ${currentSamples.length} sampled points from this session.`
              : 'Live heart-rate trace will begin once the workout starts.'
          }
          bars={heartGraphBars}
          {...(stage === 'completed' && canOpenHistory
            ? {
                onClick: () => {
                  showLatestHistorySession();
                  route('/history');
                },
              }
            : {})}
        />
        <GraphPanel
          eyebrow="Recovery Delta Histogram"
          title="Current vs previous recovery"
          description={
            previousComparisonSession !== null
              ? `Comparing against ${previousComparisonSession.startedAt.slice(0, 10)}. ${availableHistoryCount} session${availableHistoryCount === 1 ? '' : 's'} available in History.`
              : canOpenHistory
                ? `No prior comparison session yet. ${availableHistoryCount} session${availableHistoryCount === 1 ? '' : 's'} available in History.`
                : 'No comparison session yet. Complete this workout to unlock History.'
          }
          bars={recoveryBars}
          mode="histogram"
          {...(stage === 'completed' && canOpenHistory
            ? {
                onClick: () => {
                  showLatestHistorySession();
                  route('/history');
                },
              }
            : {})}
        />
      </div>

      <section class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.28em] text-app-muted">Recovery Snapshot</p>
            <h3 class="mt-3 font-display text-3xl">
              {currentPhase?.roundIndex ? `Round ${currentPhase.roundIndex}` : 'Warmup'}
            </h3>
          </div>
          <p class="max-w-xs text-right text-sm leading-6 text-app-muted">
            {previousComparisonSession !== null
              ? 'Live recovery is compared against the most recent eligible session on this profile.'
              : 'Recovery comparison will populate after there is at least one earlier eligible session.'}
          </p>
        </div>

        <div class="mt-6 grid gap-3 sm:grid-cols-4">
          <SnapshotStat label="Peak" value={formatBpm(activeRoundRecovery?.peak ?? null)} />
          <SnapshotStat label="Trough" value={formatBpm(activeRoundRecovery?.trough ?? null)} />
          <SnapshotStat label="Delta" value={formatBpm(activeRoundRecovery?.delta ?? null)} />
          <SnapshotStat
            label="Delta Diff"
            value={formatSignedBpm(activeRoundDiff?.diffDelta ?? null)}
            tone={getDiffTone(activeRoundDiff?.diffDelta ?? null)}
          />
        </div>
      </section>
    </section>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  accent?: string;
};

function MetricCard({ label, value, accent = '' }: MetricCardProps) {
  return (
    <div class="rounded-[1.5rem] bg-app-canvas px-4 py-5">
      <p class="text-xs uppercase tracking-[0.28em] text-app-muted">{label}</p>
      <p class={`mt-3 font-display text-3xl ${accent}`}>{value}</p>
    </div>
  );
}

type StepperButtonProps = {
  children: string;
  label: string;
  onClick: () => void;
};

function StepperButton({ children, label, onClick }: StepperButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      class="inline-flex h-12 w-12 items-center justify-center rounded-full border border-app-line bg-app-panel text-xl font-semibold"
    >
      {children}
    </button>
  );
}

type MetricPillProps = {
  label: string;
  value: string;
};

function MetricPill({ label, value }: MetricPillProps) {
  return (
    <div class="rounded-[1.4rem] bg-app-canvas px-4 py-3 text-right">
      <p class="text-xs uppercase tracking-[0.28em] text-app-muted">{label}</p>
      <p class="mt-2 font-display text-3xl">{value}</p>
    </div>
  );
}

type SessionReadoutProps = {
  label: string;
  value: string;
};

function SessionReadout({ label, value }: SessionReadoutProps) {
  return (
    <div class="rounded-[1.4rem] bg-app-canvas px-4 py-4">
      <p class="text-xs uppercase tracking-[0.28em] text-app-muted">{label}</p>
      <p class="mt-3 font-display text-2xl">{value}</p>
    </div>
  );
}

type SnapshotStatProps = {
  label: string;
  tone?: 'positive' | 'negative' | 'neutral';
  value: string;
};

function SnapshotStat({ label, tone = 'neutral', value }: SnapshotStatProps) {
  const toneClass =
    tone === 'positive'
      ? 'text-app-accent'
      : tone === 'negative'
        ? 'text-rose-700'
        : 'text-app-ink';

  return (
    <div class="rounded-[1.4rem] bg-app-canvas px-4 py-4">
      <p class="text-xs uppercase tracking-[0.28em] text-app-muted">{label}</p>
      <p class={`mt-3 font-display text-2xl ${toneClass}`}>{value}</p>
    </div>
  );
}

type GraphPanelProps = {
  bars: readonly GraphBar[];
  description: string;
  eyebrow: string;
  mode?: 'chart' | 'histogram';
  onClick?: () => void;
  title: string;
};

type GraphBar = {
  height: number;
  tone?: 'positive' | 'negative' | 'neutral' | 'muted';
};

function GraphPanel({ bars, description, eyebrow, mode = 'chart', onClick, title }: GraphPanelProps) {
  const isInteractive = onClick !== undefined;

  return (
    <section
      class={`rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card ${isInteractive ? 'transition-transform hover:-translate-y-0.5' : ''}`}
    >
      <p class="text-xs uppercase tracking-[0.28em] text-app-muted">{eyebrow}</p>
      <h3 class="mt-3 font-display text-3xl">{title}</h3>
      <button
        type="button"
        onClick={onClick}
        disabled={!isInteractive}
        class={`mt-6 flex h-48 w-full items-end gap-2 rounded-[1.75rem] bg-app-canvas px-4 py-4 text-left ${isInteractive ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {mode === 'histogram' ? <HistogramBaseline /> : null}
        {bars.map((bar, index) => (
          <div key={`${eyebrow}-${index + 1}`} class="relative flex h-full flex-1 items-end justify-center">
            <div
              class={`w-full rounded-t-2xl ${getBarToneClass(bar.tone ?? 'muted', mode)}`}
              style={{ height: `${Math.max(0, bar.height)}%` }}
            />
          </div>
        ))}
      </button>
      <p class="mt-4 text-sm leading-6 text-app-muted">{description}</p>
    </section>
  );
}

function HistogramBaseline() {
  return <div class="pointer-events-none absolute left-4 right-4 top-1/2 h-px bg-app-line/80" />;
}

function getBarToneClass(
  tone: 'positive' | 'negative' | 'neutral' | 'muted',
  mode: 'chart' | 'histogram',
) {
  if (mode === 'chart') {
    return 'bg-app-accent/80';
  }

  if (tone === 'positive') {
    return 'bg-emerald-700';
  }

  if (tone === 'negative') {
    return 'bg-rose-700';
  }

  if (tone === 'neutral') {
    return 'bg-stone-500';
  }

  return 'bg-stone-300';
}

type PhaseTimelineProps = {
  activePhaseLabel: string | null;
  elapsedSec: number;
  phases: readonly {
    kind: string;
    label: string;
    durationSec: number;
    startSec: number;
    endSec: number;
  }[];
};

function PhaseTimeline({ activePhaseLabel, elapsedSec, phases }: PhaseTimelineProps) {
  return (
    <ol class="mt-6 space-y-2">
      {phases.map((phase) => {
        const isActive = phase.label === activePhaseLabel;
        const isComplete = elapsedSec >= phase.endSec;

        return (
          <li
            key={`${phase.label}-${phase.startSec}`}
            class={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm ${
              isActive
                ? 'bg-app-accent text-app-canvas'
                : isComplete
                  ? 'bg-app-canvas text-app-muted'
                  : 'bg-app-canvas/60 text-app-ink'
            }`}
          >
            <span>{phase.label}</span>
            <span>{phase.durationSec}s</span>
          </li>
        );
      })}
    </ol>
  );
}

function formatSeconds(value: number | null) {
  if (value === null) {
    return '--:--';
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return `${minutes}:${`${seconds}`.padStart(2, '0')}`;
}

function formatBpm(value: number | null) {
  if (value === null) {
    return '--';
  }

  return `${value} bpm`;
}

function formatSignedBpm(value: number | null) {
  if (value === null) {
    return '--';
  }

  if (value === 0) {
    return '0 bpm';
  }

  return `${value > 0 ? '+' : ''}${value} bpm`;
}

function getDiffTone(value: number | null) {
  if (value === null || value === 0) {
    return 'neutral';
  }

  return value > 0 ? 'positive' : 'negative';
}

function stageLabel(stage: string) {
  if (stage === 'paused') {
    return 'Paused';
  }

  if (stage === 'completed') {
    return 'Completed';
  }

  return 'Running';
}

function buildHeartGraphBars(
  samples: readonly { bpm: number | null }[],
  nominalPeakHeartrate: number,
  stage: string,
) {
  if (samples.length === 0) {
    return stage === 'countdown'
      ? [18, 20, 19, 22, 21, 24, 26, 28].map((height) => ({ height, tone: 'muted' as const }))
      : Array.from({ length: 8 }, () => ({ height: 0, tone: 'muted' as const }));
  }

  const bucketSize = Math.max(1, Math.ceil(samples.length / 8));
  const chartCeiling = Math.max(
    nominalPeakHeartrate,
    ...samples.map((sample) => sample.bpm ?? nominalPeakHeartrate),
  );

  return Array.from({ length: 8 }, (_, index) => {
    const bucket = samples.slice(index * bucketSize, (index + 1) * bucketSize);

    if (bucket.length === 0) {
      return { height: 0, tone: 'muted' as const };
    }

    const bucketPeak = Math.max(...bucket.map((sample) => sample.bpm ?? 0));
    return {
      height: Math.max(6, Math.round((bucketPeak / chartCeiling) * 100)),
      tone: 'muted' as const,
    };
  });
}

function buildRecoveryBars(
  diffDeltas: readonly { roundIndex: number; diffDelta: number | null }[],
  currentRecoveries: readonly { roundIndex: number; revealAtSec: number | null }[],
  elapsedSec: number,
  stage: string,
) {
  if (stage === 'countdown') {
    return [0, 0, 0, 0].map((height) => ({ height, tone: 'muted' as const }));
  }

  if (diffDeltas.length === 0) {
    return currentRecoveries.slice(0, 4).map(() => ({ height: 0, tone: 'muted' as const }));
  }

  return diffDeltas.slice(0, 4).map((entry) => {
    const revealAtSec = currentRecoveries.find((recovery) => recovery.roundIndex === entry.roundIndex)?.revealAtSec;

    if (stage !== 'completed' && revealAtSec != null && elapsedSec < revealAtSec) {
      return { height: 0, tone: 'muted' as const };
    }

    const magnitude = Math.min(100, Math.round(Math.abs(entry.diffDelta ?? 0) * 2.4));
    return {
      height: magnitude,
      tone:
        entry.diffDelta === null
          ? 'muted'
          : entry.diffDelta > 0
            ? 'positive'
            : entry.diffDelta < 0
              ? 'negative'
              : 'neutral',
    } as const;
  });
}
