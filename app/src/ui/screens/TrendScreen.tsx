import { useEffect, useRef, useState } from 'preact/hooks';

import { appStore } from '../../application/store';
import { buildNormalisedCovTrendPoints } from '../../domain/trend/normalisedCov';
import { isComparisonEligibleSession } from '../../domain/session/lifecycle';
import type { SessionRecord } from '../../domain/shared/types';
import { HeartGraph } from '../components/HeartGraph';
import { NormalisedCovGraph, type NormalisedCovPoint } from '../components/NormalisedCovGraph';

interface TrendScreenViewProps {
  points: NormalisedCovPoint[];
  sessions: SessionRecord[];
  referenceDate?: string;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  heartGraphScrubElapsedSec?: number;
}

export function TrendScreenView({
  points,
  sessions,
  referenceDate,
  selectedIndex,
  onSelectedIndexChange,
  heartGraphScrubElapsedSec = 844,
}: TrendScreenViewProps) {
  const [heartScrubElapsedSec, setHeartScrubElapsedSec] = useState(heartGraphScrubElapsedSec);
  const validPoints = points.filter((point) => point.value !== null && point.value > 0);
  const activeIndex = Math.min(Math.max(selectedIndex, 0), Math.max(validPoints.length - 1, 0));
  const activePoint = validPoints[activeIndex] ?? null;
  const activeSession = activePoint
    ? sessions.find((session) => session.startedAt === activePoint.date) ?? null
    : null;
  const previousSessions = activeSession
    ? [...sessions]
      .filter((session) => session.startedAt < activeSession.startedAt && isComparisonEligibleSession(session))
      .sort((first, second) => second.startedAt.localeCompare(first.startedAt))
    : [];
  const previousActiveSessionIdRef = useRef(activeSession?.id ?? null);
  const activeScrubElapsedSec = activeSession
    ? Math.min(heartScrubElapsedSec, activeSession.plan.totalDurationSec)
    : null;

  useEffect(() => {
    if (previousActiveSessionIdRef.current === activeSession?.id) {
      return;
    }

    previousActiveSessionIdRef.current = activeSession?.id ?? null;
    setHeartScrubElapsedSec(heartGraphScrubElapsedSec);
  }, [activeSession?.id, heartGraphScrubElapsedSec]);

  return (
    <section class="space-y-4 pb-8">
      <NormalisedCovGraph
        points={points}
        selectedIndex={selectedIndex}
        onSelectedIndexChange={onSelectedIndexChange}
        heightClassName="h-64"
        {...(referenceDate ? { referenceDate } : {})}
      />
      {activeSession ? (
        <HeartGraph
          samples={activeSession.samples}
          totalDurationSec={activeSession.plan.totalDurationSec}
          nominalPeakHeartrate={activeSession.profileSnapshot.nominalPeakHeartrate}
          labelledAxes
          scrubElapsedSec={activeScrubElapsedSec}
          timeScale="duration"
          crosshairScrubber
          heightClassName="h-56"
          phases={activeSession.plan.phases}
          analysis={activeSession.analysis}
          onScrubElapsedSecChange={setHeartScrubElapsedSec}
          previousSessions={previousSessions.map((session) => ({
            samples: session.samples,
            phases: session.plan.phases,
            analysis: session.analysis,
          }))}
        />
      ) : null}
    </section>
  );
}

export function TrendScreen() {
  const points = buildNormalisedCovTrendPoints(appStore.sessions.value);

  return (
    <TrendScreenView
      points={points}
      sessions={appStore.sessions.value}
      selectedIndex={appStore.trendIndex.value}
      onSelectedIndexChange={(index) => appStore.setTrendIndex(index)}
    />
  );
}
