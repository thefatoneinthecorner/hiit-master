import { describe, expect, it } from 'vitest';
import { sanitizeHeartRateSample } from './hrIntegrity';

describe('sanitizeHeartRateSample', () => {
  it('drops implausible BPM outliers before they affect the session', () => {
    expect(sanitizeHeartRateSample({ elapsedSec: 1, bpm: 24 })).toBeNull();
    expect(sanitizeHeartRateSample({ elapsedSec: 1, bpm: 241 })).toBeNull();
    expect(sanitizeHeartRateSample({ elapsedSec: 1, bpm: 120 })).toEqual({
      elapsedSec: 1,
      bpm: 120,
    });
  });
});
