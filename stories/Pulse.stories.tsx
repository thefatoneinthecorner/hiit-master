import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fireEvent, waitFor } from 'storybook/test';
import { useEffect, useState } from 'preact/hooks';

import '../app/src/styles.css';
import { Pulse } from '../app/src/ui/components/Pulse';
import pulseSpec from '../specs/ui/components/Pulse.spec.md?raw';

type PulseArgs = {
  active?: boolean;
  beating?: boolean;
  label?: string;
  class?: string;
};

const meta = {
  title: 'Components/Pulse',
  component: Pulse,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: pulseSpec,
      },
    },
  },
  args: {
    active: false,
  },
  argTypes: {
    active: { control: 'boolean' },
    beating: { control: 'boolean' },
    label: { control: 'text' },
    class: { control: 'text' },
  },
} satisfies Meta<PulseArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

function LiveBpmSimulator() {
  const [bpm, setBpm] = useState(148);
  const [beatActive, setBeatActive] = useState(true);

  useEffect(() => {
    let releaseTimerId: number | null = null;

    const beat = () => {
      setBeatActive(true);
      if (releaseTimerId !== null) {
        window.clearTimeout(releaseTimerId);
      }
      releaseTimerId = window.setTimeout(() => {
        setBeatActive(false);
      }, Math.min(240, Math.max(120, (60000 / bpm) * 0.35)));
    };

    beat();
    const beatTimerId = window.setInterval(beat, 60000 / bpm);

    return () => {
      window.clearInterval(beatTimerId);
      if (releaseTimerId !== null) {
        window.clearTimeout(releaseTimerId);
      }
    };
  }, [bpm]);

  return (
    <div class="space-y-5 rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-5">
      <div>
        <div class="text-sm uppercase tracking-[0.18em] text-[color:var(--muted)]">Live BPM</div>
        <div class="mt-3 flex items-center gap-3 text-4xl font-semibold">
          <Pulse active beating={beatActive} />
          <span>{bpm}</span>
        </div>
      </div>
      <label class="grid gap-2">
        <span class="text-sm text-[color:var(--muted)]">Heart rate</span>
        <input
          type="range"
          min="40"
          max="210"
          step="1"
          value={bpm}
          onInput={(event) => setBpm(Number((event.currentTarget as HTMLInputElement).value))}
          class="w-full"
        />
      </label>
    </div>
  );
}

export const Resting: Story = {
  play: async ({ canvas }) => {
    const pulse = canvas.getByText('♥');

    await expect(pulse).toBeVisible();
    await expect(pulse).toHaveClass(/text-\[color:var\(--muted\)\]/);
    await expect(pulse).toHaveAttribute('aria-hidden', 'true');
  },
};

export const Active: Story = {
  args: {
    active: true,
  },
  play: async ({ canvas }) => {
    const pulse = canvas.getByText('♥');

    await expect(pulse).toBeVisible();
    await expect(pulse).toHaveClass(/pulse-heart/);
    await expect(pulse).toHaveClass(/text-\[color:var\(--danger\)\]/);
  },
};

export const AccessibleStandalone: Story = {
  args: {
    active: true,
    label: 'Live pulse',
  },
  play: async ({ canvas }) => {
    const pulse = canvas.getByRole('img', { name: 'Live pulse' });

    await expect(pulse).toBeVisible();
    await expect(pulse).not.toHaveAttribute('aria-hidden');
  },
};

export const LiveBpmContext: Story = {
  render: () => <LiveBpmSimulator />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Live BPM')).toBeVisible();
    await expect(canvas.getByText('148')).toBeVisible();
    await expect(canvas.getByLabelText('Heart rate')).toHaveValue('148');
    await waitFor(() => expect(canvas.getByText('♥')).toHaveClass(/pulse-heart/));
    await expect(canvas.getByText('♥')).toHaveClass(/text-\[color:var\(--danger\)\]/);

    const slider = canvas.getByLabelText('Heart rate') as HTMLInputElement;
    slider.value = '180';
    fireEvent.input(slider);

    await waitFor(() => expect(canvas.getByText('180')).toBeVisible());
    await expect(slider).toHaveValue('180');
  },
};
