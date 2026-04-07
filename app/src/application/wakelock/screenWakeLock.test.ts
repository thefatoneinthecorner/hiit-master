import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetScreenWakeLockForTests, syncScreenWakeLock } from './screenWakeLock';

const mocks = vi.hoisted(() => ({
  keepAwake: vi.fn(async () => undefined),
  allowSleep: vi.fn(async () => undefined),
  isNativePlatform: vi.fn(() => false),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: mocks.isNativePlatform,
  },
}));

vi.mock('@capacitor-community/keep-awake', () => ({
  KeepAwake: {
    keepAwake: mocks.keepAwake,
    allowSleep: mocks.allowSleep,
  },
}));

describe('screenWakeLock', () => {
  const originalWakeLock = (navigator as { wakeLock?: unknown }).wakeLock;

  beforeEach(() => {
    mocks.keepAwake.mockClear();
    mocks.allowSleep.mockClear();
    mocks.isNativePlatform.mockReturnValue(false);
  });

  afterEach(async () => {
    (navigator as { wakeLock?: unknown }).wakeLock = originalWakeLock;
    await resetScreenWakeLockForTests();
  });

  it('uses the native keep-awake plugin on native platforms', async () => {
    mocks.isNativePlatform.mockReturnValue(true);

    await syncScreenWakeLock(true);
    await syncScreenWakeLock(false);

    expect(mocks.keepAwake).toHaveBeenCalledTimes(1);
    expect(mocks.allowSleep).toHaveBeenCalledTimes(1);
  });

  it('falls back to navigator wakeLock on the web', async () => {
    const release = vi.fn(async () => undefined);
    const request = vi.fn(async () => ({ release }));
    (navigator as { wakeLock?: unknown }).wakeLock = { request };

    await syncScreenWakeLock(true);
    await syncScreenWakeLock(false);

    expect(request).toHaveBeenCalledWith('screen');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the web wake-lock API is unavailable', async () => {
    (navigator as { wakeLock?: unknown }).wakeLock = undefined;

    await syncScreenWakeLock(true);
    await syncScreenWakeLock(false);

    expect(mocks.keepAwake).not.toHaveBeenCalled();
    expect(mocks.allowSleep).not.toHaveBeenCalled();
  });
});
