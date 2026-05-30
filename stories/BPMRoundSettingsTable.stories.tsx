import type { Meta, StoryObj } from '@storybook/preact-vite';
import { useState } from 'preact/hooks';
import { expect, fn, userEvent } from 'storybook/test';

import '../app/src/styles.css';
import { getProfileBpmTargets } from '../app/src/domain/shared/profile';
import type { BPMRoundTarget } from '../app/src/domain/shared/types';
import { BPMRoundSettingsTable } from '../app/src/ui/components/BPMRoundSettingsTable';
import hiitMasterBackup from '../hiit-master-backup.json';
import bpmRoundSettingsTableSpec from '../specs/ui/components/BPMRoundSettingsTable.spec.md?raw';

type BPMRoundSettingsTableArgs = {
  warmupSec: number;
  bpmTargets: BPMRoundTarget[];
  cooldownBaseSec: number;
  readOnly?: boolean;
  onRecoveryMaxChange?: (index: number, value: number) => void;
  onRecoveryMinChange?: (index: number, value: number) => void;
  onCloneRecovery?: (index: number) => void;
};

type BackupProfile = {
  name: string;
  warmupSec: number;
  baseRestsSec: number[];
  cooldownBaseSec: number;
};

const fullTimer2 = (hiitMasterBackup as { profiles?: BackupProfile[] }).profiles?.find((profile) => profile.name === 'Full Timer 2')!;

function InteractiveBPMRoundSettingsTable(args: BPMRoundSettingsTableArgs) {
  const [bpmTargets, setBpmTargets] = useState(args.bpmTargets);

  return (
    <BPMRoundSettingsTable
      {...args}
      bpmTargets={bpmTargets}
      onRecoveryMaxChange={(index, value) => {
        setBpmTargets((current) =>
          current.map((item, itemIndex) => itemIndex === index ? { ...item, maxBpm: Math.max(value, item.minBpm) } : item)
        );
        args.onRecoveryMaxChange?.(index, value);
      }}
      onRecoveryMinChange={(index, value) => {
        setBpmTargets((current) =>
          current.map((item, itemIndex) => itemIndex === index ? { ...item, minBpm: Math.min(value, item.maxBpm) } : item)
        );
        args.onRecoveryMinChange?.(index, value);
      }}
      onCloneRecovery={(index) => {
        setBpmTargets((current) => {
          const next = [...current];
          next.splice(index + 1, 0, current[index] ?? { minBpm: 1, maxBpm: 1 });
          return next;
        });
        args.onCloneRecovery?.(index);
      }}
    />
  );
}

const meta = {
  title: 'Components/BPMRoundSettingsTable',
  component: BPMRoundSettingsTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: bpmRoundSettingsTableSpec,
      },
    },
  },
  render: (args) => (
    <div class="min-h-screen bg-[color:var(--canvas)] p-4">
      <InteractiveBPMRoundSettingsTable {...args} />
    </div>
  ),
  args: {
    warmupSec: fullTimer2.warmupSec,
    bpmTargets: getProfileBpmTargets({
      ...fullTimer2,
      id: 'full-timer-2',
      workDurationSec: 30,
      nominalPeakHeartrate: 170,
      notes: '',
    }),
    cooldownBaseSec: fullTimer2.cooldownBaseSec,
    readOnly: false,
    onRecoveryMaxChange: fn(),
    onRecoveryMinChange: fn(),
    onCloneRecovery: fn(),
  },
  argTypes: {
    bpmTargets: { table: { disable: true } },
    onRecoveryMaxChange: { table: { disable: true } },
    onRecoveryMinChange: { table: { disable: true } },
    onCloneRecovery: { table: { disable: true } },
  },
} satisfies Meta<BPMRoundSettingsTableArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FullTimer2: Story = {
  play: async ({ args, canvas }) => {
    (args.onRecoveryMaxChange as { mockClear?: () => void } | undefined)?.mockClear?.();
    (args.onRecoveryMinChange as { mockClear?: () => void } | undefined)?.mockClear?.();
    (args.onCloneRecovery as { mockClear?: () => void } | undefined)?.mockClear?.();

    await expect(canvas.getByTestId('bpm-round-settings-table')).toBeVisible();
    await expect(canvas.getByTestId('round-settings-item-warmup')).toBeVisible();
    await expect(canvas.getByRole('button', { name: '300s' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: '180s' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Round 13' })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Round 3' }));
    await expect(canvas.getByText('Max')).toBeVisible();
    await expect(canvas.getByText('Min')).toBeVisible();
    await expect(canvas.getByText('166 bpm')).toBeVisible();
    await expect(canvas.getByText('146 bpm')).toBeVisible();
    await userEvent.click(canvas.getAllByRole('button', { name: 'Increase' })[0]!);
    await userEvent.click(canvas.getByRole('button', { name: 'Clone' }));

    await expect(args.onRecoveryMaxChange).toHaveBeenCalledWith(2, 167);
    await expect(args.onCloneRecovery).toHaveBeenCalledWith(2);
    await expect(canvas.getByRole('button', { name: 'Round 14' })).toBeVisible();
  },
};
