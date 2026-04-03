import { describe, expect, it } from 'vitest';
import {
  parseHeartRateMeasurement,
  shouldUseNativeHeartRateMonitor
} from '../infrastructure/bluetooth/monitor';

describe('parseHeartRateMeasurement', () => {
  it('reads 8-bit heart-rate measurements', () => {
    const value = new DataView(Uint8Array.from([0x00, 153]).buffer);
    expect(parseHeartRateMeasurement(value)).toBe(153);
  });

  it('reads 16-bit heart-rate measurements', () => {
    const value = new DataView(Uint8Array.from([0x01, 0x2c, 0x01]).buffer);
    expect(parseHeartRateMeasurement(value)).toBe(300);
  });
});

describe('shouldUseNativeHeartRateMonitor', () => {
  it('uses the native adapter on native iOS', () => {
    expect(shouldUseNativeHeartRateMonitor('ios', true)).toBe(true);
  });

  it('keeps Web Bluetooth on desktop web', () => {
    expect(shouldUseNativeHeartRateMonitor('web', false)).toBe(false);
  });
});
