import type {
  ConnectedMonitor,
  HeartRateMonitorAdapter,
  MonitorEventHandlers,
} from './heartRateMonitorAdapter';

const devices = [
  { deviceId: 'sim-polar-oh1', name: 'Polar OH1 36F91927' },
  { deviceId: 'sim-polar-h10', name: 'Polar H10 17A5B204' },
] as const;

export function createSimulatedHeartRateMonitorAdapter(): HeartRateMonitorAdapter {
  let deviceIndex = -1;
  const disconnectHandlers = new Map<string, MonitorEventHandlers>();

  return {
    mode: 'simulated',
    connect: async (handlers): Promise<ConnectedMonitor> => {
      deviceIndex = (deviceIndex + 1) % devices.length;
      const device = devices[deviceIndex] ?? devices[0];
      disconnectHandlers.set(device.deviceId, handlers);
      handlers.onSample(48);

      return {
        batteryPercent: 80,
        deviceId: device.deviceId,
        name: device.name,
      };
    },
    disconnect: async (deviceId) => {
      disconnectHandlers.delete(deviceId);
    },
  };
}
