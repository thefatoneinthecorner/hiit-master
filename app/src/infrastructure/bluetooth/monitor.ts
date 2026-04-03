import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export const HEART_RATE_SERVICE_UUID = 'heart_rate';
export const HEART_RATE_MEASUREMENT_UUID = 'heart_rate_measurement';
export const NATIVE_HEART_RATE_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
export const NATIVE_HEART_RATE_MEASUREMENT_UUID = '00002a37-0000-1000-8000-00805f9b34fb';

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

interface NativeBleDevice {
  deviceId: string;
  name?: string | null;
}

interface NativeBluetoothLePlugin {
  initialize: () => Promise<void>;
  requestDevice: (options: {
    services?: string[];
    optionalServices?: string[];
    displayMode?: 'alert' | 'list';
  }) => Promise<NativeBleDevice>;
  connect: (options: { deviceId: string }) => Promise<void>;
  disconnect: (options: { deviceId: string }) => Promise<void>;
  startNotifications: (options: {
    deviceId: string;
    service: string;
    characteristic: string;
  }) => Promise<void>;
  stopNotifications: (options: {
    deviceId: string;
    service: string;
    characteristic: string;
  }) => Promise<void>;
  addListener: (
    eventName: string,
    listenerFunc: (event: { value?: string }) => void
  ) => Promise<PluginListenerHandle>;
}

export function parseHeartRateMeasurement(value: DataView): number {
  const flags = value.getUint8(0);
  const isUint16 = (flags & 0x01) === 0x01;

  return isUint16 ? value.getUint16(1, true) : value.getUint8(1);
}

export function shouldUseNativeHeartRateMonitor(
  platform = Capacitor.getPlatform(),
  isNativePlatform = Capacitor.isNativePlatform()
): boolean {
  return isNativePlatform && (platform === 'ios' || platform === 'android');
}

export function createAdaptiveHeartRateMonitor(callbacks: HeartRateMonitorCallbacks): HeartRateMonitor {
  return shouldUseNativeHeartRateMonitor()
    ? createNativeBleHeartRateMonitor(callbacks)
    : createWebBluetoothHeartRateMonitor(callbacks);
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

export function createNativeBleHeartRateMonitor(callbacks: HeartRateMonitorCallbacks): HeartRateMonitor {
  const nativeBluetoothLe = registerPlugin<NativeBluetoothLePlugin>('BluetoothLe');
  let initialized = false;
  let connectedDeviceId: string | null = null;
  let isDisconnecting = false;
  let notificationsStarted = false;
  let disconnectListener: PluginListenerHandle | null = null;
  let notificationListener: PluginListenerHandle | null = null;

  function hexStringToDataView(value: string): DataView {
    const normalizedValue = value.length % 2 === 0 ? value : '0' + value;
    const bytes = new Uint8Array(normalizedValue.length / 2);
    for (let index = 0; index < normalizedValue.length; index += 2) {
      bytes[index / 2] = Number.parseInt(normalizedValue.slice(index, index + 2), 16);
    }
    return new DataView(bytes.buffer);
  }

  async function ensureInitialized(): Promise<void> {
    if (initialized === false) {
      await nativeBluetoothLe.initialize();
      initialized = true;
    }
  }

  async function requestNativeDevice(): Promise<NativeBleDevice> {
    try {
      return await nativeBluetoothLe.requestDevice({
        services: [NATIVE_HEART_RATE_SERVICE_UUID],
        displayMode: 'list'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('No device found') === false) {
        throw error;
      }

      // Some monitors are not advertising the standard heart-rate service
      // during scan. Fall back to a broader native picker so the user can
      // select the strap manually, then validate via service access later.
      return await nativeBluetoothLe.requestDevice({
        optionalServices: [NATIVE_HEART_RATE_SERVICE_UUID],
        displayMode: 'list'
      });
    }
  }

  async function removeListeners(): Promise<void> {
    await notificationListener?.remove();
    await disconnectListener?.remove();
    notificationListener = null;
    disconnectListener = null;
  }

  async function handleNativeDisconnect(): Promise<void> {
    await removeListeners();
    notificationsStarted = false;
    connectedDeviceId = null;
    if (isDisconnecting) {
      return;
    }

    await callbacks.onDisconnected();
  }

  return {
    isSupported(): boolean {
      return shouldUseNativeHeartRateMonitor();
    },

    async connect(): Promise<void> {
      if (this.isSupported() === false) {
        throw new Error('Native Bluetooth is not available on this platform.');
      }

      await ensureInitialized();
      const device = await requestNativeDevice();

      connectedDeviceId = device.deviceId;
      disconnectListener = await nativeBluetoothLe.addListener(`disconnected|${device.deviceId}`, async () => {
        await handleNativeDisconnect();
      });
      notificationListener = await nativeBluetoothLe.addListener(
        `notification|${device.deviceId}|${NATIVE_HEART_RATE_SERVICE_UUID}|${NATIVE_HEART_RATE_MEASUREMENT_UUID}`,
        async (event: { value?: string }) => {
          if (event.value === undefined) {
            return;
          }

          await callbacks.onHeartRateSample(parseHeartRateMeasurement(hexStringToDataView(event.value)));
        }
      );
      await nativeBluetoothLe.connect({ deviceId: device.deviceId });

      try {
        await nativeBluetoothLe.startNotifications({
          deviceId: device.deviceId,
          service: NATIVE_HEART_RATE_SERVICE_UUID,
          characteristic: NATIVE_HEART_RATE_MEASUREMENT_UUID
        });
        notificationsStarted = true;
      } catch (error) {
        isDisconnecting = true;
        try {
          await removeListeners();
          await nativeBluetoothLe.disconnect({ deviceId: device.deviceId });
        } finally {
          isDisconnecting = false;
          connectedDeviceId = null;
        }
        throw error;
      }

      callbacks.onConnected(device.name ?? 'Heart-rate monitor');
    },

    async disconnect(): Promise<void> {
      if (connectedDeviceId === null) {
        await callbacks.onDisconnected();
        return;
      }

      const bleClient = nativeBluetoothLe;
      const deviceId = connectedDeviceId;
      isDisconnecting = true;

      try {
        if (notificationsStarted) {
          await bleClient.stopNotifications({
            deviceId,
            service: NATIVE_HEART_RATE_SERVICE_UUID,
            characteristic: NATIVE_HEART_RATE_MEASUREMENT_UUID
          });
        }
        await removeListeners();
        await bleClient.disconnect({ deviceId });
      } finally {
        notificationsStarted = false;
        connectedDeviceId = null;
        isDisconnecting = false;
      }

      await callbacks.onDisconnected();
    },

    async dispose(): Promise<void> {
      if (connectedDeviceId === null) {
        return;
      }

      await this.disconnect();
    }
  };
}
