import type { Meta, StoryObj } from '@storybook/preact-vite';
import { useState } from 'preact/hooks';
import { expect, fn, userEvent } from 'storybook/test';

import '../app/src/styles.css';
import type { SessionProfile } from '../app/src/domain/shared/types';
import { LegacySettingsScreenView, type LegacyProfileDraft } from '../app/src/ui/screens/LegacySettingsScreen';
import hiitMasterBackup from '../hiit-master-backup.json';

type LegacySettingsScreenArgs = {
  profiles: SessionProfile[];
  selectedProfileId: string;
  draft: LegacyProfileDraft;
  referenced?: boolean;
};

const backupProfiles = (hiitMasterBackup as { profiles: SessionProfile[] }).profiles;
const fullTimer2 = backupProfiles.find((profile) => profile.name === 'Full Timer 2') ?? backupProfiles[0];

function LegacySettingsScreenStoryView(args: LegacySettingsScreenArgs) {
  const [profiles, setProfiles] = useState(args.profiles);
  const [selectedProfileId, setSelectedProfileId] = useState(args.selectedProfileId);
  const [draft, setDraft] = useState(args.draft);

  return (
    <div class="min-h-screen bg-[color:var(--canvas)] p-4">
      <LegacySettingsScreenView
        profiles={profiles}
        selectedProfileId={selectedProfileId}
        draft={draft}
        referenced={args.referenced}
        hasSingleProfile={profiles.length <= 1}
        onImportFile={fn()}
        onExport={fn()}
        onEditProfile={(profileId) => {
          const profile = profiles.find((item) => item.id === profileId);
          if (profile) {
            setDraft({ ...profile, isDirty: false });
          }
        }}
        onSelectProfile={setSelectedProfileId}
        onDeleteProfile={(profileId) => {
          setProfiles((current) => current.filter((profile) => profile.id !== profileId));
        }}
        onCopyProfile={(profileId) => {
          const source = profiles.find((profile) => profile.id === profileId);
          if (!source) {
            return;
          }
          const copy = { ...source, id: `${source.id}-copy`, name: `${source.name} Copy` };
          setProfiles((current) => [...current, copy]);
          setDraft({ ...copy, isDirty: false });
        }}
        onSaveDraftProfile={() => {
          setProfiles((current) => current.map((profile) => profile.id === draft.id ? { ...draft } : profile));
          setDraft((current) => ({ ...current, isDirty: false }));
        }}
        onUpdateDraftProfile={(patch) => setDraft((current) => ({ ...current, ...patch, isDirty: true }))}
        onUpdateDraftRecovery={(index, value) => {
          setDraft((current) => ({
            ...current,
            baseRestsSec: current.baseRestsSec.map((rest, restIndex) => restIndex === index ? value : rest),
            isDirty: true,
          }));
        }}
        onCloneDraftRecovery={(index) => {
          setDraft((current) => {
            const nextBaseRestsSec = [...current.baseRestsSec];
            nextBaseRestsSec.splice(index + 1, 0, nextBaseRestsSec[index] ?? 30);
            return { ...current, baseRestsSec: nextBaseRestsSec, isDirty: true };
          });
        }}
        onDeleteDraftRecovery={(index) => {
          setDraft((current) => current.baseRestsSec.length <= 1
            ? current
            : { ...current, baseRestsSec: current.baseRestsSec.filter((_, restIndex) => restIndex !== index), isDirty: true });
        }}
        onCancelDiscardSwitch={fn()}
        onConfirmDiscardAndSwitch={fn()}
      />
    </div>
  );
}

const meta = {
  title: 'Pages/SettingsScreen/Legacy Reference',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  render: (args) => <LegacySettingsScreenStoryView {...args} />,
  args: {
    profiles: backupProfiles,
    selectedProfileId: fullTimer2.id,
    draft: { ...fullTimer2, isDirty: false },
    referenced: false,
  },
  argTypes: {
    profiles: { table: { disable: true } },
    selectedProfileId: { table: { disable: true } },
    draft: { table: { disable: true } },
  },
} satisfies Meta<LegacySettingsScreenArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FullEditor: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: 'Import' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Export' })).toBeVisible();
    await expect(canvas.getByText('Selected Profile')).toBeVisible();
    await expect(canvas.getByDisplayValue('Full Timer 2')).toBeVisible();
    await expect(canvas.getByText('Nominal Work Period')).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Copy Profile' })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Round 3' }));

    await expect(canvas.getByRole('button', { name: 'Clone' })).toBeVisible();
    await expect(canvas.getAllByRole('button', { name: 'Delete' }).length).toBeGreaterThan(1);
  },
};
