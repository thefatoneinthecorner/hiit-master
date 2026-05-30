import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fn, userEvent } from 'storybook/test';

import '../app/src/styles.css';
import { BPMRoundSettingsItem } from '../app/src/ui/components/BPMRoundSettingsItem';
import { RoundedPanel } from '../app/src/ui/components/RoundedPanel';
import bpmRoundSettingsItemSpec from '../specs/ui/components/BPMRoundSettingsItem.spec.md?raw';

type BPMRoundSettingsItemArgs = {
  label: string;
  maxBpm: number;
  minBpm: number;
  expanded: boolean;
  readOnly?: boolean;
  deleteDisabled?: boolean;
  onToggle: () => void;
  onMaxChange: (value: number) => void;
  onMinChange: (value: number) => void;
  onClone?: () => void;
  onDelete?: () => void;
};

function clearSpy(spy: (() => void) | ((value: number) => void) | undefined) {
  (spy as { mockClear?: () => void } | undefined)?.mockClear?.();
}

const meta = {
  title: 'Components/BPMRoundSettingsItem',
  component: BPMRoundSettingsItem,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: bpmRoundSettingsItemSpec,
      },
    },
  },
  render: (args) => (
    <RoundedPanel padding="sm">
      <BPMRoundSettingsItem {...args} />
    </RoundedPanel>
  ),
  args: {
    label: 'Round 1',
    maxBpm: 170,
    minBpm: 120,
    expanded: false,
    readOnly: false,
    deleteDisabled: false,
    onToggle: fn(),
    onMaxChange: fn(),
    onMinChange: fn(),
  },
} satisfies Meta<BPMRoundSettingsItemArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CollapsedRound: Story = {
  play: async ({ args, canvas }) => {
    clearSpy(args.onToggle);

    await expect(canvas.getByRole('button', { name: 'Round 1' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: '170-120 bpm' })).toBeVisible();

    await userEvent.click(canvas.getByTestId('bpm-round-settings-item-round-1'));

    await expect(args.onToggle).toHaveBeenCalledTimes(1);
  },
};

export const ExpandedEditableRound: Story = {
  args: {
    label: 'Round 3',
    maxBpm: 165,
    minBpm: 118,
    expanded: true,
    onToggle: fn(),
    onMaxChange: fn(),
    onMinChange: fn(),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Round 3' })).toBeVisible();
    await expect(canvas.getByText('Max')).toBeVisible();
    await expect(canvas.getByText('Min')).toBeVisible();
    await expect(canvas.getByText('165 bpm')).toBeVisible();
    await expect(canvas.getByText('118 bpm')).toBeVisible();
    await expect(canvas.getAllByRole('button', { name: 'Decrease' })).toHaveLength(2);
    await expect(canvas.getAllByRole('button', { name: 'Increase' })).toHaveLength(2);
  },
};

export const ExpandedRoundActions: Story = {
  args: {
    label: 'Round 6',
    maxBpm: 172,
    minBpm: 122,
    expanded: true,
    onToggle: fn(),
    onMaxChange: fn(),
    onMinChange: fn(),
    onClone: fn(),
    onDelete: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onClone);
    clearSpy(args.onDelete);

    await userEvent.click(canvas.getByRole('button', { name: 'Clone' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));

    await expect(args.onClone).toHaveBeenCalledTimes(1);
    await expect(args.onDelete).toHaveBeenCalledTimes(1);
  },
};

export const MinCannotExceedMax: Story = {
  args: {
    label: 'Round 2',
    maxBpm: 140,
    minBpm: 140,
    expanded: true,
    onToggle: fn(),
    onMaxChange: fn(),
    onMinChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onMinChange);

    await userEvent.click(canvas.getAllByRole('button', { name: 'Increase' })[1]!);

    await expect(args.onMinChange).toHaveBeenCalledWith(140);
  },
};
