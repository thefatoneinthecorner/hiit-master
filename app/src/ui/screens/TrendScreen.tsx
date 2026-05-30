import { useEffect, useRef, useState } from 'preact/hooks';

import { appStore } from '../../application/store';
import { deriveBpmSessionPlan } from '../../domain/analysis/bpmTimeline';
import { analyzeSessionRounds } from '../../domain/analysis/recovery';
import { buildNormalisedCovTrendPoints } from '../../domain/trend/normalisedCov';
import { isComparisonEligibleSession } from '../../domain/session/lifecycle';
import type { SessionRecord } from '../../domain/shared/types';
import { HeartGraph } from '../components/HeartGraph';
import { formatNormalisedCovPointLabel, NormalisedCovGraph, type NormalisedCovPoint } from '../components/NormalisedCovGraph';

interface TrendScreenViewProps {
  points: NormalisedCovPoint[];
  sessions: SessionRecord[];
  referenceDate?: string;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  heartGraphScrubElapsedSec?: number;
}

function SmallCapsTitle({ text }: { text: string }) {
  const parts = text.split(/([A-Za-z]+)/);

  return (
    <h2 class="text-sm font-medium tracking-[0.12em] text-[color:var(--muted)]" aria-label={text} data-testid="trend-selected-point-title">
      {parts.map((part, index) => {
        if (!/^[A-Za-z]+$/.test(part)) {
          return <span key={`${part}-${index}`}>{part}</span>;
        }

        return (
          <span key={`${part}-${index}`}>
            <span>{part.slice(0, 1)}</span>
            {part.length > 1 ? (
              <span class="[font-variant-caps:all-small-caps]" data-testid="trend-selected-point-title-smallcaps">
                {part.slice(1)}
              </span>
            ) : null}
          </span>
        );
      })}
    </h2>
  );
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
  const activePlan = activeSession ? deriveBpmSessionPlan(activeSession) : null;
  const activeAnalysis = activeSession && activePlan
    ? activePlan === activeSession.plan
      ? activeSession.analysis
      : analyzeSessionRounds(activePlan, activeSession.samples)
    : null;
  const previousActiveSessionIdRef = useRef(activeSession?.id ?? null);
  const activeScrubElapsedSec = activePlan
    ? Math.min(heartScrubElapsedSec, activePlan.totalDurationSec)
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
      <SmallCapsTitle text={formatNormalisedCovPointLabel(activePoint)} />
      {activeSession ? (
        <HeartGraph
          samples={activeSession.samples}
          totalDurationSec={activePlan?.totalDurationSec ?? activeSession.plan.totalDurationSec}
          nominalPeakHeartrate={activeSession.profileSnapshot.nominalPeakHeartrate}
          labelledAxes
          scrubElapsedSec={activeScrubElapsedSec}
          timeScale="duration"
          crosshairScrubber
          heightClassName="h-56"
          phases={activePlan?.phases ?? activeSession.plan.phases}
          analysis={activeAnalysis ?? activeSession.analysis}
          onScrubElapsedSecChange={setHeartScrubElapsedSec}
          previousSessions={previousSessions.map((session) => {
            const plan = deriveBpmSessionPlan(session);

            return {
              samples: session.samples,
              phases: plan.phases,
              analysis: plan === session.plan ? session.analysis : analyzeSessionRounds(plan, session.samples),
            };
          })}
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
