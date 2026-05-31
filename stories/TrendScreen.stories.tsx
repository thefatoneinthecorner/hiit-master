import type { Meta, StoryObj } from '@storybook/preact-vite';
import { useState } from 'preact/hooks';
import { expect, fireEvent, fn, waitFor } from 'storybook/test';

import '../app/src/styles.css';
import { analyzeSessionRounds } from '../app/src/domain/analysis/recovery';
import { buildNormalisedCovTrendPoints } from '../app/src/domain/trend/normalisedCov';
import type { SessionRecord } from '../app/src/domain/shared/types';
import type { NormalisedCovPoint } from '../app/src/ui/components/NormalisedCovGraph';
import { TrendScreenView } from '../app/src/ui/screens/TrendScreen';
import hiitMasterBpmBackup from '../hiit-master-backup (1).json';
import hiitMasterBackup from '../hiit-master-backup.json';
import trendScreenSpec from '../specs/ui/screens/TrendScreen.spec.md?raw';

type TrendScreenArgs = {
  points: NormalisedCovPoint[];
  sessions: SessionRecord[];
  referenceDate?: string;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  heartGraphScrubElapsedSec?: number;
};

const backupSessions = (hiitMasterBackup as { sessions: SessionRecord[] }).sessions.map((session) => ({
  ...session,
  analysis: analyzeSessionRounds(session.plan, session.samples),
}));
const points = buildNormalisedCovTrendPoints(backupSessions);
const latestValidPointIndex = points.filter((point) => point.value !== null && point.value > 0).length - 1;
const bpmBackupSessions = (hiitMasterBpmBackup as { sessions: SessionRecord[] }).sessions.map((session) => ({
  ...session,
  analysis: analyzeSessionRounds(session.plan, session.samples),
}));
const bpmPoints = buildNormalisedCovTrendPoints(bpmBackupSessions);
const latestBpmValidPointIndex = bpmPoints.filter((point) => point.value !== null && point.value > 0).length - 1;

function clientXForTrendDate(graph: HTMLElement, date: string): number {
  const bounds = graph.getBoundingClientRect();
  const validPoints = points.filter((point) => point.value !== null && point.value > 0);
  const firstTime = new Date(validPoints[0]?.date ?? date).getTime();
  const lastTime = new Date(validPoints[validPoints.length - 1]?.date ?? date).getTime();
  const targetTime = new Date(date).getTime();
  const ratio = (targetTime - firstTime) / Math.max(lastTime - firstTime, 1);

  return bounds.left + bounds.width * ratio;
}

const meta = {
  title: 'Pages/TrendScreen',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: trendScreenSpec,
      },
    },
  },
  render: (args) => (
    <TrendScreenStoryView {...args} />
  ),
  args: {
    points,
    sessions: backupSessions,
    referenceDate: '2026-05-27T12:00:00.000Z',
    selectedIndex: latestValidPointIndex,
    onSelectedIndexChange: fn(),
  },
} satisfies Meta<TrendScreenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

function TrendScreenStoryView(args: TrendScreenArgs) {
  const [selectedIndex, setSelectedIndex] = useState(args.selectedIndex);

  return (
    <div class="min-h-screen bg-[color:var(--canvas)] p-4">
      <TrendScreenView
        {...args}
        selectedIndex={selectedIndex}
        onSelectedIndexChange={(index) => {
          setSelectedIndex(index);
          args.onSelectedIndexChange(index);
        }}
      />
    </div>
  );
}

