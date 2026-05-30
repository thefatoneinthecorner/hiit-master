import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fireEvent, fn, userEvent, waitFor } from 'storybook/test';

import '../app/src/styles.css';
import type { SettingsMode } from '../app/src/application/store';
import type { ComparisonRound, HeartRateSample } from '../app/src/domain/shared/types';
import { SessionDisplay } from '../app/src/ui/components/SessionDisplay';
import { latestSessionReplayFixture } from './fixtures/latestSessionReplay';
import { useSessionReplay } from './hooks/useSessionReplay';
import sessionDisplaySpec from '../specs/ui/components/SessionDisplay.spec.md?raw';

type SessionDisplayArgs = {
  settingsMode: SettingsMode;
  title: string;
  roundName: string;
  countdownSeconds: number;
  targetBpm?: number | null;
  remainingSeconds: number;
  timingEmphasis?: 'work' | 'recovery';
  bpm: number | null;
  pulseActive?: boolean;
  pulseBeating?: boolean;
  sensorName: string | null;
  batteryPercent: number | null;
  playing?: boolean;
  onBluetooth: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  samples: HeartRateSample[];
  totalDurationSec: number;
  nominalPeakHeartrate: number;
  scrubElapsedSec?: number | null;
  recoveryRounds: ComparisonRound[];
  roundDurationsSec?: number[];
  roundEndElapsedSec?: number[];
  recoveryScaleMaxAbs?: number;
  onScrubPointerMove?: (clientX: number, containerRect: DOMRect) => void;
  sessionControllerVisible?: boolean;
};

const samples: HeartRateSample[] = [
  { elapsedSec: 0, bpm: 92 },
  { elapsedSec: 35, bpm: 117 },
  { elapsedSec: 70, bpm: 148 },
  { elapsedSec: 105, bpm: 166 },
  { elapsedSec: 140, bpm: 128 },
  { elapsedSec: 175, bpm: 160 },
  { elapsedSec: 210, bpm: 121 },
  { elapsedSec: 245, bpm: 153 },
  { elapsedSec: 280, bpm: 112 },
];

const recoveryRounds: ComparisonRound[] = [
  { roundIndex: 1, currentDelta: 42, previousDelta: 36, diffDelta: 6 },
  { roundIndex: 2, currentDelta: 35, previousDelta: 43, diffDelta: -8 },
  { roundIndex: 3, currentDelta: 39, previousDelta: 39, diffDelta: 0 },
  { roundIndex: 4, currentDelta: 50, previousDelta: 38, diffDelta: 12 },
];

const meta = {
  title: 'Components/SessionDisplay',
  component: SessionDisplay,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: sessionDisplaySpec,
      },
    },
  },
  render: (args) => (
    <div class="w-full p-6">
      <SessionDisplay {...args} />
    </div>
  ),
  args: {
    title: 'HIIT Session',
    settingsMode: 'duration',
    roundName: 'Round 3: Work',
    countdownSeconds: 42,
    targetBpm: null,
    remainingSeconds: 318,
    timingEmphasis: 'work',
    bpm: 156,
    pulseActive: true,
    pulseBeating: true,
    sensorName: 'Polar H10',
    batteryPercent: 82,
    playing: true,
    onBluetooth: fn(),
    onPlay: fn(),
    onPause: fn(),
    onStop: fn(),
    samples,
    totalDurationSec: 300,
    nominalPeakHeartrate: 170,
    scrubElapsedSec: null,
    recoveryRounds,
    roundDurationsSec: [80, 70, 90, 60],
    roundEndElapsedSec: [80, 150, 240, 300],
    recoveryScaleMaxAbs: undefined,
    sessionControllerVisible: true,
  },
  argTypes: {
    title: { control: 'text' },
    settingsMode: { control: 'radio', options: ['duration', 'bpm'] },
    roundName: { control: 'text' },
    countdownSeconds: { control: 'number' },
    targetBpm: { control: 'number' },
    remainingSeconds: { control: 'number' },
    timingEmphasis: { control: 'radio', options: ['work', 'recovery'] },
    bpm: { control: 'number' },
    pulseActive: { control: 'boolean' },
    pulseBeating: { control: 'boolean' },
    sensorName: { control: 'text' },
    batteryPercent: { control: 'number' },
    playing: { control: 'boolean' },
    totalDurationSec: { control: 'number' },
    nominalPeakHeartrate: { control: 'number' },
    scrubElapsedSec: { control: 'number' },
    sessionControllerVisible: { control: 'boolean' },
    samples: { control: 'object' },
    recoveryRounds: { control: 'object' },
    roundDurationsSec: { control: 'object' },
    roundEndElapsedSec: { control: 'object' },
    recoveryScaleMaxAbs: { control: 'number' },
    onScrubPointerMove: { table: { disable: true } },
    onBluetooth: { table: { disable: true } },
    onPlay: { table: { disable: true } },
    onPause: { table: { disable: true } },
    onStop: { table: { disable: true } },
  },
} satisfies Meta<SessionDisplayArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

