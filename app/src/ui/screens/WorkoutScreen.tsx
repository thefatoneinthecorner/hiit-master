import type { CSSProperties } from 'preact/compat';
import type { JSX, VNode } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { WorkoutSessionController } from '../../application/session/controller';
import type { WorkoutSessionControllerState } from '../../application/session/types';
import { createDemoComparisonFixture, isDemoComparisonEnabled, type DemoComparisonFixture } from '../../app/demoComparison';
import type { HeartRateSample } from '../../domain/analysis/types';
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
import type { WorkoutPlan } from '../../domain/workout/types';

const INITIAL_CONTROLLER_STATE: WorkoutSessionControllerState = {
  controllerStatus: 'idle',
  sessionId: null,
  sessionStartedAtMs: null,
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
  currentIntervalStats: [],
  currentHeartRateSamples: []
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
  const comparisonInteractionRef = useRef<HTMLDivElement | null>(null);
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
  const [demoFixture, setDemoFixture] = useState<DemoComparisonFixture | null>(null);
  const [scrubXPercent, setScrubXPercent] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap(): Promise<void> {
      try {
        const storage = await storageFactory();
        if (cancelled) {
          return;
        }

        const controller = new WorkoutSessionController({ storage });
        const demoEnabled = typeof window !== 'undefined' && isDemoComparisonEnabled(window.location.search);
        if (demoEnabled) {
          const fixture = createDemoComparisonFixture();
          await storage.sessions.save(fixture.previousSession);
          await storage.intervalStats.replaceForSession(fixture.previousSession.id, fixture.previousStats);
          setDemoFixture(fixture);
          setSelectedHistorySessionId(fixture.previousSession.id);
        } else {
          setDemoFixture(null);
        }
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
  const effectiveCurrentIntervalStats = demoFixture === null ? controllerState.currentIntervalStats : demoFixture.currentStats;
  const effectiveCurrentHeartRateSamples = demoFixture === null ? controllerState.currentHeartRateSamples : demoFixture.currentSamples;
  const effectivePreviousIntervalStats = demoFixture === null ? previousIntervalStats : demoFixture.previousStats;
  const previousComparisonSession = historySessions.find((session) => session.id === controllerState.previousComparisonSessionId) ?? null;
  const currentChartTiming = demoFixture === null
    ? getChartTimingFromWorkoutPlan(controllerState.workoutPlan)
    : getChartTimingFromSession(demoFixture.currentSession);
  const previousChartTiming = demoFixture === null
    ? getChartTimingFromSession(previousComparisonSession)
    : getChartTimingFromSession(demoFixture.previousSession);
  const comparisonRounds = demoFixture === null
    ? createComparisonRounds(effectiveCurrentIntervalStats, effectivePreviousIntervalStats)
    : demoFixture.comparisonRounds;
  const comparisonChart = createComparisonChartModel(
    effectiveCurrentHeartRateSamples,
    demoFixture === null ? controllerState.sessionStartedAtMs : Date.parse(demoFixture.currentSession.startedAt),
    effectiveCurrentIntervalStats,
    effectivePreviousIntervalStats,
    currentChartTiming,
    previousChartTiming
  );
  const maxComparisonDiff = getMaxComparisonDiff(comparisonRounds);
  const comparisonStripBars = comparisonChart === null
    ? []
    : createComparisonStripBars(comparisonRounds, currentChartTiming, comparisonChart.maxElapsedSec, maxComparisonDiff);
  const scrubDetail = comparisonChart === null
    ? null
    : createComparisonScrubDetail(
      scrubXPercent,
      comparisonRounds,
      effectiveCurrentHeartRateSamples,
      demoFixture === null ? controllerState.sessionStartedAtMs : Date.parse(demoFixture.currentSession.startedAt),
      currentChartTiming,
      comparisonChart.maxElapsedSec
    );
  const isScrubberEnabled = controllerState.controllerStatus !== 'running';
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

  function updateScrubberFromClientX(clientX: number): void {
    if (isScrubberEnabled === false) {
      return;
    }

    const container = comparisonInteractionRef.current;
    if (container === null) {
      return;
    }

    const bounds = container.getBoundingClientRect();
    if (bounds.width <= 0) {
      return;
    }

    const rawPercent = ((clientX - bounds.left) / bounds.width) * 100;
    const clampedPercent = Math.max(0, Math.min(100, rawPercent));
    setScrubXPercent(clampedPercent);
  }

  function handleComparisonPointerDown(event: PointerEvent): void {
    updateScrubberFromClientX(event.clientX);
  }

  function handleComparisonPointerMove(event: PointerEvent): void {
    if (event.buttons === 0 && event.pointerType === 'mouse') {
      return;
    }

    updateScrubberFromClientX(event.clientX);
  }

  function handleComparisonPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'mouse') {
      updateScrubberFromClientX(event.clientX);
    }
  }

  function handleComparisonPointerLeave(): void {
    setScrubXPercent(null);
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
        {scrubDetail !== null && isScrubberEnabled ? <div className="hero-scrub-card">
          <strong>{scrubDetail.timeLabel}</strong>
          <span>Round {scrubDetail.roundNumber}</span>
          <span>{scrubDetail.currentBpm === null ? 'No HR data' : 'BPM ' + formatDeltaValue(scrubDetail.currentBpm)}</span>
          <span>Current {formatDeltaValue(scrubDetail.currentDelta)} / Previous {formatDeltaValue(scrubDetail.previousDelta)}</span>
          <span className={getDiffClassName({ roundIndex: scrubDetail.roundIndex, currentDelta: scrubDetail.currentDelta, previousDelta: scrubDetail.previousDelta, diffDelta: scrubDetail.diffDelta })}>{formatSignedDelta(scrubDetail.diffDelta)}</span>
        </div> : null}
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
        <article className="panel panel--setup">
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

        <article className="panel panel--runtime">
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

        <article className="panel panel-wide panel--comparison">
          <h2>Live Comparison</h2>
          {comparisonChart === null ? (
            <p className="panel-copy">Start a session to build live round deltas.</p>
          ) : (
            <>
              <div
                ref={comparisonInteractionRef}
                className={'comparison-visual comparison-visual--interactive' + (isScrubberEnabled ? '' : ' comparison-visual--disabled')}
                onPointerDown={handleComparisonPointerDown as JSX.PointerEventHandler<HTMLDivElement>}
                onPointerMove={handleComparisonPointerMove as JSX.PointerEventHandler<HTMLDivElement>}
                onPointerEnter={handleComparisonPointerEnter as JSX.PointerEventHandler<HTMLDivElement>}
                onPointerLeave={handleComparisonPointerLeave as JSX.PointerEventHandler<HTMLDivElement>}
              >
                <div className="comparison-chart-shell">
                  <div className="comparison-axis" aria-hidden="true">
                    {comparisonChart.guides.map((guide) => (
                      <span key={guide.label}>{guide.label}</span>
                    ))}
                  </div>
                  <div className="comparison-chart-frame">
                    <svg className="comparison-chart" viewBox="0 0 100 100" role="img" aria-label="Current session heart-rate chart with comparison strip below" preserveAspectRatio="none">
                      {comparisonChart.guides.map((guide) => (
                        <line key={guide.label} x1="0" y1={guide.y} x2="100" y2={guide.y} stroke="rgba(255, 255, 255, 0.1)" strokeWidth="0.4" />
                      ))}
                      {comparisonChart.currentPathSegments.map((segment, index) => (
                        <polyline key={String(index)} points={segment} fill="none" stroke="#fff8de" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      ))}
                      {scrubDetail !== null && isScrubberEnabled ? <line x1={scrubDetail.xPercent} y1="0" x2={scrubDetail.xPercent} y2="100" stroke="rgba(120, 184, 255, 0.95)" strokeWidth="0.8" /> : null}
                    </svg>
                    <div className="comparison-rounds" aria-hidden="true">
                      {comparisonChart.timeLabels.map((label) => (
                        <span key={label.label} style={{ left: String(label.xPercent) + '%' }}>{label.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="comparison-legend" aria-hidden="true">
                  <div className="comparison-legend-item">
                    <span className="comparison-swatch comparison-swatch--current" />
                    <span>Current session</span>
                  </div>
                  <div className="comparison-legend-item">
                    <span className="comparison-swatch comparison-swatch--diff" />
                    <span>Delta vs previous</span>
                  </div>
                </div>
              </div>

              <div className="comparison-strip-shell">
                <div className="comparison-strip-axis" aria-hidden="true">
                  <span>+</span>
                  <span>0</span>
                  <span>-</span>
                </div>
                <div className="comparison-strip" aria-label="Delta versus previous session by round midpoint">
                  <div className="comparison-strip-baseline" />
                  {scrubDetail !== null && isScrubberEnabled ? <div className="comparison-strip-scrub-line" style={{ left: String(scrubDetail.xPercent) + '%' }} /> : null}
                  {comparisonStripBars.map((bar) => (
                    <div
                      key={bar.roundIndex}
                      className={bar.className}
                      style={bar.style}
                      title={bar.title}
                    />
                  ))}
                </div>
              </div>
              <p className="panel-copy">Each bar is centered on the midpoint of a work interval. Up means the current round delta beat the previous session, down means it underperformed.</p>
            </>
          )}
          {demoFixture !== null ? <p className="panel-copy">Demo comparison fixture active via demo_comparison=1.</p> : null}
          {comparisonRounds.length > 0 && effectivePreviousIntervalStats.length === 0 ? (
            <p className="panel-copy">No previous comparison-eligible session exists yet, so current deltas are shown without a baseline.</p>
          ) : null}
        </article>

        <article className="panel panel-wide panel--history">
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

function getDiffBarClassName(round: ComparisonRound): string {
  if (round.diffDelta === null || round.diffDelta === 0) {
    return 'comparison-strip-bar comparison-strip-bar--neutral';
  }

  if (round.diffDelta > 0) {
    return 'comparison-strip-bar comparison-strip-bar--up';
  }

  return 'comparison-strip-bar comparison-strip-bar--down';
}

function createComparisonStripBars(
  rounds: ComparisonRound[],
  timing: ComparisonChartTiming | null,
  maxElapsedSec: number,
  maxComparisonDiff: number
): Array<{ roundIndex: number; className: string; style: CSSProperties; title: string }> {
  if (timing === null || maxElapsedSec === 0) {
    return [];
  }

  return rounds.map((round) => {
    const midpointSec = getRoundStartSec(round.roundIndex, timing) + (timing.workDurationSec / 2);
    const xPercent = getElapsedX(midpointSec, maxElapsedSec);
    const magnitude = round.diffDelta === null || maxComparisonDiff === 0
      ? 0
      : Math.abs(round.diffDelta) / maxComparisonDiff;
    const heightPercent = round.diffDelta === null
      ? 10
      : Math.max(10, magnitude * 48);
    const style: CSSProperties = {
      left: String(xPercent) + '%',
      height: String(heightPercent) + '%'
    };

    if (round.diffDelta === null || round.diffDelta === 0) {
      style.top = '50%';
      style.transform = 'translate(-50%, -50%)';
    } else if (round.diffDelta > 0) {
      style.bottom = '50%';
      style.transform = 'translateX(-50%)';
    } else {
      style.top = '50%';
      style.transform = 'translateX(-50%)';
    }

    return {
      roundIndex: round.roundIndex,
      className: getDiffBarClassName(round),
      style,
      title: 'Round ' + String(round.roundIndex + 1)
        + '  current ' + formatDeltaValue(round.currentDelta)
        + '  previous ' + formatDeltaValue(round.previousDelta)
        + '  diff ' + formatSignedDelta(round.diffDelta)
    };
  });
}

function getMaxComparisonDiff(rounds: ComparisonRound[]): number {
  return rounds.reduce((maxDiff, round) => {
    if (round.diffDelta === null) {
      return maxDiff;
    }

    return Math.max(maxDiff, Math.abs(round.diffDelta));
  }, 0);
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

interface ChartIntervalStat {
  roundIndex: number;
  peakBpm: number | null;
  troughBpm: number | null;
}

interface ChartBpmSample {
  elapsedSec: number;
  bpm: number;
}

interface ChartSampleGap {
  elapsedSec: number;
  bpm: null;
}

interface ComparisonChartGuide {
  y: number;
  label: string;
}

interface ComparisonChartTiming {
  warmupSec: number;
  workDurationSec: number;
  restsSec: number[];
  totalDurationSec: number;
}

interface ComparisonChartLabel {
  label: string;
  xPercent: number;
}

interface ComparisonChartModel {
  currentPathSegments: string[];
  guides: ComparisonChartGuide[];
  timeLabels: ComparisonChartLabel[];
  maxElapsedSec: number;
}

interface ComparisonScrubDetail {
  roundIndex: number;
  roundNumber: number;
  xPercent: number;
  timeLabel: string;
  currentBpm: number | null;
  currentDelta: number | null;
  previousDelta: number | null;
  diffDelta: number | null;
}

function createComparisonChartModel(
  currentSamples: HeartRateSample[],
  currentSessionStartedAtMs: number | null,
  currentStats: ChartIntervalStat[],
  previousStats: ChartIntervalStat[],
  currentTiming: ComparisonChartTiming | null,
  previousTiming: ComparisonChartTiming | null
): ComparisonChartModel | null {
  const sortedCurrentStats = [...currentStats].sort((left, right) => left.roundIndex - right.roundIndex);
  const sortedPreviousStats = [...previousStats].sort((left, right) => left.roundIndex - right.roundIndex);
  const currentTotalSec = getChartDurationSec(currentTiming, sortedCurrentStats);
  const previousTotalSec = getChartDurationSec(previousTiming, sortedPreviousStats);
  const maxElapsedSec = Math.max(currentTotalSec, previousTotalSec);
  const liveSeries = normalizeChartSamples(currentSamples, currentSessionStartedAtMs, maxElapsedSec);
  const liveSamples = liveSeries.filter(isChartBpmSample);
  const allValues = [
    ...liveSamples.map((sample) => sample.bpm),
    ...sortedCurrentStats.flatMap((stat) => [stat.peakBpm, stat.troughBpm]),
    ...sortedPreviousStats.flatMap((stat) => [stat.peakBpm, stat.troughBpm])
  ].filter(isNumber);

  if (allValues.length === 0 || maxElapsedSec === 0) {
    return null;
  }

  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const rawPadding = Math.max(4, Math.ceil((maxValue - minValue) * 0.12));
  const rawMin = minValue - rawPadding;
  const rawMax = maxValue + rawPadding;
  const yStep = getNiceBpmStep((rawMax - rawMin) / 3);
  const chartMin = Math.floor(rawMin / yStep) * yStep;
  const chartMax = Math.ceil(rawMax / yStep) * yStep;

  return {
    currentPathSegments: buildLivePathSegments(liveSeries, chartMin, chartMax, maxElapsedSec),
    guides: buildChartGuides(chartMin, chartMax),
    timeLabels: buildTimeLabels(maxElapsedSec),
    maxElapsedSec
  };
}

function normalizeChartSamples(
  samples: HeartRateSample[],
  sessionStartedAtMs: number | null,
  maxElapsedSec: number
): Array<ChartBpmSample | ChartSampleGap> {
  if (sessionStartedAtMs === null) {
    return [];
  }

  const normalized: Array<ChartBpmSample | ChartSampleGap> = [];

  for (const sample of samples) {
    const elapsedSec = Math.max(0, (sample.timestampMs - sessionStartedAtMs) / 1000);
    if (elapsedSec > maxElapsedSec + 1) {
      continue;
    }

    if (sample.isMissing || sample.bpm === null) {
      const previousPoint = normalized.at(-1);
      if (previousPoint === undefined || isChartSampleGap(previousPoint)) {
        continue;
      }

      normalized.push({ elapsedSec, bpm: null });
      continue;
    }

    const previousPoint = normalized.at(-1);
    if (previousPoint !== undefined && isChartBpmSample(previousPoint) && Math.abs(previousPoint.elapsedSec - elapsedSec) < 0.05) {
      previousPoint.bpm = sample.bpm;
      continue;
    }

    normalized.push({ elapsedSec, bpm: sample.bpm });
  }

  return normalized;
}

function buildLivePathSegments(
  samples: Array<ChartBpmSample | ChartSampleGap>,
  chartMin: number,
  chartMax: number,
  maxElapsedSec: number
): string[] {
  if (samples.length === 0 || maxElapsedSec === 0) {
    return [];
  }

  const segments: string[] = [];
  let currentSegment: string[] = [];

  for (const sample of samples) {
    if (sample.bpm === null) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment.join(' '));
        currentSegment = [];
      }
      continue;
    }

    const x = getElapsedX(sample.elapsedSec, maxElapsedSec);
    const y = getChartY(sample.bpm, chartMin, chartMax);
    currentSegment.push(String(x) + ',' + String(y));
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment.join(' '));
  }

  return segments;
}

function buildChartGuides(chartMin: number, chartMax: number): ComparisonChartGuide[] {
  const step = (chartMax - chartMin) / 3;
  return Array.from({ length: 4 }, (_, index) => {
    const value = chartMax - (step * index);
    return {
      y: getChartY(value, chartMin, chartMax),
      label: String(Math.round(value))
    };
  });
}

function getNiceBpmStep(rawStep: number): number {
  const candidates = [5, 10, 15, 20, 25, 30, 40, 50];
  for (const candidate of candidates) {
    if (rawStep <= candidate) {
      return candidate;
    }
  }

  return 50;
}

function getChartTimingFromWorkoutPlan(plan: WorkoutPlan | null): ComparisonChartTiming | null {
  if (plan === null) {
    return null;
  }

  return {
    warmupSec: plan.warmupSec,
    workDurationSec: plan.workDurationSec,
    restsSec: plan.actualRestsSec,
    totalDurationSec: plan.totalDurationSec
  };
}

function getChartTimingFromSession(session: SessionRecord | null): ComparisonChartTiming | null {
  if (session === null) {
    return null;
  }

  return {
    warmupSec: session.warmupSec,
    workDurationSec: session.workDurationSec,
    restsSec: session.actualRestsSec,
    totalDurationSec: session.totalPlannedDurationSec
  };
}

function getRoundStartSec(roundIndex: number, timing: ComparisonChartTiming): number {
  let elapsedSec = timing.warmupSec;

  for (let index = 0; index < roundIndex; index += 1) {
    elapsedSec += timing.workDurationSec;
    elapsedSec += timing.restsSec[index] ?? 0;
  }

  return elapsedSec;
}

function getChartDurationSec(timing: ComparisonChartTiming | null, stats: ChartIntervalStat[]): number {
  if (timing === null) {
    return 0;
  }

  if (stats.length === 0) {
    return timing.totalDurationSec;
  }

  const lastRoundIndex = Math.max(...stats.map((stat) => stat.roundIndex));
  const intervalEndSec = getRoundStartSec(lastRoundIndex, timing) + timing.workDurationSec;
  return Math.max(timing.totalDurationSec, intervalEndSec);
}

function getElapsedX(elapsedSec: number, maxElapsedSec: number): number {
  return (elapsedSec / maxElapsedSec) * 100;
}

function createComparisonScrubDetail(
  scrubXPercent: number | null,
  rounds: ComparisonRound[],
  currentSamples: HeartRateSample[],
  currentSessionStartedAtMs: number | null,
  timing: ComparisonChartTiming | null,
  maxElapsedSec: number
): ComparisonScrubDetail | null {
  if (scrubXPercent === null || timing === null || maxElapsedSec === 0 || rounds.length === 0) {
    return null;
  }

  const scrubElapsedSec = (scrubXPercent / 100) * maxElapsedSec;
  const liveSeries = normalizeChartSamples(currentSamples, currentSessionStartedAtMs, maxElapsedSec);
  const liveSamples = liveSeries.filter(isChartBpmSample);
  const hasGapAtScrubPosition = isGapAtElapsedSec(liveSeries, scrubElapsedSec);
  const nearestSample = hasGapAtScrubPosition ? null : getNearestChartSample(liveSamples, scrubElapsedSec);
  let nearestRound = rounds[0]!;
  let nearestMidpointSec = getRoundStartSec(nearestRound.roundIndex, timing) + (timing.workDurationSec / 2);
  let nearestDistance = Math.abs(nearestMidpointSec - scrubElapsedSec);

  for (const round of rounds) {
    const midpointSec = getRoundStartSec(round.roundIndex, timing) + (timing.workDurationSec / 2);
    const distance = Math.abs(midpointSec - scrubElapsedSec);
    if (distance < nearestDistance) {
      nearestRound = round;
      nearestMidpointSec = midpointSec;
      nearestDistance = distance;
    }
  }

  return {
    roundIndex: nearestRound.roundIndex,
    roundNumber: nearestRound.roundIndex + 1,
    xPercent: scrubXPercent,
    timeLabel: formatElapsedClock(scrubElapsedSec),
    currentBpm: nearestSample?.bpm ?? null,
    currentDelta: nearestRound.currentDelta,
    previousDelta: nearestRound.previousDelta,
    diffDelta: nearestRound.diffDelta
  };
}

function isGapAtElapsedSec(samples: Array<ChartBpmSample | ChartSampleGap>, scrubElapsedSec: number): boolean {
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index]!;
    if (sample.bpm !== null) {
      continue;
    }

    const nextSample = samples.slice(index + 1).find(isChartBpmSample) ?? null;
    const gapEndSec = nextSample?.elapsedSec ?? Number.POSITIVE_INFINITY;
    if (scrubElapsedSec >= sample.elapsedSec && scrubElapsedSec < gapEndSec) {
      return true;
    }
  }

  return false;
}

function getNearestChartSample(samples: ChartBpmSample[], scrubElapsedSec: number): ChartBpmSample | null {
  if (samples.length === 0) {
    return null;
  }

  let nearestSample = samples[0]!;
  let nearestDistance = Math.abs(nearestSample.elapsedSec - scrubElapsedSec);

  for (const sample of samples) {
    const distance = Math.abs(sample.elapsedSec - scrubElapsedSec);
    if (distance < nearestDistance) {
      nearestSample = sample;
      nearestDistance = distance;
    }
  }

  return nearestSample;
}

function buildTimeLabels(maxElapsedSec: number): ComparisonChartLabel[] {
  const stepSec = getTimeLabelStepSec(maxElapsedSec);
  const labels: ComparisonChartLabel[] = [];

  for (let elapsedSec = 0; elapsedSec <= maxElapsedSec; elapsedSec += stepSec) {
    const xPercent = maxElapsedSec === 0 ? 0 : (elapsedSec / maxElapsedSec) * 100;
    labels.push({
      label: formatElapsedClock(elapsedSec),
      xPercent
    });
  }

  const lastLabel = labels.at(-1);
  if (lastLabel === undefined || Math.abs(lastLabel.xPercent - 100) > 0.01) {
    labels.push({
      label: formatElapsedClock(maxElapsedSec),
      xPercent: 100
    });
  }

  return labels;
}

function getTimeLabelStepSec(maxElapsedSec: number): number {
  const candidates = [60, 120, 180, 300, 600];
  for (const candidate of candidates) {
    if (maxElapsedSec / candidate <= 5) {
      return candidate;
    }
  }

  return 600;
}

function formatElapsedClock(totalSec: number): string {
  const safeTotalSec = Math.max(0, Math.round(totalSec));
  const minutes = Math.floor(safeTotalSec / 60);
  const seconds = safeTotalSec % 60;
  return String(minutes) + ':' + String(seconds).padStart(2, '0');
}

function getChartY(value: number, chartMin: number, chartMax: number): number {
  if (chartMax <= chartMin) {
    return 46;
  }

  const ratio = (value - chartMin) / (chartMax - chartMin);
  return 84 - (ratio * 68);
}

function isNumber(value: number | null): value is number {
  return value !== null;
}

function isChartBpmSample(value: ChartBpmSample | ChartSampleGap): value is ChartBpmSample {
  return value.bpm !== null;
}

function isChartSampleGap(value: ChartBpmSample | ChartSampleGap): value is ChartSampleGap {
  return value.bpm === null;
}
