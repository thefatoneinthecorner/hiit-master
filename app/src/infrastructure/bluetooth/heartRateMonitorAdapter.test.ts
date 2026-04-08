import { describe, expect, it } from 'vitest';
import { parseHeartRateMeasurement } from './heartRateMonitorAdapter';

describe('parseHeartRateMeasurement', () => {
  it('parses 8-bit heart-rate measurements', () => {
    const value = new DataView(new Uint8Array([0x00, 72]).buffer);

    expect(parseHeartRateMeasurement(value)).toBe(72);
  });

  it('parses 16-bit heart-rate measurements', () => {
    const value = new DataView(new Uint8Array([0x01, 0x2c, 0x01]).buffer);

    expect(parseHeartRateMeasurement(value)).toBe(300);
  });

  it('returns null for incomplete payloads', () => {
    const value = new DataView(new Uint8Array([0x01]).buffer);

    expect(parseHeartRateMeasurement(value)).toBeNull();
  });
});