function LatestSessionRealtimeReplayDemo() {
  const replay = useSessionReplay(latestSessionReplayFixture);

  return (
    <SessionDisplay
      {...replay}
      onBluetooth={fn()}
      onStop={fn()}
    />
  );
}

function readSessionDetailsRemainingSeconds(canvas: { getByTestId: (testId: string) => HTMLElement }) {
  const timeText = canvas.getByTestId('session-details-time').textContent ?? '';
  const [minutes = '0', seconds = '0'] = timeText.split(':');

  return Number(minutes) * 60 + Number(seconds);
}

export const ActiveSession: Story = {
  play: async ({ args, canvas, canvasElement }) => {
    const toggle = canvas.getByRole('button', { name: 'Hide session controller' });
    const controllerContainer = canvasElement.querySelector('[data-testid="session-display-session-controller"]');
    const closedControllerPanel = controllerContainer?.querySelector(':scope > [aria-hidden="true"]');
    const sessionDetailsPanel = canvas.getByTestId('session-details-panel');
    const sessionDetailsRow = canvas.getByTestId('session-details-row');
    const sessionDetailsPulse = canvas.getByTestId('session-details-pulse');
    const roundLabel = canvas.getByText('Round 3: Work');
    const remainingLabel = canvas.getByText('Remaining');
    const roundTitle = canvas.getByTestId('session-details-primary-title');
    const remainingTitle = canvas.getByTestId('session-details-secondary-title');

    await expect(canvas.getByText('HIIT Session')).toBeVisible();
    await expect(roundLabel).toBeVisible();
    await expect(canvas.getByText('0:42')).toBeVisible();
    await expect(canvas.getByText('♥')).toBeVisible();
    await expect(canvas.getByText('5:18')).toBeVisible();
    await expect(canvas.getByText('156')).toBeVisible();
    await expect(sessionDetailsPanel).toHaveClass(/rounded-\[1\.8rem\]/);
    for (const label of [roundTitle, remainingTitle]) {
      await expect(label).toHaveClass(/text-sm/);
      await expect(label).toHaveClass(/uppercase/);
      await expect(label).toHaveClass(/tracking-\[0\.18em\]/);
    }
    await expect(roundTitle.className).toBe(remainingTitle.className);
    await expect(sessionDetailsRow).toHaveClass(/grid-cols-3/);
    {
      const rowRect = sessionDetailsRow.getBoundingClientRect();
      const pulseRect = sessionDetailsPulse.getBoundingClientRect();
      const rowCenter = rowRect.left + rowRect.width / 2;
      const pulseCenter = pulseRect.left + pulseRect.width / 2;
      await expect(Math.abs(rowCenter - pulseCenter)).toBeLessThanOrEqual(1);
    }
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByTestId('disclosure-caret')).toHaveAttribute('data-state', 'open');
    await expect(closedControllerPanel).not.toBeInTheDocument();
    await expect(canvasElement.querySelector('polyline')).toBeInTheDocument();
    await expect(canvasElement.querySelectorAll('rect').length).toBeGreaterThan(0);

    await expect(canvas.getByText('Polar H10')).toBeVisible();
    await expect(canvas.getByTestId('recovery-histogram-magnitude')).toBeVisible();
    await expect(canvas.getByText('Battery')).toBeVisible();
    await expect(canvas.getByText('82%')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Play' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Pause' })).toBeEnabled();

    await userEvent.click(canvas.getByRole('button', { name: 'Bluetooth' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Play' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Pause' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Stop' }));
    await expect(args.onBluetooth).toHaveBeenCalledTimes(1);
    await expect(args.onPlay).not.toHaveBeenCalled();
    await expect(args.onPause).toHaveBeenCalledTimes(1);
    await expect(args.onStop).toHaveBeenCalledTimes(1);

    await userEvent.click(canvas.getByTestId('session-details-time'));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Show session controller' })).toHaveAttribute('aria-expanded', 'false'));
    await waitFor(() => expect(canvas.getByTestId('disclosure-caret')).toHaveAttribute('data-state', 'closed'));
  },
};

export const ActiveSessionBpmMode: Story = {
  args: {
    settingsMode: 'bpm',
    targetBpm: 160,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('HIIT Session')).toBeVisible();
    await expect(canvas.getByText('Round 3: Work')).toBeVisible();
    await expect(canvas.getByTestId('session-details-time')).toHaveTextContent('160');
    await expect(canvas.getByText('156')).toBeVisible();
    await expect(canvas.queryByText('Remaining')).not.toBeInTheDocument();
    await expect(canvas.queryByTestId('session-details-secondary-title')).not.toBeInTheDocument();
    await expect(canvas.queryByTestId('session-details-secondary-content')).not.toBeInTheDocument();
    await expect(canvas.queryByTestId('recovery-histogram-magnitude')).not.toBeInTheDocument();
  },
};

