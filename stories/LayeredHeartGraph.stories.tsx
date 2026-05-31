import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fireEvent, waitFor } from 'storybook/test';

import '../app/src/styles.css';
import type { HeartRateSample, Interval, RoundAnalysis, Sample, SessionRecord, WorkoutPhaseSegment } from '../app/src/domain/shared/types';
import {
  Crosshairs,
  IntervalHighlight,
  LayeredHeartGraph,
  SessionHeartRateLine,
  getSessionSampleY,
  type LayeredHeartGraphPointerMovementMode,
  useLayeredHeartGraphPointerX
} from '../app/src/ui/components/LayeredHeartGraph';
import hiitMasterBackup from '../hiit-master-backup (1).json';
import layeredHeartGraphSpec from '../specs/ui/components/LayeredHeartGraph.spec.md?raw';

type LayeredHeartGraphArgs = {
  session: SessionRecord;
};

const latestCompletedSession = [...(hiitMasterBackup as { sessions: SessionRecord[] }).sessions]
  .filter((session) => session.status === 'completed')
  .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0] as SessionRecord;

function getNearestSample(session: SessionRecord, elapsedSec: number): Sample {
  const validSamples = session.samples
    .filter((sample): sample is Sample => sample.bpm !== null)
    .sort((left, right) => left.elapsedSec - right.elapsedSec);
  const nearest = validSamples.reduce<Sample | null>((candidate, sample) => {
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

function formatElapsedTime(elapsedSec: number): string {
  return `${Math.floor(elapsedSec / 60)}:${String(Math.floor(elapsedSec % 60)).padStart(2, '0')}`;
}

function formatPhaseLabel(phase: WorkoutPhaseSegment | undefined): string {
  if (!phase) {
    return '';
  }

  if (phase.kind === 'warmup') {
    return 'Warmup';
  }

  if (phase.kind === 'cooldown') {
    return 'Cooldown';
  }

  if (phase.kind === 'work' && phase.roundIndex !== null) {
    return `R${phase.roundIndex} W`;
  }

  if (phase.kind === 'rest' && phase.roundIndex !== null) {
    return `R${phase.roundIndex} R`;
  }

  return '';
}

function findPhase(
  phases: WorkoutPhaseSegment[],
  kind: WorkoutPhaseSegment['kind'],
  roundIndex: number
): WorkoutPhaseSegment | undefined {
  return phases.find((phase) => phase.kind === kind && phase.roundIndex === roundIndex);
}

function getBpmRange(samples: HeartRateSample[], startSec: number, endSec: number) {
  const matchingSamples = samples
    .filter((sample) => sample.bpm !== null && sample.elapsedSec >= startSec && sample.elapsedSec <= endSec)
    .map((sample) => ({ elapsedSec: sample.elapsedSec, bpm: sample.bpm as number }));

  if (matchingSamples.length === 0) {
    return null;
  }

  const firstSample = matchingSamples[0] as Sample;

  return matchingSamples.reduce(
    (range, sample) => ({
      min: sample.bpm < range.min ? sample.bpm : range.min,
      max: sample.bpm > range.max ? sample.bpm : range.max,
      minElapsedSec: sample.bpm < range.min ? sample.elapsedSec : range.minElapsedSec,
      maxElapsedSec: sample.bpm > range.max ? sample.elapsedSec : range.maxElapsedSec,
    }),
    {
      min: firstSample.bpm,
      max: firstSample.bpm,
      minElapsedSec: firstSample.elapsedSec,
      maxElapsedSec: firstSample.elapsedSec,
    }
  );
}

function getPhaseDelta(
  phase: WorkoutPhaseSegment | undefined,
  samples: HeartRateSample[],
  phases: WorkoutPhaseSegment[],
  analysis: RoundAnalysis[]
): number | null {
  if (!phase || phase.roundIndex === null) {
    return null;
  }

  const workPhase = findPhase(phases, 'work', phase.roundIndex);
  const restPhase = findPhase(phases, 'rest', phase.roundIndex) ?? findPhase(phases, 'cooldown', phase.roundIndex);

  if (!workPhase || !restPhase) {
    return analysis.find((round) => round.roundIndex === phase.roundIndex)?.delta ?? null;
  }

  const laggedPeakRange = getBpmRange(samples, workPhase.startSec, restPhase.endSec);
  if (!laggedPeakRange) {
    return analysis.find((round) => round.roundIndex === phase.roundIndex)?.delta ?? null;
  }

  if (phase.kind === 'work') {
    const workRange = getBpmRange(samples, workPhase.startSec, workPhase.endSec);

    return workRange ? laggedPeakRange.max - workRange.min : analysis.find((round) => round.roundIndex === phase.roundIndex)?.delta ?? null;
  }

  if (phase.kind === 'rest' || phase.kind === 'cooldown') {
    const nextWorkPhase = findPhase(phases, 'work', phase.roundIndex + 1);
    const recoveryRange = getBpmRange(samples, restPhase.startSec, nextWorkPhase?.endSec ?? restPhase.endSec);

    return recoveryRange ? laggedPeakRange.max - recoveryRange.min : analysis.find((round) => round.roundIndex === phase.roundIndex)?.delta ?? null;
  }

  return null;
}

function getPreviousCompletedSameProfileSession(session: SessionRecord): SessionRecord | null {
  return [...(hiitMasterBackup as { sessions: SessionRecord[] }).sessions]
    .filter((candidate) =>
      candidate.status === 'completed' &&
      candidate.profileId === session.profileId &&
      candidate.startedAt < session.startedAt
    )
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0] ?? null;
}

function formatCrosshairTimeLabel(session: SessionRecord, elapsedSec: number): string {
  const phase = session.plan.phases.find((item) => elapsedSec >= item.startSec && elapsedSec < item.endSec) ?? session.plan.phases.at(-1);
  const phaseLabel = formatPhaseLabel(phase);

  if (!phaseLabel) {
    return formatElapsedTime(elapsedSec);
  }

  const delta = getPhaseDelta(phase, session.samples, session.plan.phases, session.analysis);
  if (delta === null) {
    return `${formatElapsedTime(elapsedSec)} ${phaseLabel}`;
  }

  const previousSession = getPreviousCompletedSameProfileSession(session);
  const previousPhase =
    previousSession && phase?.roundIndex !== null && phase?.roundIndex !== undefined
      ? previousSession.plan.phases.find((candidate) => candidate.kind === phase.kind && candidate.roundIndex === phase.roundIndex)
      : undefined;
  const previousDelta = previousSession
    ? getPhaseDelta(previousPhase, previousSession.samples, previousSession.plan.phases, previousSession.analysis)
    : null;

  if (previousDelta === null) {
    return `${formatElapsedTime(elapsedSec)} ${phaseLabel} Δ${delta}`;
  }

  const deltaDiff = delta - previousDelta;
  const deltaDiffLabel = deltaDiff > 0 ? ` ↑${deltaDiff}` : deltaDiff < 0 ? ` ↓${Math.abs(deltaDiff)}` : ' 0';

  return `${formatElapsedTime(elapsedSec)} ${phaseLabel} Δ${delta}${deltaDiffLabel}`;
}

function getValidSamples(session: SessionRecord): Sample[] {
  return session.samples
    .filter((sample): sample is Sample => sample.bpm !== null)
    .sort((left, right) => left.elapsedSec - right.elapsedSec);
}

function buildStoryInterval(session: SessionRecord): Interval {
  const phase =
    session.plan.phases.find((item) => item.kind === 'rest' && item.roundIndex === 9) ??
    session.plan.phases.find((item) => item.kind === 'rest' && item.roundIndex !== null);

  if (!phase || (phase.kind !== 'work' && phase.kind !== 'rest' && phase.kind !== 'warmup' && phase.kind !== 'cooldown')) {
    throw new Error('Session must contain a highlightable phase');
  }

  const samples = session.samples
    .filter((sample): sample is Sample => sample.bpm !== null && sample.elapsedSec >= phase.startSec && sample.elapsedSec <= phase.endSec)
    .sort((left, right) => left.elapsedSec - right.elapsedSec);
  const max = samples.reduce<Sample>((candidate, sample) => sample.bpm > candidate.bpm ? sample : candidate, samples[0] ?? getNearestSample(session, phase.startSec));
  const min = samples.reduce<Sample>((candidate, sample) => sample.bpm < candidate.bpm ? sample : candidate, samples[0] ?? getNearestSample(session, phase.startSec));

  return {
    kind: phase.kind,
    start: getNearestSample(session, phase.startSec),
    end: getNearestSample(session, phase.endSec),
    max,
    min,
  };
}

function getSessionIntervalAtX(session: SessionRecord, x: number): Interval {
  const elapsedSec = Math.round((session.plan.totalDurationSec * x) / 100);
  const phase =
    session.plan.phases.find((item) => elapsedSec >= item.startSec && elapsedSec < item.endSec) ??
    session.plan.phases.at(-1);

  if (!phase || phase.kind === 'countdown') {
    throw new Error('Session must contain a highlightable interval');
  }

  const samples = getValidSamples(session).filter(
    (sample) => sample.elapsedSec >= phase.startSec && sample.elapsedSec <= phase.endSec
  );
  const fallback = getNearestSample(session, phase.startSec);
  const max = samples.reduce<Sample>(
    (candidate, sample) => sample.bpm > candidate.bpm ? sample : candidate,
    samples[0] ?? fallback
  );
  const min = samples.reduce<Sample>(
    (candidate, sample) => sample.bpm < candidate.bpm ? sample : candidate,
    samples[0] ?? fallback
  );

  return {
    kind: phase.kind,
    start: getNearestSample(session, phase.startSec),
    end: getNearestSample(session, phase.endSec),
    max,
    min,
  };
}

function SessionCrosshairs({ session, x }: { session: SessionRecord; x: number }) {
  const elapsedSec = Math.round((session.plan.totalDurationSec * x) / 100);
  const sample = getNearestSample(session, elapsedSec);
  const y = getSessionSampleY(session, sample);

  return (
    <Crosshairs
      x={x}
      y={y}
      xLabel={formatCrosshairTimeLabel(session, elapsedSec)}
      yLabel={`${sample.bpm} bpm`}
    />
  );
}

function DefaultCrosshairs({ session }: { session: SessionRecord }) {
  return <SessionCrosshairs session={session} x={50} />;
}

function SessionIntervalHighlight({ session, x }: { session: SessionRecord; x: number }) {
  return (
    <IntervalHighlight
      interval={getSessionIntervalAtX(session, x)}
      totalDurationSec={session.plan.totalDurationSec}
    />
  );
}

function InteractiveSessionHeartGraph({
  session,
  movementMode,
  showIntervalHighlight = false,
}: {
  session: SessionRecord;
  movementMode: LayeredHeartGraphPointerMovementMode;
  showIntervalHighlight?: boolean;
}) {
  const { x, pointerProps } = useLayeredHeartGraphPointerX({
    initialX: 50,
    movementMode,
  });

  return (
    <LayeredHeartGraph heightClassName="h-72" {...pointerProps}>
      <SessionHeartRateLine session={session} />
      {showIntervalHighlight ? <SessionIntervalHighlight session={session} x={x} /> : null}
      <SessionCrosshairs session={session} x={x} />
    </LayeredHeartGraph>
  );
}

const meta = {
  title: 'Components/LayeredHeartGraph',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: layeredHeartGraphSpec,
      },
    },
  },
  render: (args) => (
    <div class="min-h-screen bg-[color:var(--canvas)] p-6">
      <LayeredHeartGraph heightClassName="h-72">
        <SessionHeartRateLine session={args.session} />
      </LayeredHeartGraph>
    </div>
  ),
  args: {
    session: latestCompletedSession,
  },
} satisfies Meta<LayeredHeartGraphArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LatestCompletedSession: Story = {
  play: async ({ canvas }) => {
    const svgLayer = canvas.getByTestId('layered-heart-graph-svg-layer');
    const overlayLayer = canvas.getByTestId('layered-heart-graph-overlay-layer');

    await expect(svgLayer).toBeVisible();
    await expect(overlayLayer).toBeInTheDocument();
    await waitFor(() => expect(canvas.getByTestId('layered-heart-graph-heart-rate-line')).toBeInTheDocument());

    const line = canvas.getByTestId('layered-heart-graph-heart-rate-line');
    await expect(svgLayer.contains(line)).toBe(true);
    await expect(line).toHaveAttribute('stroke', 'var(--accent)');
    await expect(line.getAttribute('points')?.split(' ').length).toBeGreaterThan(1000);
  },
};

