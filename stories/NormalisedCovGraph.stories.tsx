import type { Meta, StoryObj } from '@storybook/preact-vite';
import { useState } from 'preact/hooks';
import { expect, fireEvent, fn, userEvent } from 'storybook/test';

import '../app/src/styles.css';
import { NormalisedCovGraph } from '../app/src/ui/components/NormalisedCovGraph';
import normalisedCovGraphSpec from '../specs/ui/components/NormalisedCovGraph.spec.md?raw';

type NormalisedCovGraphArgs = {
  points: Array<{ date: string; profileName?: string; actualWorkDurationSec?: number | null; value: number | null }>;
  referenceDate?: string;
  selectedIndex?: number;
  onSelectedIndexChange?: (index: number) => void;
  heightClassName?: string;
};

const recoveryVariationPoints = [
  { date: '2026-04-08T17:44:00.000Z', profileName: 'My Profile', actualWorkDurationSec: 20, value: null },
  { date: '2026-04-08T18:23:00.000Z', profileName: 'My Profile', actualWorkDurationSec: 20, value: 0.002688 },
  { date: '2026-04-26T17:45:00.000Z', profileName: 'My Profile 2', actualWorkDurationSec: 20, value: null },
  { date: '2026-04-26T17:46:00.000Z', profileName: 'My Profile', actualWorkDurationSec: 20, value: 0.00148 },
  { date: '2026-04-27T18:27:00.000Z', profileName: 'My Profile', actualWorkDurationSec: 20, value: 0.00158 },
  { date: '2026-04-28T17:09:00.000Z', profileName: 'My Profile', actualWorkDurationSec: 20, value: 0.001025 },
  { date: '2026-04-29T18:36:00.000Z', profileName: 'My Profile', actualWorkDurationSec: 20, value: 0.000983 },
  { date: '2026-04-30T17:19:00.000Z', profileName: 'My Profile', actualWorkDurationSec: 20, value: 0.000576 },
  { date: '2026-05-05T18:44:00.000Z', profileName: 'My Profile', actualWorkDurationSec: 20, value: 0.000825 },
  { date: '2026-05-06T18:07:00.000Z', profileName: 'My Profile', actualWorkDurationSec: 20, value: 0.000739 },
  { date: '2026-05-08T18:24:00.000Z', profileName: 'Full Timer', actualWorkDurationSec: 20, value: null },
  { date: '2026-05-08T18:28:00.000Z', profileName: 'Full Timer 2', actualWorkDurationSec: 29, value: 0.001164 },
  { date: '2026-05-10T12:59:00.000Z', profileName: 'Full Timer 2', actualWorkDurationSec: 29, value: 0.001059 },
  { date: '2026-05-11T17:35:00.000Z', profileName: 'Full Timer 2', actualWorkDurationSec: 28, value: 0.000927 },
  { date: '2026-05-13T19:13:00.000Z', profileName: 'Full Timer 2', actualWorkDurationSec: 28, value: 0 },
  { date: '2026-05-16T12:23:00.000Z', profileName: 'Full Timer 2', actualWorkDurationSec: 28, value: 0.001218 },
  { date: '2026-05-17T11:39:00.000Z', profileName: 'Full Timer 2', actualWorkDurationSec: 28, value: 0.001375 },
  { date: '2026-05-18T17:40:00.000Z', profileName: 'Full Timer 2', actualWorkDurationSec: 28, value: 0.000969 },
  { date: '2026-05-23T11:36:00.000Z', profileName: 'Full Timer 2', actualWorkDurationSec: 28, value: 0.000859 },
  { date: '2026-05-24T12:43:00.000Z', profileName: 'Full Timer 2', actualWorkDurationSec: 29, value: 0.000707 },
  { date: '2026-05-25T17:35:00.000Z', profileName: 'Full Timer 2 2', actualWorkDurationSec: 30, value: null },
  { date: '2026-05-26T17:16:00.000Z', profileName: 'Full Timer 2 2', actualWorkDurationSec: 30, value: null },
  { date: '2026-05-27T11:34:00.000Z', profileName: 'Full Timer 2', actualWorkDurationSec: 30, value: 0.000895 },
];

