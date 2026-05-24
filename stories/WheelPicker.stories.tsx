import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fireEvent, fn, userEvent, waitFor } from 'storybook/test';
import { useEffect, useState } from 'preact/hooks';

import '../app/src/styles.css';
import { WheelPicker } from '../app/src/ui/components/WheelPicker';

type WheelPickerArgs = {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
};

function ControlledWheelPicker(args: WheelPickerArgs) {
  const [value, setValue] = useState(args.value);

  useEffect(() => {
    setValue(args.value);
  }, [args.value]);

  return (
    <WheelPicker
      value={value}
      min={args.min}
      max={args.max}
      onChange={(next) => {
        setValue(next);
        args.onChange(next);
      }}
    />
  );
}

function clearSpy(spy: WheelPickerArgs['onChange']) {
  (spy as { mockClear?: () => void }).mockClear?.();
}

function getOption(canvas: { getByRole: (role: string, options: { name: string }) => HTMLElement }, value: number) {
  return canvas.getByRole('button', { name: String(value) });
}

const meta = {
  title: 'Components/WheelPicker',
  component: WheelPicker,
  tags: ['autodocs'],
  render: (args) => <ControlledWheelPicker {...args} />,
  args: {
    value: 30,
    min: 10,
    max: 40,
    onChange: () => {},
  },
  argTypes: {
    value: { control: { type: 'number', min: 0 } },
    min: { control: { type: 'number', min: 0 } },
    max: { control: { type: 'number', min: 0 } },
  },
} satisfies Meta<WheelPickerArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onChange);

    await expect(getOption(canvas, 10)).toBeVisible();
    await expect(getOption(canvas, 30)).toHaveClass(/text-\[color:var\(--ink\)\]/);
    await expect(getOption(canvas, 40)).toBeVisible();
  },
};

export const ClickSelectsValue: Story = {
  args: {
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onChange);

    await userEvent.click(getOption(canvas, 35));

    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith(35);
  },
};

export const SelectedNearMaximum: Story = {
  args: {
    value: 39,
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onChange);

    await expect(getOption(canvas, 39)).toHaveClass(/text-\[color:var\(--ink\)\]/);
    await expect(getOption(canvas, 40)).toBeVisible();
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

export const ScrollSelectsNearestValue: Story = {
  args: {
    value: 20,
    min: 20,
    max: 30,
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onChange);
    const scroller = canvas.getByTestId('wheel-picker-scroll') as HTMLDivElement;

    scroller.scrollTop = 144;
    fireEvent.scroll(scroller);

    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith(23));
  },
};

export const ScrollClampsToMaximum: Story = {
  args: {
    value: 20,
    min: 20,
    max: 24,
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onChange);
    const scroller = canvas.getByTestId('wheel-picker-scroll') as HTMLDivElement;

    scroller.scrollTop = 9999;
    fireEvent.scroll(scroller);

    await waitFor(() => expect(args.onChange).toHaveBeenCalledWith(24));
  },
};

export const CompactRange: Story = {
  args: {
    value: 5,
    min: 5,
    max: 8,
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onChange);

    await expect(getOption(canvas, 5)).toHaveClass(/text-\[color:var\(--ink\)\]/);
    await expect(getOption(canvas, 8)).toBeVisible();
    await expect(canvas.queryByRole('button', { name: '4' })).not.toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: '9' })).not.toBeInTheDocument();
  },
};

export const AutoCentersSelectedValue: Story = {
  args: {
    value: 37,
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onChange);

    await expect(getOption(canvas, 37)).toHaveClass(/text-\[color:var\(--ink\)\]/);
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};
