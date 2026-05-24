import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { useState } from 'preact/hooks';

import '../app/src/styles.css';
import { CollapsiblePanel } from '../app/src/ui/components/CollapsiblePanel';
import { DisclosureToggle } from '../app/src/ui/components/DisclosureToggle';
import { HeartSensorDetails } from '../app/src/ui/components/HeartSensorDetails';
import { Pulse } from '../app/src/ui/components/Pulse';
import disclosureToggleSpec from '../specs/ui/components/DisclosureToggle.spec.md?raw';

type DisclosureToggleArgs = {
  open: boolean;
};

const reconnect = fn();
const disconnect = fn();

function clearSpies() {
  reconnect.mockClear();
  disconnect.mockClear();
}

function PulseSensorDemo({ open: initialOpen }: DisclosureToggleArgs) {
  const [open, setOpen] = useState(initialOpen);
  const panelId = 'heart-sensor-details-panel';

  return (
    <div class="grid max-w-md gap-3">
      <DisclosureToggle
        open={open}
        label={open ? 'Hide heart sensor details' : 'Show heart sensor details'}
        controls={panelId}
        onToggle={() => setOpen((current) => !current)}
      >
        <span class="flex items-center gap-3 text-lg font-semibold">
          <Pulse active={open} beating={open} />
          <span>Heart Sensor</span>
        </span>
      </DisclosureToggle>
      <div id={panelId}>
        <CollapsiblePanel open={open}>
          <HeartSensorDetails
            sensorName="Polar H10"
            batteryPercent={82}
            onReconnect={reconnect}
            onDisconnect={disconnect}
          />
        </CollapsiblePanel>
      </div>
    </div>
  );
}

const meta = {
  title: 'Components/DisclosureToggle',
  component: DisclosureToggle,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: disclosureToggleSpec,
      },
    },
  },
  render: (args) => <PulseSensorDemo {...args} />,
  args: {
    open: true,
  },
  argTypes: {
    open: { control: 'boolean' },
  },
} satisfies Meta<DisclosureToggleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithPulseAndHeartSensorDetails: Story = {
  play: async ({ canvas }) => {
    clearSpies();

    await expect(canvas.getByRole('button', { name: 'Hide heart sensor details' })).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByTestId('disclosure-caret')).toBeVisible();
    await expect(canvas.getByTestId('disclosure-caret')).toHaveAttribute('data-state', 'open');
    await expect(canvas.getByText('Polar H10')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Reconnect' }));
    await expect(reconnect).toHaveBeenCalledTimes(1);

    await userEvent.click(canvas.getByRole('button', { name: 'Hide heart sensor details' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Show heart sensor details' })).toHaveAttribute('aria-expanded', 'false'));
    await waitFor(() => expect(canvas.getByTestId('disclosure-caret')).toHaveAttribute('data-state', 'closed'));

    await userEvent.click(canvas.getByRole('button', { name: 'Show heart sensor details' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Hide heart sensor details' })).toHaveAttribute('aria-expanded', 'true'));
    await waitFor(() => expect(canvas.getByTestId('disclosure-caret')).toHaveAttribute('data-state', 'open'));

    await userEvent.click(canvas.getByRole('button', { name: 'Disconnect' }));
    await expect(disconnect).toHaveBeenCalledTimes(1);
  },
};