export const Default: Story = {
  play: async ({ args, canvas, canvasElement }) => {
    await expect(canvas.queryByRole('heading', { name: 'Trends' })).not.toBeInTheDocument();
    await expect(canvas.getByRole('heading', { name: 'Full Timer 2 2, 30s work' })).toBeVisible();
    await expect(canvas.getByTestId('trend-selected-point-title')).toHaveClass(/tracking-\[0\.12em\]/);
    await expect(canvasElement.querySelectorAll('[data-testid="trend-selected-point-title-smallcaps"]').length).toBeGreaterThan(1);
    await expect(canvas.getByRole('heading', { name: 'Normalised CoV' })).toBeVisible();
    await expect(canvas.getByTestId('heart-graph-crosshair-time')).toHaveTextContent('14:04 R7 W Δ12 ↓5');
    await expect(canvas.getByTestId('layered-heart-graph-crosshair-x-label')).toHaveTextContent('11:48 R5 W Δ20 ↓2');

    const graphSurfaces = canvasElement.querySelectorAll('.graph-surface');
    const normalisedGraph = canvas.getByTestId('normalised-cov-graph-surface');
    const selectedPointTitle = canvas.getByTestId('trend-selected-point-title');
    const layeredHeartGraph = canvas.getByTestId('layered-heart-graph');
    const heartGraph = graphSurfaces[graphSurfaces.length - 2] as HTMLDivElement | undefined;
    await expect(heartGraph).toBeInTheDocument();
    await expect(layeredHeartGraph).toBeInTheDocument();
    await expect(normalisedGraph.compareDocumentPosition(selectedPointTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expect(selectedPointTitle.compareDocumentPosition(heartGraph) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await expect(heartGraph?.compareDocumentPosition(layeredHeartGraph) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    if (heartGraph) {
      const bounds = heartGraph.getBoundingClientRect();
      fireEvent.pointerDown(heartGraph, { pointerId: 2, clientX: bounds.left + bounds.width * 0.5, buttons: 1 });
      await waitFor(() => expect(canvas.getByTestId('heart-graph-crosshair-time')).toHaveTextContent('11:48 R5 W Δ20 ↓2'));
      fireEvent.pointerUp(heartGraph, { pointerId: 2, clientX: bounds.left + bounds.width * 0.5, buttons: 0 });

      fireEvent.pointerDown(heartGraph, { pointerId: 3, clientX: bounds.left + bounds.width * 0.92, buttons: 1 });
      await waitFor(() => expect(canvas.getByTestId('heart-graph-crosshair-time')).toHaveTextContent('21:42 Cooldown Δ30 ↓3'));
      fireEvent.pointerUp(heartGraph, { pointerId: 3, clientX: bounds.left + bounds.width * 0.92, buttons: 0 });
    }

    const scrubber = canvas.getByTestId('normalised-cov-graph-surface');
    fireEvent.pointerMove(scrubber, { pointerId: 1, clientX: clientXForTrendDate(scrubber, '2026-05-23T10:36:38.890Z') });
    await expect(args.onSelectedIndexChange).not.toHaveBeenCalled();
    fireEvent.pointerDown(scrubber, { pointerId: 1, clientX: clientXForTrendDate(scrubber, '2026-05-24T11:43:17.177Z') });
    fireEvent.pointerMove(scrubber, { pointerId: 1, clientX: clientXForTrendDate(scrubber, '2026-05-23T10:36:38.890Z') });

    await expect(args.onSelectedIndexChange).toHaveBeenCalled();
    await waitFor(() => expect(canvas.getByRole('heading', { name: 'Full Timer 2, 28s work' })).toBeVisible());
    await waitFor(() => expect(canvas.getByTestId('heart-graph-crosshair-time')).toHaveTextContent('14:04 R7 R Δ9 ↓3'));

    const scrubberBounds = scrubber.getBoundingClientRect();
    fireEvent.pointerMove(scrubber, { pointerId: 1, clientX: scrubberBounds.right + scrubberBounds.width });
    await waitFor(() => expect(canvas.getByRole('heading', { name: 'Full Timer 2 2, 30s work' })).toBeVisible());
    await waitFor(() => expect(canvas.getByTestId('heart-graph-crosshair-time')).toHaveTextContent('14:04 R7 W Δ12 ↓5'));
    fireEvent.pointerUp(scrubber, { pointerId: 1, clientX: scrubberBounds.right + scrubberBounds.width });
    fireEvent.pointerMove(scrubber, { pointerId: 1, clientX: clientXForTrendDate(scrubber, '2026-05-23T10:36:38.890Z') });
    await expect(canvas.getByTestId('heart-graph-crosshair-time')).toHaveTextContent('14:04 R7 W Δ12 ↓5');
  },
};

export const BpmSessionUsesActualPhaseTimeline: Story = {
  args: {
    points: bpmPoints,
    sessions: bpmBackupSessions,
    referenceDate: '2026-05-29T12:00:00.000Z',
    selectedIndex: latestBpmValidPointIndex,
    heartGraphScrubElapsedSec: 583,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Full Timer 2 2, 30s work' })).toBeVisible();
    await expect(canvas.getByTestId('heart-graph-crosshair-time')).toHaveTextContent('9:43 R4 W');
    await expect(canvas.getByTestId('heart-graph-crosshair-time')).not.toHaveTextContent('9:43 R3 R');

    const layeredGraph = canvas.getByTestId('layered-heart-graph');
    const bounds = layeredGraph.getBoundingClientRect();
    fireEvent.pointerDown(layeredGraph, { pointerId: 4, clientX: bounds.left + bounds.width * (583 / 1389), buttons: 1 });
    await waitFor(() => expect(canvas.getByTestId('layered-heart-graph-crosshair-x-label')).toHaveTextContent('9:43 R4 W'));

    const highlight = canvas.getByTestId('layered-heart-graph-interval-highlight');
    const maxLine = canvas.getByTestId('layered-heart-graph-interval-max-line');
    const highlightEndX = Number(highlight.getAttribute('x')) + Number(highlight.getAttribute('width'));
    const maxX = Number(maxLine.getAttribute('x1'));
    await expect(maxX).toBeGreaterThan(highlightEndX);
    fireEvent.pointerUp(layeredGraph, { pointerId: 4, clientX: bounds.left + bounds.width * (583 / 1389), buttons: 0 });
  },
};