function clientXForDate(graph: HTMLElement, date: string): number {
  const bounds = graph.getBoundingClientRect();
  const firstTime = new Date('2026-04-08T18:23:00.000Z').getTime();
  const lastTime = new Date('2026-05-27T11:34:00.000Z').getTime();
  const targetTime = new Date(date).getTime();
  const ratio = (targetTime - firstTime) / (lastTime - firstTime);

  return bounds.left + bounds.width * ratio;
}

const meta = {
  title: 'Components/NormalisedCovGraph',
  component: NormalisedCovGraph,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: normalisedCovGraphSpec,
      },
    },
  },
  render: (args) => (
    <div class="w-full bg-[color:var(--canvas)] p-6">
      <NormalisedCovGraph {...args} />
    </div>
  ),
  args: {
    points: recoveryVariationPoints,
    referenceDate: '2026-05-27T12:00:00.000Z',
    selectedIndex: 16,
    onSelectedIndexChange: fn(),
    heightClassName: 'h-52',
  },
  argTypes: {
    points: { table: { disable: true } },
    referenceDate: { control: 'text' },
    selectedIndex: { control: 'number' },
    heightClassName: { control: 'text' },
    onSelectedIndexChange: { table: { disable: true } },
  },
} satisfies Meta<NormalisedCovGraphArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SessionHistory: Story = {
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByRole('heading', { name: 'Normalised CoV' })).toBeVisible();
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-title"]')).not.toHaveClass(/\[font-variant-caps:all-small-caps\]/);
    await expect(canvasElement.querySelectorAll('[data-testid="normalised-cov-title-smallcaps"]')).toHaveLength(2);
    const infoButton = canvas.getByRole('button', { name: 'Show Normalised CoV information' });

    await expect(infoButton).toBeVisible();
    await expect(infoButton).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.queryByText(/tracks how variable your recovery rates/i)).not.toBeInTheDocument();
    await userEvent.click(infoButton);
    await expect(infoButton).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByText(/tracks how variable your recovery rates/i)).toBeVisible();
    await expect(canvas.getAllByText('8.95')[0]).toBeVisible();
    const scrubSurface = canvas.getByRole('slider', { name: 'Normalised CoV scrub position' });

    await expect(scrubSurface).toBeVisible();
    await expect(scrubSurface).toHaveAttribute('data-testid', 'normalised-cov-graph-surface');
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-scrubber"]')).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-scrubber-horizontal"]')).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-crosshair-value"]')).toHaveTextContent('8.95');
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-crosshair-value"]')).toHaveClass(/z-20/);
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-crosshair-date"]')).toHaveTextContent('27 May 26 (-0d)');
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-crosshair-date"]')).toHaveClass(/z-20/);
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-time-band"]')).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-active-time-band"]')).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-time-band-label"]')).toHaveTextContent('Full Timer 2, 30s work');
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-time-band-label"]')).toHaveClass(/whitespace-nowrap/);
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-time-band-label"]')).toHaveClass(/font-normal/);
    const point = canvasElement.querySelector('[data-testid="normalised-cov-point"]');
    await expect(point).toBeInTheDocument();
    await expect(point).toHaveClass(/z-10/);
    await expect(point).toHaveClass(/rounded-full/);
    await expect(point).toHaveClass(/h-2\.5/);
    await expect(point).toHaveClass(/w-2\.5/);
    await expect(canvasElement.querySelectorAll('[data-testid="normalised-cov-profile-band"]').length).toBeGreaterThan(1);
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-profile-band"]')).toHaveAttribute('fill', '#efe3cf');
    await expect(canvas.queryByText('0.00')).not.toBeInTheDocument();
    const xValues = (canvasElement.querySelector('polyline')?.getAttribute('points') ?? '')
      .split(' ')
      .map((point) => Number(point.split(',')[0]));
    const xGaps = xValues.slice(1).map((x, index) => Number((x - xValues[index]).toFixed(2)));
    const uniqueGaps = new Set(xGaps);

    await expect(xValues[0]).toBeGreaterThan(0);
    await expect(xValues[xValues.length - 1]).toBeLessThan(100);
    await expect(uniqueGaps.size).toBeGreaterThan(1);
  },
};

