import { appStore } from '../../application/store';
import { deriveBpmSessionPlan } from '../../domain/analysis/bpmTimeline';
import { analyzeSessionRounds } from '../../domain/analysis/recovery';
import { buildNormalisedCovTrendPoints } from '../../domain/trend/normalisedCov';
import { isComparisonEligibleSession } from '../../domain/session/lifecycle';
import type { Sample, SessionRecord, WorkoutPlan } from '../../domain/shared/types';
import {
  Crosshairs,
  IntervalHighlight,
  LayeredHeartGraph,
  SessionHeartRateLine,
  buildSessionIntervalAtX,
  formatCrosshairTimeLabel,
  getSessionSampleY,
  useLayeredHeartGraphPointerX,
} from '../components/LayeredHeartGraph';
import { formatNormalisedCovPointLabel, NormalisedCovGraph, type NormalisedCovPoint } from '../components/NormalisedCovGraph';

interface TrendScreenViewProps {
  points: NormalisedCovPoint[];
  sessions: SessionRecord[];
  referenceDate?: string;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  layeredGraphInitialElapsedSec?: number;
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

function getValidSamples(session: SessionRecord): Sample[] {
  return session.samples
    .filter((sample): sample is Sample => sample.bpm !== null)
    .sort((left, right) => left.elapsedSec - right.elapsedSec);
}

function getNearestSample(session: SessionRecord, elapsedSec: number): Sample {
  const nearest = getValidSamples(session).reduce<Sample | null>((candidate, sample) => {
    if (!candidate) {
      return sample;
    }

    return Math.abs(sample.elapsedSec - elapsedSec) < Math.abs(candidate.elapsedSec - elapsedSec)
      ? sample
      : candidate;
  }, null);

  if (!nearest) {
    throw new Error('Session must contain valid heart-rate samples');
  }

  return nearest;
}

function buildDisplaySession(
  session: SessionRecord,
  plan: WorkoutPlan = deriveBpmSessionPlan(session)
): SessionRecord {
  return {
    ...session,
    plan,
    analysis: plan === session.plan ? session.analysis : analyzeSessionRounds(plan, session.samples),
  };
}

function LayeredTrendHeartGraph({
  session,
  plan,
  analysis,
  previousSessions,
  initialElapsedSec,
}: {
  session: SessionRecord;
  plan: WorkoutPlan;
  analysis: SessionRecord['analysis'];
  previousSessions?: SessionRecord[];
  initialElapsedSec: number;
}) {
  const { x, pointerProps } = useLayeredHeartGraphPointerX({
    initialX: (Math.min(initialElapsedSec, plan.totalDurationSec) / Math.max(plan.totalDurationSec, 1)) * 100,
    movementMode: 'jump',
  });
  const displaySession: SessionRecord = {
    ...session,
    plan,
    analysis,
  };
  const previousDisplaySessions = (previousSessions ?? []).map((previousSession) => buildDisplaySession(previousSession));
  const elapsedSec = Math.round((plan.totalDurationSec * x) / 100);
  const sample = getNearestSample(displaySession, elapsedSec);

  return (
    <LayeredHeartGraph heightClassName="h-56" {...pointerProps}>
      <SessionHeartRateLine session={displaySession} />
      <IntervalHighlight interval={buildSessionIntervalAtX(displaySession, x)} totalDurationSec={plan.totalDurationSec} />
      <Crosshairs
        x={x}
        y={getSessionSampleY(displaySession, sample)}
        xLabel={formatCrosshairTimeLabel(displaySession, elapsedSec, previousDisplaySessions)}
        yLabel={`${sample.bpm} bpm`}
      />
    </LayeredHeartGraph>
  );
}

export function TrendScreenView({
  points,
  sessions,
  referenceDate,
  selectedIndex,
  onSelectedIndexChange,
  layeredGraphInitialElapsedSec = 844,
}: TrendScreenViewProps) {
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
      {activeSession && activePlan && activeAnalysis ? (
        <LayeredTrendHeartGraph
          key={activeSession.id}
          session={activeSession}
          plan={activePlan}
          analysis={activeAnalysis}
          previousSessions={previousSessions}
          initialElapsedSec={layeredGraphInitialElapsedSec}
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
