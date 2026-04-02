import { analyzeIntervals } from '../../domain/analysis/analyze';
import type { HeartRateSample } from '../../domain/analysis/types';
import { isComparisonEligible } from '../../domain/session/rules';
import type { SessionStatus } from '../../domain/session/types';
import { getPhaseAtElapsedSec, createWorkoutPlan } from '../../domain/workout/plan';
import type { PhaseType, WorkoutPlan } from '../../domain/workout/types';
import type { IntervalStatRecord, SessionRecord } from '../../infrastructure/storage/types';
import type { StorageRepositories } from '../../infrastructure/storage/db';
import type { WorkoutSessionControllerState } from './types';

interface ActiveSessionContext {
  sessionId: string;
  startedAtMs: number;
  workoutPlan: WorkoutPlan;
  workDurationSec: number;
  elapsedSec: number;
  currentPhaseType: PhaseType | null;
  currentRoundIndex: number | null;
  isPaused: boolean;
  currentBpm: number | null;
  samples: HeartRateSample[];
}

export interface WorkoutSessionControllerDependencies {
  storage: StorageRepositories;
  createId?: () => string;
}

export class WorkoutSessionController {
  private readonly storage: StorageRepositories;
  private readonly createId: () => string;
  private activeSession: ActiveSessionContext | null = null;
  private controllerStatus: WorkoutSessionControllerState['controllerStatus'] = 'idle';
  private hrConnectionStatus: WorkoutSessionControllerState['hrConnectionStatus'] = 'disconnected';
  private connectedDeviceName: string | null = null;
  private isCompromised = false;
  private comparisonEligible = false;
  private previousComparisonSessionId: string | null = null;
  private currentBpm: number | null = null;

  constructor(dependencies: WorkoutSessionControllerDependencies) {
    this.storage = dependencies.storage;
    this.createId = dependencies.createId ?? (() => crypto.randomUUID());
  }

  getState(): WorkoutSessionControllerState {
    const currentIntervalStats = this.activeSession === null
      ? []
      : analyzeIntervals(this.activeSession.workoutPlan, this.activeSession.samples, this.activeSession.startedAtMs);

    return {
      controllerStatus: this.controllerStatus,
      sessionId: this.activeSession?.sessionId ?? null,
      sessionStartedAtMs: this.activeSession?.startedAtMs ?? null,
      workDurationSec: this.activeSession?.workDurationSec ?? null,
      elapsedSec: this.activeSession?.elapsedSec ?? 0,
      currentPhaseType: this.activeSession?.currentPhaseType ?? null,
      currentRoundIndex: this.activeSession?.currentRoundIndex ?? null,
      isComplete: this.controllerStatus === 'completed',
      isPaused: this.activeSession?.isPaused ?? false,
      isCompromised: this.isCompromised,
      comparisonEligible: this.comparisonEligible,
      hrConnectionStatus: this.hrConnectionStatus,
      connectedDeviceName: this.connectedDeviceName,
      currentBpm: this.activeSession?.currentBpm ?? this.currentBpm,
      previousComparisonSessionId: this.previousComparisonSessionId,
      workoutPlan: this.activeSession?.workoutPlan ?? null,
      currentIntervalStats,
      currentHeartRateSamples: this.activeSession === null ? [] : [...this.activeSession.samples]
    };
  }

  connectHeartRate(deviceName: string): void {
    this.hrConnectionStatus = 'connected';
    this.connectedDeviceName = deviceName;
    this.currentBpm = null;
  }

  async disconnectHeartRate(timestampMs: number): Promise<void> {
    this.hrConnectionStatus = 'disconnected';
    this.connectedDeviceName = null;
    this.currentBpm = null;

    if (this.activeSession === null) {
      return;
    }

    this.isCompromised = true;
    await this.persistMissingSample(timestampMs);
    await this.persistSessionRecord(this.controllerStatus === 'idle' ? 'failed' : this.controllerStatus);
  }

  reconnectHeartRate(deviceName: string): void {
    this.connectHeartRate(deviceName);
  }

  async startSession(workDurationSec: number, startedAtMs: number): Promise<void> {
    if (this.hrConnectionStatus !== 'connected') {
      throw new Error('Cannot start session without a connected heart-rate monitor');
    }

    const workoutPlan = createWorkoutPlan(workDurationSec);
    const phaseAtStart = getPhaseAtElapsedSec(workoutPlan, 0);
    const sessionId = this.createId();
    const previousComparisonSession = await this.storage.sessions.getPreviousComparisonEligibleSession(sessionId);

    this.activeSession = {
      sessionId,
      startedAtMs,
      workoutPlan,
      workDurationSec: workoutPlan.workDurationSec,
      elapsedSec: 0,
      currentPhaseType: phaseAtStart.phase?.phaseType ?? null,
      currentRoundIndex: phaseAtStart.phase?.roundIndex ?? null,
      isPaused: false,
      currentBpm: null,
      samples: []
    };
    this.controllerStatus = 'running';
    this.isCompromised = false;
    this.comparisonEligible = false;
    this.previousComparisonSessionId = previousComparisonSession?.id ?? null;

    await this.storage.appSettings.save({ id: 'app_settings', lastWorkDurationSec: workoutPlan.workDurationSec });
    await this.persistSessionRecord('running');
  }

  pause(): void {
    if (this.activeSession === null) {
      return;
    }

    this.activeSession.isPaused = true;
    this.controllerStatus = 'paused';
  }

