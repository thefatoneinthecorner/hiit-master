import type { Meta, StoryObj } from '@storybook/preact-vite';
import { useState } from 'preact/hooks';
import { expect, fn, userEvent } from 'storybook/test';

import '../app/src/styles.css';
import type { SessionProfile } from '../app/src/domain/shared/types';
import { SettingsScreenView } from '../app/src/ui/screens/SettingsScreen';
import hiitMasterBackup from '../hiit-master-backup.json';
import settingsScreenSpec from '../specs/ui/screens/SettingsScreen.spec.md?raw';

type SettingsScreenArgs = {
  profiles: SessionProfile[];
  selectedProfileIndex: number;
  readOnly?: boolean;
  onImportFile: (file: File) => void;
  onExport: () => void;
};

const backupProfiles = (hiitMasterBackup as { profiles: SessionProfile[] }).profiles;
const fullTimer2Index = backupProfiles.findIndex((profile) => profile.name === 'Full Timer 2');
const myProfile2Index = backupProfiles.findIndex((profile) => profile.name === 'My Profile 2');

function SettingsScreenStoryView(args: SettingsScreenArgs) {
  const [profiles, setProfiles] = useState(args.profiles);
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(args.selectedProfileIndex);
  const selectedProfile = profiles[selectedProfileIndex];

  return (
    <div class="min-h-screen bg-[color:var(--canvas)] p-4">
      <SettingsScreenView
        {...args}
        profiles={profiles}
        selectedProfileIndex={selectedProfileIndex}
        onProfileIndexChange={setSelectedProfileIndex}
        onWarmupChange={(value) => {
          setProfiles((current) => current.map((profile, index) => index === selectedProfileIndex ? { ...profile, warmupSec: value } : profile));
        }}
        onRecoveryChange={(roundIndex, value) => {
          setProfiles((current) =>
            current.map((profile, profileIndex) =>
              profileIndex === selectedProfileIndex
                ? {
                  ...profile,
                  baseRestsSec: profile.baseRestsSec.map((rest, restIndex) => restIndex === roundIndex ? value : rest),
                }
                : profile
            )
          );
        }}
        onCooldownChange={(value) => {
          setProfiles((current) => current.map((profile, index) => index === selectedProfileIndex ? { ...profile, cooldownBaseSec: value } : profile));
        }}
        onCloneRecovery={(roundIndex) => {
          setProfiles((current) =>
            current.map((profile, profileIndex) => {
              if (profileIndex !== selectedProfileIndex) {
                return profile;
              }
              const nextBaseRestsSec = [...profile.baseRestsSec];
              nextBaseRestsSec.splice(roundIndex + 1, 0, nextBaseRestsSec[roundIndex] ?? 30);
              return { ...profile, baseRestsSec: nextBaseRestsSec };
            })
          );
        }}
        onDeleteRecovery={(roundIndex) => {
          setProfiles((current) =>
            current.map((profile, profileIndex) =>
              profileIndex === selectedProfileIndex && profile.baseRestsSec.length > 1
                ? { ...profile, baseRestsSec: profile.baseRestsSec.filter((_, index) => index !== roundIndex) }
                : profile
            )
          );
        }}
      />
      <div class="hidden" data-testid="settings-selected-profile-name">{selectedProfile?.name}</div>
    </div>
  );
}

const meta = {
  title: 'Pages/SettingsScreen',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: settingsScreenSpec,
      },
    },
  },
  render: (args) => <SettingsScreenStoryView {...args} />,
  args: {
    profiles: backupProfiles,
    selectedProfileIndex: fullTimer2Index,
    readOnly: false,
    onImportFile: fn(),
    onExport: fn(),
  },
  argTypes: {
    profiles: { table: { disable: true } },
    selectedProfileIndex: { table: { disable: true } },
    onImportFile: { table: { disable: true } },
    onExport: { table: { disable: true } },
  },
} satisfies Meta<SettingsScreenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProfilePickerAndRounds: Story = {
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Import' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Export' }));
    await expect(args.onExport).toHaveBeenCalledTimes(1);

    await expect(canvas.getByRole('button', { name: 'Full Timer 2' })).toBeVisible();
    await expect(canvas.getByTestId('settings-selected-profile-name')).toHaveTextContent('Full Timer 2');
    await expect(canvas.getByRole('button', { name: 'Round 13' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: '300s' })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'My Profile 2' }));

    await expect(canvas.getByTestId('settings-selected-profile-name')).toHaveTextContent('My Profile 2');
    await expect(canvas.getAllByRole('button', { name: '60s' }).length).toBeGreaterThan(0);
    await expect(canvas.getByRole('button', { name: 'Round 12' })).toBeVisible();
    await expect(canvas.queryByRole('button', { name: 'Round 13' })).not.toBeInTheDocument();
  },
};
