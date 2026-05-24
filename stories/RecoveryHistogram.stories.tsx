import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fn, userEvent } from 'storybook/test';

import '../app/src/styles.css';
import type { ComparisonRound } from '../app/src/domain/shared/types';
import { RecoveryHistogram } from '../app/src/ui/components/RecoveryHistogram';
import recoveryHistogramSpec from '../specs/ui/components/RecoveryHistogram.spec.md?raw';

type RecoveryHistogramArgs = {
  rounds: ComparisonRound[];
  roundDurationsSec?: number[];
  roundEndElapsedSec?: number[];
  timelineDurationSec?: number;
  scrubElapsedSec?: number | null;
  selectedRoundIndex?: number | null;
  onClick?: () => void;
  clickLabel?: string;
  heightClassName?: string;
  showEmptyState?: boolean;
  scaleMaxAbs?: number;
};

const mixedRounds: ComparisonRound[] = [
  { roundIndex: 1, currentDelta: 42, previousDelta: 36, diffDelta: 6 },
  { roundIndex: 2, currentDelta: 35, previousDelta: 43, diffDelta: -8 },
  { roundIndex: 3, currentDelta: 39, previousDelta: 39, diffDelta: 0 },
  { roundIndex: 4, currentDelta: 50, previousDelta: 38, diffDelta: 12 },
  { roundIndex: 5, currentDelta: 31, previousDelta: 40, diffDelta: -9 },
];

const emptyComparableRounds: ComparisonRound[] = [
  { roundIndex: 1, currentDelta: 42, previousDelta: null, diffDelta: null },
  { roundIndex: 2, currentDelta: 35, previousDelta: null, diffDelta: null },
  { roundIndex: 3, currentDelta: 39, previousDelta: null, diffDelta: null },
];

const meta = {
  title: 'Components/RecoveryHistogram',
  component: RecoveryHistogram,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: recoveryHistogramSpec,
      },
    },
  },
  args: {
    rounds: mixedRounds,
    roundDurationsSec: [80, 70, 90, 60, 100],
    roundEndElapsedSec: undefined,
    timelineDurationSec: undefined,
    scrubElapsedSec: null,
    selectedRoundIndex: null,
    heightClassName: 'h-24',
    showEmptyState: false,
    scaleMaxAbs: undefined,
  },
  argTypes: {
    roundDurationsSec: { control: 'object' },
    roundEndElapsedSec: { control: 'object' },
    timelineDurationSec: { control: 'number' },
    scrubElapsedSec: { control: 'number' },
    selectedRoundIndex: { control: 'number' },
    heightClassName: { control: 'text' },
    showEmptyState: { control: 'boolean' },
    scaleMaxAbs: { control: 'number' },
    clickLabel: { control: 'text' },
    onClick: { table: { disable: true } },
  },
} satisfies Meta<RecoveryHistogramArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MixedRecovery: Story = {
  play: async ({ canvasElement }) => {
    const bars = Array.from(canvasElement.querySelectorAll('rect'));
    const baseline = canvasElement.querySelector('line');
    const svg = canvasElement.querySelector('svg');

    await expect(baseline).toHaveAttribute('y1', '18');
    await expect(baseline).toHaveAttribute('y2', '18');
    await expect(baseline).toHaveAttribute('x1', '0');
    await expect(baseline).toHaveAttribute('x2', '100');
    await expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
    await expect(bars).toHaveLength(5);
    await expect(bars.every((bar) => !bar.hasAttribute('rx'))).toBe(true);
    await expect(bars.some((bar) => bar.getAttribute('fill') === 'var(--accent)')).toBe(true);
    await expect(bars.some((bar) => bar.getAttribute('fill') === 'var(--danger)')).toBe(true);
    await expect(bars.some((bar) => bar.getAttribute('fill') === 'var(--line)')).toBe(true);
    await expect(canvasElement.querySelector('[data-testid="recovery-histogram-magnitude"]')).toHaveTextContent('12');
  },
};

export const DurationAlignedRounds: Story = {
  args: {
    roundDurationsSec: [80, 70, 90, 60, 100],
  },
  play: async ({ canvasElement }) => {
    const bars = Array.from(canvasElement.querySelectorAll('rect'));
    const firstBar = bars[0];
    const fourthBar = bars[3];
    const lastBar = bars[4];

    await expect(bars).toHaveLength(5);
    await expect(firstBar).toHaveAttribute('width', '13.5');
    await expect(Number(firstBar.getAttribute('x')) + Number(firstBar.getAttribute('width'))).toBeCloseTo(20, 4);
    await expect(Number(fourthBar.getAttribute('x')) + Number(fourthBar.getAttribute('width'))).toBeCloseTo(75, 4);
    await expect(Number(lastBar.getAttribute('x')) + Number(lastBar.getAttribute('width'))).toBeCloseTo(100, 4);
  },
};

export const PartialReplayProgress: Story = {
  args: {
    rounds: mixedRounds.slice(0, 2),
    roundDurationsSec: [80, 70, 90, 60, 100],
  },
  play: async ({ canvasElement }) => {
    const bars = Array.from(canvasElement.querySelectorAll('rect'));
    const firstBar = bars[0];
    const secondBar = bars[1];

    await expect(bars).toHaveLength(2);
    await expect(firstBar).toHaveAttribute('width', '13.5');
    await expect(Number(firstBar.getAttribute('x')) + Number(firstBar.getAttribute('width'))).toBeCloseTo(20, 4);
    await expect(Number(secondBar.getAttribute('x')) + Number(secondBar.getAttribute('width'))).toBeCloseTo(37.5, 4);
    await expect(canvasElement.querySelector('[data-testid="recovery-histogram-magnitude"]')).toHaveTextContent('8');
  },
};