export const RunningBpmMode: Story = {
  args: {
    settingsMode: 'bpm',
    targetBpm: 160,
    title: '',
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('HIIT Session')).not.toBeInTheDocument();
    await expect(canvas.getByText('Round 3: Work')).toBeVisible();
    await expect(canvas.getByTestId('session-details-time')).toHaveTextContent('160');
    await expect(canvas.getByText('156')).toBeVisible();
    await expect(canvas.queryByText('Remaining')).not.toBeInTheDocument();
    await expect(canvas.queryByTestId('session-details-secondary-title')).not.toBeInTheDocument();
    await expect(canvas.queryByTestId('session-details-secondary-content')).not.toBeInTheDocument();
    await expect(canvas.queryByTestId('recovery-histogram-magnitude')).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Hide session controller' })).toHaveAttribute('aria-expanded', 'true');
  },
};

export const ControllerInitiallyHidden: Story = {
  args: {
    sessionControllerVisible: false,
  },
  play: async ({ canvas, canvasElement }) => {
    const controllerContainer = canvasElement.querySelector('[data-testid="session-display-session-controller"]');

    await expect(canvas.getByRole('button', { name: 'Show session controller' })).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByTestId('disclosure-caret')).toHaveAttribute('data-state', 'closed');
    await expect(controllerContainer?.querySelector(':scope > [aria-hidden="true"]')).toBeInTheDocument();
  },
};

