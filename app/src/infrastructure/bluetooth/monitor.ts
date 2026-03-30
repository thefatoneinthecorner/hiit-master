export const HEART_RATE_SERVICE_UUID = 'heart_rate';
export const HEART_RATE_MEASUREMENT_UUID = 'heart_rate_measurement';

interface BluetoothRequestDeviceOptions {
  filters: Array<{ services: string[] }>;
}

interface BluetoothLikeNavigator extends Navigator {
  bluetooth?: {
    requestDevice: (options: BluetoothRequestDeviceOptions) => Promise<BluetoothLikeDevice>;
  };
}

interface BluetoothLikeDevice extends EventTarget {
  name?: string;
  gatt?: {
    connect: () => Promise<BluetoothLikeRemoteGATTServer>;
    disconnect: () => void;
  };
}

interface BluetoothLikeRemoteGATTServer {
  getPrimaryService: (service: string) => Promise<BluetoothLikeRemoteGATTService>;
}

interface BluetoothLikeRemoteGATTService {
  getCharacteristic: (characteristic: string) => Promise<BluetoothLikeCharacteristic>;
}

interface BluetoothMeasurementEventTarget extends EventTarget {
  value: DataView | null;
}

interface BluetoothLikeCharacteristic extends EventTarget {
  startNotifications: () => Promise<void>;
  stopNotifications: () => Promise<void>;
}

export interface HeartRateMonitorCallbacks {
  onConnected: (deviceName: string) => void;
  onDisconnected: () => void | Promise<void>;
  onHeartRateSample: (bpm: number) => void | Promise<void>;
}

export interface HeartRateMonitor {
  isSupported: () => boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  dispose: () => Promise<void>;
}

export function parseHeartRateMeasurement(value: DataView): number {
  const flags = value.getUint8(0);
  const isUint16 = (flags & 0x01) === 0x01;

  return isUint16 ? value.getUint16(1, true) : value.getUint8(1);
}

export function createWebBluetoothHeartRateMonitor(callbacks: HeartRateMonitorCallbacks): HeartRateMonitor {
  let device: BluetoothLikeDevice | null = null;
  let characteristic: BluetoothLikeCharacteristic | null = null;

  async function handleCharacteristicValueChanged(event: Event): Promise<void> {
    const target = event.target as BluetoothMeasurementEventTarget | null;
    if (target === null || target.value === null) {
      return;
    }

    await callbacks.onHeartRateSample(parseHeartRateMeasurement(target.value));
  }

  async function handleGattServerDisconnected(): Promise<void> {
    characteristic?.removeEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
    characteristic = null;
    await callbacks.onDisconnected();
  }

  return {
    isSupported(): boolean {
      const bluetoothNavigator = navigator as BluetoothLikeNavigator;
      return typeof navigator !== 'undefined' && bluetoothNavigator.bluetooth !== undefined;
    },

    async connect(): Promise<void> {
      const bluetoothNavigator = navigator as BluetoothLikeNavigator;
      if (this.isSupported() === false || bluetoothNavigator.bluetooth === undefined) {
        throw new Error('Web Bluetooth is not available in this browser.');
      }

      device?.removeEventListener('gattserverdisconnected', handleGattServerDisconnected);

      device = await bluetoothNavigator.bluetooth.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE_UUID] }]
      });

      device.addEventListener('gattserverdisconnected', handleGattServerDisconnected);

      const server = await device.gatt?.connect();
      if (server === undefined) {
        throw new Error('Failed to connect to the heart-rate monitor.');
      }

      const service = await server.getPrimaryService(HEART_RATE_SERVICE_UUID);
      characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT_UUID);
      characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
      await characteristic.startNotifications();
      callbacks.onConnected(device.name ?? 'Heart-rate monitor');
    },

    async disconnect(): Promise<void> {
      characteristic?.removeEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);

      if (characteristic !== null) {
        await characteristic.stopNotifications();
      }

      characteristic = null;

      if (device !== null) {
        device.removeEventListener('gattserverdisconnected', handleGattServerDisconnected);
        device.gatt?.disconnect();
      }

      device = null;
      await callbacks.onDisconnected();
    },

    async dispose(): Promise<void> {
      if (device === null && characteristic === null) {
        return;
      }

      await this.disconnect();
    }
  };
}
