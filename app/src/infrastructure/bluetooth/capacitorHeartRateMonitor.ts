import { BleClient } from '@capacitor-community/bluetooth-le';
import type { ConnectedMonitor, DisconnectListener, HeartRateMonitorAdapter, SampleListener } from './types';

const HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HEART_RATE_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';
const BATTERY_SERVICE = '0000180f-0000-1000-8000-00805f9b34fb';
const BATTERY_LEVEL = '00002a19-0000-1000-8000-00805f9b34fb';

function parseHeartRateMeasurement(value: DataView): number {
  const flags = value.getUint8(0);
  return (flags & 0x1) === 0x1 ? value.getUint16(1, true) : value.getUint8(1);
}

export class CapacitorHeartRateMonitor implements HeartRateMonitorAdapter {
  private sampleListener: SampleListener | null = null;
  private disconnectListener: DisconnectListener | null = null;
  private connected = false;
  private deviceId: string | null = null;

  onSample(listener: SampleListener): void {
    this.sampleListener = listener;
  }

  onDisconnect(listener: DisconnectListener): void {
    this.disconnectListener = listener;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<ConnectedMonitor> {
    await BleClient.initialize({ androidNeverForLocation: true });
    const device = await BleClient.requestDevice({
      services: [HEART_RATE_SERVICE],
      optionalServices: [BATTERY_SERVICE]
    });

    this.deviceId = device.deviceId;
    await BleClient.connect(device.deviceId, () => {
      this.connected = false;
      this.deviceId = null;
      this.disconnectListener?.();
    });

    await BleClient.startNotifications(
      device.deviceId,
      HEART_RATE_SERVICE,
      HEART_RATE_MEASUREMENT,
      (value) => {
        this.sampleListener?.(parseHeartRateMeasurement(value));
      }
    );

    this.connected = true;

    return {
      name: device.name || 'Heart Rate Monitor',
      batteryPercent: await this.readBatteryLevel(device.deviceId)
    };
  }

  async disconnect(): Promise<void> {
    if (!this.deviceId) {
      this.connected = false;
      return;
    }

    try {
      await BleClient.stopNotifications(this.deviceId, HEART_RATE_SERVICE, HEART_RATE_MEASUREMENT);
    } catch {
      // ignore notification teardown failures
    }

    try {
      await BleClient.disconnect(this.deviceId);
    } catch {
      // ignore disconnect teardown failures
    }

    this.connected = false;
    this.deviceId = null;
  }

  private async readBatteryLevel(deviceId: string): Promise<number | null> {
    try {
      const value = await BleClient.read(deviceId, BATTERY_SERVICE, BATTERY_LEVEL);
      return value.getUint8(0);
    } catch {
      return null;
    }
  }
}

