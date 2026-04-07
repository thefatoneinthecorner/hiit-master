import { describe, expect, it } from 'vitest';
import { getDefaultActualWorkDurationSec } from './defaults';

describe('getDefaultActualWorkDurationSec', () => {
  it('uses the most recent session value when available', () => {
    expect(getDefaultActualWorkDurationSec(30, { actualWorkDurationSec: 23 })).toBe(23);
  });

  it('falls back to two thirds of nominal duration when no prior session exists', () => {
    expect(getDefaultActualWorkDurationSec(30)).toBe(20);
  });
});
