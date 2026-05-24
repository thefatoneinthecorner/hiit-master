import { appStore } from '../../application/store';
import { HeartSensorDetails } from '../components/HeartSensorDetails';
import { Pulse } from '../components/Pulse';

export function DevicesScreen() {
  const device = appStore.device.value;
  const bpmPulse = Date.now() - appStore.runtime.value.bpmPulseAt < 450;

  return (
    <section class="screen-nonscroll flex flex-col gap-4">
      <HeartSensorDetails
        sensorName={device?.name}
        batteryPercent={device?.batteryPercent}
        onReconnect={() => appStore.reconnectDevice()}
        onDisconnect={() => appStore.disconnectDevice()}
      />
      <div class="grid gap-4">
        <div class="rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <div class="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">Live BPM</div>
          <div class="mt-3 flex items-center gap-3 text-4xl font-semibold">
            <Pulse active={bpmPulse} />
            <span>{appStore.runtime.value.bpm ?? '--'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