export const WithDefaultCrosshairs: Story = {
  render: (args) => (
    <div class="min-h-screen bg-[color:var(--canvas)] p-6">
      <LayeredHeartGraph heightClassName="h-72">
        <SessionHeartRateLine session={args.session} />
        <DefaultCrosshairs session={args.session} />
      </LayeredHeartGraph>
    </div>
  ),
  play: async ({ canvas }) => {
    const svgLayer = canvas.getByTestId('layered-heart-graph-svg-layer');
    const overlayLayer = canvas.getByTestId('layered-heart-graph-overlay-layer');

    await waitFor(() => expect(canvas.getByTestId('layered-heart-graph-crosshair-vertical')).toBeInTheDocument());
    await expect(svgLayer.contains(canvas.getByTestId('layered-heart-graph-crosshair-vertical'))).toBe(true);
    await expect(svgLayer.contains(canvas.getByTestId('layered-heart-graph-crosshair-horizontal'))).toBe(true);
    await expect(overlayLayer.contains(canvas.getByTestId('layered-heart-graph-crosshair-x-label'))).toBe(true);
    await expect(overlayLayer.contains(canvas.getByTestId('layered-heart-graph-crosshair-y-label'))).toBe(true);
    await expect(canvas.getByTestId('layered-heart-graph-crosshair-vertical')).toHaveAttribute('x1', '50');
    await expect(canvas.getByTestId('layered-heart-graph-crosshair-x-label')).toHaveTextContent('11:48 R5 W Δ14 ↓6');
    await expect(canvas.getByTestId('layered-heart-graph-crosshair-y-label')).toHaveTextContent(/bpm/);
  },
};

