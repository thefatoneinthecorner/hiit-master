export type SampleListener = (bpm: number) => void;
export type DisconnectListener = () => void;

export interface ConnectedMonitor {
  name: string;
  batteryPercent: number | null;
}

export interface HeartRateMonitorAdapter {
  connect(): Promise<ConnectedMonitor>;
  disconnect(): Promise<void>;
  onSample(listener: SampleListener): void;
  onDisconnect(listener: DisconnectListener): void;
  isConnected(): boolean;
}

