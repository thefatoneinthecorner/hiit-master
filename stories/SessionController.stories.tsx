import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fn, userEvent } from 'storybook/test';

import '../app/src/styles.css';
import { SessionController } from '../app/src/ui/components/SessionController';
import sessionControllerSpec from '../specs/ui/components/SessionController.spec.md?raw';

type SessionControllerArgs = {
  sensorName?: string | null;
  batteryPercent?: number | null;
  playing?: boolean;
  onBluetooth: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
};

function clearSpies(args: SessionControllerArgs) {
  for (const spy of [args.onBluetooth, args.onPlay, args.onPause, args.onStop]) {
    (spy as { mockClear?: () => void }).mockClear?.();
  }
}

const meta = {
  title: 'Components/SessionController',
  component: SessionController,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: sessionControllerSpec,
      },
    },
  },
  args: {
    sensorName: 'Polar H10',
    batteryPercent: 82,
    playing: true,
    onBluetooth: fn(),
    onPlay: fn(),
    onPause: fn(),
    onStop: fn(),
  },
  argTypes: {
    sensorName: { control: 'text' },
    batteryPercent: { control: { type: 'number', min: 0, max: 100 } },
    playing: { control: 'boolean' },
  },
} satisfies Meta<SessionControllerArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onBluetooth: fn(),
    onPlay: fn(),
    onPause: fn(),
    onStop: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpies(args);

    await expect(canvas.getByText('Sensor')).toBeVisible();
    await expect(canvas.getByText('Polar H10')).toBeVisible();
    await expect(canvas.getByText('Battery')).toBeVisible();
    await expect(canvas.getByText('82%')).toBeVisible();

    const bluetooth = canvas.getByRole('button', { name: 'Bluetooth' });
    const play = canvas.getByRole('button', { name: 'Play' });
    const pause = canvas.getByRole('button', { name: 'Pause' });
    const stop = canvas.getByRole('button', { name: 'Stop' });

    await expect(bluetooth).toBeVisible();
    await expect(play).toBeVisible();
    await expect(pause).toBeVisible();
    await expect(stop).toBeVisible();
    await expect(play).toBeDisabled();
    await expect(pause).toBeEnabled();

    await userEvent.click(bluetooth);
    await userEvent.click(play);
    await userEvent.click(pause);
    await userEvent.click(stop);

    await expect(args.onBluetooth).toHaveBeenCalledTimes(1);
    await expect(args.onPlay).not.toHaveBeenCalled();
    await expect(args.onPause).toHaveBeenCalledTimes(1);
    await expect(args.onStop).toHaveBeenCalledTimes(1);
  },
};

export const MissingValues: Story = {
  args: {
    sensorName: null,
    batteryPercent: null,
    playing: false,
    onBluetooth: fn(),
    onPlay: fn(),
    onPause: fn(),
    onStop: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpies(args);

    await expect(canvas.getByText('Sensor')).toBeVisible();
    await expect(canvas.getByText('Battery')).toBeVisible();
    await expect(canvas.getByText('--')).toBeVisible();
    await expect(canvas.getByText('--%')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Play' })).toBeEnabled();
    await expect(canvas.getByRole('button', { name: 'Pause' })).toBeDisabled();

    await userEvent.click(canvas.getByRole('button', { name: 'Bluetooth' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Play' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Pause' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Stop' }));

    await expect(args.onBluetooth).toHaveBeenCalledTimes(1);
    await expect(args.onPlay).toHaveBeenCalledTimes(1);
    await expect(args.onPause).not.toHaveBeenCalled();
    await expect(args.onStop).toHaveBeenCalledTimes(1);
  },
};
