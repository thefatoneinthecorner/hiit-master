import type { Meta, StoryObj } from '@storybook/preact-vite';
import { expect, fn, userEvent } from 'storybook/test';
import { useEffect, useState } from 'preact/hooks';

import '../app/src/styles.css';
import { RoundSettingsTable } from '../app/src/ui/components/RoundSettingsTable';
import hiitMasterBackup from '../hiit-master-backup.json';
import roundSettingsTableSpec from '../specs/ui/components/RoundSettingsTable.spec.md?raw';

type RoundSettingsTableArgs = {
  warmupSec: number;
  baseRestsSec: number[];
  cooldownBaseSec: number;
  readOnly?: boolean;
  onWarmupChange?: (value: number) => void;
  onRecoveryChange?: (index: number, value: number) => void;
  onCooldownChange?: (value: number) => void;
  onCloneRecovery?: (index: number) => void;
  onDeleteRecovery?: (index: number) => void;
};

type BackupProfile = {
  name: string;
  warmupSec: number;
  baseRestsSec: number[];
  cooldownBaseSec: number;
};

const fullTimer2 =
  (hiitMasterBackup as { profiles?: BackupProfile[] }).profiles?.find((profile) => profile.name === 'Full Timer 2') ??
  ({
    name: 'Full Timer 2',
    warmupSec: 300,
    baseRestsSec: [90, 75, 60, 45, 35, 30, 30, 30, 30, 30, 30, 30, 30],
    cooldownBaseSec: 180,
  } satisfies BackupProfile);

function clearSpy(spy: unknown) {
  (spy as { mockClear?: () => void } | undefined)?.mockClear?.();
}

function InteractiveRoundSettingsTable(args: RoundSettingsTableArgs) {
  const [warmupSec, setWarmupSec] = useState(args.warmupSec);
  const [baseRestsSec, setBaseRestsSec] = useState(args.baseRestsSec);
  const [cooldownBaseSec, setCooldownBaseSec] = useState(args.cooldownBaseSec);

  useEffect(() => {
    setWarmupSec(args.warmupSec);
    setBaseRestsSec(args.baseRestsSec);
    setCooldownBaseSec(args.cooldownBaseSec);
  }, [args.warmupSec, args.baseRestsSec, args.cooldownBaseSec]);

  return (
    <RoundSettingsTable
      {...args}
      warmupSec={warmupSec}
      baseRestsSec={baseRestsSec}
      cooldownBaseSec={cooldownBaseSec}
      onWarmupChange={(value) => {
        setWarmupSec(value);
        args.onWarmupChange?.(value);
      }}
      onRecoveryChange={(index, value) => {
        setBaseRestsSec((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
        args.onRecoveryChange?.(index, value);
      }}
      onCooldownChange={(value) => {
        setCooldownBaseSec(value);
        args.onCooldownChange?.(value);
      }}
      onCloneRecovery={(index) => {
        setBaseRestsSec((current) => {
          const next = [...current];
          next.splice(index + 1, 0, current[index] ?? 1);
          return next;
        });
        args.onCloneRecovery?.(index);
      }}
      onDeleteRecovery={(index) => {
        setBaseRestsSec((current) => (current.length <= 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
        args.onDeleteRecovery?.(index);
      }}
    />
  );
}

const meta = {
  title: 'Components/RoundSettingsTable',
  component: RoundSettingsTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: roundSettingsTableSpec,
      },
    },
  },
  render: (args) => (
    <div class="min-h-screen bg-[color:var(--canvas)] p-4" data-testid="round-settings-table-story-scroll">
      <div class="mx-auto max-w-2xl rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
        <InteractiveRoundSettingsTable {...args} />
      </div>
    </div>
  ),
  args: {
    warmupSec: fullTimer2.warmupSec,
    baseRestsSec: fullTimer2.baseRestsSec,
    cooldownBaseSec: fullTimer2.cooldownBaseSec,
    readOnly: false,
    onWarmupChange: fn(),
    onRecoveryChange: fn(),
    onCooldownChange: fn(),
    onCloneRecovery: fn(),
    onDeleteRecovery: fn(),
  },
  argTypes: {
    baseRestsSec: { table: { disable: true } },
    onWarmupChange: { table: { disable: true } },
    onRecoveryChange: { table: { disable: true } },
    onCooldownChange: { table: { disable: true } },
    onCloneRecovery: { table: { disable: true } },
    onDeleteRecovery: { table: { disable: true } },
  },
} satisfies Meta<RoundSettingsTableArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FullTimer2: Story = {
  play: async ({ args, canvas }) => {
    clearSpy(args.onRecoveryChange);
    clearSpy(args.onCloneRecovery);
    clearSpy(args.onDeleteRecovery);

    await expect(canvas.getByTestId('round-settings-table-story-scroll')).toHaveClass(/min-h-screen/);
    await expect(canvas.getByTestId('round-settings-table')).toBeVisible();
    await expect(canvas.getByTestId('round-settings-table')).not.toHaveClass(/space-y-/);
    await expect(canvas.getByTestId('round-settings-item-warmup')).not.toHaveClass(/rounded/);
    await expect(canvas.getByTestId('round-settings-item-warmup')).not.toHaveClass(/border/);
    await expect(canvas.getByTestId('round-settings-item-warmup')).toHaveClass(/py-1/);
    await expect(canvas.getByRole('button', { name: 'Warmup' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Round 1' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Round 13' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Cooldown' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: '90s' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: '75s' })).toBeVisible();
    await expect(canvas.getAllByRole('button', { name: '30s' })).toHaveLength(8);

    await userEvent.click(canvas.getByRole('button', { name: 'Round 3' }));

    await expect(canvas.getByRole('button', { name: 'Clone' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Delete' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Decrease' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Increase' })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Increase' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Clone' }));

    await expect(args.onRecoveryChange).toHaveBeenCalledWith(2, 61);
    await expect(args.onCloneRecovery).toHaveBeenCalledWith(2);
    await expect(args.onDeleteRecovery).not.toHaveBeenCalled();
    await expect(canvas.getAllByText('61s').length).toBeGreaterThan(0);
    await expect(canvas.getByRole('button', { name: 'Round 14' })).toBeVisible();
  },
};

export const ReadOnly: Story = {
  args: {
    readOnly: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByTestId('round-settings-table-story-scroll')).toHaveClass(/min-h-screen/);
    await userEvent.click(canvas.getByRole('button', { name: 'Round 3' }));

    await expect(canvas.getByText('Read only')).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Clone' })).not.toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    await expect(canvas.queryByRole('button', { name: 'Increase' })).not.toBeInTheDocument();
  },
};
