import type { CSSProperties } from 'preact/compat';
import type { JSX, VNode } from 'preact';
import { Capacitor, registerPlugin } from '@capacitor/core';
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
  createAdaptiveHeartRateMonitor,
  type HeartRateMonitor,
  type HeartRateMonitorCallbacks
} from '../../infrastructure/bluetooth/monitor';
import {
  createStorageRepositories,
  exportStorageBackup,
  importStorageBackup,
  type StorageRepositories
} from '../../infrastructure/storage/db';
import type { IntervalStatRecord, SessionRecord, StorageBackupRecord } from '../../infrastructure/storage/types';
import type { WorkoutPlan } from '../../domain/workout/types';
import { createWorkoutPlan, getWorkWindows } from '../../domain/workout/plan';

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

const DURATION_WHEEL_ITEM_HEIGHT_PX = 48;

const nativeKeepAwake = registerPlugin<KeepAwakePlugin>('KeepAwake');

export interface WorkoutScreenProps {
  storageFactory?: () => Promise<StorageRepositories>;
  monitorFactory?: (callbacks: HeartRateMonitorCallbacks) => HeartRateMonitor;
  now?: () => number;
}

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

interface KeepAwakePlugin {
  keepAwake: () => Promise<void>;
  allowSleep: () => Promise<void>;
}

const MIN_CHART_BPM = 25;
const MAX_CHART_BPM = 240;
const PREVIEW_CHART_MIN_BPM = 80;
const PREVIEW_CHART_MAX_BPM = 180;

interface TouchSwipeState {
  startX: number;
  startY: number;
  isIgnored: boolean;
  pointerId: number | null;
}

interface ReplayTimedSample {
  elapsedMs: number;
  bpm: number;
}

function getSwipeDebugTargetLabel(target: EventTarget | null): string {
  if (!(target instanceof HTMLElement)) {
    return 'unknown';
  }

  return target.className || target.tagName.toLowerCase();
}

function logSwipeDebug(message: string): string {
  console.info('[swipe-debug]', message);
  return message;
}

function isDeviceTestEnabled(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get('device-test') === '1';
}

async function createReplayHeartRateMonitor(
  storage: StorageRepositories,
  callbacks: HeartRateMonitorCallbacks
): Promise<HeartRateMonitor> {
  const sessions = await storage.sessions.listAll();
  const replaySession = sessions.find((session) => session.hasHeartRateData) ?? null;
  const replaySamples = replaySession === null
    ? []
    : (await storage.heartRateSamples.listBySessionId(replaySession.id))
      .filter((sample) => sample.isMissing === false && sample.bpm !== null)
      .map((sample, index, samples): ReplayTimedSample => ({
        elapsedMs: index === 0 ? 0 : Math.max(0, sample.timestampMs - samples[0]!.timestampMs),
        bpm: sample.bpm as number
      }));

  let timeoutIds: number[] = [];
  let isConnected = false;

  function clearReplayTimeouts(): void {
    for (const timeoutId of timeoutIds) {
      window.clearTimeout(timeoutId);
    }
    timeoutIds = [];
  }

  async function scheduleReplay(): Promise<void> {
    clearReplayTimeouts();
    if (replaySamples.length === 0) {
      throw new Error('device-test requires at least one stored session with heart-rate data.');
    }

    for (const sample of replaySamples) {
      const timeoutId = window.setTimeout(() => {
        if (isConnected === false) {
          return;
        }
        void callbacks.onHeartRateSample(sample.bpm);
      }, sample.elapsedMs);
      timeoutIds.push(timeoutId);
    }

    const finalSample = replaySamples[replaySamples.length - 1]!;
    timeoutIds.push(window.setTimeout(() => {
      if (isConnected === false) {
        return;
      }
      void scheduleReplay();
    }, finalSample.elapsedMs + 1000));
  }

  return {
    isSupported(): boolean {
      return true;
    },

    async connect(): Promise<void> {
      if (replaySamples.length === 0) {
        throw new Error('device-test requires at least one stored session with heart-rate data.');
      }

      isConnected = true;
      await callbacks.onConnected('Device Test Replay');
      await scheduleReplay();
    },

    async disconnect(): Promise<void> {
      clearReplayTimeouts();
      isConnected = false;
      await callbacks.onDisconnected();
    },

    async dispose(): Promise<void> {
      clearReplayTimeouts();
      isConnected = false;
    }
  };
}

