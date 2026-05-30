import type { Meta, StoryObj } from '@storybook/preact-vite';
import { useState } from 'preact/hooks';
import { expect, fn } from 'storybook/test';

import '../app/src/styles.css';
import { getProfileBpmTargets } from '../app/src/domain/shared/profile';
import type { RoundAnalysis, SessionProfile } from '../app/src/domain/shared/types';
import { BPMSettingsScreenView } from '../app/src/ui/screens/BPMSettingsScreen';
import hiitMasterBackup from '../hiit-master-backup.json';
import bpmSettingsScreenSpec from '../specs/ui/screens/BPMSettingsScreen.spec.md?raw';

type BPMSettingsScreenArgs = {
  profiles: SessionProfile[];
  selectedProfileIndex: number;
  readOnly?: boolean;
  onImportFile: (file: File) => void;
  onExport: () => void;
};

type BackupSession = {
  startedAt: string;
  profileName: string;
  status: string;
  analysis: RoundAnalysis[];
};

const backup = hiitMasterBackup as { profiles: SessionProfile[]; sessions: BackupSession[] };
const finalMay27Session = backup.sessions.find((session) => session.startedAt.startsWith('2026-05-27') && session.status !== 'ended_early');
const finalMay27BpmTargets = finalMay27Session?.analysis
  .toSorted((left, right) => left.roundIndex - right.roundIndex)
  .map((round) => ({
    minBpm: round.trough ?? 1,
    maxBpm: Math.max(round.peak ?? round.trough ?? 1, round.trough ?? 1),
  })) ?? [];
const backupProfiles = backup.profiles.map((profile) =>
  profile.name === finalMay27Session?.profileName ? { ...profile, bpmTargets: finalMay27BpmTargets } : profile
);
const finalMay27ProfileIndex = Math.max(0, backupProfiles.findIndex((profile) => profile.name === finalMay27Session?.profileName));
const profileNamesWithSessions = new Set(backup.sessions.map((session) => session.profileName));

function BPMSettingsScreenStoryView(args: BPMSettingsScreenArgs) {
  const [profiles, setProfiles] = useState(args.profiles);
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(args.selectedProfileIndex);
  const selectedProfile = profiles[selectedProfileIndex];

  return (
    <div class="min-h-screen bg-[color:var(--canvas)] p-4">
      <BPMSettingsScreenView
        {...args}
        profiles={profiles}
        selectedProfileIndex={selectedProfileIndex}
        showNominalWorkPeriod={false}
        showNominalPeakHeartrate={false}
        roundSettingsKind="bpm"
        onProfileIndexChange={setSelectedProfileIndex}
        deleteProfileDisabled={selectedProfile ? profileNamesWithSessions.has(selectedProfile.name) : true}
        onNameChange={(value) => {
          setProfiles((current) => current.map((profile, index) => index === selectedProfileIndex ? { ...profile, name: value } : profile));
        }}
        onWorkDurationChange={(value) => {
          setProfiles((current) => current.map((profile, index) => index === selectedProfileIndex ? { ...profile, workDurationSec: value } : profile));
        }}
        onNominalPeakHeartrateChange={(value) => {
          setProfiles((current) => current.map((profile, index) => index === selectedProfileIndex ? { ...profile, nominalPeakHeartrate: value } : profile));
        }}
        onRecoveryMaxBpmChange={(roundIndex, value) => {
          setProfiles((current) =>
            current.map((profile, profileIndex) => {
              if (profileIndex !== selectedProfileIndex) {
                return profile;
              }
              const bpmTargets = getProfileBpmTargets(profile);
              const target = bpmTargets[roundIndex];
              if (!target) {
                return profile;
              }
              bpmTargets[roundIndex] = { ...target, maxBpm: Math.max(value, target.minBpm) };
              return { ...profile, bpmTargets };
            })
          );
        }}
        onRecoveryMinBpmChange={(roundIndex, value) => {
          setProfiles((current) =>
            current.map((profile, profileIndex) => {
              if (profileIndex !== selectedProfileIndex) {
                return profile;
              }
              const bpmTargets = getProfileBpmTargets(profile);
              const target = bpmTargets[roundIndex];
              if (!target) {
                return profile;
              }
              bpmTargets[roundIndex] = { ...target, minBpm: Math.min(value, target.maxBpm) };
              return { ...profile, bpmTargets };
            })
          );
        }}
        onNotesChange={(value) => {
          setProfiles((current) => current.map((profile, index) => index === selectedProfileIndex ? { ...profile, notes: value } : profile));
        }}
      />
      <div class="hidden" data-testid="bpm-settings-selected-profile-name">{selectedProfile?.name}</div>
    </div>
  );
}

const meta = {
  title: 'Pages/BPMSettingsScreen',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: bpmSettingsScreenSpec,
      },
    },
  },
  render: (args) => <BPMSettingsScreenStoryView {...args} />,
  args: {
    profiles: backupProfiles,
    selectedProfileIndex: finalMay27ProfileIndex,
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
} satisfies Meta<BPMSettingsScreenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ProfilePickerAndRounds: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Full Timer 2 2' })).toBeVisible();
    await expect(canvas.getByTestId('bpm-settings-selected-profile-name')).toHaveTextContent('Full Timer 2 2');
    await expect(canvas.getByRole('button', { name: 'Clone Profile' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Delete Profile' })).toBeDisabled();
    await expect(canvas.getByLabelText('Name')).toHaveValue('Full Timer 2 2');
    await expect(canvas.getByTestId('bpm-round-settings-table')).toBeVisible();
    await expect(canvas.getByRole('button', { name: '300s' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: '180s' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: '112-86 bpm' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: '154-152 bpm' })).toBeVisible();
    await expect(canvas.getByTestId('bpm-round-settings-item-round-13')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Round 13' })).toBeVisible();
    await expect(canvas.queryByText('Nominal Work Period')).not.toBeInTheDocument();
    await expect(canvas.queryByText('Nominal Peak Heartrate')).not.toBeInTheDocument();
    await expect(canvas.getByLabelText('Notes')).toBeVisible();
  },
};
