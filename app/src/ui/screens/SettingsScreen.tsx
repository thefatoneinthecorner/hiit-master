import { useRef } from 'preact/hooks';

import { appStore } from '../../application/store';
import type { SessionProfile } from '../../domain/shared/types';
import { RoundSettingsTable } from '../components/RoundSettingsTable';
import { WheelPicker } from '../components/WheelPicker';

interface SettingsScreenViewProps {
  profiles: SessionProfile[];
  selectedProfileIndex: number;
  readOnly?: boolean;
  onProfileIndexChange: (index: number) => void;
  onImportFile: (file: File) => void;
  onExport: () => void;
  onWarmupChange?: (value: number) => void;
  onRecoveryChange?: (index: number, value: number) => void;
  onCooldownChange?: (value: number) => void;
  onCloneRecovery?: (index: number) => void;
  onDeleteRecovery?: (index: number) => void;
}

export function SettingsScreenView({
  profiles,
  selectedProfileIndex,
  readOnly = false,
  onProfileIndexChange,
  onImportFile,
  onExport,
  onWarmupChange,
  onRecoveryChange,
  onCooldownChange,
  onCloneRecovery,
  onDeleteRecovery,
}: SettingsScreenViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedIndex = Math.min(Math.max(selectedProfileIndex, 0), Math.max(profiles.length - 1, 0));
  const selectedProfile = profiles[selectedIndex] ?? null;

  return (
    <section class="shrink-0 space-y-4 pb-8">
      <div class="flex gap-3">
        <button type="button" class="rounded-full bg-[color:var(--accent)] px-5 py-3 font-semibold text-[color:var(--accent-ink)]" onClick={() => fileInputRef.current?.click()}>
          Import
        </button>
        <button type="button" class="rounded-full border border-[color:var(--line)] bg-[color:var(--panel)] px-5 py-3 font-semibold" onClick={onExport}>
          Export
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          class="hidden"
          onChange={(event) => {
            const file = (event.currentTarget as HTMLInputElement).files?.[0];
            if (file) {
              onImportFile(file);
            }
          }}
        />
      </div>

      {selectedProfile ? (
        <>
          <WheelPicker
            value={selectedIndex}
            min={0}
            max={profiles.length - 1}
            labels={profiles.map((profile) => profile.name)}
            onChange={onProfileIndexChange}
          />
          <RoundSettingsTable
            warmupSec={selectedProfile.warmupSec}
            baseRestsSec={selectedProfile.baseRestsSec}
            cooldownBaseSec={selectedProfile.cooldownBaseSec}
            readOnly={readOnly}
            {...(onWarmupChange ? { onWarmupChange } : {})}
            {...(onRecoveryChange ? { onRecoveryChange } : {})}
            {...(onCooldownChange ? { onCooldownChange } : {})}
            {...(onCloneRecovery ? { onCloneRecovery } : {})}
            {...(onDeleteRecovery ? { onDeleteRecovery } : {})}
          />
        </>
      ) : null}
    </section>
  );
}

export function SettingsScreen() {
  const profiles = appStore.profiles.value;
  const draft = appStore.profileDraft.value;
  const draftProfileIndex = profiles.findIndex((profile) => profile.id === appStore.draftProfileId.value);
  const selectedProfileIndex = draftProfileIndex >= 0
    ? draftProfileIndex
    : Math.max(0, profiles.findIndex((profile) => profile.id === appStore.selectedProfile.value.id));
  const displayProfiles = draft && selectedProfileIndex >= 0
    ? profiles.map((profile, index) => (index === selectedProfileIndex ? draft : profile))
    : profiles;
  const readOnly = draft ? appStore.hasProfileReferences(draft.id) : false;

  return (
    <SettingsScreenView
      profiles={displayProfiles}
      selectedProfileIndex={selectedProfileIndex}
      readOnly={readOnly}
      onProfileIndexChange={(index) => {
        const profile = profiles[index];
        if (profile) {
          appStore.requestEditProfile(profile.id);
        }
      }}
      onImportFile={(file) => {
        void appStore.importBackup(file);
      }}
      onExport={() => appStore.exportBackup()}
      onWarmupChange={(value) => appStore.updateDraftProfile({ warmupSec: value })}
      onRecoveryChange={(index, value) => appStore.updateDraftRecovery(index, value)}
      onCooldownChange={(value) => appStore.updateDraftProfile({ cooldownBaseSec: value })}
      onCloneRecovery={(index) => appStore.cloneDraftRecovery(index)}
      onDeleteRecovery={(index) => appStore.deleteDraftRecovery(index)}
    />
  );
}
