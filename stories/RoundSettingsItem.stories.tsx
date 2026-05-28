import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fn, userEvent } from 'storybook/test';

import '../app/src/styles.css';
import { RoundSettingsItem } from '../app/src/ui/components/RoundSettingsItem';
import roundSettingsItemSpec from '../specs/ui/components/RoundSettingsItem.spec.md?raw';

type RoundSettingsItemArgs = {
  label: string;
  valueSec: number;
  expanded: boolean;
  readOnly?: boolean;
  bordered?: boolean;
  deleteDisabled?: boolean;
  onToggle: () => void;
  onChange: (value: number) => void;
  onClone?: () => void;
  onDelete?: () => void;
};

function clearSpy(spy: (() => void) | ((value: number) => void) | undefined) {
  (spy as { mockClear?: () => void } | undefined)?.mockClear?.();
}

const meta = {
  title: 'Components/RoundSettingsItem',
  component: RoundSettingsItem,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: roundSettingsItemSpec,
      },
    },
  },
  args: {
    label: 'Round 1',
    valueSec: 90,
    expanded: false,
    readOnly: false,
    bordered: true,
    deleteDisabled: false,
    onToggle: fn(),
    onChange: fn(),
  },
  argTypes: {
    label: { control: 'text' },
    valueSec: { control: { type: 'number', min: 1 } },
    expanded: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    bordered: { control: 'boolean' },
    deleteDisabled: { control: 'boolean' },
  },
} satisfies Meta<RoundSettingsItemArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CollapsedWarmup: Story = {
  args: {
    label: 'Warmup',
    valueSec: 300,
    onToggle: fn(),
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onToggle);

    await expect(canvas.getByRole('button', { name: 'Warmup' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: '300s' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Increase' })).not.toBeInTheDocument();

    await userEvent.click(canvas.getByTestId('round-settings-item-warmup'));
    await userEvent.click(canvas.getByRole('button', { name: 'Warmup' }));

    await expect(args.onToggle).toHaveBeenCalledTimes(2);
  },
};

export const ExpandedEditableRound: Story = {
  args: {
    label: 'Round 3',
    valueSec: 60,
    expanded: true,
    onToggle: fn(),
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onToggle);

    await expect(canvas.getByRole('button', { name: 'Round 3' })).toBeVisible();
    await expect(canvas.getByText('60s')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Decrease' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Increase' })).toBeVisible();

    await userEvent.click(canvas.getByTestId('round-settings-item-round-3'));
    await userEvent.click(canvas.getByRole('button', { name: 'Round 3' }));

    await expect(args.onToggle).toHaveBeenCalledTimes(2);
  },
};

export const ExpandedRoundActions: Story = {
  args: {
    label: 'Round 6',
    valueSec: 30,
    expanded: true,
    onToggle: fn(),
    onChange: fn(),
    onClone: fn(),
    onDelete: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onToggle);
    clearSpy(args.onClone);
    clearSpy(args.onDelete);

    await userEvent.click(canvas.getByRole('button', { name: 'Clone' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Delete' }));

    await expect(args.onClone).toHaveBeenCalledTimes(1);
    await expect(args.onDelete).toHaveBeenCalledTimes(1);
    await expect(args.onToggle).not.toHaveBeenCalled();
  },
};

export const ReadOnlyExpanded: Story = {
  args: {
    label: 'Cooldown',
    valueSec: 180,
    expanded: true,
    readOnly: true,
    onToggle: fn(),
    onChange: fn(),
    onClone: fn(),
    onDelete: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onClone);
    clearSpy(args.onDelete);

    await expect(canvas.getByText('Read only')).toBeVisible();
    await expect(canvas.getByText('180s')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Clone' })).not.toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    await expect(args.onClone).not.toHaveBeenCalled();
    await expect(args.onDelete).not.toHaveBeenCalled();
  },
};

export const DeleteDisabled: Story = {
  args: {
    label: 'Round 1',
    valueSec: 90,
    expanded: true,
    deleteDisabled: true,
    onToggle: fn(),
    onChange: fn(),
    onClone: fn(),
    onDelete: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onClone);
    clearSpy(args.onDelete);

    const deleteButton = canvas.getByRole('button', { name: 'Delete' });

    await expect(deleteButton).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: 'Clone' }));

    await expect(args.onClone).toHaveBeenCalledTimes(1);
    await expect(args.onDelete).not.toHaveBeenCalled();
  },
};
