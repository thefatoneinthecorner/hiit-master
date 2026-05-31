import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fn, userEvent } from 'storybook/test';

import '../app/src/styles.css';
import type { SessionRuntime, SettingsMode } from '../app/src/application/store';
import { STARTER_PROFILE } from '../app/src/domain/shared/profile';
import type { ComparisonRound, HeartRateSample, WorkoutPhaseSegment } from '../app/src/domain/shared/types';
import { createWorkoutPlan, getPhaseAtElapsedSec } from '../app/src/domain/workout/plan';
import { HomeScreenView } from '../app/src/ui/screens/HomeScreen';
import homeScreenSpec from '../specs/ui/screens/HomeScreen.spec.md?raw';

type HomeScreenArgs = {
  runtime: SessionRuntime;
  phase: WorkoutPhaseSegment | null;
  homeComparison: ComparisonRound[];
  showNoComparableSessionWarning: boolean;
  sensorName?: string | null;
  batteryPercent?: number | null;
  onConnectDevice: () => void;
  onReconnectDevice: () => void;
  onSetActualWorkDuration: (value: number) => void;
  settingsMode: SettingsMode;
  onSetSettingsMode: (value: SettingsMode) => void;
  onStartSession: () => void;
  onTogglePauseResume: () => void;
  onStopSession: () => void;
  onSetScrubElapsedSec: (value: number) => void;
};

const profile = STARTER_PROFILE;
const plan = createWorkoutPlan(profile, 20);

const samples: HeartRateSample[] = [
  { elapsedSec: 0, bpm: 78 },
  { elapsedSec: 120, bpm: 95 },
  { elapsedSec: 300, bpm: 128 },
  { elapsedSec: 320, bpm: 156 },
  { elapsedSec: 360, bpm: 116 },
  { elapsedSec: 420, bpm: 146 },
  { elapsedSec: 480, bpm: 118 },
];

const homeComparison: ComparisonRound[] = [
  { roundIndex: 1, currentDelta: 42, previousDelta: 36, diffDelta: 6 },
  { roundIndex: 2, currentDelta: 35, previousDelta: 43, diffDelta: -8 },
  { roundIndex: 3, currentDelta: 39, previousDelta: 39, diffDelta: 0 },
];

const baseRuntime: SessionRuntime = {
  status: 'running',
  startedAt: '2026-05-24T11:43:17.177Z',
  elapsedSec: 320,
  countdownRemainingSec: 3,
  isCompromised: false,
  hrCoverageComplete: true,
  samples,
  bpm: 156,
  bpmPulseAt: 0,
  scrubElapsedSec: null,
  actualWorkDurationSec: 20,
  phaseIndex: 0,
  phaseElapsedSec: 20,
};

function renderHomeScreen(args: HomeScreenArgs) {
  return (
    <div class="min-h-screen w-full overflow-hidden bg-[color:var(--canvas)] p-4">
      <HomeScreenView
        runtime={args.runtime}
        profile={profile}
        plan={plan}
        phase={args.phase}
        homeComparison={args.homeComparison}
        showNoComparableSessionWarning={args.showNoComparableSessionWarning}
        sensorName={args.sensorName}
        batteryPercent={args.batteryPercent}
        onConnectDevice={args.onConnectDevice}
        onReconnectDevice={args.onReconnectDevice}
        onSetActualWorkDuration={args.onSetActualWorkDuration}
        settingsMode={args.settingsMode}
        onSetSettingsMode={args.onSetSettingsMode}
        onStartSession={args.onStartSession}
        onTogglePauseResume={args.onTogglePauseResume}
        onStopSession={args.onStopSession}
        onSetScrubElapsedSec={args.onSetScrubElapsedSec}
      />
    </div>
  );
}

