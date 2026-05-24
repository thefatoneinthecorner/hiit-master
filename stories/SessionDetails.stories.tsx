import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, userEvent, waitFor } from 'storybook/test';
import { useState } from 'preact/hooks';

import '../app/src/styles.css';
import { SessionDetails } from '../app/src/ui/components/SessionDetails';
import sessionDetailsSpec from '../specs/ui/components/SessionDetails.spec.md?raw';

type SessionDetailsArgs = {
  open: boolean;
  timeRemaining: string;
  bpm: string | number;
  remainingValue: string;
  primaryTitle?: string;
  remainingTitle?: string;
  pulseActive?: boolean;
  pulseBeating?: boolean;
};

function SessionDetailsDemo(args: SessionDetailsArgs) {
  const [open, setOpen] = useState(args.open);

  return (
    <div class="max-w-xl">
      <SessionDetails
        {...args}
        open={open}
        onToggle={() => setOpen((current) => !current)}
      />
    </div>
  );
}

const meta = {
  title: 'Components/SessionDetails',
  component: SessionDetails,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: sessionDetailsSpec,
      },
    },
  },
  render: (args) => <SessionDetailsDemo {...args} />,
  args: {
    open: true,
    timeRemaining: '0:42',
    bpm: 156,
    remainingValue: '5:18',
    primaryTitle: 'Session',
    remainingTitle: 'Remaining',
    pulseActive: true,
    pulseBeating: true,
  },
  argTypes: {
    open: { control: 'boolean' },
    timeRemaining: { control: 'text' },
    bpm: { control: 'text' },
    remainingValue: { control: 'text' },
    primaryTitle: { control: 'text' },
    remainingTitle: { control: 'text' },
    pulseActive: { control: 'boolean' },
    pulseBeating: { control: 'boolean' },
  },
} satisfies Meta<SessionDetailsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

function expectPulseCentered(row: HTMLElement, pulse: HTMLElement) {
  const rowRect = row.getBoundingClientRect();
  const pulseRect = pulse.getBoundingClientRect();
  const rowCenter = rowRect.left + rowRect.width / 2;
  const pulseCenter = pulseRect.left + pulseRect.width / 2;

  expect(Math.abs(rowCenter - pulseCenter)).toBeLessThanOrEqual(1);
}

function expectCaretAlignedWithTitle(caret: HTMLElement, title: HTMLElement) {
  const caretRect = caret.getBoundingClientRect();
  const titleRect = title.getBoundingClientRect();
  const caretCenter = caretRect.top + caretRect.height / 2;
  const titleCenter = titleRect.top + titleRect.height / 2;

  expect(Math.abs(caretCenter - titleCenter)).toBeLessThanOrEqual(4);
}

export const Default: Story = {
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('button', { name: 'Hide session details' });
    const row = canvas.getByTestId('session-details-row');
    const pulse = canvas.getByTestId('session-details-pulse');
    const caret = canvas.getByTestId('disclosure-caret');
    const title = canvas.getByTestId('session-details-primary-title');
    const secondaryTitle = canvas.getByTestId('session-details-secondary-title');

    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByText('Session')).toBeVisible();
    await expect(canvas.getByText('0:42')).toBeVisible();
    await expect(canvas.getByText('♥')).toBeVisible();
    await expect(canvas.getByText('156')).toBeVisible();
    await expect(canvas.getByText('Remaining')).toBeVisible();
    await expect(canvas.getByText('5:18')).toBeVisible();
    await expect(title).toHaveClass(/text-sm/);
    await expect(title).toHaveClass(/uppercase/);
    await expect(title).toHaveClass(/tracking-\[0\.18em\]/);
    await expect(title).toHaveClass(/text-\[color:var\(--muted\)\]/);
    await expect(title.className).toBe(secondaryTitle.className);
    expectPulseCentered(row, pulse);
    expectCaretAlignedWithTitle(caret, title);

    await userEvent.click(canvas.getByTestId('session-details-time'));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Show session details' })).toHaveAttribute('aria-expanded', 'false'));
    await waitFor(() => expect(caret).toHaveAttribute('data-state', 'closed'));

    await userEvent.click(canvas.getByTestId('session-details-bpm'));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Hide session details' })).toHaveAttribute('aria-expanded', 'true'));
    await waitFor(() => expect(caret).toHaveAttribute('data-state', 'open'));
  },
};

export const InitiallyClosed: Story = {
  args: {
    open: false,
  },
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('button', { name: 'Show session details' });

    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(canvas.getByTestId('disclosure-caret')).toHaveAttribute('data-state', 'closed');

    await userEvent.click(canvas.getByText('Session'));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Hide session details' })).toHaveAttribute('aria-expanded', 'true'));
    await waitFor(() => expect(canvas.getByTestId('disclosure-caret')).toHaveAttribute('data-state', 'open'));
  },
};
