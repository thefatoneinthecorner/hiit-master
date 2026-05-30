import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import {
  buildComparisonRounds,
  buildReplayRecoveryAnalysis,
  getReplayRecoveryVisibleRoundIndexes
} from '../../app/src/domain/comparison/comparison';
import { getProfileBpmTargets } from '../../app/src/domain/shared/profile';
import type { HeartRateSample } from '../../app/src/domain/shared/types';
import type { LatestSessionReplayFixture } from '../fixtures/latestSessionReplay';

interface UseSessionReplayOptions {
  loop?: boolean;
  tickMs?: number;
}

function interpolateSamples(samples: HeartRateSample[], elapsedSec: number): HeartRateSample[] {
  if (samples.length === 0) {
    return [];
  }

  const sorted = [...samples].sort((left, right) => left.elapsedSec - right.elapsedSec);
  const visible: HeartRateSample[] = [];

  for (let second = 0; second <= elapsedSec; second += 1) {
    const nextIndex = sorted.findIndex((sample) => sample.elapsedSec >= second);
    const next = nextIndex === -1 ? sorted.at(-1) : sorted[nextIndex];
    const previous = nextIndex <= 0 ? sorted[0] : sorted[nextIndex - 1];

    if (!next || !previous || previous.bpm === null || next.bpm === null || next.elapsedSec === previous.elapsedSec) {
      visible.push({ elapsedSec: second, bpm: next?.bpm ?? previous?.bpm ?? null });
      continue;
    }

    const progress = (second - previous.elapsedSec) / (next.elapsedSec - previous.elapsedSec);
    const bpm = Math.round(previous.bpm + (next.bpm - previous.bpm) * progress);
    visible.push({ elapsedSec: second, bpm });
  }

  return visible;
}

function formatReplayPhaseLabel(phase: LatestSessionReplayFixture['latest']['plan']['phases'][number] | undefined, fallback: string) {
  if (!phase) {
    return fallback;
  }

  if (phase.kind === 'work') {
    return `${phase.label}: Work`;
  }

  if (phase.kind === 'rest') {
    return `${phase.label}: Rest`;
  }

  return phase.label;
}

function getRoundRecoveryPhaseEndElapsedSec(
  plan: LatestSessionReplayFixture['latest']['plan'],
  analysis: LatestSessionReplayFixture['latest']['analysis'],
  roundIndex: number
): number {
  const restPhase = plan.phases.find((item) => item.kind === 'rest' && item.roundIndex === roundIndex);
  if (restPhase) {
    return restPhase.endSec;
  }

  return analysis.find((round) => round.roundIndex === roundIndex)?.recoveryWindowEndSec ?? plan.totalDurationSec;
}

function getReplayTargetBpm(
  fixture: LatestSessionReplayFixture['latest'],
  phase: LatestSessionReplayFixture['latest']['plan']['phases'][number] | undefined
): number | null {
  if (fixture.settingsMode !== 'bpm' || !phase?.roundIndex || (phase.kind !== 'work' && phase.kind !== 'rest')) {
    return null;
  }

  const target = getProfileBpmTargets(fixture.profileSnapshot)[phase.roundIndex - 1];
  if (!target) {
    return null;
  }

  return phase.kind === 'work' ? target.maxBpm : target.minBpm;
}

function getDurationReplayPhaseState(fixture: LatestSessionReplayFixture['latest'], elapsedSec: number) {
  const totalDurationSec = fixture.plan.totalDurationSec;
  const phase =
    fixture.plan.phases.find((item) => elapsedSec >= item.startSec && elapsedSec < item.endSec) ??
    fixture.plan.phases.at(-1);

  return {
    phase,
    countdownSeconds: Math.max(0, (phase?.endSec ?? totalDurationSec) - elapsedSec)
  };
}

