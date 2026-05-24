import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fn, userEvent } from 'storybook/test';

import '../app/src/styles.css';
import type { HeartRateSample } from '../app/src/domain/shared/types';
import { HeartGraph } from '../app/src/ui/components/HeartGraph';
import heartGraphSpec from '../specs/ui/components/HeartGraph.spec.md?raw';

type HeartGraphArgs = {
  samples: HeartRateSample[];
  totalDurationSec: number;
  nominalPeakHeartrate: number;
  labelledAxes?: boolean;
  scrubElapsedSec?: number | null;
  heightClassName?: string;
  lineThickness?: number;
  fillWidth?: boolean;
  timeScale?: 'samples' | 'duration';
  clickLabel?: string;
  onClick?: () => void;
};

const sessionSamples: HeartRateSample[] = [
  { elapsedSec: 0, bpm: null },
  { elapsedSec: 20, bpm: 94 },
  { elapsedSec: 55, bpm: 118 },
  { elapsedSec: 90, bpm: 151 },
  { elapsedSec: 125, bpm: 164 },
  { elapsedSec: 160, bpm: null },
  { elapsedSec: 195, bpm: 132 },
  { elapsedSec: 230, bpm: 172 },
  { elapsedSec: 270, bpm: 138 },
  { elapsedSec: 320, bpm: 156 },
  { elapsedSec: 360, bpm: 112 },
];

const completedSessionSamples: HeartRateSample[] = [
  { elapsedSec: 0, bpm: 82 },
  { elapsedSec: 45, bpm: 108 },
  { elapsedSec: 90, bpm: 148 },
  { elapsedSec: 135, bpm: 169 },
  { elapsedSec: 180, bpm: 128 },
  { elapsedSec: 225, bpm: 162 },
  { elapsedSec: 270, bpm: 121 },
  { elapsedSec: 315, bpm: 154 },
  { elapsedSec: 360, bpm: 103 },
];

const meta = {
  title: 'Components/HeartGraph',
  component: HeartGraph,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: heartGraphSpec,
      },
    },
  },
  render: (args) => (
    <div class="w-full p-6">
      <HeartGraph {...args} />
    </div>
  ),
  args: {
    samples: sessionSamples,
    totalDurationSec: 360,
    nominalPeakHeartrate: 170,
    labelledAxes: false,
    scrubElapsedSec: null,
    heightClassName: 'h-44',
    lineThickness: 1.8,
    fillWidth: true,
    timeScale: 'samples',
  },
  argTypes: {
    labelledAxes: { control: 'boolean' },
    scrubElapsedSec: { control: 'number' },
    totalDurationSec: { control: 'number' },
    nominalPeakHeartrate: { control: 'number' },
    heightClassName: { control: 'text' },
    lineThickness: { control: { type: 'number', min: 0.5, max: 6, step: 0.1 } },
    fillWidth: { control: 'boolean' },
    timeScale: { control: 'radio', options: ['samples', 'duration'] },
    clickLabel: { control: 'text' },
    onClick: { table: { disable: true } },
  },
} satisfies Meta<HeartGraphArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const LiveSession: Story = {
  play: async ({ canvasElement }) => {
    const polyline = canvasElement.querySelector('polyline');
    const scrubMarker = canvasElement.querySelector('line[stroke="var(--danger)"]');

    await expect(polyline).toBeInTheDocument();
    await expect(polyline).toHaveAttribute('stroke', 'var(--accent)');
    await expect(polyline).toHaveAttribute('stroke-width', '1.8');
    await expect(polyline).toHaveAttribute('vector-effect', 'non-scaling-stroke');
    await expect(polyline).toHaveAttribute('stroke-linejoin', 'round');
    await expect(canvasElement.querySelector('svg')).toHaveAttribute('preserveAspectRatio', 'none');
    await expect(polyline?.getAttribute('points')).toMatch(/^0,/);
    await expect(polyline?.getAttribute('points')).toMatch(/100,/);
    await expect(scrubMarker).not.toBeInTheDocument();
  },
};

export const ThickLine: Story = {
  args: {
    lineThickness: 3.2,
  },
  play: async ({ canvasElement }) => {
    const surface = canvasElement.querySelector('.graph-surface');
    const svg = canvasElement.querySelector('svg');
    const polyline = canvasElement.querySelector('polyline');

    await expect(surface).toHaveClass(/w-full/);
    await expect(surface).not.toHaveClass(/p-3/);
    await expect(svg).toHaveClass(/w-full/);
    await expect(polyline).toHaveAttribute('stroke-width', '3.2');
    await expect(polyline).toHaveAttribute('vector-effect', 'non-scaling-stroke');
  },
};

