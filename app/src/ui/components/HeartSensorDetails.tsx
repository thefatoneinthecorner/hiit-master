interface HeartSensorDetailsProps {
  sensorName: string | null | undefined;
  batteryPercent: number | null | undefined;
  onReconnect: () => void;
  onDisconnect: () => void;
}

export function HeartSensorDetails({
  sensorName,
  batteryPercent,
  onReconnect,
  onDisconnect
}: HeartSensorDetailsProps) {
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
      <div class="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onReconnect}
          class="rounded-full bg-[color:var(--accent)] px-4 py-4 text-lg font-semibold text-[color:var(--accent-ink)]"
        >
          Reconnect
        </button>
        <button
          type="button"
          onClick={onDisconnect}
          class="rounded-full bg-[color:var(--danger)] px-4 py-4 text-lg font-semibold text-[color:var(--danger-ink)]"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