function getBpmReplayPhaseState(
  fixture: LatestSessionReplayFixture['latest'],
  samples: HeartRateSample[],
  elapsedSec: number
) {
  const warmupPhase = fixture.plan.phases.find((phase) => phase.kind === 'warmup');
  if (!warmupPhase || elapsedSec < warmupPhase.durationSec) {
    return {
      phase: warmupPhase,
      countdownSeconds: Math.max(0, (warmupPhase?.durationSec ?? fixture.profileSnapshot.warmupSec) - elapsedSec)
    };
  }

  const targetPhases = fixture.plan.phases.filter((phase) => phase.kind === 'work' || phase.kind === 'rest');
  let targetPhaseIndex = 0;
  let cooldownStartSec: number | null = null;

  for (let second = Math.max(0, warmupPhase.durationSec); second <= elapsedSec; second += 1) {
    const phase = targetPhases[targetPhaseIndex];
    const bpm = samples[second]?.bpm ?? null;
    const target = getReplayTargetBpm(fixture, phase);

    if (!phase || bpm === null || target === null) {
      continue;
    }

    const reachedTarget = phase.kind === 'work' ? bpm >= target : bpm <= target;
    if (!reachedTarget) {
      continue;
    }

    targetPhaseIndex += 1;
    if (targetPhaseIndex >= targetPhases.length) {
      cooldownStartSec = second;
      break;
    }
  }

  if (cooldownStartSec !== null) {
    const cooldownPhase = fixture.plan.phases.find((phase) => phase.kind === 'cooldown');
    return {
      phase: cooldownPhase,
      countdownSeconds: Math.max(0, fixture.profileSnapshot.cooldownBaseSec - (elapsedSec - cooldownStartSec))
    };
  }

  const phase = targetPhases[Math.min(targetPhaseIndex, targetPhases.length - 1)] ?? fixture.plan.phases.at(-1);
  return {
    phase,
    countdownSeconds: 0
  };
}

