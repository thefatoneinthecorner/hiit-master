import { useRef, useState } from 'preact/hooks';

import type { SessionProfile } from '../../domain/shared/types';
import { RoundedPanel } from '../components/RoundedPanel';
import { RoundSettingsItem } from '../components/RoundSettingsItem';
import { Stepper } from '../components/Stepper';

export interface LegacyProfileDraft extends SessionProfile {
  isDirty: boolean;
}

interface LegacySettingsScreenViewProps {
  profiles: SessionProfile[];
  selectedProfileId: string;
  draft: LegacyProfileDraft | null;
  referenced?: boolean;
  hasSingleProfile?: boolean;
  showUnsavedModal?: boolean;
  onImportFile: (file: File) => void;
  onExport: () => void;
  onEditProfile: (profileId: string) => void;
  onSelectProfile: (profileId: string) => void;
  onDeleteProfile: (profileId: string) => void;
  onCopyProfile: (profileId: string) => void;
  onSaveDraftProfile: () => void;
  onUpdateDraftProfile: (patch: Partial<SessionProfile>) => void;
  onUpdateDraftRecovery: (index: number, value: number) => void;
  onCloneDraftRecovery: (index: number) => void;
  onDeleteDraftRecovery: (index: number) => void;
  onCancelDiscardSwitch: () => void;
  onConfirmDiscardAndSwitch: () => void;
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

export function LegacySettingsScreenView({
  profiles,
  selectedProfileId,
  draft,
  referenced = false,
  hasSingleProfile = false,
  showUnsavedModal = false,
  onImportFile,
  onExport,
  onEditProfile,
  onSelectProfile,
  onDeleteProfile,
  onCopyProfile,
  onSaveDraftProfile,
  onUpdateDraftProfile,
  onUpdateDraftRecovery,
  onCloneDraftRecovery,
  onDeleteDraftRecovery,
  onCancelDiscardSwitch,
  onConfirmDiscardAndSwitch,
}: LegacySettingsScreenViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

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

      <div class="space-y-2">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            class={`flex items-center gap-2 rounded-[1.4rem] border p-3 ${
              selectedProfileId === profile.id
                ? 'border-[color:var(--accent)] bg-[color:var(--panel)]'
                : 'border-[color:var(--line)] bg-[color:var(--panel)]'
            }`}
          >
            <div class="flex-1">
              <div class="font-semibold">{profile.name}</div>
              <div class="text-sm text-[color:var(--muted)]">{selectedProfileId === profile.id ? 'Selected Profile' : 'Profile'}</div>
            </div>
            <button type="button" class="rounded-full border border-[color:var(--line)] px-4 py-2" onClick={() => onEditProfile(profile.id)}>
              Edit
            </button>
            <button
              type="button"
              class="rounded-full border border-[color:var(--line)] px-4 py-2 disabled:text-[color:var(--muted)]"
              onClick={() => onSelectProfile(profile.id)}
              disabled={selectedProfileId === profile.id}
            >
              Select
            </button>
            <button
              type="button"
              class="rounded-full border border-[color:var(--line)] px-4 py-2 disabled:text-[color:var(--muted)]"
              onClick={() => onDeleteProfile(profile.id)}
              disabled={hasSingleProfile}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {draft ? (
        <div class="space-y-4 rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--panel)] p-4">
          <div class="grid gap-3">
            <label class="grid gap-1">
              <span class="text-sm text-[color:var(--muted)]">Name</span>
              <input class="rounded-xl border border-[color:var(--line)] bg-white/50 px-3 py-2" value={draft.name} onInput={(event) => onUpdateDraftProfile({ name: (event.currentTarget as HTMLInputElement).value })} />
            </label>
            <label class="grid gap-1">
              <span class="text-sm text-[color:var(--muted)]">Notes</span>
              <textarea class="min-h-24 rounded-xl border border-[color:var(--line)] bg-white/50 px-3 py-2" value={draft.notes} onInput={(event) => onUpdateDraftProfile({ notes: (event.currentTarget as HTMLTextAreaElement).value })} />
            </label>
          </div>
          <div class="flex flex-wrap gap-3">
            <button type="button" class="rounded-full border border-[color:var(--line)] px-4 py-2" onClick={() => onCopyProfile(draft.id)}>
              Copy Profile
            </button>
            <button
              type="button"
              class="rounded-full border border-[color:var(--line)] px-4 py-2 disabled:text-[color:var(--muted)]"
              onClick={() => onSelectProfile(draft.id)}
              disabled={selectedProfileId === draft.id}
            >
              Set Selected
            </button>
            <button type="button" class="rounded-full bg-[color:var(--accent)] px-4 py-2 font-semibold text-[color:var(--accent-ink)]" onClick={onSaveDraftProfile}>
              Save Changes
            </button>
            <button
              type="button"
              class="rounded-full bg-[color:var(--danger)] px-4 py-2 font-semibold text-[color:var(--danger-ink)] disabled:opacity-50"
              onClick={() => onDeleteProfile(draft.id)}
              disabled={hasSingleProfile}
            >
              Delete Profile
            </button>
          </div>
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <div class="mb-2 text-sm text-[color:var(--muted)]">Nominal Work Period</div>
              {referenced ? (
                <ReadOnlyValue value={`${draft.workDurationSec}s`} />
              ) : (
                <Stepper value={draft.workDurationSec} onChange={(value) => onUpdateDraftProfile({ workDurationSec: value })} />
              )}
            </div>
            <div>
              <div class="mb-2 text-sm text-[color:var(--muted)]">Nominal Peak Heartrate</div>
              {referenced ? (
                <ReadOnlyValue value={`${draft.nominalPeakHeartrate} bpm`} />
              ) : (
                <Stepper value={draft.nominalPeakHeartrate} onChange={(value) => onUpdateDraftProfile({ nominalPeakHeartrate: value })} />
              )}
            </div>
          </div>
          <div class="space-y-2">
            <RoundedPanel padding="sm" radius="md">
              <RoundSettingsItem
                label="Warmup"
                valueSec={draft.warmupSec}
                expanded={expandedKey === 'warmup'}
                readOnly={referenced}
                onToggle={() => setExpandedKey(expandedKey === 'warmup' ? null : 'warmup')}
                onChange={(value) => onUpdateDraftProfile({ warmupSec: value })}
              />
            </RoundedPanel>
            {draft.baseRestsSec.map((value, index) => {
              const key = `round-${index}`;
              const expanded = expandedKey === key;
              return (
                <RoundedPanel key={key} padding="sm" radius="md">
                  <RoundSettingsItem
                    label={`Round ${index + 1}`}
                    valueSec={value}
                    expanded={expanded}
                    readOnly={referenced}
                    deleteDisabled={draft.baseRestsSec.length <= 1}
                    onToggle={() => setExpandedKey(expanded ? null : key)}
                    onChange={(next) => onUpdateDraftRecovery(index, next)}
                    onClone={() => onCloneDraftRecovery(index)}
                    onDelete={() => onDeleteDraftRecovery(index)}
                  />
                </RoundedPanel>
              );
            })}
            <RoundedPanel padding="sm" radius="md">
              <RoundSettingsItem
                label="Cooldown"
                valueSec={draft.cooldownBaseSec}
                expanded={expandedKey === 'cooldown'}
                readOnly={referenced}
                onToggle={() => setExpandedKey(expandedKey === 'cooldown' ? null : 'cooldown')}
                onChange={(value) => onUpdateDraftProfile({ cooldownBaseSec: value })}
              />
            </RoundedPanel>
          </div>
        </div>
      ) : null}

      {showUnsavedModal ? (
        <div class="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
          <div class="w-full max-w-sm rounded-[1.4rem] bg-[color:var(--panel)] p-5">
            <div class="text-lg font-semibold">Discard unsaved amendments?</div>
            <div class="mt-2 text-sm text-[color:var(--muted)]">Unsaved amendments will be lost if you continue.</div>
            <div class="mt-4 flex gap-3">
              <button type="button" class="rounded-full border border-[color:var(--line)] px-4 py-2" onClick={onCancelDiscardSwitch}>
                Cancel
              </button>
              <button type="button" class="rounded-full bg-[color:var(--danger)] px-4 py-2 font-semibold text-[color:var(--danger-ink)]" onClick={onConfirmDiscardAndSwitch}>
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
