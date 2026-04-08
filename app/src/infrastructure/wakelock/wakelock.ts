import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';

let activeLock: WakeLockSentinel | null = null;

export async function requestWakeLock(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await KeepAwake.keepAwake();
    } catch {
      // fall through to browser wake lock if available
    }
  }

  if (!('wakeLock' in navigator)) {
    return;
  }

  try {
    activeLock = await navigator.wakeLock.request('screen');
  } catch {
    activeLock = null;
  }
}

export async function releaseWakeLock(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await KeepAwake.allowSleep();
    } catch {
      // fall through to browser wake lock release if needed
    }
  }

  if (!activeLock) {
    return;
  }

  await activeLock.release();
  activeLock = null;
}
