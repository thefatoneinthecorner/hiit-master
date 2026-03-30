import { describe, expect, it } from 'vitest';
import { createWorkoutPlan, getPhaseAtElapsedSec } from '../domain/workout/plan';

describe('workout plan', () => {
  it('preserves the canonical 13-round structure', () => {
    const plan = createWorkoutPlan(20);
    const workPhaseCount = plan.phases.filter((phase) => phase.phaseType === 'work').length;

    expect(workPhaseCount).toBe(13);
    expect(plan.actualRestsSec.length).toBe(12);
  });

  it('preserves the fixed round-duration rule across work durations', () => {
    const plan20 = createWorkoutPlan(20);
    const plan30 = createWorkoutPlan(30);
    const firstRest20 = plan20.actualRestsSec[0];
    const firstRest30 = plan30.actualRestsSec[0];

    expect(firstRest20).toBe(100);
    expect(firstRest30).toBe(90);
    expect(firstRest20).toBeDefined();
    expect(firstRest30).toBeDefined();

    if (firstRest20 === undefined || firstRest30 === undefined) {
      throw new Error('Expected first rest values to exist');
    }

    expect(firstRest20 + plan20.workDurationSec).toBe(firstRest30 + plan30.workDurationSec);
  });

  it('maps elapsed time to the correct phase', () => {
    const plan = createWorkoutPlan(20);

    expect(getPhaseAtElapsedSec(plan, 0).phase?.phaseType).toBe('warmup');
    expect(getPhaseAtElapsedSec(plan, 300).phase?.phaseType).toBe('work');
    expect(getPhaseAtElapsedSec(plan, 320).phase?.phaseType).toBe('rest');
    expect(getPhaseAtElapsedSec(plan, plan.totalDurationSec).isComplete).toBe(true);
  });
});