export const LatestSessionReplay: Story = {
  render: () => (
    <div class="w-full p-6">
      <LatestSessionRealtimeReplayDemo />
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('24 May 2026, 12:43')).toBeVisible();
    await expect(canvas.getByText('Warmup')).toBeVisible();
    await expect(canvas.getByText('5:00')).toBeVisible();
    await expect(canvas.getByText('55')).toBeVisible();
    await expect(canvas.queryByText('Remaining')).not.toBeInTheDocument();
    await expect(canvas.queryByTestId('session-details-secondary-title')).not.toBeInTheDocument();
    await expect(canvas.queryByTestId('session-details-secondary-content')).not.toBeInTheDocument();
    await expect(canvas.queryByTestId('recovery-histogram-magnitude')).not.toBeInTheDocument();
    await waitFor(() => expect(canvas.getByText('♥')).toHaveClass(/pulse-heart/), { timeout: 1500 });
    await expect(canvas.getByRole('button', { name: 'Show session controller' })).toHaveAttribute('aria-expanded', 'false');
    const heartGraphLine = canvasElement.querySelector('polyline');
    await expect(heartGraphLine).toBeInTheDocument();
    await expect(heartGraphLine).toHaveAttribute('stroke', 'var(--accent)');
    await expect(canvasElement.querySelector('line[stroke="var(--danger)"]')).not.toBeInTheDocument();
    await expect(canvasElement.querySelectorAll('rect')).toHaveLength(0);
    await waitFor(() => expect(canvas.getByText('4:59')).toBeVisible(), { timeout: 1500 });
    await waitFor(() => expect(heartGraphLine?.getAttribute('points')).not.toBe('0,42 100,42'), { timeout: 1500 });

    fireEvent.keyDown(canvasElement.ownerDocument.body, { key: 's' });
    await waitFor(() => expect(canvasElement.querySelector('[data-testid="heart-graph-scrubber"]')).toBeInTheDocument());
    await expect(canvasElement.querySelector('[data-testid="recovery-histogram-scrubber"]')).not.toBeInTheDocument();

    const sessionDisplay = canvasElement.querySelector('section');
    const displayRect = sessionDisplay?.getBoundingClientRect();
    if (!sessionDisplay || !displayRect) {
      throw new Error('Session display section not found');
    }
    fireEvent.mouseMove(sessionDisplay, { clientX: displayRect.left + displayRect.width * 0.5 });
    await waitFor(() => expect(canvasElement.querySelector('[data-testid="heart-graph-scrubber"]')).toHaveAttribute('x1', expect.stringMatching(/^50/)));
    await expect(canvasElement.querySelector('[data-testid="recovery-histogram-scrubber"]')).not.toBeInTheDocument();

    fireEvent.keyDown(canvasElement.ownerDocument.body, { key: 's' });
    await waitFor(() => expect(canvasElement.querySelector('[data-testid="heart-graph-scrubber"]')).not.toBeInTheDocument());
    await expect(canvasElement.querySelector('[data-testid="recovery-histogram-scrubber"]')).not.toBeInTheDocument();

    await userEvent.click(canvas.getByRole('button', { name: 'Show session controller' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Pause' })).toBeVisible());
    await expect(canvas.getByRole('button', { name: 'Play' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Pause' })).toBeEnabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Pause' }));
    await expect(canvas.getByRole('button', { name: 'Play' })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Pause' })).toBeDisabled();
    const pausedRemainingSeconds = readSessionDetailsRemainingSeconds(canvas);
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    await expect(readSessionDetailsRemainingSeconds(canvas)).toBe(pausedRemainingSeconds);
    await userEvent.click(canvas.getByRole('button', { name: 'Play' }));
    await expect(canvas.getByRole('button', { name: 'Play' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Pause' })).toBeEnabled();
    await waitFor(() => expect(readSessionDetailsRemainingSeconds(canvas)).toBeLessThan(pausedRemainingSeconds), { timeout: 1500 });

    fireEvent.keyDown(canvasElement.ownerDocument.body, { key: ' ', code: 'Space' });
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Play' })).toBeEnabled());
    await expect(canvas.getByRole('button', { name: 'Pause' })).toBeDisabled();
    const spacePausedRemainingSeconds = readSessionDetailsRemainingSeconds(canvas);
    await new Promise((resolve) => window.setTimeout(resolve, 1200));
    await expect(readSessionDetailsRemainingSeconds(canvas)).toBe(spacePausedRemainingSeconds);
    fireEvent.keyDown(canvasElement.ownerDocument.body, { key: ' ', code: 'Space' });
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Play' })).toBeDisabled());
    await expect(canvas.getByRole('button', { name: 'Pause' })).toBeEnabled();
    await waitFor(() => expect(readSessionDetailsRemainingSeconds(canvas)).toBeLessThan(spacePausedRemainingSeconds), { timeout: 1500 });

    fireEvent.keyDown(canvasElement.ownerDocument.body, { key: 'ArrowRight' });
    await waitFor(() => expect(canvas.getByText('Round 3: Rest')).toBeVisible(), { timeout: 6000 });
    await waitFor(() => expect(canvas.getByTestId('session-details-bpm')).toHaveTextContent('108'), { timeout: 3000 });
    await expect(canvas.getByTestId('session-details-time')).toHaveTextContent('105');
    fireEvent.keyUp(canvasElement.ownerDocument.body, { key: 'ArrowRight' });

    fireEvent.keyDown(canvasElement.ownerDocument.body, { key: 'ArrowLeft' });
    await waitFor(() => expect(canvas.getByText('Warmup')).toBeVisible(), { timeout: 2000 });
    await expect(canvas.getByTestId('session-details-time')).toHaveTextContent(/^\d+:\d{2}$/);
    fireEvent.keyUp(canvasElement.ownerDocument.body, { key: 'ArrowLeft' });
  },
};
