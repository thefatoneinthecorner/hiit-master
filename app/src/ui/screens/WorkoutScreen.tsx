import type { VNode } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { WorkoutSessionController } from '../../application/session/controller';
import type { WorkoutSessionControllerState } from '../../application/session/types';
import { createComparisonRounds } from '../../domain/comparison/select';
import type { ComparisonRound } from '../../domain/comparison/types';
import { DEFAULT_WORK_DURATION_SEC, MAX_WORK_DURATION_SEC, MIN_WORK_DURATION_SEC, ROUNDS_PLANNED } from '../../domain/workout/constants';
import type { PhaseSegment, PhaseType } from '../../domain/workout/types';
import {
  createWebBluetoothHeartRateMonitor,
  type HeartRateMonitor,
  type HeartRateMonitorCallbacks
} from '../../infrastructure/bluetooth/monitor';
import { createStorageRepositories, type StorageRepositories } from '../../infrastructure/storage/db';
import type { IntervalStatRecord, SessionRecord } from '../../infrastructure/storage/types';

const INITIAL_CONTROLLER_STATE: WorkoutSessionControllerState = {
  controllerStatus: 'idle',
  sessionId: null,
  workDurationSec: null,
  elapsedSec: 0,
  currentPhaseType: null,
  currentRoundIndex: null,
  isComplete: false,
  isPaused: false,
  isCompromised: false,
  comparisonEligible: false,
  hrConnectionStatus: 'disconnected',
  connectedDeviceName: null,
  currentBpm: null,
  previousComparisonSessionId: null,
  workoutPlan: null,
  currentIntervalStats: []
};

const PHASE_LABELS: Record<PhaseType, string> = {
  warmup: 'Warmup',
  work: 'Work',
  rest: 'Rest',
  cooldown: 'Cooldown'
};

export interface WorkoutScreenProps {
  storageFactory?: () => Promise<StorageRepositories>;
  monitorFactory?: (callbacks: HeartRateMonitorCallbacks) => HeartRateMonitor;
  now?: () => number;
}

