import { appStore } from '../../application/store';

export function DevicesScreen() {
  const device = appStore.device.value;
  const bpmPulse = Date.now() - appStore.runtime.value.bpmPulseAt < 450;

  return (
    <section class="screen-nonscroll flex flex-col gap-4">
      <div class="rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
        <div class="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">Device</div>
        <div class="mt-2 text-2xl font-semibold">{device?.name ?? '--'}</div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <div class="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">Battery</div>
          <div class="mt-3 text-4xl font-semibold">{device?.batteryPercent ?? '--'}%</div>
        </div>
        <div class="rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
          <div class="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">Live BPM</div>
          <div class="mt-3 flex items-center gap-3 text-4xl font-semibold">
            <span class={bpmPulse ? 'pulse-heart text-[color:var(--danger)]' : 'text-[color:var(--muted)]'}>♥</span>
            <span>{appStore.runtime.value.bpm ?? '--'}</span>
          </div>
        </div>
      </div>
      <div class="mt-auto grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => appStore.reconnectDevice()}
          class="rounded-full bg-[color:var(--accent)] px-4 py-4 text-lg font-semibold text-[color:var(--accent-ink)]"
        >
          Reconnect
        </button>
        <button
          type="button"
          onClick={() => appStore.disconnectDevice()}
          class="rounded-full bg-[color:var(--danger)] px-4 py-4 text-lg font-semibold text-[color:var(--danger-ink)]"
        >
          Disconnect
        </button>
      </div>
    </section>
  );
}

