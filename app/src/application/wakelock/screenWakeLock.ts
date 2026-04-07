import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';

type ScreenWakeLockSentinel = {
  release: () => Promise<void>;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: 'screen') => Promise<ScreenWakeLockSentinel>;
  };
};

let requested = false;
let nativeWakeLockActive = false;
let webWakeLock: ScreenWakeLockSentinel | null = null;
let visibilityListenerBound = false;

export async function syncScreenWakeLock(enabled: boolean) {
  requested = enabled;

  if (!enabled) {
    await releaseScreenWakeLock();
    return;
  }

  bindVisibilityListener();
  await requestScreenWakeLock();
}

export async function resetScreenWakeLockForTests() {
  requested = false;
  await releaseScreenWakeLock();
  visibilityListenerBound = false;
}

async function requestScreenWakeLock() {
  if (typeof document !== 'undefined' && document.hidden) {
    return;
  }

  if (Capacitor.isNativePlatform()) {
    if (!nativeWakeLockActive) {
      await KeepAwake.keepAwake();
      nativeWakeLockActive = true;
    }
    return;
  }

  const navigatorWithWakeLock = getNavigatorWithWakeLock();

  if (navigatorWithWakeLock?.wakeLock === undefined || webWakeLock !== null) {
    return;
  }

  try {
    webWakeLock = await navigatorWithWakeLock.wakeLock.request('screen');
  } catch {
    webWakeLock = null;
  }
}

async function releaseScreenWakeLock() {
  if (nativeWakeLockActive) {
    await KeepAwake.allowSleep();
    nativeWakeLockActive = false;
  }

  if (webWakeLock !== null) {
    const currentWakeLock = webWakeLock;
    webWakeLock = null;
    await currentWakeLock.release();
  }
}

function bindVisibilityListener() {
  if (visibilityListenerBound || typeof document === 'undefined') {
    return;
  }

  document.addEventListener('visibilitychange', () => {
    void handleVisibilityChange();
  });
  visibilityListenerBound = true;
}

async function handleVisibilityChange() {
  if (!requested) {
    return;
  }

  if (document.hidden) {
    await releaseScreenWakeLock();
    return;
  }

  await requestScreenWakeLock();
}

function getNavigatorWithWakeLock() {
  if (typeof navigator === 'undefined') {
    return null;
  }

  return navigator as NavigatorWithWakeLock;
}
