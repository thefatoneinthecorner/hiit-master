import type { HeartRateSample } from '../shared/types';

const MIN_PLAUSIBLE_BPM = 25;
const MAX_PLAUSIBLE_BPM = 240;

export function sanitizeHeartRateSample(sample: HeartRateSample): HeartRateSample | null {
  if (sample.bpm === null) {
    return sample;
  }

  if (sample.bpm < MIN_PLAUSIBLE_BPM || sample.bpm > MAX_PLAUSIBLE_BPM) {
    return null;
  }

  return sample;
}