export const ScrubbedHistoricalSession: Story = {
  args: {
    selectedIndex: 14,
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getAllByText('8.59')[0]).toBeVisible();
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-crosshair-date"]')).toHaveTextContent('23 May 26 (-4d)');
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-time-band-label"]')).toHaveTextContent('Full Timer 2, 28s work');
  },
};

export const InteractiveScrubber: Story = {
  args: {
    selectedIndex: 16,
  },
  render: (args) => {
    const [selectedIndex, setSelectedIndex] = useState(args.selectedIndex ?? 0);

    return (
      <div class="w-full bg-[color:var(--canvas)] p-6">
        <NormalisedCovGraph
          {...args}
          selectedIndex={selectedIndex}
          onSelectedIndexChange={(index) => {
            setSelectedIndex(index);
            args.onSelectedIndexChange?.(index);
          }}
        />
      </div>
    );
  },
  play: async ({ args, canvas, canvasElement }) => {
    const scrubber = canvas.getByRole('slider', { name: 'Normalised CoV scrub position' });

    await expect(canvas.getAllByText('8.95')[0]).toBeVisible();
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-scrubber"]')).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-scrubber-horizontal"]')).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-crosshair-value"]')).toHaveTextContent('8.95');
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-crosshair-date"]')).toHaveTextContent('27 May 26 (-0d)');
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-time-band-label"]')).toHaveTextContent('Full Timer 2, 30s work');
    await expect(scrubber.tagName).toBe('DIV');
    fireEvent.pointerMove(scrubber, { pointerId: 1, clientX: clientXForDate(scrubber, '2026-05-23T11:36:00.000Z') });
    await expect(args.onSelectedIndexChange).not.toHaveBeenCalledWith(14);
    fireEvent.pointerDown(scrubber, { pointerId: 1, clientX: clientXForDate(scrubber, '2026-05-24T12:43:00.000Z') });
    fireEvent.pointerMove(scrubber, { pointerId: 1, clientX: clientXForDate(scrubber, '2026-05-23T11:36:00.000Z') });

    await expect(args.onSelectedIndexChange).toHaveBeenCalledWith(14);
    await expect(canvas.getAllByText('8.59')[0]).toBeVisible();
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-scrubber"]')).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-scrubber-horizontal"]')).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-crosshair-value"]')).toHaveTextContent('8.59');
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-crosshair-date"]')).toHaveTextContent('23 May 26 (-4d)');
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-time-band-label"]')).toHaveTextContent('Full Timer 2, 28s work');
    fireEvent.pointerUp(scrubber, { pointerId: 1, clientX: clientXForDate(scrubber, '2026-05-23T11:36:00.000Z') });
    fireEvent.pointerMove(scrubber, { pointerId: 1, clientX: clientXForDate(scrubber, '2026-05-27T11:34:00.000Z') });
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-crosshair-date"]')).toHaveTextContent('23 May 26 (-4d)');
  },
};

export const Empty: Story = {
  args: {
    points: [
      { date: '2026-05-26T12:00:00.000Z', value: null },
      { date: '2026-05-27T12:00:00.000Z', value: null },
    ],
    selectedIndex: 0,
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getAllByText('--')).toHaveLength(1);
    await expect(canvas.getByRole('slider', { name: 'Normalised CoV scrub position' })).toHaveAttribute('aria-disabled', 'true');
    await expect(canvasElement.querySelector('polyline')).not.toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-testid="normalised-cov-active-time-band"]')).not.toBeInTheDocument();
  },
};