export function WorkoutScreen({
  storageFactory = createStorageRepositories,
  monitorFactory = createAdaptiveHeartRateMonitor,
  now = Date.now
}: WorkoutScreenProps): VNode {
  const controllerRef = useRef<WorkoutSessionController | null>(null);
  const monitorRef = useRef<HeartRateMonitor | null>(null);
  const storageRef = useRef<StorageRepositories | null>(null);
  const durationWheelRef = useRef<HTMLDivElement | null>(null);
  const comparisonInteractionRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const comparisonPlotRef = useRef<HTMLDivElement | null>(null);
  const historyComparisonInteractionRef = useRef<HTMLDivElement | null>(null);
  const historyComparisonPlotRef = useRef<HTMLDivElement | null>(null);
  const historySwipeRef = useRef<TouchSwipeState | null>(null);
  const isTickInFlightRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<AudioNode | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const noSleepVideoRef = useRef<HTMLVideoElement | null>(null);
  const lastCountdownBeepSecRef = useRef<number | null>(null);
  const previousPhaseTypeRef = useRef<PhaseType | null>(null);
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
  const [deletingHistorySessionId, setDeletingHistorySessionId] = useState<string | null>(null);
  const [selectedHistoryStats, setSelectedHistoryStats] = useState<IntervalStatRecord[]>([]);
  const [selectedHistorySamples, setSelectedHistorySamples] = useState<HeartRateSample[]>([]);
  const [selectedHistoryPreviousStats, setSelectedHistoryPreviousStats] = useState<IntervalStatRecord[]>([]);
  const [demoFixture, setDemoFixture] = useState<DemoComparisonFixture | null>(null);
  const [scrubXPercent, setScrubXPercent] = useState<number | null>(null);
  const [historyScrubXPercent, setHistoryScrubXPercent] = useState<number | null>(null);
  const [startupCountdownSec, setStartupCountdownSec] = useState<number | null>(null);
  const [mobileHistoryMode, setMobileHistoryMode] = useState(false);
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const [transferMessageIsError, setTransferMessageIsError] = useState(false);
  const [isTransferringData, setIsTransferringData] = useState(false);

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
        const callbacks: HeartRateMonitorCallbacks = {
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
        };
        const deviceTestEnabled = typeof window !== 'undefined' && isDeviceTestEnabled(window.location.search);
        const monitor = deviceTestEnabled
          ? await createReplayHeartRateMonitor(storage, callbacks)
          : monitorFactory(callbacks);

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
      const wakeLock = wakeLockRef.current;
      const noSleepVideo = noSleepVideoRef.current;
      monitorRef.current = null;
      storageRef.current = null;
      wakeLockRef.current = null;
      noSleepVideoRef.current = null;
      if (monitor !== null) {
        void monitor.dispose();
      }
      if (wakeLock !== null) {
        void wakeLock.release();
      }
      if (noSleepVideo !== null) {
        noSleepVideo.pause();
        noSleepVideo.remove();
      }
    };
  }, [monitorFactory, now, storageFactory]);

  async function ensureAudioReady(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    const audioWindow = window as Window & {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextConstructor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (AudioContextConstructor === undefined) {
      return;
    }

    if (audioContextRef.current === null) {
      const context = new AudioContextConstructor();
      const compressor = context.createDynamicsCompressor();
      compressor.connect(context.destination);
      audioContextRef.current = context;
      audioDestinationRef.current = compressor;
    }

    const audioContext = audioContextRef.current;
    if (audioContext !== null && audioContext.state === 'suspended') {
      await audioContext.resume();
    }
  }

  async function ensureNoSleepFallbackReady(): Promise<HTMLVideoElement | null> {
    if (typeof document === 'undefined') {
      return null;
    }

    if (noSleepVideoRef.current !== null) {
      return noSleepVideoRef.current;
    }

    const video = document.createElement('video');
    video.src = new URL('nosleep.mp4', document.baseURI).toString();
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('muted', '');
    video.setAttribute('aria-hidden', 'true');
    video.style.position = 'fixed';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    video.style.bottom = '0';
    video.style.right = '0';
    document.body.appendChild(video);
    noSleepVideoRef.current = video;
    return video;
  }

  async function enableNoSleepFallback(): Promise<void> {
    const video = await ensureNoSleepFallbackReady();
    if (video === null) {
      return;
    }

    try {
      if (video.paused) {
        await video.play();
      }
    } catch {
      return;
    }
  }

  function disableNoSleepFallback(): void {
    const video = noSleepVideoRef.current;
    if (video === null) {
      return;
    }

    video.pause();
    video.currentTime = 0;
  }

  function playTone(frequencyHz: number, durationSec: number): void {
    const audioContext = audioContextRef.current;
    const destination = audioDestinationRef.current;
    if (audioContext === null || destination === null) {
      return;
    }

    const startedAtSec = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequencyHz, startedAtSec);
    oscillator.connect(gainNode);
    gainNode.connect(destination);
    gainNode.gain.setValueAtTime(0.0001, startedAtSec);
    gainNode.gain.exponentialRampToValueAtTime(0.2, startedAtSec + 0.004);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startedAtSec + durationSec);
    oscillator.start(startedAtSec);
    oscillator.stop(startedAtSec + durationSec + 0.05);
  }

  async function requestWakeLock(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await nativeKeepAwake.keepAwake();
      } catch {
        // Fall back to browser-based wake-lock handling below if unavailable.
      }
    }

    await enableNoSleepFallback();

    if (typeof navigator === 'undefined') {
      return;
    }

    const wakeLockManager = (navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
    }).wakeLock;

    if (wakeLockManager === undefined || wakeLockRef.current !== null) {
      return;
    }

    try {
      wakeLockRef.current = await wakeLockManager.request('screen');
    } catch {
      wakeLockRef.current = null;
    }
  }

  async function releaseWakeLock(): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      try {
        await nativeKeepAwake.allowSleep();
      } catch {
        // Continue with fallback cleanup even if native release is unavailable.
      }
    }

    disableNoSleepFallback();

    const wakeLock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (wakeLock === null) {
      return;
    }

    try {
      await wakeLock.release();
    } catch {
      return;
    }
  }

  function syncControllerState(): WorkoutSessionControllerState | null {
    const controller = controllerRef.current;
    if (controller === null) {
      return null;
    }

    const nextState = controller.getState();
    setControllerState(nextState);
    return nextState;
  }

  async function refreshHistory(preferredSessionId?: string | null): Promise<void> {
    const storage = storageRef.current;
    if (storage === null) {
      return;
    }

    const sessions = await storage.sessions.listAll();
    setHistorySessions(sessions);
    setSelectedHistorySessionId((current) => {
      const requested = preferredSessionId === undefined ? current : preferredSessionId;
      if (requested !== null && requested !== undefined && sessions.some((session) => session.id === requested)) {
        return requested;
      }

      return sessions[0]?.id ?? null;
    });
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

  useEffect(() => {
    const storage = storageRef.current;
    const selectedHistorySession = historySessions.find((session) => session.id === selectedHistorySessionId) ?? null;
    const previousHistorySession = getPreviousComparisonSessionForHistory(historySessions, selectedHistorySessionId);
    if (storage === null || selectedHistorySession === null) {
      setSelectedHistorySamples([]);
      setSelectedHistoryPreviousStats([]);
      return;
    }

    let cancelled = false;
    const historyComparisonStorage = storage;
    const historyComparisonSession = selectedHistorySession;

    async function loadHistoryComparisonData(): Promise<void> {
      const [sampleRecords, previousStats] = await Promise.all([
        historyComparisonStorage.heartRateSamples.listBySessionId(historyComparisonSession.id),
        previousHistorySession === null
          ? Promise.resolve([])
          : historyComparisonStorage.intervalStats.listBySessionId(previousHistorySession.id)
      ]);
      if (cancelled) {
        return;
      }

      setSelectedHistorySamples(sampleRecords.map((sample) => ({
        timestampMs: sample.timestampMs,
        bpm: sample.bpm,
        isMissing: sample.isMissing
      })));
      setSelectedHistoryPreviousStats(previousStats);
    }

    void loadHistoryComparisonData();

    return () => {
      cancelled = true;
    };
  }, [historySessions, selectedHistorySessionId]);

  async function handleConnectToggle(): Promise<void> {
    const monitor = monitorRef.current;
    if (monitor === null) {
      return;
    }

    if (monitor.isSupported() === false) {
      setConnectionMessage('Bluetooth monitor connection is not available on this device. Use the native iPhone app or a supported Chromium-based browser.');
      return;
    }

    setIsConnecting(true);
    setConnectionMessage(null);

    try {
      await ensureAudioReady();
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

  async function handleReconnectMonitor(): Promise<void> {
    const monitor = monitorRef.current;
    if (monitor === null || controllerState.hrConnectionStatus !== 'connected') {
      return;
    }

    setIsConnecting(true);
    setConnectionMessage(null);

    try {
      await ensureAudioReady();
      await monitor.disconnect();
      await monitor.connect();
    } catch (error) {
      setConnectionMessage(error instanceof Error ? error.message : 'Failed to reconnect to the heart-rate monitor.');
    } finally {
      setIsConnecting(false);
      syncControllerState();
    }
  }

  async function handleStartSession(): Promise<void> {
    const controller = controllerRef.current;
    if (controller === null || startupCountdownSec !== null) {
      return;
    }

    await ensureAudioReady();
    await enableNoSleepFallback();
    setStartupCountdownSec(3);

    for (const countdownSec of [3, 2, 1]) {
      setStartupCountdownSec(countdownSec);
      playTone(1760, 0.1);
      await delay(1000);
    }

    playTone(1760, 0.8);
    await delay(850);
    setStartupCountdownSec(null);
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
    void ensureAudioReady();
    void enableNoSleepFallback();
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

  function navigateHistoryByOffset(offset: number): void {
    if (offset === 0 || historySessions.length === 0 || selectedHistorySessionId === null) {
      return;
    }

    const currentIndex = historySessions.findIndex((session) => session.id === selectedHistorySessionId);
    if (currentIndex === -1) {
      return;
    }

    const nextIndex = Math.max(0, Math.min(historySessions.length - 1, currentIndex + offset));
    if (nextIndex === currentIndex) {
      return;
    }

    setMobileHistoryMode(true);
    setSelectedHistorySessionId(historySessions[nextIndex]?.id ?? null);
    setHistoryScrubXPercent(null);
  }

  async function handleExportData(): Promise<void> {
    const storage = storageRef.current;
    if (storage === null || isSessionActive || startupCountdownSec !== null) {
      return;
    }

    setIsTransferringData(true);
    setTransferMessage(null);
    setTransferMessageIsError(false);

    try {
      const backup = await exportStorageBackup(storage);
      const backupJson = JSON.stringify(backup, null, 2);
      const exportName = 'hiit-master-backup-' + backup.exportedAt.replace(/[:.]/g, '-') + '.json';
      const blob = new Blob([backupJson], { type: 'application/json' });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = exportName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      setTransferMessage('Exported ' + String(backup.sessions.length) + ' sessions to ' + exportName + '.');
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : 'Failed to export stored data.');
      setTransferMessageIsError(true);
    } finally {
      setIsTransferringData(false);
    }
  }

  function handleImportButtonClick(): void {
    if (isSessionActive || startupCountdownSec !== null) {
      return;
    }

    setTransferMessage(null);
    setTransferMessageIsError(false);
    if (importInputRef.current !== null) {
      importInputRef.current.value = '';
      importInputRef.current.click();
    }
  }

  async function handleImportFileChange(event: Event): Promise<void> {
    const storage = storageRef.current;
    const input = event.currentTarget as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (storage === null || file === null || isSessionActive || startupCountdownSec !== null) {
      return;
    }

    setIsTransferringData(true);
    setTransferMessage(null);
    setTransferMessageIsError(false);

    try {
      const parsed = parseStorageBackup(JSON.parse(await file.text()));
      const confirmed = typeof window === 'undefined'
        ? true
        : window.confirm('Replace all stored sessions on this device with the contents of ' + file.name + '?');
      if (confirmed === false) {
        return;
      }

      await importStorageBackup(storage, parsed);
      const preferredSessionId = parsed.sessions[0]?.id ?? null;
      setWorkDurationSec(parsed.appSettings?.lastWorkDurationSec ?? DEFAULT_WORK_DURATION_SEC);
      setMobileHistoryMode(false);
      setScrubXPercent(null);
      setHistoryScrubXPercent(null);
      await refreshHistory(preferredSessionId);
      setTransferMessage('Imported ' + String(parsed.sessions.length) + ' sessions from ' + file.name + '.');
    } catch (error) {
      setTransferMessage(error instanceof Error ? error.message : 'Failed to import stored data.');
      setTransferMessageIsError(true);
    } finally {
      setIsTransferringData(false);
      if (input !== null) {
        input.value = '';
      }
    }
  }

  async function handleDeleteHistorySession(sessionId: string): Promise<void> {
    const storage = storageRef.current;
    if (storage === null || deletingHistorySessionId !== null) {
      return;
    }

    const targetSession = historySessions.find((session) => session.id === sessionId) ?? null;
    if (targetSession === null) {
      return;
    }

    const confirmed = typeof window === 'undefined'
      ? true
      : window.confirm('Delete ' + formatSessionDate(targetSession.startedAt) + '? This removes the session, its heart-rate samples, and its interval stats.');
    if (confirmed === false) {
      return;
    }

    setDeletingHistorySessionId(sessionId);

    try {
      await storage.heartRateSamples.deleteBySessionId(sessionId);
      await storage.intervalStats.deleteBySessionId(sessionId);
      await storage.sessions.deleteById(sessionId);

      const remainingSessions = historySessions.filter((session) => session.id !== sessionId);
      const deletedIndex = historySessions.findIndex((session) => session.id === sessionId);
      const nextSelection = selectedHistorySessionId !== sessionId
        ? selectedHistorySessionId
        : remainingSessions[Math.min(deletedIndex, Math.max(remainingSessions.length - 1, 0))]?.id ?? null;

      await refreshHistory(nextSelection);
    } finally {
      setDeletingHistorySessionId(null);
    }
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

  useEffect(() => {
    if ((controllerState.controllerStatus === 'running' || controllerState.controllerStatus === 'paused') || controllerState.hrConnectionStatus !== 'connected') {
      return;
    }

    const timerId = window.setTimeout(() => {
      scrollDurationWheelToValue(workDurationSec, 'auto');
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [controllerState.controllerStatus, controllerState.hrConnectionStatus, workDurationSec]);

  const activePhase = getActivePhase(controllerState);
  const phaseRemainingSec = activePhase === null ? 0 : Math.max(0, activePhase.endSec - controllerState.elapsedSec);
  const totalRemainingSec = controllerState.workoutPlan === null
    ? 0
    : Math.max(0, controllerState.workoutPlan.totalDurationSec - controllerState.elapsedSec);
  const isSessionActive = controllerState.controllerStatus === 'running' || controllerState.controllerStatus === 'paused';
  const canStart = bootstrapStatus === 'ready'
    && controllerState.hrConnectionStatus === 'connected'
    && isSessionActive === false
    && startupCountdownSec === null;
  const roundLabel = controllerState.currentRoundIndex === null
    ? (controllerState.currentPhaseType === 'cooldown' ? 'Cooldown' : 'Warmup')
    : String(controllerState.currentRoundIndex + 1) + ' / ' + String(ROUNDS_PLANNED);
  const progressPercent = controllerState.workoutPlan === null || controllerState.workoutPlan.totalDurationSec === 0
    ? 0
    : Math.min(100, (controllerState.elapsedSec / controllerState.workoutPlan.totalDurationSec) * 100);
  const phaseClassName = startupCountdownSec !== null
    ? 'phase--rest'
    : controllerState.currentPhaseType === null ? 'phase--idle' : 'phase--' + controllerState.currentPhaseType;
  const statusCopy = getStatusCopy(controllerState);
  const effectiveCurrentIntervalStats = demoFixture === null ? controllerState.currentIntervalStats : demoFixture.currentStats;
  const effectiveCurrentHeartRateSamples = demoFixture === null ? controllerState.currentHeartRateSamples : demoFixture.currentSamples;
  const effectivePreviousIntervalStats = demoFixture === null ? previousIntervalStats : demoFixture.previousStats;
  const previousComparisonSession = historySessions.find((session) => session.id === controllerState.previousComparisonSessionId) ?? null;
  const previewWorkoutPlan = startupCountdownSec === null ? null : createWorkoutPlan(workDurationSec);
  const currentChartTiming = demoFixture === null
    ? getChartTimingFromWorkoutPlan(controllerState.workoutPlan ?? previewWorkoutPlan)
    : getChartTimingFromSession(demoFixture.currentSession);
  const previousChartTiming = demoFixture === null
    ? getChartTimingFromSession(previousComparisonSession)
    : getChartTimingFromSession(demoFixture.previousSession);
  const liveSessionStartedAtMs = demoFixture === null
    ? controllerState.sessionStartedAtMs
    : Date.parse(demoFixture.currentSession.startedAt);
  const comparisonRounds = demoFixture === null
    ? getVisibleLiveComparisonRounds(
      effectiveCurrentIntervalStats,
      effectivePreviousIntervalStats,
      currentChartTiming,
      controllerState.elapsedSec,
      effectiveCurrentHeartRateSamples,
      liveSessionStartedAtMs
    )
    : demoFixture.comparisonRounds;
  const comparisonChart = createComparisonChartModel(
    effectiveCurrentHeartRateSamples,
    liveSessionStartedAtMs,
    effectiveCurrentIntervalStats,
    effectivePreviousIntervalStats,
    currentChartTiming,
    previousChartTiming
  );
  const maxComparisonDiff = getMaxComparisonDiff(comparisonRounds);
  const comparisonStripBars = comparisonChart === null
    ? []
    : createComparisonStripBars(
      comparisonRounds,
      currentChartTiming,
      comparisonChart.maxElapsedSec,
      maxComparisonDiff,
      effectiveCurrentHeartRateSamples,
      liveSessionStartedAtMs,
      effectiveCurrentIntervalStats
    );
  const scrubDetail = comparisonChart === null
    ? null
    : createComparisonScrubDetail(
      scrubXPercent,
      comparisonRounds,
      effectiveCurrentHeartRateSamples,
      liveSessionStartedAtMs,
      currentChartTiming,
      comparisonChart.maxElapsedSec,
      effectiveCurrentIntervalStats
    );
  const isScrubberEnabled = controllerState.controllerStatus !== 'running';
  const isPortraitPhone = isPortraitPhoneLayout();
  const showSetupRuntimePanels = isSessionActive === false && startupCountdownSec === null;
  const selectedHistorySession = historySessions.find((session) => session.id === selectedHistorySessionId) ?? null;
  const selectedHistoryComparisonSession = getPreviousComparisonSessionForHistory(historySessions, selectedHistorySessionId);
  const showMobileHistoryMode = isPortraitPhone && mobileHistoryMode && isSessionActive === false && selectedHistorySession !== null;
  const selectedHistoryTiming = getChartTimingFromSession(selectedHistorySession);
  const selectedHistoryPreviousTiming = getChartTimingFromSession(selectedHistoryComparisonSession);
  const selectedHistoryComparisonRounds = createComparisonRounds(selectedHistoryStats, selectedHistoryPreviousStats);
  const selectedHistoryChart = createComparisonChartModel(
    selectedHistorySamples,
    selectedHistorySession === null ? null : Date.parse(selectedHistorySession.startedAt),
    selectedHistoryStats,
    selectedHistoryPreviousStats,
    selectedHistoryTiming,
    selectedHistoryPreviousTiming
  );
  const selectedHistoryStripBars = selectedHistoryChart === null
    ? []
    : createComparisonStripBars(
      selectedHistoryComparisonRounds,
      selectedHistoryTiming,
      selectedHistoryChart.maxElapsedSec,
      getMaxComparisonDiff(selectedHistoryComparisonRounds),
      selectedHistorySamples,
      selectedHistorySession === null ? null : Date.parse(selectedHistorySession.startedAt),
      selectedHistoryStats
    );
  const selectedHistoryScrubDetail = selectedHistoryChart === null
    ? null
    : createComparisonScrubDetail(
      historyScrubXPercent,
      selectedHistoryComparisonRounds,
      selectedHistorySamples,
      selectedHistorySession === null ? null : Date.parse(selectedHistorySession.startedAt),
      selectedHistoryTiming,
      selectedHistoryChart.maxElapsedSec,
      selectedHistoryStats
    );
  const liveTimeLabels = isPortraitPhone ? comparisonChart?.timeLabels.slice(1) ?? [] : comparisonChart?.timeLabels ?? [];
  const historyTimeLabels = isPortraitPhone ? selectedHistoryChart?.timeLabels.slice(1) ?? [] : selectedHistoryChart?.timeLabels ?? [];

  useEffect(() => {
    if (controllerState.controllerStatus === 'running') {
      void requestWakeLock();
      return;
    }

    void releaseWakeLock();
  }, [controllerState.controllerStatus]);

  useEffect(() => {
    async function handleVisibilityChange(): Promise<void> {
      if (document.visibilityState === 'visible' && controllerState.controllerStatus === 'running') {
        await requestWakeLock();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [controllerState.controllerStatus]);

  useEffect(() => {
    if (controllerState.controllerStatus !== 'running') {
      lastCountdownBeepSecRef.current = null;
      previousPhaseTypeRef.current = controllerState.currentPhaseType;
      return;
    }

    const previousPhaseType = previousPhaseTypeRef.current;
    const hasPhaseTransition = (
      previousPhaseType !== null
      && controllerState.currentPhaseType !== null
      && previousPhaseType !== controllerState.currentPhaseType
    );

    if (hasPhaseTransition) {
      playTone(1760, 0.4);
      lastCountdownBeepSecRef.current = null;
    } else if (phaseRemainingSec > 0 && phaseRemainingSec <= 3 && lastCountdownBeepSecRef.current !== phaseRemainingSec) {
      playTone(1760, 0.1);
      lastCountdownBeepSecRef.current = phaseRemainingSec;
    } else if (phaseRemainingSec > 3) {
      lastCountdownBeepSecRef.current = null;
    }

    previousPhaseTypeRef.current = controllerState.currentPhaseType;
  }, [controllerState.controllerStatus, controllerState.currentPhaseType, phaseRemainingSec]);

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

  function updateScrubberFromClientX(
    clientX: number,
    container: HTMLDivElement | null,
    setValue: (value: number | null) => void,
    isEnabled: boolean
  ): void {
    if (isEnabled === false || container === null) {
      return;
    }

    const bounds = container.getBoundingClientRect();
    if (bounds.width <= 0) {
      return;
    }

    if (clientX < bounds.left || clientX > bounds.right) {
      return;
    }

    const rawPercent = ((clientX - bounds.left) / bounds.width) * 100;
    const clampedPercent = Math.max(0, Math.min(100, rawPercent));
    setValue(clampedPercent);
  }

  function handleComparisonPointerDown(event: PointerEvent): void {
    updateScrubberFromClientX(event.clientX, comparisonPlotRef.current, setScrubXPercent, isScrubberEnabled);
  }

  function handleComparisonPointerMove(event: PointerEvent): void {
    if (event.buttons === 0 && event.pointerType === 'mouse') {
      return;
    }

    updateScrubberFromClientX(event.clientX, comparisonPlotRef.current, setScrubXPercent, isScrubberEnabled);
  }

  function handleComparisonPointerEnter(_event: PointerEvent): void {}

  function handleComparisonPointerLeave(): void {
    setScrubXPercent(null);
  }

  function handleHistoryComparisonPointerDown(event: PointerEvent): void {
    updateScrubberFromClientX(event.clientX, historyComparisonPlotRef.current, setHistoryScrubXPercent, true);
  }

  function handleHistoryComparisonPointerMove(event: PointerEvent): void {
    if (event.buttons === 0 && event.pointerType === 'mouse') {
      return;
    }

    updateScrubberFromClientX(event.clientX, historyComparisonPlotRef.current, setHistoryScrubXPercent, true);
  }

  function handleHistoryComparisonPointerEnter(_event: PointerEvent): void {}

  function handleHistoryComparisonPointerLeave(): void {
    setHistoryScrubXPercent(null);
  }

  function handleHistorySwipeTouchStart(event: TouchEvent): void {
    if (isPortraitPhone === false) {
      historySwipeRef.current = null;
      return;
    }

    const touch = event.touches[0];
    const target = event.target;
    const isIgnored = target instanceof HTMLElement
      && target.closest('button, a, input, select, textarea, label, .comparison-visual, .comparison-strip-shell, .comparison-chart-frame, .comparison-strip') !== null;

    historySwipeRef.current = touch === undefined
      ? null
      : { startX: touch.clientX, startY: touch.clientY, isIgnored, pointerId: null };
  }

  function handleHistorySwipePointerDown(event: PointerEvent): void {
    if (isPortraitPhone === false || event.pointerType === 'touch') {
      return;
    }

    const target = event.target;
    const isIgnored = target instanceof HTMLElement
      && target.closest('button, a, input, select, textarea, label, .comparison-visual, .comparison-strip-shell, .comparison-chart-frame, .comparison-strip') !== null;

    historySwipeRef.current = { startX: event.clientX, startY: event.clientY, isIgnored, pointerId: event.pointerId };
  }

  function handleHistorySwipeTouchMove(event: TouchEvent): void {
    const swipe = historySwipeRef.current;
    if (swipe === null || swipe.isIgnored) {
      return;
    }

    const touch = event.touches[0];
    if (touch === undefined) {
      return;
    }

    const deltaX = touch.clientX - swipe.startX;
    const deltaY = touch.clientY - swipe.startY;
    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && Math.abs(deltaX) > 24) {
      event.preventDefault();
    }
  }

  function commitHistorySwipe(deltaX: number, deltaY: number): void {
    if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.3) {
      return;
    }

    navigateHistoryByOffset(deltaX < 0 ? 1 : -1);
  }

  function handleHistorySwipeTouchEnd(event: TouchEvent): void {
    const swipe = historySwipeRef.current;
    historySwipeRef.current = null;
    if (swipe === null || swipe.isIgnored || isPortraitPhone === false) {
      return;
    }

    const touch = event.changedTouches[0];
    if (touch === undefined) {
      return;
    }

    commitHistorySwipe(touch.clientX - swipe.startX, touch.clientY - swipe.startY);
  }

  function handleHistorySwipePointerMove(event: PointerEvent): void {
    const swipe = historySwipeRef.current;
    if (swipe === null || swipe.isIgnored || swipe.pointerId !== event.pointerId || event.pointerType === 'touch') {
      return;
    }

    const deltaX = event.clientX - swipe.startX;
    const deltaY = event.clientY - swipe.startY;
    if (Math.abs(deltaX) > Math.abs(deltaY) * 1.2 && Math.abs(deltaX) > 24) {
      event.preventDefault();
    }
  }

  function handleHistorySwipePointerUp(event: PointerEvent): void {
    const swipe = historySwipeRef.current;
    if (swipe === null || swipe.pointerId !== event.pointerId || event.pointerType === 'touch') {
      return;
    }

    historySwipeRef.current = null;
    if (swipe.isIgnored || isPortraitPhone === false) {
      return;
    }

    commitHistorySwipe(event.clientX - swipe.startX, event.clientY - swipe.startY);
  }

  function isPortraitPhoneLayout(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 600px) and (orientation: portrait)').matches;
  }

  function handleExitMobileHistoryMode(): void {
    setMobileHistoryMode(false);
    setHistoryScrubXPercent(null);
  }

  function getDurationOptions(): number[] {
    return Array.from({ length: MAX_WORK_DURATION_SEC - MIN_WORK_DURATION_SEC + 1 }, (_, index) => MIN_WORK_DURATION_SEC + index);
  }

  function scrollDurationWheelToValue(value: number, behavior: ScrollBehavior = 'smooth'): void {
    const wheel = durationWheelRef.current;
    if (wheel === null) {
      return;
    }

    const clampedValue = Math.max(MIN_WORK_DURATION_SEC, Math.min(MAX_WORK_DURATION_SEC, value));
    const index = clampedValue - MIN_WORK_DURATION_SEC;
    wheel.scrollTo({
      top: index * DURATION_WHEEL_ITEM_HEIGHT_PX,
      behavior
    });
  }

  function handleDurationWheelScroll(event: Event): void {
    const target = event.currentTarget as HTMLDivElement | null;
    if (target === null) {
      return;
    }

    const index = Math.max(
      0,
      Math.min(
        MAX_WORK_DURATION_SEC - MIN_WORK_DURATION_SEC,
        Math.round(target.scrollTop / DURATION_WHEEL_ITEM_HEIGHT_PX)
      )
    );
    const nextValue = MIN_WORK_DURATION_SEC + index;
    if (nextValue !== workDurationSec) {
      setWorkDurationSec(nextValue);
    }
  }

  function handleScreenTap(event: MouseEvent): void {
    if (isSessionActive === false || isPortraitPhoneLayout() === false) {
      return;
    }

    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.closest('button, a, input, select, textarea, label') !== null) {
      return;
    }

    if (controllerState.controllerStatus === 'running') {
      handlePause();
      return;
    }

    if (controllerState.controllerStatus === 'paused') {
      handleResume();
    }
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
    <main
      className={
        'screen'
        + (showMobileHistoryMode ? ' screen--mobile-history' : '')
        + (showSetupRuntimePanels ? ' screen--setup' : '')
      }
      onClick={handleScreenTap as JSX.MouseEventHandler<HTMLElement>}
      onTouchStart={handleHistorySwipeTouchStart as JSX.TouchEventHandler<HTMLElement>}
      onTouchMove={handleHistorySwipeTouchMove as JSX.TouchEventHandler<HTMLElement>}
      onTouchEnd={handleHistorySwipeTouchEnd as JSX.TouchEventHandler<HTMLElement>}
      onPointerDown={handleHistorySwipePointerDown as JSX.PointerEventHandler<HTMLElement>}
      onPointerMove={handleHistorySwipePointerMove as JSX.PointerEventHandler<HTMLElement>}
      onPointerUp={handleHistorySwipePointerUp as JSX.PointerEventHandler<HTMLElement>}
    >
      <section className={'hero-card hero-card--session ' + phaseClassName + (isSessionActive ? ' hero-card--running' : '')}>
        <p className="eyebrow">{controllerState.connectedDeviceName ?? 'No HR monitor connected'}</p>
        {isSessionActive || startupCountdownSec !== null ? <h1 className="timer">{startupCountdownSec === null ? formatClock(phaseRemainingSec) : '00:0' + String(startupCountdownSec)}</h1> : null}
        <div className="hero-scrub-slot" aria-live="polite">
          {scrubDetail !== null && isScrubberEnabled ? <div className="hero-scrub-card">
            <strong>{scrubDetail.timeLabel}</strong>
            <span>Round {scrubDetail.roundNumber}</span>
            <span>{scrubDetail.currentBpm === null ? 'No HR data' : 'BPM ' + formatDeltaValue(scrubDetail.currentBpm)}</span>
            <span>Current {formatDeltaValue(scrubDetail.currentDelta)} / Previous {formatDeltaValue(scrubDetail.previousDelta)}</span>
            <span className={getDiffClassName({ roundIndex: scrubDetail.roundIndex, currentDelta: scrubDetail.currentDelta, previousDelta: scrubDetail.previousDelta, diffDelta: scrubDetail.diffDelta })}>{formatSignedDelta(scrubDetail.diffDelta)}</span>
          </div> : null}
        </div>
        <p className={'phase ' + phaseClassName}>{startupCountdownSec === null ? getPhaseHeading(controllerState.currentPhaseType, controllerState.controllerStatus) : 'Starting'}</p>
        <p className="copy">{statusCopy}</p>
        <div className="hero-metrics">
          {(isSessionActive || startupCountdownSec !== null) ? <div className="metric-pill metric-pill--round">
            <span>Round</span>
            <strong>{roundLabel}</strong>
          </div> : null}
          {(isSessionActive || controllerState.hrConnectionStatus === 'connected') ? <div className="metric-pill metric-pill--bpm">
            <span>BPM</span>
            <strong>{controllerState.currentBpm === null ? '--' : controllerState.currentBpm}</strong>
          </div> : null}
          {(isSessionActive || startupCountdownSec !== null) ? <div className="metric-pill metric-pill--total">
            <span>Total Left</span>
            <strong>{formatClock(totalRemainingSec)}</strong>
          </div> : null}
        </div>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-bar" style={{ width: String(progressPercent) + '%' }} />
        </div>
      </section>

      <section className="status-grid">
        {showSetupRuntimePanels ? <>
          <article className="panel panel--setup">
            <h2>Setup</h2>
            {controllerState.hrConnectionStatus !== 'connected' ? <div className="setup-connect-only">
              <button type="button" className="primary-action primary-action--connect" onClick={() => void handleConnectToggle()} disabled={isConnecting || startupCountdownSec !== null || isTransferringData}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 20s-6.5-4.1-6.5-9.3A3.9 3.9 0 0 1 9.4 6.8c1 0 1.9.4 2.6 1.1.7-.7 1.6-1.1 2.6-1.1a3.9 3.9 0 0 1 3.9 3.9C18.5 15.9 12 20 12 20Z" fill="currentColor" />
                  <path d="M9.2 12h1.8l1-2.1 1.2 4.2 1-2.1h1.6" fill="none" stroke="#081019" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <span>{isConnecting ? 'Connecting...' : 'Connect'}</span>
              </button>
            </div> : <>
              <div className="setup-connected-layout">
                <div className="setup-connected-layout__spacer" aria-hidden="true" />
                <div className="action-stack">
                  <button type="button" className="primary-action primary-action--start" onClick={() => void handleStartSession()} disabled={canStart === false || isConnecting || isTransferringData}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="15.5" cy="4.75" r="2.25" fill="currentColor" />
                      <path d="m13.8 8.2-2.9 3.4-2.7 1.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="m13.3 8.7 3.8 2 .9 3.1" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="m11 12.4 2.4 2.2-1.4 4.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
                      <path d="m13.6 14.8 4.5 2.4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                    <span>{startupCountdownSec !== null
                      ? 'Starting ' + String(startupCountdownSec)
                      : 'Start'}</span>
                  </button>
                </div>
                <div className="setup-connected-layout__spacer" aria-hidden="true" />
                <div className="duration-picker" aria-label="Workout duration picker">
                  <span className="duration-picker__label">Workout Duration</span>
                  <div className="duration-wheel-shell">
                    <div className="duration-wheel-shell__fade duration-wheel-shell__fade--top" aria-hidden="true" />
                    <div className="duration-wheel-shell__fade duration-wheel-shell__fade--bottom" aria-hidden="true" />
                    <div className="duration-wheel-shell__highlight" aria-hidden="true" />
                    <div
                      ref={durationWheelRef}
                      className="duration-wheel"
                      onScroll={handleDurationWheelScroll as JSX.UIEventHandler<HTMLDivElement>}
                    >
                      <div className="duration-wheel__spacer" aria-hidden="true" />
                      {getDurationOptions().map((durationSec) => (
                        <button
                          key={durationSec}
                          type="button"
                          className={'duration-wheel__item' + (durationSec === workDurationSec ? ' duration-wheel__item--selected' : '')}
                          onClick={() => {
                            setWorkDurationSec(durationSec);
                            scrollDurationWheelToValue(durationSec);
                          }}
                          disabled={isSessionActive || isConnecting}
                        >
                          <span>{durationSec}</span>
                          <small>sec</small>
                        </button>
                      ))}
                      <div className="duration-wheel__spacer" aria-hidden="true" />
                    </div>
                  </div>
                </div>
                <div className="setup-connected-layout__spacer" aria-hidden="true" />
              </div>
            </>}
            {/* Data import/export will move to the dedicated Data screen. */}
            <input ref={importInputRef} type="file" accept="application/json" className="visually-hidden" onChange={(event) => void handleImportFileChange(event)} />
            <p className="panel-copy">
              Uses native BLE inside the iPhone app and Web Bluetooth in supported desktop browsers. Connection drops are recorded through the existing session-controller compromise flow.
            </p>
            {connectionMessage !== null ? <p className="panel-copy panel-copy--alert">{connectionMessage}</p> : null}
            {transferMessage !== null ? <p className={'panel-copy' + (transferMessageIsError ? ' panel-copy--alert' : '')}>{transferMessage}</p> : null}
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
              <button type="button" onClick={() => void handleEndEarly()}>End Early</button>
            </div>
            <p className="panel-copy">
              Previous comparison source: {controllerState.previousComparisonSessionId ?? 'none yet'}
            </p>
          </article>
        </> : <article className="panel panel-wide panel--session-controls">
          <div className="session-controls-head">
            <div className="session-runtime-pill">
              <span>Status</span>
              <strong>{controllerState.controllerStatus}</strong>
            </div>
            <div className="session-runtime-pill">
              <span>Connection</span>
              <strong>{controllerState.hrConnectionStatus}</strong>
            </div>
            <div className="session-runtime-pill">
              <span>Compromised</span>
              <strong>{controllerState.isCompromised ? 'Yes' : 'No'}</strong>
            </div>
          </div>
          <div className="action-stack action-stack--inline action-stack--session">
            <button type="button" onClick={handlePause} disabled={controllerState.controllerStatus !== 'running'}>Pause</button>
            <button type="button" onClick={handleResume} disabled={controllerState.controllerStatus !== 'paused'}>Resume</button>
            <button type="button" onClick={() => void handleEndEarly()}>End Early</button>
          </div>
        </article>}

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
                      <span key={guide.label} style={{ top: String(guide.y) + '%' }}>{guide.label}</span>
                    ))}
                  </div>
                  <div ref={comparisonPlotRef} className="comparison-chart-frame">
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
                      {liveTimeLabels.map((label) => (
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
              <p className="panel-copy">Each bar is centered on the time its comparison becomes knowable. Up means the current round delta beat the previous session, down means it underperformed.</p>
            </>
          )}
          {demoFixture !== null ? <p className="panel-copy">Demo comparison fixture active via demo_comparison=1.</p> : null}
          {comparisonRounds.length > 0 && effectivePreviousIntervalStats.length === 0 ? (
            <p className="panel-copy">No previous comparison-eligible session exists yet, so current deltas are shown without a baseline.</p>
          ) : null}
        </article>

        {(controllerState.hrConnectionStatus === 'connected' && showMobileHistoryMode === false) ? null : <article className="panel panel-wide panel--history">
          <h2>History</h2>
          {showMobileHistoryMode ? <div className="history-mobile-actions">
            <button type="button" onClick={() => navigateHistoryByOffset(-1)}>Newer</button>
            <button type="button" onClick={handleExitMobileHistoryMode}>Back</button>
            <button type="button" onClick={() => navigateHistoryByOffset(1)}>Older</button>
            {selectedHistorySession === null ? null : <button type="button" className="history-item-delete" onClick={() => void handleDeleteHistorySession(selectedHistorySession.id)} disabled={deletingHistorySessionId === selectedHistorySession.id}>{deletingHistorySessionId === selectedHistorySession.id ? 'Deleting...' : 'Delete'}</button>}
          </div> : null}
          <div className="history-layout">
            <div className="history-detail">
              {selectedHistorySession === null ? (
                <p className="panel-copy">Choose a stored session to inspect its round metrics.</p>
              ) : (
                <>
                  <p className="panel-copy">
                    {formatSessionDate(selectedHistorySession.startedAt)}. {selectedHistorySession.status}. {selectedHistorySession.comparisonEligible ? 'Eligible for comparison.' : 'Not eligible for comparison.'}
                  </p>
                  {selectedHistoryChart === null ? null : <>
                    <div className="hero-scrub-slot hero-scrub-slot--history" aria-live="polite">
                      {selectedHistoryScrubDetail !== null ? <div className="hero-scrub-card hero-scrub-card--history">
                        <strong>{selectedHistoryScrubDetail.timeLabel}</strong>
                        <span>Round {selectedHistoryScrubDetail.roundNumber}</span>
                        <span>{selectedHistoryScrubDetail.currentBpm === null ? 'No HR data' : 'BPM ' + formatDeltaValue(selectedHistoryScrubDetail.currentBpm)}</span>
                        <span>Current {formatDeltaValue(selectedHistoryScrubDetail.currentDelta)} / Previous {formatDeltaValue(selectedHistoryScrubDetail.previousDelta)}</span>
                        <span className={getDiffClassName({ roundIndex: selectedHistoryScrubDetail.roundIndex, currentDelta: selectedHistoryScrubDetail.currentDelta, previousDelta: selectedHistoryScrubDetail.previousDelta, diffDelta: selectedHistoryScrubDetail.diffDelta })}>{formatSignedDelta(selectedHistoryScrubDetail.diffDelta)}</span>
                      </div> : null}
                    </div>
                    <div
                      ref={historyComparisonInteractionRef}
                      className="comparison-visual comparison-visual--history comparison-visual--interactive"
                      onPointerDown={handleHistoryComparisonPointerDown as JSX.PointerEventHandler<HTMLDivElement>}
                      onPointerMove={handleHistoryComparisonPointerMove as JSX.PointerEventHandler<HTMLDivElement>}
                      onPointerEnter={handleHistoryComparisonPointerEnter as JSX.PointerEventHandler<HTMLDivElement>}
                      onPointerLeave={handleHistoryComparisonPointerLeave as JSX.PointerEventHandler<HTMLDivElement>}
                    >
                      <div className="comparison-chart-shell">
                        <div className="comparison-axis" aria-hidden="true">
                          {selectedHistoryChart.guides.map((guide) => (
                            <span key={guide.label} style={{ top: String(guide.y) + '%' }}>{guide.label}</span>
                          ))}
                        </div>
                        <div ref={historyComparisonPlotRef} className="comparison-chart-frame">
                          <svg className="comparison-chart" viewBox="0 0 100 100" role="img" aria-label="Selected session heart-rate chart with comparison strip below" preserveAspectRatio="none">
                            {selectedHistoryChart.guides.map((guide) => (
                              <line key={guide.label} x1="0" y1={guide.y} x2="100" y2={guide.y} stroke="rgba(255, 255, 255, 0.1)" strokeWidth="0.4" />
                            ))}
                            {selectedHistoryChart.currentPathSegments.map((segment, index) => (
                              <polyline key={String(index)} points={segment} fill="none" stroke="#fff8de" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            ))}
                            {selectedHistoryScrubDetail !== null ? <line x1={selectedHistoryScrubDetail.xPercent} y1="0" x2={selectedHistoryScrubDetail.xPercent} y2="100" stroke="rgba(120, 184, 255, 0.95)" strokeWidth="0.8" /> : null}
                          </svg>
                          <div className="comparison-rounds" aria-hidden="true">
                            {historyTimeLabels.map((label) => (
                              <span key={label.label} style={{ left: String(label.xPercent) + '%' }}>{label.label}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="comparison-strip-shell comparison-strip-shell--history">
                      <div className="comparison-strip-axis" aria-hidden="true">
                        <span>+</span>
                        <span>0</span>
                        <span>-</span>
                      </div>
                      <div className="comparison-strip" aria-label="Selected session delta versus previous session by round midpoint">
                        <div className="comparison-strip-baseline" />
                        {selectedHistoryScrubDetail !== null ? <div className="comparison-strip-scrub-line" style={{ left: String(selectedHistoryScrubDetail.xPercent) + '%' }} /> : null}
                        {selectedHistoryStripBars.map((bar) => (
                          <div
                            key={bar.roundIndex}
                            className={bar.className}
                            style={bar.style}
                            title={bar.title}
                          />
                        ))}
                      </div>
                    </div>
                    {selectedHistoryComparisonSession === null ? (
                      <p className="panel-copy">No earlier comparison-eligible session exists for this historical workout, so only the session trace is shown.</p>
                    ) : null}
                  </>}
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
            <div className="history-list history-list--footer">
              {historySessions.length === 0 ? (
                <p className="panel-copy">No sessions stored yet.</p>
              ) : historySessions.map((session) => (
                <div
                  key={session.id}
                  className={'history-item ' + (session.id === selectedHistorySessionId ? 'history-item--active' : '')}
                >
                  <button
                    type="button"
                    className="history-item-select"
                    onClick={() => {
                      setSelectedHistorySessionId(session.id);
                      setMobileHistoryMode(true);
                    }}
                  >
                    <span>{formatSessionDate(session.startedAt)}</span>
                    <strong>{session.workDurationSec}s work</strong>
                    <span>{formatSessionBadge(session)}</span>
                  </button>
                  <button
                    type="button"
                    className="history-item-delete"
                    onClick={() => void handleDeleteHistorySession(session.id)}
                    disabled={deletingHistorySessionId === session.id}
                    aria-label={'Delete ' + formatSessionDate(session.startedAt)}
                  >
                    {deletingHistorySessionId === session.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </article>}
      </section>

      <nav className="mobile-tab-bar" aria-label="Primary">
        <button type="button" className="mobile-tab-bar__item mobile-tab-bar__item--active" aria-current="page">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <span>Home</span>
        </button>
        <button type="button" className="mobile-tab-bar__item">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 7.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm10 4a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path d="M9.5 10h5M9.5 14h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <span>Devices</span>
        </button>
        <button type="button" className="mobile-tab-bar__item">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 5h10a2 2 0 0 1 2 2v10H5V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
            <path d="M9 3v4M15 3v4M8 11h8M8 15h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <span>Data</span>
        </button>
        <button type="button" className="mobile-tab-bar__item">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" fill="none" stroke="currentColor" stroke-width="1.8" />
            <path d="m19 12 .9-1.6-1.7-2.9-1.8.3a6 6 0 0 0-1.4-.8L14.4 5h-4.8l-.6 2a6 6 0 0 0-1.4.8l-1.8-.3-.1.1L4.1 10.4 5 12l-.9 1.6 1.7 2.9 1.8-.3c.4.3.9.6 1.4.8l.6 2h4.8l.6-2c.5-.2 1-.5 1.4-.8l1.8.3 1.7-2.9z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" />
          </svg>
          <span>Settings</span>
        </button>
      </nav>
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function parseStorageBackup(value: unknown): StorageBackupRecord {
  if (isRecord(value) === false || value.version !== 1) {
    throw new Error('Import file is not a supported HIIT Master backup.');
  }

  if (Array.isArray(value.sessions) === false || Array.isArray(value.heartRateSamples) === false || Array.isArray(value.intervalStats) === false) {
    throw new Error('Import file is missing one or more required data collections.');
  }

  if (value.appSettings !== null && value.appSettings !== undefined && isRecord(value.appSettings) === false) {
    throw new Error('Import file contains invalid app settings.');
  }

  return {
    version: 1,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : new Date().toISOString(),
    sessions: value.sessions as SessionRecord[],
    heartRateSamples: value.heartRateSamples as import('../../infrastructure/storage/types').HeartRateSampleRecord[],
    intervalStats: value.intervalStats as IntervalStatRecord[],
    appSettings: value.appSettings === undefined ? null : value.appSettings as StorageBackupRecord['appSettings']
  };
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

  if (state.hrConnectionStatus === 'connected') {
    return state.currentBpm === null
      ? 'Monitor connected. Waiting for a live BPM sample before you start the session.'
      : 'Monitor connected. Live BPM is showing before session start, and you can reconnect if the value gets stuck.';
  }

  return 'Select the work duration, connect a real monitor, and start a session. The screen uses the platform Bluetooth adapter plus the existing controller and IndexedDB repositories.';
}

function getVisibleLiveComparisonRounds(
  currentStats: ComparisonSourceStat[],
  previousStats: ComparisonSourceStat[],
  timing: ComparisonChartTiming | null,
  elapsedSec: number,
  samples: HeartRateSample[],
  sessionStartedAtMs: number | null
): ComparisonRound[] {
  const rounds = createComparisonRounds(currentStats, previousStats);
  if (timing === null) {
    return rounds;
  }

  const currentStatsByRound = new Map(currentStats.map((stat) => [stat.roundIndex, stat]));
  return rounds.filter((round) => {
    const currentStat = currentStatsByRound.get(round.roundIndex) ?? null;
    if (currentStat === null) {
      return false;
    }

    return elapsedSec >= getRoundComparisonRevealSec(
      round.roundIndex,
      currentStat.peakBpm,
      round.previousDelta,
      timing,
      samples,
      sessionStartedAtMs
    );
  });
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
  maxComparisonDiff: number,
  currentSamples: HeartRateSample[],
  currentSessionStartedAtMs: number | null,
  currentStats: ComparisonSourceStat[]
): Array<{ roundIndex: number; className: string; style: CSSProperties; title: string }> {
  if (timing === null || maxElapsedSec === 0) {
    return [];
  }

  const currentStatsByRound = new Map(currentStats.map((stat) => [stat.roundIndex, stat]));
  return rounds
    .filter((round) => round.currentDelta !== null && round.previousDelta !== null && round.diffDelta !== null)
    .map((round) => {
    const currentStat = currentStatsByRound.get(round.roundIndex) ?? null;
    const comparisonDisplaySec = getRoundComparisonRevealSec(
      round.roundIndex,
      currentStat?.peakBpm ?? null,
      round.previousDelta,
      timing,
      currentSamples,
      currentSessionStartedAtMs
    );
    const xPercent = Math.max(1, Math.min(99, getElapsedX(comparisonDisplaySec, maxElapsedSec)));
    const magnitude = round.diffDelta === null || maxComparisonDiff === 0
      ? 0
      : Math.abs(round.diffDelta) / maxComparisonDiff;
    const heightPercent = round.diffDelta === null
      ? 8
      : Math.max(4, magnitude * 48);
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

function getPreviousComparisonSessionForHistory(
  sessions: SessionRecord[],
  selectedSessionId: string | null
): SessionRecord | null {
  if (selectedSessionId === null) {
    return null;
  }

  const selectedSession = sessions.find((session) => session.id === selectedSessionId) ?? null;
  if (selectedSession === null) {
    return null;
  }

  const selectedStartedAtMs = Date.parse(selectedSession.startedAt);
  return sessions
    .filter((session) => session.id !== selectedSession.id)
    .filter((session) => session.comparisonEligible)
    .filter((session) => Date.parse(session.startedAt) < selectedStartedAtMs)
    .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))[0] ?? null;
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
  cooldownSec: number;
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

interface ComparisonSourceStat {
  roundIndex: number;
  peakBpm: number | null;
  troughBpm: number | null;
  deltaBpm: number | null;
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
  ].filter((value): value is number =>
    isNumber(value) && value >= MIN_CHART_BPM && value <= MAX_CHART_BPM
  );

  if (maxElapsedSec === 0) {
    return null;
  }

  if (allValues.length === 0) {
    return {
      currentPathSegments: [],
      guides: buildChartGuides(PREVIEW_CHART_MIN_BPM, PREVIEW_CHART_MAX_BPM),
      timeLabels: buildTimeLabels(maxElapsedSec),
      maxElapsedSec
    };
  }

  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const chartMin = Math.floor(minValue / 10) * 10;
  const chartMaxBase = Math.ceil(maxValue / 10) * 10;
  const chartMax = chartMaxBase === chartMin ? chartMin + 10 : chartMaxBase;

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
    cooldownSec: plan.cooldownSec,
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
    cooldownSec: session.cooldownBaseSec,
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

function getRoundComparisonRevealSec(
  roundIndex: number,
  peakBpm: number | null,
  previousDelta: number | null,
  timing: ComparisonChartTiming,
  samples: HeartRateSample[],
  sessionStartedAtMs: number | null
): number {
  const nextRoundIndex = roundIndex + 1;
  const recoveryStartSec = getRoundStartSec(roundIndex, timing) + timing.workDurationSec;
  const defaultRevealSec = nextRoundIndex >= timing.restsSec.length + 1
    ? getEstimatedFinalComparisonDisplaySec(timing, samples, sessionStartedAtMs)
    : getRoundStartSec(nextRoundIndex, timing);

  if (peakBpm === null || previousDelta === null || sessionStartedAtMs === null) {
    return defaultRevealSec;
  }

  const recoveryEndSec = nextRoundIndex >= timing.restsSec.length + 1
    ? timing.totalDurationSec
    : getRoundStartSec(nextRoundIndex, timing);
  const thresholdBpm = peakBpm - previousDelta;
  const zeroCrossingSample = samples
    .filter((sample) => sample.isMissing === false && sample.bpm !== null)
    .map((sample) => ({
      elapsedSec: (sample.timestampMs - sessionStartedAtMs) / 1000,
      bpm: sample.bpm as number
    }))
    .filter((sample) => sample.elapsedSec >= recoveryStartSec && sample.elapsedSec < recoveryEndSec)
    .find((sample) => sample.bpm <= thresholdBpm);

  if (zeroCrossingSample !== undefined) {
    return zeroCrossingSample.elapsedSec;
  }

  return defaultRevealSec;
}

function getEstimatedFinalComparisonDisplaySec(
  timing: ComparisonChartTiming,
  samples: HeartRateSample[],
  sessionStartedAtMs: number | null
): number {
  if (sessionStartedAtMs === null) {
    return timing.totalDurationSec;
  }

  const roundTwelveIndex = timing.restsSec.length - 1;
  const roundElevenIndex = roundTwelveIndex - 1;
  if (roundElevenIndex < 0) {
    return timing.totalDurationSec;
  }

  const roundElevenTrough = getRoundTroughSampleElapsedSec(roundElevenIndex, timing, samples, sessionStartedAtMs);
  const roundTwelveTrough = getRoundTroughSampleElapsedSec(roundTwelveIndex, timing, samples, sessionStartedAtMs);
  if (roundElevenTrough === null || roundTwelveTrough === null) {
    return timing.totalDurationSec;
  }

  const troughGapSec = Math.max(1, roundTwelveTrough - roundElevenTrough);
  return roundTwelveTrough + troughGapSec;
}

function getRoundTroughSampleElapsedSec(
  roundIndex: number,
  timing: ComparisonChartTiming,
  samples: HeartRateSample[],
  sessionStartedAtMs: number
): number | null {
  const recoveryStartSec = getRoundStartSec(roundIndex, timing) + timing.workDurationSec;
  const nextWorkStartSec = getRoundStartSec(roundIndex + 1, timing);
  const nextWorkEndSec = nextWorkStartSec + timing.workDurationSec;
  const troughSample = getMinTimedHeartRateSample(samples, sessionStartedAtMs, recoveryStartSec, nextWorkEndSec);
  return troughSample?.elapsedSec ?? null;
}

function getMinTimedHeartRateSample(
  samples: HeartRateSample[],
  sessionStartedAtMs: number,
  startSec: number,
  endSec: number
): { elapsedSec: number; bpm: number } | null {
  const windowSamples = samples
    .filter((sample) => sample.isMissing === false && sample.bpm !== null)
    .map((sample) => ({
      elapsedSec: (sample.timestampMs - sessionStartedAtMs) / 1000,
      bpm: sample.bpm as number
    }))
    .filter((sample) => sample.elapsedSec >= startSec && sample.elapsedSec < endSec);

  if (windowSamples.length === 0) {
    return null;
  }

  return windowSamples.reduce((lowest, sample) => sample.bpm < lowest.bpm ? sample : lowest);
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
  maxElapsedSec: number,
  currentStats: ComparisonSourceStat[]
): ComparisonScrubDetail | null {
  if (scrubXPercent === null || timing === null || maxElapsedSec === 0 || rounds.length === 0) {
    return null;
  }

  const scrubElapsedSec = (scrubXPercent / 100) * maxElapsedSec;
  const liveSeries = normalizeChartSamples(currentSamples, currentSessionStartedAtMs, maxElapsedSec);
  const liveSamples = liveSeries.filter(isChartBpmSample);
  const hasGapAtScrubPosition = isGapAtElapsedSec(liveSeries, scrubElapsedSec);
  const nearestSample = hasGapAtScrubPosition ? null : getNearestChartSample(liveSamples, scrubElapsedSec);
  const currentStatsByRound = new Map(currentStats.map((stat) => [stat.roundIndex, stat]));
  let nearestRound = rounds[0]!;
  let nearestDisplaySec = getRoundComparisonRevealSec(
    nearestRound.roundIndex,
    currentStatsByRound.get(nearestRound.roundIndex)?.peakBpm ?? null,
    nearestRound.previousDelta,
    timing,
    currentSamples,
    currentSessionStartedAtMs
  );
  let nearestDistance = Math.abs(nearestDisplaySec - scrubElapsedSec);

  for (const round of rounds) {
    const displaySec = getRoundComparisonRevealSec(
      round.roundIndex,
      currentStatsByRound.get(round.roundIndex)?.peakBpm ?? null,
      round.previousDelta,
      timing,
      currentSamples,
      currentSessionStartedAtMs
    );
    const distance = Math.abs(displaySec - scrubElapsedSec);
    if (distance < nearestDistance) {
      nearestRound = round;
      nearestDisplaySec = displaySec;
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
    return 50;
  }

  const ratio = (value - chartMin) / (chartMax - chartMin);
  return 100 - (ratio * 100);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
