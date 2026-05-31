import { appStore } from '../../application/store';
import type { SessionRuntime, SettingsMode } from '../../application/store';
import { getProfileBpmTargets } from '../../domain/shared/profile';
import type { ComparisonRound, HeartRateSample, SessionProfile, WorkoutPhaseSegment, WorkoutPlan } from '../../domain/shared/types';
import { LayeredHeartGraph, SvgLayerPortal } from '../components/LayeredHeartGraph';
import { Pulse } from '../components/Pulse';
import { RecoveryHistogram } from '../components/RecoveryHistogram';
import { RoundTiming } from '../components/RoundTiming';
import { SessionDisplay } from '../components/SessionDisplay';
import { SliderToggle } from '../components/SliderToggle';
import { WheelPicker } from '../components/WheelPicker';

function formatPhaseSeconds(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getRoundDisplayLabel(phase: WorkoutPhaseSegment | null): string {
  if (!phase || phase.kind === 'countdown' || phase.kind === 'warmup') {
    return 'Warm up';
  }

  if (phase.kind === 'cooldown') {
    return 'Cool down';
  }

  return phase.roundIndex ? `Round ${phase.roundIndex}` : '-';
}

function getSessionDisplayRoundName(phase: WorkoutPhaseSegment | null): string {
  if (!phase || phase.kind === 'countdown' || phase.kind === 'warmup') {
    return 'Warmup';
  }

  if (phase.kind === 'cooldown') {
    return 'Cooldown';
  }

  if (!phase.roundIndex) {
    return '-';
  }

  return `Round ${phase.roundIndex}: ${phase.kind === 'work' ? 'Work' : 'Rest'}`;
}

function getPhaseEmphasisClass(phase: WorkoutPhaseSegment | null): string {
  return phase?.kind === 'work' ? 'text-[color:var(--danger)]' : 'text-[color:var(--accent)]';
}

function getBpmPhaseTarget(profile: SessionProfile, phase: WorkoutPhaseSegment | null): number | null {
  if (!phase?.roundIndex || (phase.kind !== 'work' && phase.kind !== 'rest')) {
    return null;
  }

  const target = getProfileBpmTargets(profile)[phase.roundIndex - 1];
  if (!target) {
    return null;
  }

  return phase.kind === 'work' ? target.maxBpm : target.minBpm;
}

function getRoundEndElapsedSec(plan: WorkoutPlan): number[] {
  return plan.rounds.map((round) => {
    const restPhase = plan.phases.find((phase) => phase.kind === 'rest' && phase.roundIndex === round.roundIndex);
    const workPhase = plan.phases.find((phase) => phase.kind === 'work' && phase.roundIndex === round.roundIndex);

    return restPhase?.endSec ?? workPhase?.endSec ?? plan.totalDurationSec;
  });
}

function getLayeredGraphRange(samples: HeartRateSample[], nominalPeakHeartrate: number) {
  const values = samples.filter((sample) => sample.bpm !== null).map((sample) => sample.bpm as number);
  const maxBpm = values.length > 0 ? Math.max(nominalPeakHeartrate, ...values) : nominalPeakHeartrate;
  const minBpm = values.length > 0 ? Math.min(...values) : 50;

  return {
    min: Math.min(50, minBpm),
    max: Math.ceil(maxBpm / 10) * 10,
  };
}

function FallbackLayeredHeartGraph({
  samples,
  totalDurationSec,
  nominalPeakHeartrate,
}: {
  samples: HeartRateSample[];
  totalDurationSec: number;
  nominalPeakHeartrate: number;
}) {
  const width = 100;
  const height = 42;
  const validSamples = samples.filter((sample) => sample.bpm !== null);
  const { min, max } = getLayeredGraphRange(samples, nominalPeakHeartrate);
  const points = validSamples.length === 0
    ? `0,${height} ${width},${height}`
    : validSamples
      .map((sample) => {
        const x = (sample.elapsedSec / Math.max(totalDurationSec, 1)) * width;
        const y = height - (((sample.bpm as number) - min) / Math.max(max - min, 1)) * height;

        return `${x},${y}`;
      })
      .join(' ');

  return (
    <LayeredHeartGraph heightClassName="h-32 sm:h-40">
      <SvgLayerPortal>
        <polyline
          data-testid="home-fallback-layered-heart-graph-line"
          fill="none"
          stroke="var(--accent)"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
          points={points}
        />
      </SvgLayerPortal>
    </LayeredHeartGraph>
  );
}

interface HomeScreenViewProps {
  runtime: SessionRuntime;
  profile: SessionProfile;
  plan: WorkoutPlan;
  phase: WorkoutPhaseSegment | null;
  homeComparison: ComparisonRound[];
  showNoComparableSessionWarning: boolean;
  sensorName?: string | null;
  batteryPercent?: number | null;
  onConnectDevice: () => void;
  onReconnectDevice: () => void;
  onSetActualWorkDuration: (value: number) => void;
  settingsMode: SettingsMode;
  onSetSettingsMode: (value: SettingsMode) => void;
  onStartSession: () => void;
  onTogglePauseResume: () => void;
  onStopSession: () => void;
  onOpenCompletedSessionInHistory: () => void;
  onSetScrubElapsedSec: (value: number) => void;
}

export function HomeScreenView({
  runtime,
  profile,
  plan,
  phase,
  homeComparison,
  showNoComparableSessionWarning,
  sensorName,
  batteryPercent,
  onConnectDevice,
  onReconnectDevice,
  onSetActualWorkDuration,
  settingsMode,
  onSetSettingsMode,
  onStartSession,
  onTogglePauseResume,
  onStopSession,
  onOpenCompletedSessionInHistory,
  onSetScrubElapsedSec
}: HomeScreenViewProps) {
  const phaseRemaining =
    runtime.status === 'countdown'
      ? runtime.countdownRemainingSec
      : settingsMode === 'bpm' && phase && (phase.kind === 'warmup' || phase.kind === 'cooldown')
        ? Math.max(0, phase.durationSec - runtime.phaseElapsedSec)
        : settingsMode === 'bpm'
          ? 0
          : phase
            ? Math.max(0, phase.endSec - runtime.elapsedSec)
            : 0;

  const remaining = Math.max(0, plan.totalDurationSec - runtime.elapsedSec);
  const targetBpm = settingsMode === 'bpm' ? getBpmPhaseTarget(profile, phase) : null;

  if (runtime.status === 'idle' || runtime.status === 'connecting_hr') {
    return (
      <section class="screen-nonscroll flex flex-col items-center justify-center gap-6">
        <SliderToggle
          label="Settings mode"
          value={settingsMode}
          options={[
            { value: 'duration', label: 'Duration' },
            { value: 'bpm', label: 'BPM' },
          ]}
          onChange={(value) => onSetSettingsMode(value as SettingsMode)}
        />
        <button
          type="button"
          onClick={onConnectDevice}
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
          <div class="flex items-center justify-center gap-4 text-5xl font-semibold">
            <Pulse
              key={runtime.bpmPulseAt}
              active={runtime.bpm !== null}
              beating={runtime.bpm !== null}
              class="text-6xl leading-none"
            />
            <span>{runtime.bpm ?? '--'}</span>
          </div>
        </div>
        {settingsMode === 'duration' ? (
          <div class="rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
            <div class="mb-4 text-center text-sm uppercase tracking-[0.16em] text-[color:var(--muted)]">Actual Work Duration</div>
            <div class="flex justify-center">
              <WheelPicker
                value={runtime.actualWorkDurationSec}
                min={Math.max(5, profile.workDurationSec - 20)}
                max={profile.workDurationSec + 10}
                onChange={onSetActualWorkDuration}
              />
            </div>
          </div>
        ) : null}
        {showNoComparableSessionWarning ? (
          <div
            role="status"
            class="rounded-[1.4rem] border border-[color:var(--danger)] bg-[color:var(--danger-ink)] px-5 py-4 text-center text-base font-semibold text-[color:var(--danger)]"
          >
            No comparable previous session for this profile
          </div>
        ) : null}
        <button
          type="button"
          onClick={onStartSession}
          class="rounded-full bg-[color:var(--accent)] px-10 py-5 text-2xl font-semibold text-[color:var(--accent-ink)]"
        >
          Start
        </button>
      </section>
    );
  }

  if (runtime.status === 'countdown' || runtime.status === 'running' || runtime.status === 'paused' || runtime.status === 'completed') {
    return (
      <section class="screen-nonscroll">
        <SessionDisplay
          roundName={getSessionDisplayRoundName(phase)}
          countdownSeconds={phaseRemaining}
          targetBpm={targetBpm}
          remainingSeconds={remaining}
          timingEmphasis={phase?.kind === 'work' ? 'work' : 'recovery'}
          bpm={runtime.bpm}
          pulseActive={runtime.bpm !== null}
          pulseBeating={runtime.bpm !== null}
          pulseBeatKey={runtime.bpmPulseAt}
          sensorName={sensorName}
          batteryPercent={batteryPercent}
          playing={runtime.status !== 'paused'}
          onBluetooth={onReconnectDevice}
          onPlay={onTogglePauseResume}
          onPause={onTogglePauseResume}
          onStop={onStopSession}
          samples={runtime.samples}
          settingsMode={settingsMode}
          totalDurationSec={plan.totalDurationSec}
          nominalPeakHeartrate={profile.nominalPeakHeartrate}
          scrubElapsedSec={runtime.status === 'completed' ? runtime.scrubElapsedSec : null}
          recoveryRounds={homeComparison}
          roundDurationsSec={plan.rounds.map((round) => round.nominalRoundDurationSec)}
          roundEndElapsedSec={getRoundEndElapsedSec(plan)}
          sessionControllerVisible={false}
          {...(runtime.status === 'completed' ? { onOpenHistory: onOpenCompletedSessionInHistory } : {})}
        />
        {runtime.status === 'completed' ? (
          <input
            aria-label="Session scrub position"
            class="mt-3 w-full accent-[color:var(--accent)]"
            type="range"
            min="0"
            max={String(plan.totalDurationSec)}
            value={String(runtime.scrubElapsedSec ?? plan.totalDurationSec)}
            onInput={(event) => onSetScrubElapsedSec(Number((event.currentTarget as HTMLInputElement).value))}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section class="screen-nonscroll flex flex-col gap-3" onClick={() => (runtime.status === 'running' || runtime.status === 'paused') && onTogglePauseResume()}>
      <RoundTiming
        roundName={getRoundDisplayLabel(phase)}
        countdownSeconds={phaseRemaining}
        remainingSeconds={remaining}
        emphasis={phase?.kind === 'work' ? 'work' : 'recovery'}
      />
      <div class="grid grid-cols-3 gap-2 sm:gap-3">
        <div class="rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-4 text-center">
          <div class="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">Round</div>
          <div class={`mt-2 text-xl font-semibold leading-tight ${getPhaseEmphasisClass(phase)}`}>{getRoundDisplayLabel(phase)}</div>
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
          <FallbackLayeredHeartGraph
            samples={runtime.samples}
            totalDurationSec={plan.totalDurationSec}
            nominalPeakHeartrate={profile.nominalPeakHeartrate}
          />
        </div>
        <RecoveryHistogram
          rounds={homeComparison}
          roundDurationsSec={plan.rounds.map((round) => round.nominalRoundDurationSec)}
          heightClassName="h-16 sm:h-20"
        />
      </div>
    </section>
  );
}

export function HomeScreen() {
  return (
    <HomeScreenView
      runtime={appStore.runtime.value}
      profile={appStore.selectedProfile.value}
      plan={appStore.currentPlan.value}
      phase={appStore.currentPhase.value}
      homeComparison={appStore.homeComparison.value}
      showNoComparableSessionWarning={appStore.shouldWarnNoComparableSession.value}
      sensorName={appStore.device.value?.name ?? null}
      batteryPercent={appStore.device.value?.batteryPercent ?? null}
      onConnectDevice={() => appStore.connectDevice()}
      onReconnectDevice={() => appStore.reconnectDevice()}
      onSetActualWorkDuration={(value) => appStore.setActualWorkDuration(value)}
      settingsMode={appStore.settingsMode.value}
      onSetSettingsMode={(value) => appStore.setSettingsMode(value)}
      onStartSession={() => appStore.startSession()}
      onTogglePauseResume={() => appStore.togglePauseResume()}
      onStopSession={() => appStore.stopSessionAndDisconnect()}
      onOpenCompletedSessionInHistory={() => appStore.openCompletedSessionInHistory()}
      onSetScrubElapsedSec={(value) => appStore.setScrubElapsedSec(value)}
    />
  );
}
