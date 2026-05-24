import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fn, userEvent } from 'storybook/test';

import '../app/src/styles.css';
import { IconButton } from '../app/src/ui/components/IconButton';
import iconButtonSpec from '../specs/ui/components/IconButton.spec.md?raw';

const copyIcon = new URL('../assets/copy.svg', import.meta.url).href;
const trashIcon = new URL('../assets/trash.svg', import.meta.url).href;

type IconButtonArgs = {
  label: string;
  iconSrc: string;
  variant?: 'default' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick: () => void;
};

function clearSpy(spy: IconButtonArgs['onClick']) {
  (spy as { mockClear?: () => void }).mockClear?.();
}

const meta = {
  title: 'Components/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: iconButtonSpec,
      },
    },
  },
  args: {
    label: 'Copy',
    iconSrc: copyIcon,
    variant: 'default',
    size: 'md',
    disabled: false,
    onClick: fn(),
  },
  argTypes: {
    label: { control: 'text' },
    iconSrc: { control: 'text' },
    variant: { control: 'select', options: ['default', 'danger', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<IconButtonArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onClick: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onClick);

    const button = canvas.getByRole('button', { name: 'Copy' });

    await expect(button).toBeVisible();
    await expect(button.querySelector('[aria-hidden="true"]')).toBeVisible();

    await userEvent.click(button);

    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const Danger: Story = {
  args: {
    label: 'Delete',
    iconSrc: trashIcon,
    variant: 'danger',
    onClick: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onClick);

    const button = canvas.getByRole('button', { name: 'Delete' });

    await expect(button).toHaveClass(/bg-\[color:var\(--danger\)\]/);
    await userEvent.click(button);

    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

export const GhostSmall: Story = {
  args: {
    label: 'Copy',
    iconSrc: copyIcon,
    variant: 'ghost',
    size: 'sm',
    onClick: fn(),
  },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Copy' });

    await expect(button).toHaveClass(/h-9/);
    await expect(button).toHaveClass(/border-transparent/);
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    onClick: fn(),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Copy' })).toHaveClass(/h-12/);
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    onClick: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onClick);

    const button = canvas.getByRole('button', { name: 'Copy' });

    await expect(button).toBeDisabled();
    await userEvent.click(button);

    await expect(args.onClick).not.toHaveBeenCalled();
  },
};