export function useSessionReplay(
  fixture: LatestSessionReplayFixture,
  { loop = true, tickMs = 1000 }: UseSessionReplayOptions = {}
) {
  const [elapsedSec, setElapsedSec] = useState(0);
  const [scrubDirection, setScrubDirection] = useState<0 | 1 | -1>(0);
  const [playing, setPlaying] = useState(true);
  const [visibleRoundIndexes, setVisibleRoundIndexes] = useState<number[]>([]);
  const [recoveryScaleMaxAbs, setRecoveryScaleMaxAbs] = useState(1);
  const [scrubberVisible, setScrubberVisible] = useState(false);
  const [scrubElapsedSec, setScrubElapsedSec] = useState(0);
  const previousElapsedSec = useRef(0);
  const previousScaleElapsedSec = useRef(0);
  const { latest, previousComparable } = fixture;
  const totalDurationSec = latest.plan.totalDurationSec;

  const advanceElapsed = (stepSec = 1) => {
    setElapsedSec((current) => {
      if (current >= totalDurationSec) {
        return loop ? 0 : totalDurationSec;
      }

      return Math.min(totalDurationSec, current + stepSec);
    });
  };
  const reverseElapsed = (stepSec = 1) => {
    setElapsedSec((current) => Math.max(0, current - stepSec));
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setScrubDirection(1);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setScrubDirection(-1);
      }
      if ((event.key === ' ' || event.code === 'Space') && !event.repeat) {
        event.preventDefault();
        setPlaying((current) => !current);
      }
      if (event.key.toLowerCase() === 's' && !event.repeat) {
        event.preventDefault();
        setScrubberVisible((current) => {
          const next = !current;
          if (next) {
            setScrubElapsedSec(elapsedSec);
          }

          return next;
        });
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setScrubDirection((current) => current === 1 ? 0 : current);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setScrubDirection((current) => current === -1 ? 0 : current);
      }
    };
    const handleBlur = () => setScrubDirection(0);

    window.addEventListener('blur', handleBlur);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [elapsedSec]);

  useEffect(() => {
    if (scrubDirection !== 0 || !playing) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      advanceElapsed();
    }, tickMs);

    return () => window.clearInterval(intervalId);
  }, [loop, playing, scrubDirection, tickMs, totalDurationSec]);

  useEffect(() => {
    if (scrubDirection === 0 || !playing) {
      return undefined;
    }

    let animationFrameId = 0;
    const advance = () => {
      if (scrubDirection === 1) {
        advanceElapsed(5);
      } else {
        reverseElapsed(5);
      }
      animationFrameId = window.requestAnimationFrame(advance);
    };

    animationFrameId = window.requestAnimationFrame(advance);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [loop, playing, scrubDirection, totalDurationSec]);

  const samples = useMemo(
    () => interpolateSamples(latest.samples, elapsedSec),
    [elapsedSec, latest.samples]
  );
  const currentSample = samples.at(-1);
  const phaseState = latest.settingsMode === 'bpm'
    ? getBpmReplayPhaseState(latest, samples, elapsedSec)
    : getDurationReplayPhaseState(latest, elapsedSec);
  const currentPhase = phaseState.phase;
  const currentBpm = currentSample?.bpm ?? null;
  const roundEndElapsedSec = latest.plan.rounds.map((round) =>
    getRoundRecoveryPhaseEndElapsedSec(latest.plan, latest.analysis, round.roundIndex)
  );
  useEffect(() => {
    const movingBackward = elapsedSec < previousElapsedSec.current;
    previousElapsedSec.current = elapsedSec;

    if (elapsedSec === 0) {
      setVisibleRoundIndexes([]);
      return;
    }

    setVisibleRoundIndexes((current) => {
      const nextIndexes = getReplayRecoveryVisibleRoundIndexes({
        elapsedSec,
        currentBpm,
        currentAnalysis: latest.analysis,
        previousAnalysis: previousComparable.analysis,
        visibleRoundIndexes: movingBackward ? [] : current,
        samples,
        revealElapsedSec: roundEndElapsedSec
      });
      return nextIndexes.length === current.length && nextIndexes.every((roundIndex, index) => roundIndex === current[index])
        ? current
        : nextIndexes;
    });
  }, [currentBpm, elapsedSec, latest.analysis, previousComparable.analysis]);

  const replayAnalysis = buildReplayRecoveryAnalysis({
    elapsedSec,
    currentBpm,
    currentAnalysis: latest.analysis,
    visibleRoundIndexes,
    samples
  });
  const recoveryRounds = buildComparisonRounds(replayAnalysis, previousComparable.analysis);
  const currentRecoveryMaxAbs = Math.max(1, ...recoveryRounds.map((round) => Math.abs(round.diffDelta ?? 0)));

  useEffect(() => {
    const movingBackward = elapsedSec < previousScaleElapsedSec.current;
    previousScaleElapsedSec.current = elapsedSec;

    setRecoveryScaleMaxAbs((current) => {
      if (elapsedSec === 0 || movingBackward) {
        return currentRecoveryMaxAbs;
      }

      return Math.max(current, currentRecoveryMaxAbs);
    });
  }, [currentRecoveryMaxAbs, elapsedSec]);

  return {
    settingsMode: latest.settingsMode ?? 'duration',
    title: latest.name,
    roundName: formatReplayPhaseLabel(currentPhase, latest.name),
    countdownSeconds: phaseState.countdownSeconds,
    targetBpm: getReplayTargetBpm(latest, currentPhase),
    remainingSeconds: Math.max(0, totalDurationSec - elapsedSec),
    timingEmphasis: currentPhase?.kind === 'work' ? 'work' as const : 'recovery' as const,
    bpm: currentBpm,
    pulseActive: currentBpm !== null,
    pulseBeating: currentBpm !== null,
    pulseBeatKey: elapsedSec,
    sensorName: 'Polar H10',
    batteryPercent: 82,
    playing,
    samples,
    totalDurationSec,
    nominalPeakHeartrate: latest.profileSnapshot.nominalPeakHeartrate,
    scrubElapsedSec: scrubberVisible ? scrubElapsedSec : null,
    recoveryRounds,
    recoveryScaleMaxAbs,
    roundDurationsSec: latest.plan.rounds.map((round) => round.nominalRoundDurationSec),
    roundEndElapsedSec,
    sessionControllerVisible: false,
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onScrubPointerMove: (clientX: number, containerRect: DOMRect) => {
      if (!scrubberVisible) {
        return;
      }

      const progress = Math.max(0, Math.min(1, (clientX - containerRect.left) / Math.max(containerRect.width, 1)));
      setScrubElapsedSec(Math.round(progress * totalDurationSec));
    },
  };
}
