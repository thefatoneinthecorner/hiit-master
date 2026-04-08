import type { ConnectedMonitor, DisconnectListener, HeartRateMonitorAdapter, SampleListener } from './types';

export class MockHeartRateMonitor implements HeartRateMonitorAdapter {
  private sampleListener: SampleListener | null = null;
  private disconnectListener: DisconnectListener | null = null;
  private timerId: number | null = null;
  private replayTimeoutId: number | null = null;
  private connected = false;
  private tick = 0;

  constructor(
    private readonly getTargetBpm: () => number,
    private readonly deviceTestMode: boolean,
    private readonly getReplaySamples: () => Array<{ elapsedSec: number; bpm: number | null }> = () => []
  ) {}

  async connect(): Promise<ConnectedMonitor> {
    this.connected = true;
    this.start();

    return {
      name: this.deviceTestMode ? 'Replay Monitor' : 'Polar OH1 36F91927',
      batteryPercent: this.deviceTestMode ? 33 : 80
    };
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.replayTimeoutId !== null) {
      window.clearTimeout(this.replayTimeoutId);
      this.replayTimeoutId = null;
    }
  }

  onSample(listener: SampleListener): void {
    this.sampleListener = listener;
  }

  onDisconnect(listener: DisconnectListener): void {
    this.disconnectListener = listener;
  }

  isConnected(): boolean {
    return this.connected;
  }

  private start(): void {
    const replaySamples = this.getReplaySamples()
      .filter((sample) => sample.bpm !== null)
      .sort((left, right) => left.elapsedSec - right.elapsedSec);

    if (this.deviceTestMode && replaySamples.length > 1) {
      this.startReplay(replaySamples as Array<{ elapsedSec: number; bpm: number }>);
      return;
    }

    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
    }

    this.timerId = window.setInterval(() => {
      const target = this.getTargetBpm();
      const wave = Math.sin(this.tick / 2) * 3;
      const drift = Math.cos(this.tick / 3) * 2;
      const bpm = Math.round(Math.max(48, target + wave + drift));
      this.tick += 1;
      this.sampleListener?.(bpm);
    }, 1000);
  }

  private startReplay(samples: Array<{ elapsedSec: number; bpm: number }>): void {
    const firstElapsed = samples[0]?.elapsedSec ?? 0;
    const normalized = samples.map((sample) => ({
      delayMs: Math.max(0, Math.round((sample.elapsedSec - firstElapsed) * 1000)),
      bpm: sample.bpm
    }));
    const loopDurationMs = Math.max(1000, normalized.at(-1)?.delayMs ?? 1000);
    const startedAt = performance.now();

    const scheduleFrom = (index: number) => {
      if (!this.connected) {
        return;
      }

      const current = normalized[index];
      if (!current) {
        this.replayTimeoutId = window.setTimeout(() => {
          scheduleFrom(0);
        }, loopDurationMs);
        return;
      }

      const elapsedInLoop = (performance.now() - startedAt) % loopDurationMs;
      const waitMs = Math.max(0, current.delayMs - elapsedInLoop);
      this.replayTimeoutId = window.setTimeout(() => {
        this.sampleListener?.(current.bpm);
        scheduleFrom(index + 1);
      }, waitMs);
    };

    scheduleFrom(0);
  }
}
