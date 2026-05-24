import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import {
  buildComparisonRounds,
  buildReplayRecoveryAnalysis,
  getReplayRecoveryVisibleRoundIndexes
} from '../../app/src/domain/comparison/comparison';
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

  const advanceElapsed = () => {
    setElapsedSec((current) => {
      if (current >= totalDurationSec) {
        return loop ? 0 : totalDurationSec;
      }

      return current + 1;
    });
  };
  const reverseElapsed = () => {
    setElapsedSec((current) => Math.max(0, current - 1));
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
        advanceElapsed();
      } else {
        reverseElapsed();
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
  const currentPhase =
    latest.plan.phases.find((phase) => elapsedSec >= phase.startSec && elapsedSec < phase.endSec) ??
    latest.plan.phases.at(-1);
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
    title: latest.name,
    roundName: formatReplayPhaseLabel(currentPhase, latest.name),
    countdownSeconds: Math.max(0, (currentPhase?.endSec ?? totalDurationSec) - elapsedSec),
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
