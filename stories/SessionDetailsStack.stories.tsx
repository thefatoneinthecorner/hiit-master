import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect } from 'storybook/test';

import '../app/src/styles.css';
import { Pulse } from '../app/src/ui/components/Pulse';
import { SessionDetailsStack } from '../app/src/ui/components/SessionDetailsStack';
import sessionDetailsStackSpec from '../specs/ui/components/SessionDetailsStack.spec.md?raw';

type SessionDetailsStackArgs = {
  primaryTitle: string;
  primaryContent: string;
  secondaryTitle?: string;
  secondaryContent?: string;
  titleAlign?: 'center' | 'left';
};

const meta = {
  title: 'Components/SessionDetailsStack',
  component: SessionDetailsStack,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: sessionDetailsStackSpec,
      },
    },
  },
  args: {
    primaryTitle: 'Round 3',
    primaryContent: '0:42',
    secondaryTitle: 'Remaining',
    secondaryContent: '5:18',
    titleAlign: 'center',
  },
  argTypes: {
    primaryTitle: { control: 'text' },
    primaryContent: { control: 'text' },
    secondaryTitle: { control: 'text' },
    secondaryContent: { control: 'text' },
    titleAlign: { control: 'radio', options: ['center', 'left'] },
  },
} satisfies Meta<SessionDetailsStackArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

function assertTitleTypography(element: HTMLElement) {
  expect(element).toHaveClass(/text-sm/);
  expect(element).toHaveClass(/uppercase/);
  expect(element).toHaveClass(/tracking-\[0\.18em\]/);
  expect(element).toHaveClass(/text-\[color:var\(--muted\)\]/);
}

export const RoundTiming: Story = {
  render: (args) => (
    <SessionDetailsStack
      primaryTitle={args.primaryTitle}
      secondaryTitle={args.secondaryTitle}
      secondaryContent={<span class="text-4xl font-semibold leading-none">{args.secondaryContent}</span>}
      titleAlign={args.titleAlign}
    >
      <span class="text-6xl font-semibold leading-none">{args.primaryContent}</span>
    </SessionDetailsStack>
  ),
  play: async ({ canvas }) => {
    const stack = canvas.getByTestId('session-details-stack');
    const primaryTitle = canvas.getByTestId('session-details-primary-title');
    const secondaryTitle = canvas.getByTestId('session-details-secondary-title');

    await expect(canvas.getByText('Round 3')).toBeVisible();
    await expect(canvas.getByText('0:42')).toBeVisible();
    await expect(canvas.getByText('Remaining')).toBeVisible();
    await expect(canvas.getByText('5:18')).toBeVisible();
    assertTitleTypography(primaryTitle);
    assertTitleTypography(secondaryTitle);
    await expect(stack).toHaveClass(/min-h-48/);
    await expect(stack).not.toHaveClass(/border/);
    await expect(stack).not.toHaveClass(/bg-/);
  },
};

export const LeftAlignedTitles: Story = {
  args: {
    titleAlign: 'left',
  },
  render: (args) => (
    <SessionDetailsStack
      primaryTitle={args.primaryTitle}
      secondaryTitle={args.secondaryTitle}
      secondaryContent={<span class="text-4xl font-semibold leading-none">{args.secondaryContent}</span>}
      titleAlign={args.titleAlign}
    >
      <span class="text-6xl font-semibold leading-none">{args.primaryContent}</span>
    </SessionDetailsStack>
  ),
  play: async ({ canvas }) => {
    const primaryTitle = canvas.getByTestId('session-details-primary-title');
    const secondaryTitle = canvas.getByTestId('session-details-secondary-title');

    assertTitleTypography(primaryTitle);
    assertTitleTypography(secondaryTitle);
    await expect(primaryTitle).toHaveClass(/text-left/);
    await expect(secondaryTitle).toHaveClass(/text-left/);
  },
};

export const LiveBPM: Story = {
  render: () => (
    <SessionDetailsStack primaryTitle="Live BPM">
      <span class="flex items-center justify-center gap-3 text-6xl font-semibold leading-none">
        <Pulse active beating />
        <span>156</span>
      </span>
    </SessionDetailsStack>
  ),
  play: async ({ canvas }) => {
    const primaryTitle = canvas.getByTestId('session-details-primary-title');
    const secondaryTitle = canvas.getByTestId('session-details-secondary-title');
    const secondaryContent = canvas.getByTestId('session-details-secondary-content');

    await expect(canvas.getByText('Live BPM')).toBeVisible();
    await expect(canvas.getByText('♥')).toBeVisible();
    await expect(canvas.getByText('156')).toBeVisible();
    assertTitleTypography(primaryTitle);
    await expect(secondaryTitle).toBeInTheDocument();
    await expect(secondaryContent).toBeInTheDocument();
  },
};

export const TimePulseBPMRow: Story = {
  render: () => (
    <SessionDetailsStack
      primaryTitle="Session"
      secondaryTitle="Remaining"
      secondaryContent={<span class="text-4xl font-semibold leading-none">5:18</span>}
    >
      <span class="grid w-full grid-cols-3 items-center text-5xl font-semibold leading-none" data-testid="time-pulse-bpm-row">
        <span class="justify-self-end" data-testid="time-pulse-bpm-time">0:42</span>
        <span class="justify-self-center text-6xl" data-testid="time-pulse-bpm-pulse">
          <Pulse active beating />
        </span>
        <span class="justify-self-start" data-testid="time-pulse-bpm-bpm">156</span>
      </span>
    </SessionDetailsStack>
  ),
  play: async ({ canvas }) => {
    const row = canvas.getByTestId('time-pulse-bpm-row');
    const time = canvas.getByTestId('time-pulse-bpm-time');
    const pulse = canvas.getByTestId('time-pulse-bpm-pulse');
    const bpm = canvas.getByTestId('time-pulse-bpm-bpm');
    const secondaryTitle = canvas.getByTestId('session-details-secondary-title');

    await expect(canvas.getByText('Session')).toBeVisible();
    await expect(canvas.getByText('Remaining')).toBeVisible();
    await expect(canvas.getByText('5:18')).toBeVisible();
    await expect(time).toHaveTextContent('0:42');
    await expect(canvas.getByText('♥')).toBeVisible();
    await expect(bpm).toHaveTextContent('156');
    await expect(row).toHaveClass(/grid-cols-3/);
    assertTitleTypography(secondaryTitle);

    const rowRect = row.getBoundingClientRect();
    const pulseRect = pulse.getBoundingClientRect();
    const rowCenter = rowRect.left + rowRect.width / 2;
    const pulseCenter = pulseRect.left + pulseRect.width / 2;

    await expect(Math.abs(rowCenter - pulseCenter)).toBeLessThanOrEqual(1);
  },
};
