import { appStore } from '../../application/store';
import { HeartGraph } from '../components/HeartGraph';
import { RecoveryHistogram } from '../components/RecoveryHistogram';
import { WheelPicker } from '../components/WheelPicker';

function formatPhaseSeconds(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getRoundDisplayLabel(): string {
  const phase = appStore.currentPhase.value;

  if (!phase || phase.kind === 'countdown' || phase.kind === 'warmup') {
    return 'Warm up';
  }

  if (phase.kind === 'cooldown') {
    return 'Cool down';
  }

  return phase.roundIndex ? `Round ${phase.roundIndex}` : '-';
}

function getPhaseEmphasisClass(): string {
  const phase = appStore.currentPhase.value;
  return phase?.kind === 'work' ? 'text-[color:var(--danger)]' : 'text-[color:var(--accent)]';
}

export function HomeScreen() {
  const runtime = appStore.runtime.value;
  const profile = appStore.selectedProfile.value;
  const plan = appStore.currentPlan.value;
  const phase = appStore.currentPhase.value;

  const phaseRemaining =
    runtime.status === 'countdown'
      ? runtime.countdownRemainingSec
      : phase
        ? Math.max(0, phase.endSec - runtime.elapsedSec)
        : 0;

  const remaining = Math.max(0, plan.totalDurationSec - runtime.elapsedSec);

  if (runtime.status === 'idle' || runtime.status === 'connecting_hr') {
    return (
      <section class="screen-nonscroll flex flex-col items-center justify-center">
        <button
          type="button"
          onClick={() => appStore.connectDevice()}
          class="rounded-full bg-[color:var(--accent)] px-10 py-5 text-2xl font-semibold text-[color:var(--accent-ink)]"
        >
          Connect
        </button>
      </section>
    );
  }

  if (runtime.status === 'ready') {
    return (
      <section class="screen-nonscroll flex flex-col justify-center gap-8">
        <div class="space-y-2 text-center">
          <div class="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">Selected Profile</div>
          <div class="text-3xl font-semibold">{profile.name}</div>
          <div class="text-5xl font-semibold">{runtime.bpm ?? '--'}</div>
        </div>
        <div class="rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <div class="mb-4 text-center text-sm uppercase tracking-[0.16em] text-[color:var(--muted)]">Actual Work Duration</div>
          <div class="flex justify-center">
            <WheelPicker
              value={runtime.actualWorkDurationSec}
              min={Math.max(5, profile.workDurationSec - 20)}
              max={profile.workDurationSec + 10}
              onChange={(value) => appStore.setActualWorkDuration(value)}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => appStore.startSession()}
          class="rounded-full bg-[color:var(--accent)] px-10 py-5 text-2xl font-semibold text-[color:var(--accent-ink)]"
        >
          Start
        </button>
      </section>
    );
  }

  return (
    <section class="screen-nonscroll flex flex-col gap-3" onClick={() => (runtime.status === 'running' || runtime.status === 'paused') && appStore.togglePauseResume()}>
      <div class="rounded-[1.8rem] border border-[color:var(--line)] bg-[color:var(--panel)] px-5 py-4 text-center">
        <div class={`text-sm uppercase tracking-[0.18em] ${getPhaseEmphasisClass()}`}>
          {phase?.label ?? 'Warmup'}
        </div>
        <div class="text-6xl font-semibold leading-none">{formatPhaseSeconds(phaseRemaining)}</div>
      </div>
      <div class="grid grid-cols-3 gap-2 sm:gap-3">
        <div class="rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-4 text-center">
          <div class="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">Round</div>
          <div class={`mt-2 text-xl font-semibold leading-tight ${getPhaseEmphasisClass()}`}>{getRoundDisplayLabel()}</div>
        </div>
        <div class="rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-4 text-center">
          <div class="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">BPM</div>
          <div class="mt-2 text-3xl font-semibold">{runtime.bpm ?? '--'}</div>
        </div>
        <div class="rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-4 text-center">
          <div class="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">Remaining</div>
          <div class="mt-2 text-2xl font-semibold">{formatPhaseSeconds(remaining)}</div>
        </div>
      </div>
      <div class="min-h-0 flex flex-1 flex-col gap-3">
        <div class="min-h-0 flex-1">
          <HeartGraph
            samples={runtime.samples}
            totalDurationSec={plan.totalDurationSec}
            nominalPeakHeartrate={profile.nominalPeakHeartrate}
            scrubElapsedSec={runtime.status === 'completed' ? runtime.scrubElapsedSec : null}
            onClick={() => runtime.status === 'completed' && appStore.openCompletedSessionInHistory()}
            heightClassName="h-32 sm:h-40"
          />
        </div>
        <RecoveryHistogram
          rounds={appStore.homeComparison.value}
          onClick={() => runtime.status === 'completed' && appStore.openCompletedSessionInHistory()}
          heightClassName="h-16 sm:h-20"
        />
      </div>
      {runtime.status === 'completed' ? (
        <input
          class="w-full accent-[color:var(--accent)]"
          type="range"
          min="0"
          max={String(plan.totalDurationSec)}
          value={String(runtime.scrubElapsedSec ?? plan.totalDurationSec)}
          onInput={(event) => appStore.setScrubElapsedSec(Number((event.currentTarget as HTMLInputElement).value))}
        />
      ) : null}
    </section>
  );
}