export const FullSessionTimeline: Story = {
  args: {
    rounds: mixedRounds.slice(0, 2),
    roundDurationsSec: [80, 70, 90, 60, 100],
    roundEndElapsedSec: [380, 450, 540, 600, 700],
    timelineDurationSec: 800,
  },
  play: async ({ canvasElement }) => {
    const bars = Array.from(canvasElement.querySelectorAll('rect'));
    const firstBar = bars[0];
    const secondBar = bars[1];

    await expect(bars).toHaveLength(2);
    await expect(firstBar).toHaveAttribute('width', '6.75');
    await expect(Number(firstBar.getAttribute('x')) + Number(firstBar.getAttribute('width'))).toBeCloseTo(47.5, 4);
    await expect(Number(secondBar.getAttribute('x')) + Number(secondBar.getAttribute('width'))).toBeCloseTo(56.25, 4);
  },
};

export const ReplayRestEndAligned: Story = {
  args: {
    rounds: [
      { roundIndex: 1, currentDelta: 17, previousDelta: 17, diffDelta: 0 },
      { roundIndex: 2, currentDelta: 16, previousDelta: 20, diffDelta: -4 },
    ],
    roundDurationsSec: [120, 105, 90, 75, 65, 60, 60, 60, 60, 60, 60, 60, 60],
    roundEndElapsedSec: [420, 525, 615, 690, 755, 815, 875, 935, 995, 1055, 1115, 1175, 1234],
    timelineDurationSec: 1415,
  },
  play: async ({ canvasElement }) => {
    const bars = Array.from(canvasElement.querySelectorAll('rect'));
    const firstBar = bars[0];
    const secondBar = bars[1];

    await expect(bars).toHaveLength(2);
    await expect(Number(firstBar.getAttribute('x')) + Number(firstBar.getAttribute('width'))).toBeCloseTo((420 / 1415) * 100, 4);
    await expect(Number(secondBar.getAttribute('x')) + Number(secondBar.getAttribute('width'))).toBeCloseTo((525 / 1415) * 100, 4);
  },
};

export const FinalRecoveryEndAligned: Story = {
  args: {
    rounds: [
      { roundIndex: 13, currentDelta: 3, previousDelta: 3, diffDelta: 0 },
    ],
    roundDurationsSec: [120, 105, 90, 75, 65, 60, 60, 60, 60, 60, 60, 60, 60],
    roundEndElapsedSec: [420, 525, 615, 690, 755, 815, 875, 935, 995, 1055, 1115, 1175, 1234],
    timelineDurationSec: 1415,
  },
  play: async ({ canvasElement }) => {
    const bar = canvasElement.querySelector('rect');

    await expect(bar).toBeInTheDocument();
    await expect(Number(bar?.getAttribute('x')) + Number(bar?.getAttribute('width'))).toBeCloseTo((1234 / 1415) * 100, 4);
  },
};

export const FixedReplayScale: Story = {
  args: {
    rounds: [
      { roundIndex: 1, currentDelta: 19, previousDelta: 17, diffDelta: 2 },
      { roundIndex: 2, currentDelta: 16, previousDelta: 20, diffDelta: -4 },
    ],
    roundDurationsSec: [120, 105, 90],
    roundEndElapsedSec: [420, 525, 615],
    timelineDurationSec: 615,
    scaleMaxAbs: 6,
  },
  play: async ({ canvasElement }) => {
    const bars = Array.from(canvasElement.querySelectorAll('rect'));
    const firstBar = bars[0];
    const secondBar = bars[1];

    await expect(canvasElement.querySelector('[data-testid="recovery-histogram-magnitude"]')).toHaveTextContent('6');
    await expect(firstBar).toHaveAttribute('height', '5');
    await expect(secondBar).toHaveAttribute('height', '10');
  },
};

export const Scrubber: Story = {
  args: {
    scrubElapsedSec: 200,
    timelineDurationSec: 400,
  },
  play: async ({ canvasElement }) => {
    const scrubMarker = canvasElement.querySelector('[data-testid="recovery-histogram-scrubber"]');

    await expect(scrubMarker).toBeInTheDocument();
    await expect(scrubMarker).toHaveAttribute('x1', '50');
    await expect(scrubMarker).toHaveAttribute('x2', '50');
  },
};

export const SelectedRound: Story = {
  args: {
    selectedRoundIndex: 4,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('4')).toBeVisible();
  },
};

export const EmptyComparableData: Story = {
  args: {
    rounds: emptyComparableRounds,
    roundDurationsSec: [80, 70, 90],
    showEmptyState: true,
  },
  play: async ({ canvasElement }) => {
    const bars = canvasElement.querySelectorAll('rect');
    const baseline = canvasElement.querySelector('line');

    await expect(baseline).toBeInTheDocument();
    await expect(bars).toHaveLength(0);
    await expect(canvasElement.querySelector('[data-testid="recovery-histogram-magnitude"]')).toHaveTextContent('0');
  },
};

export const ClickableSummary: Story = {
  args: {
    clickLabel: 'Open recovery details',
    onClick: fn(),
  },
  play: async ({ args, canvas }) => {
    const histogram = canvas.getByRole('button', { name: 'Open recovery details' });

    await userEvent.click(histogram);
    await expect(args.onClick).toHaveBeenCalledTimes(1);

    histogram.focus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onClick).toHaveBeenCalledTimes(2);

    await userEvent.keyboard(' ');
    await expect(args.onClick).toHaveBeenCalledTimes(3);
  },
};