export const WithIntervalHighlight: Story = {
  render: (args) => (
    <div class="min-h-screen bg-[color:var(--canvas)] p-6">
      <LayeredHeartGraph heightClassName="h-72">
        <SessionHeartRateLine session={args.session} />
        <IntervalHighlight interval={buildStoryInterval(args.session)} totalDurationSec={args.session.plan.totalDurationSec} />
      </LayeredHeartGraph>
    </div>
  ),
  play: async ({ canvas }) => {
    const svgLayer = canvas.getByTestId('layered-heart-graph-svg-layer');

    await waitFor(() => expect(canvas.getByTestId('layered-heart-graph-interval-highlight')).toBeInTheDocument());
    await expect(svgLayer.contains(canvas.getByTestId('layered-heart-graph-interval-highlight'))).toBe(true);
    await expect(svgLayer.contains(canvas.getByTestId('layered-heart-graph-interval-max-line'))).toBe(true);
    await expect(svgLayer.contains(canvas.getByTestId('layered-heart-graph-interval-min-line'))).toBe(true);
    await expect(canvas.getByTestId('layered-heart-graph-interval-highlight')).toHaveAttribute('fill', 'var(--accent)');
    await expect(canvas.getByTestId('layered-heart-graph-interval-max-line')).toHaveAttribute('stroke-dasharray', '2 2');
    await expect(canvas.getByTestId('layered-heart-graph-interval-min-line')).toHaveAttribute('stroke-dasharray', '2 2');
  },
};

