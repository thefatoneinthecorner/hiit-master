import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fireEvent, fn, waitFor } from 'storybook/test';
import { act } from '@testing-library/preact';
import { useEffect, useState } from 'preact/hooks';

import '../app/src/styles.css';
import { Stepper } from '../app/src/ui/components/Stepper';

type StepperArgs = {
  value: number;
  min?: number;
  disabled?: boolean;
  onChange: (next: number) => void;
};

function ControlledStepper(args: StepperArgs) {
  const [value, setValue] = useState(args.value);

  useEffect(() => {
    setValue(args.value);
  }, [args.value]);

  return (
    <Stepper
      value={value}
      min={args.min}
      disabled={args.disabled}
      onChange={(next) => {
        setValue(next);
        args.onChange(next);
      }}
    />
  );
}

async function pressAndRelease(button: HTMLElement, pointerId: number) {
  await act(async () => {
    dispatchPointerEvent(button, 'pointerdown', pointerId, 0, 0);
    dispatchPointerEvent(window, 'pointerup', pointerId, 0, 0);
  });
}

function dispatchPointerEvent(
  target: EventTarget,
  type: 'pointercancel' | 'pointerdown' | 'pointermove' | 'pointerup',
  pointerId: number,
  clientX: number,
  clientY: number
) {
  const event = new Event(type, { bubbles: true, cancelable: true }) as PointerEvent;

  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    clientX: { value: clientX },
    clientY: { value: clientY },
  });

  fireEvent(target, event);
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function clearSpy(spy: StepperArgs['onChange']) {
  (spy as { mockClear?: () => void }).mockClear?.();
}

const meta = {
  title: 'Components/Stepper',
  component: Stepper,
  tags: ['autodocs'],
  render: (args) => <ControlledStepper {...args} />,
  args: {
    value: 30,
    min: 1,
    disabled: false,
    onChange: () => {},
  },
  argTypes: {
    value: { control: { type: 'number', min: 0 } },
    min: { control: { type: 'number', min: 0 } },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<StepperArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Increment: Story = {
  args: {
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onChange);
    const increase = canvas.getByRole('button', { name: 'Increase' });

    await expect(canvas.getByText('30s')).toBeVisible();

    await pressAndRelease(increase, 1);
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith(31);
  },
};

export const Decrement: Story = {
  args: {
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onChange);
    const decrease = canvas.getByRole('button', { name: 'Decrease' });

    await expect(canvas.getByText('30s')).toBeVisible();

    await pressAndRelease(decrease, 2);
    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith(29);
  },
};

export const AtMinimum: Story = {
  args: {
    value: 5,
    min: 5,
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onChange);
    const decrease = canvas.getByRole('button', { name: 'Decrease' });

    await pressAndRelease(decrease, 3);

    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith(5);
    await expect(canvas.getByText('5s')).toBeVisible();
  },
};

export const LongPressStepsByFive: Story = {
  args: {
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onChange);
    const increase = canvas.getByRole('button', { name: 'Increase' });

    await act(async () => {
      dispatchPointerEvent(increase, 'pointerdown', 4, 0, 0);
      await wait(350);
      dispatchPointerEvent(window, 'pointerup', 4, 0, 0);
    });

    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith(35);
    await waitFor(() => expect(canvas.getByText('35s')).toBeVisible());
  },
};

export const DraggingVerticallyCancelsPress: Story = {
  args: {
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onChange);
    const increase = canvas.getByRole('button', { name: 'Increase' });

    await act(async () => {
      dispatchPointerEvent(increase, 'pointerdown', 5, 0, 0);
      dispatchPointerEvent(window, 'pointermove', 5, 1, 24);
      dispatchPointerEvent(window, 'pointerup', 5, 1, 24);
    });

    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByText('30s')).toBeVisible();
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    onChange: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onChange);
    const decrease = canvas.getByRole('button', { name: 'Decrease' });
    const increase = canvas.getByRole('button', { name: 'Increase' });

    await expect(decrease).toBeDisabled();
    await expect(increase).toBeDisabled();

    await pressAndRelease(increase, 6);

    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByText('30s')).toBeVisible();
  },
};
