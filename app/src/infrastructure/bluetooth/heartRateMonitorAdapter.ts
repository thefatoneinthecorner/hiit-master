import { BleClient } from '@capacitor-community/bluetooth-le';

export type ConnectedMonitor = {
  batteryPercent: number | null;
  deviceId: string;
  name: string;
};

export type MonitorEventHandlers = {
  onDisconnect: () => void;
  onSample: (bpm: number) => void;
};

export type HeartRateMonitorAdapter = {
  mode: 'live' | 'simulated';
  connect: (handlers: MonitorEventHandlers) => Promise<ConnectedMonitor>;
  disconnect: (deviceId: string) => Promise<void>;
};

const heartRateService = '0000180d-0000-1000-8000-00805f9b34fb';
const heartRateMeasurementCharacteristic = '00002a37-0000-1000-8000-00805f9b34fb';
const batteryService = '0000180f-0000-1000-8000-00805f9b34fb';
const batteryLevelCharacteristic = '00002a19-0000-1000-8000-00805f9b34fb';

let bleInitialized = false;

export function createBleHeartRateMonitorAdapter(): HeartRateMonitorAdapter {
  return {
    mode: 'live',
    connect: async (handlers) => {
      await ensureBleInitialized();

      const device = await BleClient.requestDevice({
        services: [heartRateService],
        optionalServices: [batteryService],
      });

      await BleClient.connect(device.deviceId, () => {
        handlers.onDisconnect();
      });

      await BleClient.startNotifications(
        device.deviceId,
        heartRateService,
        heartRateMeasurementCharacteristic,
        (value) => {
          const bpm = parseHeartRateMeasurement(value);

          if (bpm !== null) {
            handlers.onSample(bpm);
          }
        },
      );

      const batteryPercent = await readBatteryLevel(device.deviceId);

      return {
        batteryPercent,
        deviceId: device.deviceId,
        name: device.name ?? 'Heart Rate Monitor',
      };
    },
    disconnect: async (deviceId) => {
      try {
        await BleClient.stopNotifications(
          deviceId,
          heartRateService,
          heartRateMeasurementCharacteristic,
        );
      } catch {}

      try {
        await BleClient.disconnect(deviceId);
      } catch {}
    },
  };
}

async function ensureBleInitialized() {
  if (bleInitialized) {
    return;
  }

  await BleClient.initialize({ androidNeverForLocation: true });
  bleInitialized = true;
}

async function readBatteryLevel(deviceId: string) {
  try {
    const value = await BleClient.read(deviceId, batteryService, batteryLevelCharacteristic);
    return value.getUint8(0);
  } catch {
    return null;
  }
}

export function parseHeartRateMeasurement(value: DataView) {
  if (value.byteLength === 0) {
    return null;
  }

  const flags = value.getUint8(0);
  const isUint16 = (flags & 0x1) === 0x1;

  if (isUint16) {
    if (value.byteLength < 3) {
      return null;
    }

    return value.getUint16(1, true);
  }

  if (value.byteLength < 2) {
    return null;
  }

  return value.getUint8(1);
}