  resume(): void {
    if (this.activeSession === null) {
      return;
    }

    this.activeSession.isPaused = false;
    this.controllerStatus = 'running';
  }

  async tick(elapsedSec: number, timestampMs: number): Promise<void> {
    if (this.activeSession === null || this.activeSession.isPaused) {
      return;
    }

    this.activeSession.elapsedSec = elapsedSec;
    const phase = getPhaseAtElapsedSec(this.activeSession.workoutPlan, elapsedSec);
    this.activeSession.currentPhaseType = phase.phase?.phaseType ?? null;
    this.activeSession.currentRoundIndex = phase.phase?.roundIndex ?? null;

    if (this.hrConnectionStatus === 'disconnected') {
      await this.persistMissingSample(timestampMs);
    }

    if (phase.isComplete) {
      await this.completeSession(timestampMs);
      return;
    }

    await this.persistSessionRecord(this.controllerStatus === 'paused' ? 'paused' : 'running');
  }

  async recordHeartRateSample(timestampMs: number, bpm: number): Promise<void> {
    this.currentBpm = bpm;

    if (this.activeSession === null) {
      return;
    }

    const sample: HeartRateSample = {
      timestampMs,
      bpm,
      isMissing: false
    };

    this.activeSession.samples.push(sample);
    this.activeSession.currentBpm = bpm;
    this.currentBpm = bpm;

    await this.storage.heartRateSamples.append({
      id: this.createId(),
      sessionId: this.activeSession.sessionId,
      timestampMs,
      bpm,
      isMissing: false
    });
    await this.persistSessionRecord(this.controllerStatus === 'paused' ? 'paused' : 'running');
  }

  async endEarly(timestampMs: number): Promise<void> {
    if (this.activeSession === null) {
      return;
    }

    this.controllerStatus = 'ended_early';
    this.comparisonEligible = false;
    await this.persistFinalState('ended_early', timestampMs, true);
  }

  private async completeSession(timestampMs: number): Promise<void> {
    this.controllerStatus = 'completed';
    await this.persistFinalState('completed', timestampMs, false);
  }

  private async persistMissingSample(timestampMs: number): Promise<void> {
    if (this.activeSession === null) {
      return;
    }

    const lastSample = this.activeSession.samples[this.activeSession.samples.length - 1] ?? null;
    if (lastSample?.timestampMs === timestampMs && lastSample.isMissing) {
      return;
    }

    const sample: HeartRateSample = {
      timestampMs,
      bpm: null,
      isMissing: true
    };

    this.activeSession.samples.push(sample);
    this.activeSession.currentBpm = null;
    this.currentBpm = null;

    await this.storage.heartRateSamples.append({
      id: this.createId(),
      sessionId: this.activeSession.sessionId,
      timestampMs,
      bpm: null,
      isMissing: true
    });
  }

  private async persistFinalState(status: SessionStatus, timestampMs: number, endedEarly: boolean): Promise<void> {
    if (this.activeSession === null) {
      return;
    }

    const intervalStats = analyzeIntervals(this.activeSession.workoutPlan, this.activeSession.samples, this.activeSession.startedAtMs);
    const intervalsWithDeltaCount = intervalStats.filter((stat) => stat.deltaBpm !== null).length;
    this.comparisonEligible = isComparisonEligible({
      status,
      endedEarly,
      isCompromised: this.isCompromised,
      hrCoverageComplete: this.isCompromised === false,
      intervalsWithDeltaCount
    });

    const records: IntervalStatRecord[] = intervalStats.map((stat) => ({
      id: this.createId(),
      sessionId: this.activeSession!.sessionId,
      roundIndex: stat.roundIndex,
      peakBpm: stat.peakBpm,
      troughBpm: stat.troughBpm,
      deltaBpm: stat.deltaBpm,
      analysisVersion: 1
    }));

    await this.storage.intervalStats.replaceForSession(this.activeSession.sessionId, records);
    await this.persistSessionRecord(status, timestampMs, endedEarly);
  }

  private async persistSessionRecord(status: SessionStatus, completedAtMs?: number, endedEarly = false): Promise<void> {
    if (this.activeSession === null) {
      return;
    }

    const record: SessionRecord = {
      id: this.activeSession.sessionId,
      startedAt: new Date(this.activeSession.startedAtMs).toISOString(),
      completedAt: completedAtMs === undefined ? null : new Date(completedAtMs).toISOString(),
      status,
      workDurationSec: this.activeSession.workDurationSec,
      warmupSec: this.activeSession.workoutPlan.warmupSec,
      baseRestsSec: this.activeSession.workoutPlan.baseRestsSec,
      actualRestsSec: this.activeSession.workoutPlan.actualRestsSec,
      cooldownBaseSec: this.activeSession.workoutPlan.cooldownSec,
      totalPlannedDurationSec: this.activeSession.workoutPlan.totalDurationSec,
      roundsPlanned: 13,
      hasHeartRateData: this.activeSession.samples.some((sample) => sample.isMissing === false),
      hrCoverageComplete: this.isCompromised === false,
      isCompromised: this.isCompromised,
      comparisonEligible: this.comparisonEligible,
      analysisVersion: 1,
      deviceName: this.connectedDeviceName,
      endedEarly,
      notes: null
    };

    await this.storage.sessions.save(record);
  }
}