const meta = {
  title: 'Pages/HomeScreen',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: homeScreenSpec,
      },
    },
  },
  render: renderHomeScreen,
  args: {
    runtime: baseRuntime,
    phase: getPhaseAtElapsedSec(plan, baseRuntime.elapsedSec),
    homeComparison,
    showNoComparableSessionWarning: false,
    sensorName: 'Polar H10',
    batteryPercent: 82,
    onConnectDevice: fn(),
    onReconnectDevice: fn(),
    onSetActualWorkDuration: fn(),
    settingsMode: 'duration',
    onSetSettingsMode: fn(),
    onStartSession: fn(),
    onTogglePauseResume: fn(),
    onStopSession: fn(),
    onSetScrubElapsedSec: fn(),
  },
  argTypes: {
    settingsMode: { control: 'radio', options: ['duration', 'bpm'] },
  },
} satisfies Meta<HomeScreenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    runtime: {
      ...baseRuntime,
      status: 'idle',
      startedAt: null,
      elapsedSec: 0,
      samples: [],
      bpm: null,
    },
    phase: null,
    homeComparison: [],
    showNoComparableSessionWarning: false,
  },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('group', { name: 'Settings mode' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Duration' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(canvas.getByRole('button', { name: 'BPM' }));
    await expect(args.onSetSettingsMode).toHaveBeenCalledWith('bpm');

    await userEvent.click(canvas.getByRole('button', { name: 'Connect' }));

    await expect(args.onConnectDevice).toHaveBeenCalledTimes(1);
  },
};

export const Ready: Story = {
  args: {
    runtime: {
      ...baseRuntime,
      status: 'ready',
      startedAt: null,
      elapsedSec: 0,
      samples: [],
      bpm: 72,
    },
    phase: null,
    homeComparison: [],
    showNoComparableSessionWarning: false,
  },
  play: async ({ args, canvas }) => {
    await expect(canvas.getByText('Selected Profile')).toBeVisible();
    await expect(canvas.getByText(profile.name)).toBeVisible();
    await expect(canvas.getByText('♥')).toBeVisible();
    await expect(canvas.getByText('72')).toBeVisible();
    await expect(canvas.getByText('Actual Work Duration')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Start' }));

    await expect(args.onStartSession).toHaveBeenCalledTimes(1);
  },
};

export const ReadyBpmMode: Story = {
  args: {
    runtime: {
      ...baseRuntime,
      status: 'ready',
      startedAt: null,
      elapsedSec: 0,
      samples: [],
      bpm: 72,
    },
    phase: null,
    homeComparison: [],
    showNoComparableSessionWarning: false,
    settingsMode: 'bpm',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Selected Profile')).toBeVisible();
    await expect(canvas.getByText(profile.name)).toBeVisible();
    await expect(canvas.queryByText('Actual Work Duration')).not.toBeInTheDocument();
  },
};

export const ReadyWithoutComparableSession: Story = {
  args: {
    runtime: {
      ...baseRuntime,
      status: 'ready',
      startedAt: null,
      elapsedSec: 0,
      samples: [],
      bpm: 72,
    },
    phase: null,
    homeComparison: [],
    showNoComparableSessionWarning: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Selected Profile')).toBeVisible();
    await expect(canvas.getByRole('status')).toHaveTextContent('No comparable previous session for this profile');
    await expect(canvas.getByRole('button', { name: 'Start' })).toBeVisible();
  },
};

export const Running: Story = {
  play: async ({ args, canvas }) => {
    await expect(canvas.queryByText('Active Session')).not.toBeInTheDocument();
    await expect(canvas.getByText('Round 1: Rest')).toBeVisible();
    await expect(canvas.getByText('156')).toBeVisible();
    await expect(canvas.getByTestId('recovery-histogram-magnitude')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Show session controller' })).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(canvas.getByRole('button', { name: 'Show session controller' }));
    await expect(canvas.getByText('Polar H10')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Play' })).toBeDisabled();
    await expect(canvas.getByRole('button', { name: 'Pause' })).toBeEnabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Pause' }));

    await expect(args.onTogglePauseResume).toHaveBeenCalledTimes(1);
  },
};

export const RunningBpmMode: Story = {
  args: {
    settingsMode: 'bpm',
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Active Session')).not.toBeInTheDocument();
    await expect(canvas.getByText('Round 1: Rest')).toBeVisible();
    await expect(canvas.getByText('156')).toBeVisible();
    await expect(canvas.queryByTestId('recovery-histogram-magnitude')).not.toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: 'Show session controller' })).toHaveAttribute('aria-expanded', 'false');
  },
};

export const Completed: Story = {
  args: {
    runtime: {
      ...baseRuntime,
      status: 'completed',
      elapsedSec: plan.totalDurationSec,
      scrubElapsedSec: 420,
      bpm: 118,
    },
    phase: getPhaseAtElapsedSec(plan, plan.totalDurationSec),
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText('Completed Session')).not.toBeInTheDocument();
    await expect(canvas.getByText('Cooldown')).toBeVisible();
    await expect(canvas.getByText('118')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Show session controller' })).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByRole('slider')).toBeVisible();
  },
};
