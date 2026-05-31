import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fireEvent, waitFor } from 'storybook/test';

import '../app/src/styles.css';
import type { Interval, Sample, SessionRecord } from '../app/src/domain/shared/types';
import {
  Crosshairs,
  IntervalHighlight,
  LayeredHeartGraph,
  SessionHeartRateLine,
  buildSessionIntervalAtX,
  formatCrosshairTimeLabel,
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

function getPreviousCompletedSameProfileSession(session: SessionRecord): SessionRecord | null {
  return [...(hiitMasterBackup as { sessions: SessionRecord[] }).sessions]
    .filter((candidate) =>
      candidate.status === 'completed' &&
      candidate.profileId === session.profileId &&
      candidate.startedAt < session.startedAt
    )
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0] ?? null;
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

function SessionCrosshairs({ session, x }: { session: SessionRecord; x: number }) {
  const elapsedSec = Math.round((session.plan.totalDurationSec * x) / 100);
  const sample = getNearestSample(session, elapsedSec);
  const y = getSessionSampleY(session, sample);

  return (
    <Crosshairs
      x={x}
      y={y}
      xLabel={formatCrosshairTimeLabel(session, elapsedSec, getPreviousCompletedSameProfileSession(session))}
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
      interval={buildSessionIntervalAtX(session, x)}
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