export const WithHighlightAndCrosshairs: Story = {
  render: (args) => (
    <div class="min-h-screen bg-[color:var(--canvas)] p-6">
      <InteractiveSessionHeartGraph session={args.session} movementMode="jump" showIntervalHighlight />
    </div>
  ),
  play: async ({ canvas }) => {
    const svgLayer = canvas.getByTestId('layered-heart-graph-svg-layer');
    const overlayLayer = canvas.getByTestId('layered-heart-graph-overlay-layer');
    const graph = canvas.getByTestId('layered-heart-graph');
    const vertical = canvas.getByTestId('layered-heart-graph-crosshair-vertical');
    const highlight = canvas.getByTestId('layered-heart-graph-interval-highlight');
    const bounds = graph.getBoundingClientRect();
    const initialHighlightX = highlight.getAttribute('x');

    await waitFor(() => expect(canvas.getByTestId('layered-heart-graph-interval-highlight')).toBeInTheDocument());
    await waitFor(() => expect(canvas.getByTestId('layered-heart-graph-crosshair-vertical')).toBeInTheDocument());
    await expect(svgLayer.contains(canvas.getByTestId('layered-heart-graph-interval-highlight'))).toBe(true);
    await expect(svgLayer.contains(canvas.getByTestId('layered-heart-graph-crosshair-vertical'))).toBe(true);
    await expect(svgLayer.contains(canvas.getByTestId('layered-heart-graph-crosshair-horizontal'))).toBe(true);
    await expect(overlayLayer.contains(canvas.getByTestId('layered-heart-graph-crosshair-x-label'))).toBe(true);
    await expect(overlayLayer.contains(canvas.getByTestId('layered-heart-graph-crosshair-y-label'))).toBe(true);

    fireEvent.pointerMove(graph, { pointerId: 14, pointerType: 'mouse', clientX: bounds.left + bounds.width * 0.8, buttons: 0 });
    await expect(vertical).toHaveAttribute('x1', '50');
    await expect(highlight).toHaveAttribute('x', initialHighlightX ?? '');

    fireEvent.pointerDown(graph, { pointerId: 14, pointerType: 'mouse', clientX: bounds.left + bounds.width * 0.25, buttons: 1 });
    await waitFor(() => expect(Number(vertical.getAttribute('x1'))).toBeGreaterThan(24));
    await expect(Number(vertical.getAttribute('x1'))).toBeLessThan(26);
    await waitFor(() => expect(highlight.getAttribute('x')).not.toBe(initialHighlightX));

    fireEvent.pointerMove(graph, { pointerId: 14, pointerType: 'mouse', clientX: bounds.right + bounds.width, buttons: 1 });
    await waitFor(() => expect(vertical).toHaveAttribute('x1', '100'));
    fireEvent.pointerUp(graph, { pointerId: 14, pointerType: 'mouse', clientX: bounds.right + bounds.width, buttons: 0 });
  },
};

