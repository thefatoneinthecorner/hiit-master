import { useRef } from 'preact/hooks';

import { appStore } from '../../application/store';
import type { SessionProfile } from '../../domain/shared/types';
import { IconButton } from '../components/IconButton';
import { RoundSettingsTable } from '../components/RoundSettingsTable';
import { Stepper } from '../components/Stepper';
import { WheelPicker } from '../components/WheelPicker';

const copyIcon = new URL('../../../../assets/copy.svg', import.meta.url).href;
const trashIcon = new URL('../../../../assets/trash.svg', import.meta.url).href;

interface SettingsScreenViewProps {
  profiles: SessionProfile[];
  selectedProfileIndex: number;
  readOnly?: boolean;
  onProfileIndexChange: (index: number) => void;
  onImportFile: (file: File) => void;
  onExport: () => void;
  deleteProfileDisabled?: boolean;
  onCloneProfile?: () => void;
  onDeleteProfile?: () => void;
  onNameChange?: (value: string) => void;
  onWorkDurationChange?: (value: number) => void;
  onNominalPeakHeartrateChange?: (value: number) => void;
  onNotesChange?: (value: string) => void;
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
  deleteProfileDisabled = false,
  onCloneProfile,
  onDeleteProfile,
  onNameChange,
  onWorkDurationChange,
  onNominalPeakHeartrateChange,
  onNotesChange,
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
      <div class="mx-auto flex w-56 justify-between">
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
          <div class="text-sm font-semibold uppercase tracking-wide text-[color:var(--muted)]">Selected Profile</div>
          <WheelPicker
            value={selectedIndex}
            min={0}
            max={profiles.length - 1}
            labels={profiles.map((profile) => profile.name)}
            onChange={onProfileIndexChange}
          />
          <div class="mx-auto flex w-56 justify-between">
            <IconButton label="Clone Profile" iconSrc={copyIcon} onClick={onCloneProfile} />
            <IconButton label="Delete Profile" iconSrc={trashIcon} variant="danger" disabled={profiles.length <= 1 || deleteProfileDisabled} onClick={onDeleteProfile} />
          </div>
          <div class="grid gap-3">
            <label class="grid gap-1">
              <span class="text-sm text-[color:var(--muted)]">Name</span>
              <input
                class="rounded-xl border border-[color:var(--line)] bg-white/50 px-3 py-2"
                value={selectedProfile.name}
                onInput={(event) => onNameChange?.((event.currentTarget as HTMLInputElement).value)}
              />
            </label>
          </div>
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
          <div class="grid justify-items-center gap-4 md:grid-cols-2">
            <div class="grid justify-items-center">
              <div class="mb-2 text-center text-sm text-[color:var(--muted)]">Nominal Work Period</div>
              {readOnly ? (
                <ReadOnlyValue value={`${selectedProfile.workDurationSec}s`} />
              ) : (
                <Stepper value={selectedProfile.workDurationSec} onChange={(value) => onWorkDurationChange?.(value)} />
              )}
            </div>
            <div class="grid justify-items-center">
              <div class="mb-2 text-center text-sm text-[color:var(--muted)]">Nominal Peak Heartrate</div>
              {readOnly ? (
                <ReadOnlyValue value={`${selectedProfile.nominalPeakHeartrate} bpm`} />
              ) : (
                <Stepper value={selectedProfile.nominalPeakHeartrate} onChange={(value) => onNominalPeakHeartrateChange?.(value)} />
              )}
            </div>
          </div>
          <label class="grid gap-1">
            <span class="text-sm text-[color:var(--muted)]">Notes</span>
            <textarea
              class="min-h-24 rounded-xl border border-[color:var(--line)] bg-white/50 px-3 py-2"
              value={selectedProfile.notes}
              onInput={(event) => onNotesChange?.((event.currentTarget as HTMLTextAreaElement).value)}
            />
          </label>
        </>
      ) : null}
    </section>
  );
}

function ReadOnlyValue({ value }: { value: string }) {
  return (
    <div class="rounded-xl border border-[color:var(--line)] bg-white/30 px-4 py-3 text-sm">
      <div class="flex items-center justify-between gap-3">
        <span class="text-[color:var(--muted)]">Read only</span>
        <span class="font-semibold text-[color:var(--ink)]">{value}</span>
      </div>
    </div>
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
  const selectedDraftId = displayProfiles[selectedProfileIndex]?.id;
  const deleteProfileDisabled = selectedDraftId ? appStore.hasProfileReferences(selectedDraftId) : true;

  function updateLiveProfile(patch: Partial<SessionProfile>) {
    appStore.updateDraftProfile(patch);
    void appStore.saveDraftProfile();
  }

  function updateLiveRecovery(index: number, value: number) {
    appStore.updateDraftRecovery(index, value);
    void appStore.saveDraftProfile();
  }

  function cloneLiveRecovery(index: number) {
    appStore.cloneDraftRecovery(index);
    void appStore.saveDraftProfile();
  }

  function deleteLiveRecovery(index: number) {
    appStore.deleteDraftRecovery(index);
    void appStore.saveDraftProfile();
  }

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
      deleteProfileDisabled={deleteProfileDisabled}
      onCloneProfile={() => {
        if (selectedDraftId) {
          appStore.copyProfile(selectedDraftId);
        }
      }}
      onDeleteProfile={() => {
        if (selectedDraftId) {
          appStore.deleteProfile(selectedDraftId);
        }
      }}
      onNameChange={(value) => updateLiveProfile({ name: value })}
      onWorkDurationChange={(value) => updateLiveProfile({ workDurationSec: value })}
      onNominalPeakHeartrateChange={(value) => updateLiveProfile({ nominalPeakHeartrate: value })}
      onNotesChange={(value) => updateLiveProfile({ notes: value })}
      onWarmupChange={(value) => updateLiveProfile({ warmupSec: value })}
      onRecoveryChange={updateLiveRecovery}
      onCooldownChange={(value) => updateLiveProfile({ cooldownBaseSec: value })}
      onCloneRecovery={cloneLiveRecovery}
      onDeleteRecovery={deleteLiveRecovery}
    />
  );
}
