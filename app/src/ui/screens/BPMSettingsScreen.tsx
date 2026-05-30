import { appStore } from '../../application/store';
import type { SessionProfile } from '../../domain/shared/types';
import { SettingsScreenView } from './SettingsScreen';

export const BPMSettingsScreenView = SettingsScreenView;

export function BPMSettingsScreen() {
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

  function updateLiveRecoveryBpmTarget(index: number, patch: { minBpm?: number; maxBpm?: number }) {
    appStore.updateDraftBpmTarget(index, patch);
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
      showNominalWorkPeriod={false}
      showNominalPeakHeartrate={false}
      roundSettingsKind="bpm"
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
      onNominalPeakHeartrateChange={(value) => updateLiveProfile({ nominalPeakHeartrate: value })}
      onNotesChange={(value) => updateLiveProfile({ notes: value })}
      onWarmupChange={(value) => updateLiveProfile({ warmupSec: value })}
      onRecoveryChange={updateLiveRecovery}
      onRecoveryMaxBpmChange={(index, value) => updateLiveRecoveryBpmTarget(index, { maxBpm: value })}
      onRecoveryMinBpmChange={(index, value) => updateLiveRecoveryBpmTarget(index, { minBpm: value })}
      onCooldownChange={(value) => updateLiveProfile({ cooldownBaseSec: value })}
      onCloneRecovery={cloneLiveRecovery}
      onDeleteRecovery={deleteLiveRecovery}
    />
  );
}