export function WorkoutScreen({
  storageFactory = createStorageRepositories,
  monitorFactory = createWebBluetoothHeartRateMonitor,
  now = Date.now
}: WorkoutScreenProps): VNode {
  const controllerRef = useRef<WorkoutSessionController | null>(null);
  const monitorRef = useRef<HeartRateMonitor | null>(null);
  const storageRef = useRef<StorageRepositories | null>(null);
  const isTickInFlightRef = useRef(false);
  const [bootstrapStatus, setBootstrapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [controllerState, setControllerState] = useState<WorkoutSessionControllerState>(INITIAL_CONTROLLER_STATE);
  const [workDurationSec, setWorkDurationSec] = useState(DEFAULT_WORK_DURATION_SEC);
  const [sessionStartAtMs, setSessionStartAtMs] = useState<number | null>(null);
  const [pausedAtMs, setPausedAtMs] = useState<number | null>(null);
  const [pausedAccumulatedMs, setPausedAccumulatedMs] = useState(0);
  const [previousIntervalStats, setPreviousIntervalStats] = useState<IntervalStatRecord[]>([]);
  const [historySessions, setHistorySessions] = useState<SessionRecord[]>([]);
  const [selectedHistorySessionId, setSelectedHistorySessionId] = useState<string | null>(null);
  const [selectedHistoryStats, setSelectedHistoryStats] = useState<IntervalStatRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      try {
        const storage = await storageFactory();
        if (cancelled) {
          return;
        }

        const controller = new WorkoutSessionController({ storage });
        const savedSettings = await storage.appSettings.get();
        const monitor = monitorFactory({
          onConnected: (deviceName) => {
            controller.connectHeartRate(deviceName);
            setConnectionMessage(null);
            setControllerState(controller.getState());
          },
          onDisconnected: async () => {
            await controller.disconnectHeartRate(now());
            setControllerState(controller.getState());
          },
          onHeartRateSample: async (bpm) => {
            await controller.recordHeartRateSample(now(), bpm);
            setControllerState(controller.getState());
          }
        });

        if (cancelled) {
          await monitor.dispose();
          return;
        }

        controllerRef.current = controller;
        monitorRef.current = monitor;
        storageRef.current = storage;
        setWorkDurationSec(savedSettings?.lastWorkDurationSec ?? DEFAULT_WORK_DURATION_SEC);
        setControllerState(controller.getState());
        setBootstrapStatus('ready');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setBootstrapStatus('error');
        setBootstrapError(error instanceof Error ? error.message : 'Failed to initialize the workout screen');
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
      const monitor = monitorRef.current;
      monitorRef.current = null;
      storageRef.current = null;
      if (monitor !== null) {
        void monitor.dispose();
      }
    };
  }, [monitorFactory, now, storageFactory]);

  function syncControllerState(): WorkoutSessionControllerState | null {
    const controller = controllerRef.current;
    if (controller === null) {
      return null;
    }

    const nextState = controller.getState();
    setControllerState(nextState);
    return nextState;
  }

  async function refreshHistory(): Promise<void> {
    const storage = storageRef.current;
    if (storage === null) {
      return;
    }

    const sessions = await storage.sessions.listAll();
    setHistorySessions(sessions);
    setSelectedHistorySessionId((current) => current ?? (sessions[0]?.id ?? null));
  }

  useEffect(() => {
    if (bootstrapStatus !== 'ready') {
      return;
    }

    void refreshHistory();
  }, [bootstrapStatus, controllerState.controllerStatus, controllerState.sessionId]);

  useEffect(() => {
    const storage = storageRef.current;
    const previousSessionId = controllerState.previousComparisonSessionId;
    if (storage === null || previousSessionId === null) {
      setPreviousIntervalStats([]);
      return;
    }

    let cancelled = false;
    const previousStatsStorage = storage;
    const previousStatsSessionId = previousSessionId;

    async function loadPreviousStats(): Promise<void> {
      const stats = await previousStatsStorage.intervalStats.listBySessionId(previousStatsSessionId);
      if (cancelled) {
        return;
      }

      setPreviousIntervalStats(stats);
    }

    void loadPreviousStats();

    return () => {
      cancelled = true;
    };
  }, [controllerState.previousComparisonSessionId]);

  useEffect(() => {
    const storage = storageRef.current;
    if (storage === null || selectedHistorySessionId === null) {
      setSelectedHistoryStats([]);
      return;
    }

    let cancelled = false;
    const historyStatsStorage = storage;
    const historyStatsSessionId = selectedHistorySessionId;

    async function loadHistoryStats(): Promise<void> {
      const stats = await historyStatsStorage.intervalStats.listBySessionId(historyStatsSessionId);
      if (cancelled) {
        return;
      }

      setSelectedHistoryStats(stats);
    }

    void loadHistoryStats();

    return () => {
      cancelled = true;
    };
  }, [selectedHistorySessionId]);

  async function handleConnectToggle(): Promise<void> {
    const monitor = monitorRef.current;
    if (monitor === null) {
      return;
    }

    if (monitor.isSupported() === false) {
      setConnectionMessage('Web Bluetooth is not available in this browser. Use a Chromium-based browser on a supported device.');
      return;
    }

    setIsConnecting(true);
    setConnectionMessage(null);

    try {
      if (controllerState.hrConnectionStatus === 'connected') {
        await monitor.disconnect();
      } else {
        await monitor.connect();
      }
    } catch (error) {
      setConnectionMessage(error instanceof Error ? error.message : 'Failed to connect to the heart-rate monitor.');
    } finally {
      setIsConnecting(false);
      syncControllerState();
    }
  }

  async function handleStartSession(): Promise<void> {
    const controller = controllerRef.current;
    if (controller === null) {
      return;
    }

    const startedAtMs = now();
    setSessionStartAtMs(startedAtMs);
    setPausedAccumulatedMs(0);
    setPausedAtMs(null);
    await controller.startSession(workDurationSec, startedAtMs);
    syncControllerState();
    await refreshHistory();
  }

  function handlePause(): void {
    const controller = controllerRef.current;
    if (controller === null) {
      return;
    }

    controller.pause();
    setPausedAtMs(now());
    syncControllerState();
  }

  function handleResume(): void {
    const controller = controllerRef.current;
    if (controller === null) {
      return;
    }

    const resumedAtMs = now();
    const pauseDeltaMs = pausedAtMs === null ? 0 : resumedAtMs - pausedAtMs;
    controller.resume();
    setPausedAccumulatedMs((current) => current + pauseDeltaMs);
    setPausedAtMs(null);
    syncControllerState();
  }

  async function handleEndEarly(): Promise<void> {
    const controller = controllerRef.current;
    if (controller === null) {
      return;
    }

    await controller.endEarly(now());
    syncControllerState();
    await refreshHistory();
  }

  useEffect(() => {
    const controller = controllerRef.current;
    if (controller === null || sessionStartAtMs === null || controllerState.controllerStatus !== 'running') {
      return;
    }

    const timerId = window.setInterval(() => {
      if (isTickInFlightRef.current) {
        return;
      }

      isTickInFlightRef.current = true;
      const timestampMs = now();
      const elapsedSec = Math.max(0, Math.floor((timestampMs - sessionStartAtMs - pausedAccumulatedMs) / 1000));

      void controller.tick(elapsedSec, timestampMs).finally(() => {
        syncControllerState();
        isTickInFlightRef.current = false;
      });
    }, 250);

    return () => {
      window.clearInterval(timerId);
    };
  }, [controllerState.controllerStatus, now, pausedAccumulatedMs, sessionStartAtMs]);

  const activePhase = getActivePhase(controllerState);
  const phaseRemainingSec = activePhase === null ? 0 : Math.max(0, activePhase.endSec - controllerState.elapsedSec);
  const totalRemainingSec = controllerState.workoutPlan === null
    ? 0
    : Math.max(0, controllerState.workoutPlan.totalDurationSec - controllerState.elapsedSec);
  const isSessionActive = controllerState.controllerStatus === 'running' || controllerState.controllerStatus === 'paused';
  const canStart = bootstrapStatus === 'ready'
    && controllerState.hrConnectionStatus === 'connected'
    && isSessionActive === false;
  const roundLabel = controllerState.currentRoundIndex === null
    ? 'Warmup / Cooldown'
    : String(controllerState.currentRoundIndex + 1) + ' / ' + String(ROUNDS_PLANNED);
  const progressPercent = controllerState.workoutPlan === null || controllerState.workoutPlan.totalDurationSec === 0
    ? 0
    : Math.min(100, (controllerState.elapsedSec / controllerState.workoutPlan.totalDurationSec) * 100);
  const phaseClassName = controllerState.currentPhaseType === null ? 'phase--idle' : 'phase--' + controllerState.currentPhaseType;
  const statusCopy = getStatusCopy(controllerState);
  const comparisonRounds = createComparisonRounds(controllerState.currentIntervalStats, previousIntervalStats);
  const selectedHistorySession = historySessions.find((session) => session.id === selectedHistorySessionId) ?? null;

  if (bootstrapStatus === 'loading') {
    return (
      <main className="screen">
        <section className="hero-card">
          <p className="eyebrow">HIIT Master Rebuild</p>
          <h1 className="timer">--:--</h1>
          <p className="phase phase--idle">Booting Storage</p>
          <p className="copy">Opening IndexedDB and restoring the most recent workout settings.</p>
        </section>
      </main>
    );
  }

  if (bootstrapStatus === 'error') {
    return (
      <main className="screen">
        <section className="hero-card">
          <p className="eyebrow">HIIT Master Rebuild</p>
          <h1 className="timer">Error</h1>
          <p className="phase phase--work">Startup Failed</p>
          <p className="copy">{bootstrapError}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="screen">
      <section className={'hero-card ' + phaseClassName}>
        <p className="eyebrow">{controllerState.connectedDeviceName ?? 'No HR monitor connected'}</p>
        <h1 className="timer">{formatClock(phaseRemainingSec)}</h1>
        <p className={'phase ' + phaseClassName}>{getPhaseHeading(controllerState.currentPhaseType, controllerState.controllerStatus)}</p>
        <p className="copy">{statusCopy}</p>
        <div className="hero-metrics">
          <div className="metric-pill">
            <span>Round</span>
            <strong>{roundLabel}</strong>
          </div>
          <div className="metric-pill">
            <span>BPM</span>
            <strong>{controllerState.currentBpm === null ? '--' : controllerState.currentBpm}</strong>
          </div>
          <div className="metric-pill">
            <span>Total Left</span>
            <strong>{formatClock(totalRemainingSec)}</strong>
          </div>
        </div>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-bar" style={{ width: String(progressPercent) + '%' }} />
        </div>
      </section>

      <section className="status-grid">
        <article className="panel">
          <h2>Setup</h2>
          <div className="duration-control">
            <button type="button" onClick={() => setWorkDurationSec((current) => Math.max(MIN_WORK_DURATION_SEC, current - 1))} disabled={isSessionActive || workDurationSec <= MIN_WORK_DURATION_SEC || isConnecting}>
              -
            </button>
            <div className="duration-readout">
              <span>Work Duration</span>
              <strong>{workDurationSec}s</strong>
            </div>
            <button type="button" onClick={() => setWorkDurationSec((current) => Math.min(MAX_WORK_DURATION_SEC, current + 1))} disabled={isSessionActive || workDurationSec >= MAX_WORK_DURATION_SEC || isConnecting}>
              +
            </button>
          </div>
          <div className="action-stack">
            <button type="button" className="primary-action" onClick={() => void handleConnectToggle()} disabled={isConnecting}>
              {getConnectionActionLabel(controllerState, isConnecting)}
            </button>
            <button type="button" className="primary-action" onClick={() => void handleStartSession()} disabled={canStart === false || isConnecting}>
              {controllerState.controllerStatus === 'completed' || controllerState.controllerStatus === 'ended_early' ? 'Start New Session' : 'Start Session'}
            </button>
          </div>
          <p className="panel-copy">
            Uses the real Web Bluetooth `heart_rate` service. Connection drops are recorded through the existing session-controller compromise flow.
          </p>
          {connectionMessage !== null ? <p className="panel-copy panel-copy--alert">{connectionMessage}</p> : null}
        </article>

        <article className="panel">
          <h2>Runtime</h2>
          <div className="runtime-grid">
            <div>
              <span>Status</span>
              <strong>{controllerState.controllerStatus}</strong>
            </div>
            <div>
              <span>Connection</span>
              <strong>{controllerState.hrConnectionStatus}</strong>
            </div>
            <div>
              <span>Compromised</span>
              <strong>{controllerState.isCompromised ? 'Yes' : 'No'}</strong>
            </div>
            <div>
              <span>Comparison Ready</span>
              <strong>{controllerState.comparisonEligible ? 'Yes' : 'No'}</strong>
            </div>
          </div>
          <div className="action-stack action-stack--inline">
            <button type="button" onClick={handlePause} disabled={controllerState.controllerStatus !== 'running'}>Pause</button>
            <button type="button" onClick={handleResume} disabled={controllerState.controllerStatus !== 'paused'}>Resume</button>
            <button type="button" onClick={() => void handleEndEarly()} disabled={isSessionActive === false}>End Early</button>
          </div>
          <p className="panel-copy">
            Previous comparison source: {controllerState.previousComparisonSessionId ?? 'none yet'}
          </p>
        </article>

        <article className="panel panel-wide">
          <h2>Live Comparison</h2>
          <div className="comparison-grid">
            {comparisonRounds.length === 0 ? (
              <p className="panel-copy">Start a session to build live round deltas.</p>
            ) : comparisonRounds.map((round) => (
              <div key={round.roundIndex} className="comparison-card">
                <div className="comparison-header">
                  <span>Round {round.roundIndex + 1}</span>
                  <strong className={getDiffClassName(round)}>{formatSignedDelta(round.diffDelta)}</strong>
                </div>
                <div className="comparison-values">
                  <div>
                    <span>Current</span>
                    <strong>{formatDeltaValue(round.currentDelta)}</strong>
                  </div>
                  <div>
                    <span>Previous</span>
                    <strong>{formatDeltaValue(round.previousDelta)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {comparisonRounds.length > 0 && previousIntervalStats.length === 0 ? (
            <p className="panel-copy">No previous comparison-eligible session exists yet, so current deltas are shown without a baseline.</p>
          ) : null}
        </article>

        <article className="panel panel-wide">
          <h2>History</h2>
          <div className="history-layout">
            <div className="history-list">
              {historySessions.length === 0 ? (
                <p className="panel-copy">No sessions stored yet.</p>
              ) : historySessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  className={'history-item ' + (session.id === selectedHistorySessionId ? 'history-item--active' : '')}
                  onClick={() => setSelectedHistorySessionId(session.id)}
                >
                  <span>{formatSessionDate(session.startedAt)}</span>
                  <strong>{session.workDurationSec}s work</strong>
                  <span>{formatSessionBadge(session)}</span>
                </button>
              ))}
            </div>
            <div className="history-detail">
              {selectedHistorySession === null ? (
                <p className="panel-copy">Choose a stored session to inspect its round metrics.</p>
              ) : (
                <>
                  <p className="panel-copy">
                    {formatSessionDate(selectedHistorySession.startedAt)}. {selectedHistorySession.status}. {selectedHistorySession.comparisonEligible ? 'Eligible for comparison.' : 'Not eligible for comparison.'}
                  </p>
                  <div className="history-stats-grid">
                    {selectedHistoryStats.length === 0 ? (
                      <p className="panel-copy">Interval stats will appear here once a session completes with analyzed rounds.</p>
                    ) : selectedHistoryStats.map((stat) => (
                      <div key={stat.roundIndex} className="history-stat-card">
                        <span>Round {stat.roundIndex + 1}</span>
                        <strong>{formatDeltaValue(stat.deltaBpm)}</strong>
                        <small>Peak {formatDeltaValue(stat.peakBpm)} / Trough {formatDeltaValue(stat.troughBpm)}</small>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}

function getActivePhase(state: WorkoutSessionControllerState): PhaseSegment | null {
  if (state.workoutPlan === null || state.currentPhaseType === null) {
    return null;
  }

  return state.workoutPlan.phases.find((phase) =>
    phase.phaseType === state.currentPhaseType
    && phase.roundIndex === state.currentRoundIndex
    && state.elapsedSec >= phase.startSec
    && state.elapsedSec < phase.endSec
  ) ?? null;
}

function getConnectionActionLabel(state: WorkoutSessionControllerState, isConnecting: boolean): string {
  if (isConnecting) {
    return 'Connecting...';
  }

  if (state.hrConnectionStatus === 'connected') {
    return 'Disconnect Monitor';
  }

  return state.isCompromised ? 'Reconnect Monitor' : 'Connect Heart-Rate Monitor';
}

function getPhaseHeading(phaseType: PhaseType | null, controllerStatus: WorkoutSessionControllerState['controllerStatus']): string {
  if (controllerStatus === 'completed') {
    return 'Session Complete';
  }

  if (controllerStatus === 'ended_early') {
    return 'Ended Early';
  }

  if (phaseType === null) {
    return 'Ready';
  }

  return PHASE_LABELS[phaseType];
}

function getStatusCopy(state: WorkoutSessionControllerState): string {
  if (state.controllerStatus === 'completed') {
    return state.comparisonEligible
      ? 'The session finished with complete HR coverage and can be used as a future comparison baseline.'
      : 'The session finished, but it cannot be used as a comparison baseline because coverage or completion requirements were not met.';
  }

  if (state.controllerStatus === 'ended_early') {
    return 'The session ended before the cooldown completed, so it remains excluded from comparison history.';
  }

  if (state.isCompromised) {
    return 'Heart-rate coverage dropped during this session. The workout can continue, but this run is now marked compromised.';
  }

  if (state.controllerStatus === 'paused') {
    return 'Timer paused. Resume when ready to continue the same workout timeline.';
  }

  if (state.controllerStatus === 'running') {
    return 'The session is live. Timer state, current BPM, live round deltas, and previous-session comparison are being driven from the session controller.';
  }

  return 'Select the work duration, connect a real monitor, and start a session. The screen now uses the Web Bluetooth adapter plus the existing controller and IndexedDB repositories.';
}

function getDiffClassName(round: ComparisonRound): string {
  if (round.diffDelta === null) {
    return 'comparison-diff comparison-diff--neutral';
  }

  if (round.diffDelta > 0) {
    return 'comparison-diff comparison-diff--up';
  }

  if (round.diffDelta < 0) {
    return 'comparison-diff comparison-diff--down';
  }

  return 'comparison-diff comparison-diff--neutral';
}

function formatDeltaValue(value: number | null): string {
  return value === null ? '--' : String(value);
}

function formatSignedDelta(value: number | null): string {
  if (value === null) {
    return '--';
  }

  return value > 0 ? '+' + String(value) : String(value);
}

function formatSessionBadge(session: SessionRecord): string {
  if (session.comparisonEligible) {
    return 'comparison ready';
  }

  if (session.endedEarly) {
    return 'ended early';
  }

  if (session.isCompromised) {
    return 'compromised';
  }

  return session.status;
}

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatClock(totalSec: number): string {
  const safeTotalSec = Math.max(0, totalSec);
  const minutes = Math.floor(safeTotalSec / 60);
  const seconds = safeTotalSec % 60;
  return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}