export const FullWidthParent: Story = {
  render: (args) => (
    <div class="w-full p-6">
      <div data-testid="heart-graph-parent" class="w-full outline outline-1 outline-dashed outline-[color:var(--line)]">
        <HeartGraph {...args} />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const parent = canvasElement.querySelector('[data-testid="heart-graph-parent"]');
    const surface = canvasElement.querySelector('.graph-surface');
    const svg = canvasElement.querySelector('svg');

    await expect(parent).toBeInTheDocument();
    await expect(surface).toBeInTheDocument();
    await expect(svg).toBeInTheDocument();

    const parentWidth = parent?.getBoundingClientRect().width ?? 0;
    const surfaceWidth = surface?.getBoundingClientRect().width ?? 0;
    const svgWidth = svg?.getBoundingClientRect().width ?? 0;
    const polyline = canvasElement.querySelector('polyline');
    const polylineWidth = polyline?.getBoundingClientRect().width ?? 0;
    const points = polyline?.getAttribute('points') ?? '';

    await expect(Math.abs(parentWidth - surfaceWidth)).toBeLessThanOrEqual(1);
    await expect(svgWidth).toBeGreaterThan(parentWidth * 0.9);
    await expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
    await expect(polylineWidth).toBeGreaterThan(svgWidth * 0.9);
    await expect(points).toMatch(/^0,/);
    await expect(points).toMatch(/100,/);
  },
};

export const HistoryWithScrub: Story = {
  args: {
    samples: completedSessionSamples,
    labelledAxes: true,
    scrubElapsedSec: 225,
  },
  play: async ({ canvas, canvasElement }) => {
    const scrubMarker = canvasElement.querySelector('line[stroke="var(--danger)"]');

    await expect(canvas.getByText('170')).toBeVisible();
    await expect(canvas.getByText('50')).toBeVisible();
    await expect(canvas.getByText('Time')).toBeVisible();
    await expect(canvasElement.querySelector('svg')).toHaveAttribute('preserveAspectRatio', 'none');
    await expect(canvasElement.querySelector('svg text')).not.toBeInTheDocument();
    await expect(scrubMarker).toBeInTheDocument();
  },
};

export const Scrubber: Story = {
  args: {
    samples: completedSessionSamples,
    totalDurationSec: 360,
    scrubElapsedSec: 180,
  },
  play: async ({ canvasElement }) => {
    const scrubMarker = canvasElement.querySelector('[data-testid="heart-graph-scrubber"]');

    await expect(scrubMarker).toBeInTheDocument();
    await expect(scrubMarker).toHaveAttribute('x1', '50');
    await expect(scrubMarker).toHaveAttribute('x2', '50');
  },
};

export const DurationScaleLiveReplay: Story = {
  args: {
    samples: [
      { elapsedSec: 0, bpm: 55 },
      { elapsedSec: 1, bpm: 54 },
      { elapsedSec: 2, bpm: 54 },
      { elapsedSec: 3, bpm: 54 },
      { elapsedSec: 4, bpm: 53 },
      { elapsedSec: 5, bpm: 53 },
    ],
    totalDurationSec: 60,
    nominalPeakHeartrate: 170,
    timeScale: 'duration',
    scrubElapsedSec: null,
  },
  play: async ({ canvasElement }) => {
    const polyline = canvasElement.querySelector('polyline');
    const points = polyline?.getAttribute('points') ?? '';
    const lastPoint = points.trim().split(' ').at(-1) ?? '';
    const lastX = Number(lastPoint.split(',')[0]);

    await expect(polyline).toBeInTheDocument();
    await expect(points).toMatch(/^0,/);
    await expect(lastX).toBeGreaterThan(8);
    await expect(lastX).toBeLessThan(9);
    await expect(points).not.toMatch(/100,/);
    await expect(canvasElement.querySelector('line[stroke="var(--danger)"]')).not.toBeInTheDocument();
  },
};

export const PreservedAspectRatio: Story = {
  args: {
    fillWidth: false,
  },
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg');

    await expect(svg).toHaveAttribute('preserveAspectRatio', 'xMidYMid meet');
  },
};

export const EmptySamples: Story = {
  args: {
    samples: [
      { elapsedSec: 0, bpm: null },
      { elapsedSec: 60, bpm: null },
      { elapsedSec: 120, bpm: null },
    ],
    labelledAxes: true,
    scrubElapsedSec: null,
  },
  play: async ({ canvas, canvasElement }) => {
    const polyline = canvasElement.querySelector('polyline');

    await expect(canvas.getByText('170')).toBeVisible();
    await expect(polyline).toHaveAttribute('points', '0,42 100,42');
  },
};

export const ClickableCompletedSession: Story = {
  args: {
    samples: completedSessionSamples,
    labelledAxes: true,
    scrubElapsedSec: 180,
    clickLabel: 'Open completed session in history',
    onClick: fn(),
  },
  play: async ({ args, canvas }) => {
    const graph = canvas.getByRole('button', { name: 'Open completed session in history' });

    await userEvent.click(graph);
    await expect(args.onClick).toHaveBeenCalledTimes(1);

    graph.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(2);

    await userEvent.keyboard(' ');
    await expect(args.onClick).toHaveBeenCalledTimes(3);
  },
};