export const JumpPointerMovement: Story = {
  render: (args) => (
    <div class="min-h-screen bg-[color:var(--canvas)] p-6">
      <InteractiveSessionHeartGraph session={args.session} movementMode="jump" showIntervalHighlight />
    </div>
  ),
  play: async ({ canvas }) => {
    const graph = canvas.getByTestId('layered-heart-graph');
    const vertical = canvas.getByTestId('layered-heart-graph-crosshair-vertical');
    const highlight = canvas.getByTestId('layered-heart-graph-interval-highlight');
    const bounds = graph.getBoundingClientRect();
    const initialHighlightX = highlight.getAttribute('x');

    fireEvent.pointerMove(graph, { pointerId: 12, pointerType: 'mouse', clientX: bounds.left + bounds.width * 0.8, buttons: 0 });
    await expect(vertical).toHaveAttribute('x1', '50');
    await expect(highlight).toHaveAttribute('x', initialHighlightX ?? '');

    fireEvent.pointerDown(graph, { pointerId: 12, pointerType: 'mouse', clientX: bounds.left + bounds.width * 0.25, buttons: 1 });
    await waitFor(() => expect(Number(vertical.getAttribute('x1'))).toBeGreaterThan(24));
    await expect(Number(vertical.getAttribute('x1'))).toBeLessThan(26);
    await waitFor(() => expect(highlight.getAttribute('x')).not.toBe(initialHighlightX));

    fireEvent.pointerMove(graph, { pointerId: 12, pointerType: 'mouse', clientX: bounds.right + bounds.width, buttons: 1 });
    await waitFor(() => expect(vertical).toHaveAttribute('x1', '100'));
    fireEvent.pointerUp(graph, { pointerId: 12, pointerType: 'mouse', clientX: bounds.right + bounds.width, buttons: 0 });
  },
};

export const RelativePointerMovement: Story = {
  render: (args) => (
    <div class="min-h-screen bg-[color:var(--canvas)] p-6">
      <InteractiveSessionHeartGraph session={args.session} movementMode="relative" />
    </div>
  ),
  play: async ({ canvas }) => {
    const graph = canvas.getByTestId('layered-heart-graph');
    const vertical = canvas.getByTestId('layered-heart-graph-crosshair-vertical');
    const bounds = graph.getBoundingClientRect();

    fireEvent.pointerDown(graph, { pointerId: 13, pointerType: 'mouse', clientX: bounds.left + bounds.width * 0.25, buttons: 1 });
    await expect(vertical).toHaveAttribute('x1', '50');

    fireEvent.pointerMove(graph, { pointerId: 13, pointerType: 'mouse', clientX: bounds.left + bounds.width * 0.45, buttons: 1 });
    await waitFor(() => expect(Number(vertical.getAttribute('x1'))).toBeGreaterThan(69));
    await expect(Number(vertical.getAttribute('x1'))).toBeLessThan(71);

    fireEvent.pointerMove(graph, { pointerId: 13, pointerType: 'mouse', clientX: bounds.left - bounds.width, buttons: 1 });
    await waitFor(() => expect(vertical).toHaveAttribute('x1', '0'));
    fireEvent.pointerUp(graph, { pointerId: 13, pointerType: 'mouse', clientX: bounds.left - bounds.width, buttons: 0 });
  },
};
