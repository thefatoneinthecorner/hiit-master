import type { Meta, StoryObj } from '@storybook/preact-vite';
import { useState } from 'preact/hooks';
import { expect, userEvent } from 'storybook/test';

import '../app/src/styles.css';
import { SliderToggle, type SliderToggleOption } from '../app/src/ui/components/SliderToggle';
import sliderToggleSpec from '../specs/ui/components/SliderToggle.spec.md?raw';

type SliderToggleArgs = {
  options: [SliderToggleOption, SliderToggleOption];
  value: string;
  label: string;
};

function SliderToggleStoryView(args: SliderToggleArgs) {
  const [value, setValue] = useState(args.value);

  return (
    <div class="min-h-screen bg-[color:var(--canvas)] p-6">
      <SliderToggle {...args} value={value} onChange={setValue} />
      <div class="hidden" data-testid="selected-slider-toggle-value">{value}</div>
    </div>
  );
}

const meta = {
  title: 'Components/SliderToggle',
  component: SliderToggle,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: sliderToggleSpec,
      },
    },
  },
  render: (args) => <SliderToggleStoryView {...args} />,
  args: {
    label: 'Metric type',
    value: 'duration',
    options: [
      { value: 'duration', label: 'Duration' },
      { value: 'bpm', label: 'BPM' },
    ],
  },
  argTypes: {
    options: { table: { disable: true } },
  },
} satisfies Meta<SliderToggleArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DurationAndBpm: Story = {
  play: async ({ canvas }) => {
    const duration = canvas.getByRole('button', { name: 'Duration' });
    const bpm = canvas.getByRole('button', { name: 'BPM' });

    await expect(canvas.getByRole('group', { name: 'Metric type' })).toBeVisible();
    await expect(duration).toHaveAttribute('aria-pressed', 'true');
    await expect(bpm).toHaveAttribute('aria-pressed', 'false');
    await expect(canvas.getByTestId('selected-slider-toggle-value')).toHaveTextContent('duration');

    await userEvent.click(bpm);

    await expect(duration).toHaveAttribute('aria-pressed', 'false');
    await expect(bpm).toHaveAttribute('aria-pressed', 'true');
    await expect(canvas.getByTestId('selected-slider-toggle-value')).toHaveTextContent('bpm');
  },
};
