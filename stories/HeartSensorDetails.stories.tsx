import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fn, userEvent } from 'storybook/test';

import '../app/src/styles.css';
import { HeartSensorDetails } from '../app/src/ui/components/HeartSensorDetails';
import heartSensorDetailsSpec from '../specs/ui/components/HeartSensorDetails.spec.md?raw';

type HeartSensorDetailsArgs = {
  sensorName?: string | null;
  batteryPercent?: number | null;
  onReconnect: () => void;
  onDisconnect: () => void;
};

function clearSpy(spy: () => void) {
  (spy as { mockClear?: () => void }).mockClear?.();
}

const meta = {
  title: 'Components/HeartSensorDetails',
  component: HeartSensorDetails,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: heartSensorDetailsSpec,
      },
    },
  },
  args: {
    sensorName: 'Polar H10',
    batteryPercent: 82,
    onReconnect: fn(),
    onDisconnect: fn(),
  },
  argTypes: {
    sensorName: { control: 'text' },
    batteryPercent: { control: { type: 'number', min: 0, max: 100 } },
  },
} satisfies Meta<HeartSensorDetailsArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Connected: Story = {
  args: {
    onReconnect: fn(),
    onDisconnect: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onReconnect);
    clearSpy(args.onDisconnect);

    await expect(canvas.getByText('Sensor')).toBeVisible();
    await expect(canvas.getByText('Polar H10')).toBeVisible();
    await expect(canvas.getByText('Battery')).toBeVisible();
    await expect(canvas.getByText('82%')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Reconnect' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Disconnect' }));

    await expect(args.onReconnect).toHaveBeenCalledTimes(1);
    await expect(args.onDisconnect).toHaveBeenCalledTimes(1);
  },
};

export const MissingValues: Story = {
  args: {
    sensorName: null,
    batteryPercent: null,
    onReconnect: fn(),
    onDisconnect: fn(),
  },
  play: async ({ args, canvas }) => {
    clearSpy(args.onReconnect);
    clearSpy(args.onDisconnect);

    await expect(canvas.getByText('Sensor')).toBeVisible();
    await expect(canvas.getByText('Battery')).toBeVisible();
    await expect(canvas.getByText('--')).toBeVisible();
    await expect(canvas.getByText('--%')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Reconnect' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Disconnect' }));

    await expect(args.onReconnect).toHaveBeenCalledTimes(1);
    await expect(args.onDisconnect).toHaveBeenCalledTimes(1);
  },
};
