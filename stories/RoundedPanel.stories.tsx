import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect } from 'storybook/test';

import '../app/src/styles.css';
import { RoundedPanel } from '../app/src/ui/components/RoundedPanel';
import roundedPanelSpec from '../specs/ui/components/RoundedPanel.spec.md?raw';

type RoundedPanelArgs = {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  radius?: 'md' | 'lg' | 'xl';
};

function PanelContent() {
  return (
    <div class="space-y-2">
      <div class="text-sm font-semibold text-[color:var(--ink)]">Panel content</div>
      <div class="text-sm text-[color:var(--muted)]">Shared chrome for larger framed sections.</div>
    </div>
  );
}

const meta = {
  title: 'Components/RoundedPanel',
  component: RoundedPanel,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: roundedPanelSpec,
      },
    },
  },
  render: (args) => (
    <div class="w-full max-w-md bg-[color:var(--canvas)] p-6">
      <RoundedPanel {...args} data-testid="rounded-panel">
        <PanelContent />
      </RoundedPanel>
    </div>
  ),
  args: {
    padding: 'md',
    radius: 'lg',
  },
  argTypes: {
    padding: { control: 'select', options: ['none', 'sm', 'md', 'lg'] },
    radius: { control: 'select', options: ['md', 'lg', 'xl'] },
  },
} satisfies Meta<RoundedPanelArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const panel = canvas.getByTestId('rounded-panel');

    await expect(panel).toBeVisible();
    await expect(panel).toHaveClass(/rounded-\[1\.6rem\]/);
    await expect(panel).toHaveClass(/border-\[color:var\(--line\)\]/);
    await expect(panel).toHaveClass(/bg-\[color:var\(--panel\)\]/);
    await expect(panel).toHaveClass(/p-4/);
  },
};

export const LargePadding: Story = {
  args: {
    padding: 'lg',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('rounded-panel')).toHaveClass(/p-5/);
  },
};

export const NoPadding: Story = {
  args: {
    padding: 'none',
  },
  play: async ({ canvas }) => {
    const panel = canvas.getByTestId('rounded-panel');

    await expect(panel).not.toHaveClass(/p-[345]/);
  },
};

export const ExtraLargeRadius: Story = {
  args: {
    radius: 'xl',
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('rounded-panel')).toHaveClass(/rounded-\[1\.8rem\]/);
  },
};
