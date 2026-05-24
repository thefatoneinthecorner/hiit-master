import { IconButton } from './IconButton';

const bluetoothIcon = new URL('../../../../assets/bluetooth.svg', import.meta.url).href;
const playIcon = new URL('../../../../assets/play.svg', import.meta.url).href;
const pauseIcon = new URL('../../../../assets/pause.svg', import.meta.url).href;
const stopIcon = new URL('../../../../assets/square.svg', import.meta.url).href;

interface SessionControllerProps {
  sensorName: string | null | undefined;
  batteryPercent: number | null | undefined;
  playing?: boolean;
  onBluetooth: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

export function SessionController({
  sensorName,
  batteryPercent,
  playing = true,
  onBluetooth,
  onPlay,
  onPause,
  onStop
}: SessionControllerProps) {
  return (
    <div class="rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
      <dl class="grid gap-4">
        <div>
          <dt class="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">Sensor</dt>
          <dd class="mt-2 text-2xl font-semibold">{sensorName ?? '--'}</dd>
        </div>
        <div>
          <dt class="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">Battery</dt>
          <dd class="mt-2 text-4xl font-semibold">{batteryPercent ?? '--'}%</dd>
        </div>
      </dl>
      <div class="mt-5 grid grid-cols-4 justify-items-center gap-3" aria-label="Session controls">
        <IconButton label="Bluetooth" iconSrc={bluetoothIcon} size="lg" onClick={onBluetooth} />
        <IconButton label="Play" iconSrc={playIcon} size="lg" variant="default" disabled={playing} onClick={onPlay} />
        <IconButton label="Pause" iconSrc={pauseIcon} size="lg" variant="default" disabled={!playing} onClick={onPause} />
        <IconButton label="Stop" iconSrc={stopIcon} size="lg" variant="danger" onClick={onStop} />
      </div>
    </div>
  );
}
