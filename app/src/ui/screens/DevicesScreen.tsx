import { useAppState } from '../../application/session/AppStateContext';

export function DevicesScreen() {
  const {
    batteryPercent,
    canOpenDevices,
    deviceName,
    deviceTestMode,
    disconnectMonitor,
    isCurrentSessionCompromised,
    liveBpm,
    livePulseVersion,
    reconnectMonitor,
    stage,
  } = useAppState();

  if (!canOpenDevices) {
    return (
      <section class="flex min-h-[70vh] items-center justify-center">
        <div class="w-full max-w-md rounded-[2rem] border border-app-line bg-app-panel px-8 py-12 text-center shadow-card">
          <p class="text-xs uppercase tracking-[0.34em] text-app-muted">Devices</p>
          <h2 class="mt-4 font-display text-5xl leading-none">Unavailable</h2>
          <p class="mt-5 text-sm leading-6 text-app-muted">
            Connect a heart-rate monitor or start a session before opening device controls.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section class="mx-auto flex min-h-[75vh] max-w-3xl flex-col gap-5">
      <header class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
        <p class="text-xs uppercase tracking-[0.34em] text-app-muted">Connected Monitor</p>
        <h2 class="mt-3 font-display text-4xl leading-none">
          {deviceName ?? (isCurrentSessionCompromised && (stage === 'running' || stage === 'paused') ? 'Connection Lost' : 'Reconnecting...')}
        </h2>
        <p class="mt-4 text-sm leading-6 text-app-muted">
          {buildStatusCopy(stage, isCurrentSessionCompromised, deviceName !== null)}
        </p>
      </header>

      <div class="grid gap-5 md:grid-cols-2">
        <div class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
          <p class="text-xs uppercase tracking-[0.28em] text-app-muted">Battery</p>
          <p class="mt-4 font-display text-5xl leading-none">
            {batteryPercent === null ? '--' : `${batteryPercent}%`}
          </p>
          <p class="mt-4 text-sm leading-6 text-app-muted">
            {deviceTestMode
              ? 'Device-test mode is active, so battery is hardwired to 33%.'
              : 'Battery is a best-effort BLE read from the current monitor.'}
          </p>
        </div>

        <div class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.28em] text-app-muted">Live BPM</p>
              <p class="mt-4 font-display text-5xl leading-none">{liveBpm === null ? '--' : liveBpm}</p>
            </div>
            <span
              key={livePulseVersion}
              aria-hidden="true"
              class={`inline-flex h-16 w-16 items-center justify-center rounded-full text-3xl transition ${
                liveBpm === null ? 'bg-stone-200 text-stone-400' : 'bg-rose-100 text-rose-600'
              }`}
            >
              ♥
            </span>
          </div>
          <p class="mt-4 text-sm leading-6 text-app-muted">
            The heart indicator refreshes on each incoming sample, even if the BPM value repeats.
          </p>
        </div>
      </div>

      <div class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
        <p class="text-xs uppercase tracking-[0.28em] text-app-muted">Connection Behavior</p>
        <ul class="mt-5 space-y-3 text-sm leading-6 text-app-muted">
          <li class="rounded-2xl bg-app-canvas px-4 py-3">
            Reconnect performs a fresh monitor connection flow and may show the host OS Bluetooth picker.
          </li>
          <li class="rounded-2xl bg-app-canvas px-4 py-3">
            Disconnect ends the monitor connection. If a workout is active, that session ends early and becomes compromised.
          </li>
        </ul>
      </div>

      <div class="mt-auto grid gap-3 pb-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={reconnectMonitor}
          class="inline-flex min-h-14 items-center justify-center rounded-[1.5rem] border border-app-line bg-app-panel px-6 text-base font-semibold shadow-card"
        >
          Reconnect
        </button>
        <button
          type="button"
          onClick={disconnectMonitor}
          class="inline-flex min-h-14 items-center justify-center rounded-[1.5rem] bg-app-accent px-6 text-base font-semibold text-app-accent-ink shadow-card"
        >
          Disconnect
        </button>
      </div>
    </section>
  );
}

function buildStatusCopy(stage: string, isCurrentSessionCompromised: boolean, hasConnectedDevice: boolean) {
  if (isCurrentSessionCompromised && !hasConnectedDevice && (stage === 'running' || stage === 'paused')) {
    return 'The workout is still active, but heart-rate coverage is compromised until you reconnect a monitor. Reconnect can resume live samples, but the session remains comparison-ineligible.';
  }

  if (isCurrentSessionCompromised) {
    return 'The last session ended early because the monitor disconnected during an active workout.';
  }

  if (stage === 'paused') {
    return 'Session is paused. You can reconnect to a different device and still resume the workout.';
  }

  if (stage === 'running') {
    return 'Session is active. Reconnect keeps the workout alive, but Disconnect ends it early.';
  }

  if (stage === 'completed') {
    return 'Workout is complete. Device controls stay available while the monitor remains connected.';
  }

  return 'Use this screen to manage the current heart-rate monitor without starting a new workout.';
}
