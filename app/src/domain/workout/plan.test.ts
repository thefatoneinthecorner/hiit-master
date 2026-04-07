import { describe, expect, it } from 'vitest';
import { buildWorkoutPlan } from './plan';
import type { Profile } from '../shared/types';

const profile: Profile = {
  id: 'profile-1',
  name: 'My Profile',
  workDurationSec: 30,
  nominalPeakHeartrate: 160,
  warmupSec: 180,
  baseRestsSec: [90, 75, 60],
  cooldownBaseSec: 120,
  notes: '',
};

describe('buildWorkoutPlan', () => {
  it('preserves round durations by adding reduced work time onto recovery', () => {
    const plan = buildWorkoutPlan(profile, 20);

    const workPhases = plan.phases.filter((phase) => phase.kind === 'work');
    const recoveryPhases = plan.phases.filter(
      (phase) => phase.kind === 'recovery' || phase.kind === 'cooldown',
    );

    expect(workPhases.map((phase) => phase.durationSec)).toEqual([20, 20, 20]);
    expect(recoveryPhases.map((phase) => phase.durationSec)).toEqual([100, 85, 130]);
  });
});
