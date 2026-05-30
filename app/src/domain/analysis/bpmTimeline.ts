import type { SessionRecord, WorkoutPhaseSegment, WorkoutPlan } from '../shared/types';

export interface BpmTargetDurationRow {
  roundIndex: number;
  phase: 'work' | 'rest';
  targetBpm: number;
  targetComparator: '>=' | '<=';
  startElapsedSec: number;
  targetReachedElapsedSec: number | null;
  targetDurationSec: number | null;
  definedDurationSec: number;
  reachedBpm: number | null;
}

function getNumericSamples(session: SessionRecord) {
  return session.samples
    .filter((sample) => sample.bpm !== null)
    .map((sample) => ({ elapsedSec: sample.elapsedSec, bpm: sample.bpm as number }))
    .sort((left, right) => left.elapsedSec - right.elapsedSec);
}

function hasBpmTargets(session: SessionRecord): boolean {
  return (
    session.settingsMode === 'bpm' &&
    Array.isArray(session.profileSnapshot.bpmTargets) &&
    session.profileSnapshot.bpmTargets.length >= session.plan.rounds.length
  );
}

function rebuildPhase(
  phase: WorkoutPhaseSegment,
  startSec: number,
  endSec: number
): WorkoutPhaseSegment {
  return {
    ...phase,
    startSec,
    endSec,
    durationSec: Math.max(0, endSec - startSec)
  };
}

function findTargetReachedElapsedSec(
  session: SessionRecord,
  phase: WorkoutPhaseSegment,
  startSec: number,
  samples: Array<{ elapsedSec: number; bpm: number }>
): number | null {
  if (phase.roundIndex === null || (phase.kind !== 'work' && phase.kind !== 'rest')) {
    return null;
  }

  const target = session.profileSnapshot.bpmTargets?.[phase.roundIndex - 1];
  if (!target) {
    return null;
  }

  const reachedSample = samples.find((sample) => {
    if (sample.elapsedSec < startSec) {
      return false;
    }

    return phase.kind === 'work' ? sample.bpm >= target.maxBpm : sample.bpm <= target.minBpm;
  });

  return reachedSample?.elapsedSec ?? null;
}

export function deriveBpmSessionPlan(session: SessionRecord): WorkoutPlan {
  if (!hasBpmTargets(session)) {
    return session.plan;
  }

  const rebuiltPhases: WorkoutPhaseSegment[] = [];
  const samples = getNumericSamples(session);
  const latestSampleElapsedSec = samples.at(-1)?.elapsedSec ?? session.plan.totalDurationSec;
  let cursorSec = 0;

  for (const phase of session.plan.phases) {
    if (phase.kind === 'warmup' || phase.kind === 'cooldown') {
      const endSec = cursorSec + phase.durationSec;
      rebuiltPhases.push(rebuildPhase(phase, cursorSec, endSec));
      cursorSec = endSec;
      continue;
    }

    if (phase.kind === 'work' || phase.kind === 'rest') {
      const targetReachedElapsedSec = findTargetReachedElapsedSec(session, phase, cursorSec, samples);
      const endSec = targetReachedElapsedSec ?? latestSampleElapsedSec;
      rebuiltPhases.push(rebuildPhase(phase, cursorSec, endSec));
      cursorSec = endSec;

      if (targetReachedElapsedSec === null) {
        break;
      }
    }
  }

  if (rebuiltPhases.length === 0) {
    return session.plan;
  }

  return {
    ...session.plan,
    phases: rebuiltPhases,
    totalDurationSec: rebuiltPhases.at(-1)?.endSec ?? session.plan.totalDurationSec
  };
}

export function buildBpmTargetDurationRows(session: SessionRecord): BpmTargetDurationRow[] {
  if (!hasBpmTargets(session)) {
    return [];
  }

  const rows: BpmTargetDurationRow[] = [];
  const samples = getNumericSamples(session);
  let cursorSec = 0;

  for (const phase of session.plan.phases) {
    if (phase.kind === 'warmup' || phase.kind === 'cooldown') {
      cursorSec += phase.durationSec;
      continue;
    }

    if (phase.kind !== 'work' && phase.kind !== 'rest') {
      continue;
    }

    if (phase.roundIndex === null) {
      continue;
    }

    const target = session.profileSnapshot.bpmTargets?.[phase.roundIndex - 1];
    if (!target) {
      break;
    }

    const targetReachedElapsedSec = findTargetReachedElapsedSec(session, phase, cursorSec, samples);
    const reachedSample =
      targetReachedElapsedSec !== null
        ? samples.find((sample) => sample.elapsedSec === targetReachedElapsedSec) ?? null
        : null;
    const targetBpm = phase.kind === 'work' ? target.maxBpm : target.minBpm;

    rows.push({
      roundIndex: phase.roundIndex,
      phase: phase.kind,
      targetBpm,
      targetComparator: phase.kind === 'work' ? '>=' : '<=',
      startElapsedSec: cursorSec,
      targetReachedElapsedSec,
      targetDurationSec: targetReachedElapsedSec !== null ? targetReachedElapsedSec - cursorSec : null,
      definedDurationSec: phase.durationSec,
      reachedBpm: reachedSample?.bpm ?? null
    });

    if (targetReachedElapsedSec === null) {
      break;
    }

    cursorSec = targetReachedElapsedSec;
  }

  return rows;
}

export function formatElapsedTime(elapsedSec: number): string {
  return `${Math.floor(elapsedSec / 60)}:${String(Math.floor(elapsedSec % 60)).padStart(2, '0')}`;
}

function formatDuration(durationSec: number | null): string {
  return durationSec === null ? 'not reached' : `${durationSec}s`;
}

export function buildBpmTargetDurationMarkdownTable(session: SessionRecord): string {
  const header = '| Round | Phase | Target | Start | Hit at | Duration | Defined duration | BPM at hit |';
  const separator = '|---:|---|---:|---:|---:|---:|---:|---:|';
  const body = buildBpmTargetDurationRows(session).map((row) => {
    const hitAt = row.targetReachedElapsedSec === null ? 'not reached' : formatElapsedTime(row.targetReachedElapsedSec);
    const reachedBpm = row.reachedBpm === null ? 'not reached' : String(row.reachedBpm);

    return [
      `| ${row.roundIndex}`,
      row.phase === 'work' ? 'Work' : 'Rest',
      `${row.targetComparator}${row.targetBpm}`,
      formatElapsedTime(row.startElapsedSec),
      hitAt,
      formatDuration(row.targetDurationSec),
      `${row.definedDurationSec}s`,
      `${reachedBpm} |`
    ].join(' | ');
  });

  return [header, separator, ...body].join('\n');
}
