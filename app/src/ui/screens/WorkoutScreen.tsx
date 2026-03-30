import type { VNode } from 'preact';
import { DEFAULT_WORK_DURATION_SEC } from '../../domain/workout/constants';
import { createWorkoutPlan } from '../../domain/workout/plan';

const plan = createWorkoutPlan(DEFAULT_WORK_DURATION_SEC);

export function WorkoutScreen(): VNode {
  return (
    <main className="screen">
      <section className="hero-card">
        <p className="eyebrow">HIIT Master Rebuild</p>
        <h1 className="timer">05:00</h1>
        <p className="phase">Warmup</p>
        <p className="copy">
          Strict TypeScript + Preact scaffold is in place. The next implementation slice is the domain timer,
          Bluetooth integration, and comparison view model.
        </p>
      </section>

      <section className="status-grid">
        <article className="panel">
          <h2>Workout Model</h2>
          <p>{plan.phases.length} phases generated from the canonical timing rule.</p>
        </article>
        <article className="panel">
          <h2>Comparison Surface</h2>
          <p>Presentation intentionally open: bars, styled graph, or hybrid encoding.</p>
        </article>
        <article className="panel panel-wide">
          <h2>Laptop Debug View</h2>
          <div className="debug-table">
            <div>Round</div>
            <div>Peak</div>
            <div>Trough</div>
            <div>Delta</div>
            <div>1</div>
            <div>--</div>
            <div>--</div>
            <div>--</div>
            <div>2</div>
            <div>--</div>
            <div>--</div>
            <div>--</div>
          </div>
        </article>
      </section>
    </main>
  );
}
