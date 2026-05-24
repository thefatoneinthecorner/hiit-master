import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect } from 'storybook/test';

import '../app/src/styles.css';
import { RoundTiming } from '../app/src/ui/components/RoundTiming';
import roundTimingSpec from '../specs/ui/components/RoundTiming.spec.md?raw';

type RoundTimingArgs = {
  roundName: string;
  countdownSeconds: number;
  remainingSeconds: number;
  emphasis?: 'work' | 'recovery';
};

const meta = {
  title: 'Components/RoundTiming',
  component: RoundTiming,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: roundTimingSpec,
      },
    },
  },
  args: {
    roundName: 'Round 3',
    countdownSeconds: 42,
    remainingSeconds: 318,
    emphasis: 'work',
  },
  argTypes: {
    roundName: { control: 'text' },
    countdownSeconds: { control: 'number' },
    remainingSeconds: { control: 'number' },
    emphasis: { control: 'radio', options: ['work', 'recovery'] },
  },
} satisfies Meta<RoundTimingArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WorkRound: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Round 3')).toBeVisible();
    await expect(canvas.getByText('0:42')).toBeVisible();
    await expect(canvas.getByText('Remaining')).toBeVisible();
    await expect(canvas.getByText('5:18')).toBeVisible();
    await expect(canvas.getByText('Round 3')).toHaveClass(/text-\[color:var\(--danger\)\]/);
    await expect(canvas.getByText('Remaining')).toHaveClass(/text-sm/);
    await expect(canvas.getByTestId('round-timing-remaining-time')).toHaveClass(/text-4xl/);
  },
};

export const RecoveryRound: Story = {
  args: {
    roundName: 'Rest 3',
    countdownSeconds: 73,
    remainingSeconds: 206,
    emphasis: 'recovery',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Rest 3')).toBeVisible();
    await expect(canvas.getByText('1:13')).toBeVisible();
    await expect(canvas.getByText('3:26')).toBeVisible();
    await expect(canvas.getByText('Rest 3')).toHaveClass(/text-\[color:var\(--accent\)\]/);
  },
};

export const CoolDown: Story = {
  args: {
    roundName: 'Cool down',
    countdownSeconds: 95,
    remainingSeconds: 95,
    emphasis: 'recovery',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Cool down')).toBeVisible();
    await expect(canvas.getAllByText('1:35')).toHaveLength(2);
  },
};
