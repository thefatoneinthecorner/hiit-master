import type { ConnectedMonitor, DisconnectListener, HeartRateMonitorAdapter, SampleListener } from './types';

const HEART_RATE_SERVICE = 'heart_rate';
const HEART_RATE_MEASUREMENT = 'heart_rate_measurement';
const BATTERY_SERVICE = 'battery_service';
const BATTERY_LEVEL = 'battery_level';

function parseHeartRateMeasurement(dataView: DataView): number {
  const flags = dataView.getUint8(0);
  const isSixteenBit = (flags & 0x01) === 0x01;
  return isSixteenBit ? dataView.getUint16(1, true) : dataView.getUint8(1);
}

export class WebBluetoothHeartRateMonitor implements HeartRateMonitorAdapter {
  private sampleListener: SampleListener | null = null;
  private disconnectListener: DisconnectListener | null = null;
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private measurementCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private connected = false;

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
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth is not available in this browser');
    }

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [HEART_RATE_SERVICE] }],
      optionalServices: [BATTERY_SERVICE]
    });

    this.device = device;
    this.device.addEventListener('gattserverdisconnected', this.handleDisconnected);

    const server = await device.gatt?.connect();
    if (!server) {
      throw new Error('Failed to connect to heart-rate monitor');
    }

    this.server = server;

    const heartRateService = await server.getPrimaryService(HEART_RATE_SERVICE);
    this.measurementCharacteristic = await heartRateService.getCharacteristic(HEART_RATE_MEASUREMENT);
    await this.measurementCharacteristic.startNotifications();
    this.measurementCharacteristic.addEventListener('characteristicvaluechanged', this.handleMeasurementChanged as EventListener);
    this.connected = true;

    return {
      name: device.name || 'Heart Rate Monitor',
      batteryPercent: await this.readBatteryLevel()
    };
  }

  async disconnect(): Promise<void> {
    if (this.measurementCharacteristic) {
      this.measurementCharacteristic.removeEventListener('characteristicvaluechanged', this.handleMeasurementChanged as EventListener);
      try {
        await this.measurementCharacteristic.stopNotifications();
      } catch {
        // ignore cleanup failure
      }
      this.measurementCharacteristic = null;
    }

    if (this.device) {
      this.device.removeEventListener('gattserverdisconnected', this.handleDisconnected);
      this.device.gatt?.disconnect();
    }

    this.server = null;
    this.device = null;
    this.connected = false;
  }

  private readonly handleMeasurementChanged = (event: Event): void => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic | null;
    const value = characteristic?.value;
    if (!value) {
      return;
    }

    this.sampleListener?.(parseHeartRateMeasurement(value));
  };

  private readonly handleDisconnected = (): void => {
    this.connected = false;
    this.server = null;
    this.measurementCharacteristic = null;
    this.disconnectListener?.();
  };

  private async readBatteryLevel(): Promise<number | null> {
    if (!this.server) {
      return null;
    }

    try {
      const batteryService = await this.server.getPrimaryService(BATTERY_SERVICE);
      const batteryCharacteristic = await batteryService.getCharacteristic(BATTERY_LEVEL);
      const value = await batteryCharacteristic.readValue();
      return value.getUint8(0);
    } catch {
      return null;
    }
  }
}
