import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { useState } from 'preact/hooks';

import '../app/src/styles.css';
import { CollapsiblePanel } from '../app/src/ui/components/CollapsiblePanel';
import { HeartSensorDetails } from '../app/src/ui/components/HeartSensorDetails';
import collapsiblePanelSpec from '../specs/ui/components/CollapsiblePanel.spec.md?raw';

type CollapsiblePanelArgs = {
  open: boolean;
};

const reconnect = fn();
const disconnect = fn();

function clearSpies() {
  reconnect.mockClear();
  disconnect.mockClear();
}

function HeartSensorDetailsDemo({ open: initialOpen }: CollapsiblePanelArgs) {
  const [open, setOpen] = useState(initialOpen);

  return (
    <div class="grid max-w-md gap-3">
      <button
        type="button"
        class="rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] px-4 py-3 font-semibold"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? 'Hide sensor details' : 'Show sensor details'}
      </button>
      <CollapsiblePanel open={open}>
        <HeartSensorDetails
          sensorName="Polar H10"
          batteryPercent={82}
          onReconnect={reconnect}
          onDisconnect={disconnect}
        />
      </CollapsiblePanel>
    </div>
  );
}

const meta = {
  title: 'Components/CollapsiblePanel',
  component: CollapsiblePanel,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: collapsiblePanelSpec,
      },
    },
  },
  render: (args) => <HeartSensorDetailsDemo {...args} />,
  args: {
    open: true,
  },
  argTypes: {
    open: { control: 'boolean' },
  },
} satisfies Meta<CollapsiblePanelArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithHeartSensorDetails: Story = {
  play: async ({ canvas }) => {
    clearSpies();

    await expect(canvas.getByText('Polar H10')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Reconnect' }));
    await expect(reconnect).toHaveBeenCalledTimes(1);

    await userEvent.click(canvas.getByRole('button', { name: 'Hide sensor details' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Show sensor details' })).toHaveAttribute('aria-expanded', 'false'));

    await userEvent.click(canvas.getByRole('button', { name: 'Show sensor details' }));
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Hide sensor details' })).toHaveAttribute('aria-expanded', 'true'));

    await userEvent.click(canvas.getByRole('button', { name: 'Disconnect' }));
    await expect(disconnect).toHaveBeenCalledTimes(1);
  },
};
