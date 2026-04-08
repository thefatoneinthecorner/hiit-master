import { useEffect, useRef, useState } from 'preact/hooks';
import { useAppState } from '../../application/session/AppStateContext';
import type { Profile } from '../../domain/shared/types';
import { downloadBackupFile, readBackupFile } from '../../infrastructure/storage/backupFile';

type ExpandedRow = 'warmup' | 'cooldown' | `round-${number}` | null;

export function SettingsScreen() {
  const {
    copyProfile,
    deleteProfile,
    exportBackup,
    importBackup,
    isProfileTimingLocked,
    profile,
    profiles,
    selectProfile,
    selectedProfileId,
    updateProfile,
  } = useAppState();
  const [draft, setDraft] = useState<Profile>(profile);
  const [expandedRow, setExpandedRow] = useState<ExpandedRow>(null);
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [selectedBackupName, setSelectedBackupName] = useState<string | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(profile);
    setExpandedRow(null);
  }, [profile]);

  const timingLocked = isProfileTimingLocked(draft.id);
  const nameConflict = profiles.some(
    (candidate) => candidate.id !== draft.id && candidate.name.trim() === draft.name.trim(),
  );
  const saveDisabled = draft.name.trim().length === 0 || nameConflict;

  return (
    <section class="mx-auto max-w-5xl space-y-5">
      <div class="grid gap-5 lg:grid-cols-[0.9fr_1.4fr]">
        <aside class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs uppercase tracking-[0.34em] text-app-muted">Backup</p>
              <h2 class="mt-3 font-display text-4xl leading-none">Settings</h2>
            </div>
            <div class="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  downloadBackupFile(exportBackup());
                  setBackupStatus('Backup exported as a JSON file.');
                }}
                class="inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-app-line bg-app-canvas px-4 text-sm font-semibold"
              >
                Export
              </button>
              <button
                type="button"
                onClick={() => backupInputRef.current?.click()}
                class="inline-flex min-h-11 items-center justify-center rounded-[1rem] border border-app-line bg-app-canvas px-4 text-sm font-semibold"
              >
                Import
              </button>
            </div>
          </div>

          <input
            ref={backupInputRef}
            type="file"
            accept=".json,application/json"
            aria-label="Backup File"
            class="sr-only"
            onChange={async (event) => {
              const inputElement = event.currentTarget;
              const file = inputElement.files?.[0] ?? null;

              if (file === null) {
                setBackupStatus('Import cancelled.');
                return;
              }

              setSelectedBackupName(file.name);

              try {
                const serialized = await readBackupFile(file);
                const result = importBackup(serialized);
                setBackupStatus(result.message);
              } catch {
                setBackupStatus('Import failed: backup file could not be read.');
              } finally {
                inputElement.value = '';
              }
            }}
          />
          <div class="mt-6 rounded-[1.4rem] border border-dashed border-app-line bg-app-canvas px-4 py-4">
            <p class="text-xs uppercase tracking-[0.28em] text-app-muted">Backup File</p>
            <p class="mt-3 text-sm leading-6 text-app-muted">
              {selectedBackupName === null
                ? 'Export downloads a backup JSON file. Import restores profiles and sessions from a previously exported file.'
                : `Selected backup: ${selectedBackupName}`}
            </p>
          </div>
          <p class="mt-3 text-sm leading-6 text-app-muted">
            {backupStatus ?? 'Choose Export to save a backup file, or Import to restore one.'}
          </p>

          <div class="mt-8 space-y-3">
            {profiles.map((candidate) => {
              const isSelected = candidate.id === selectedProfileId;

              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => selectProfile(candidate.id)}
                  class={`flex w-full items-center justify-between rounded-[1.4rem] px-4 py-4 text-left transition ${
                    isSelected ? 'bg-app-accent text-app-canvas' : 'bg-app-canvas text-app-ink'
                  }`}
                >
                  <span>
                    <span class="block font-semibold">{candidate.name}</span>
                    <span class={`mt-1 block text-xs uppercase tracking-[0.24em] ${isSelected ? 'text-app-canvas/75' : 'text-app-muted'}`}>
                      {isSelected ? 'Selected Profile' : 'Tap to select'}
                    </span>
                  </span>
                  <span class={`text-xs uppercase tracking-[0.24em] ${isSelected ? 'text-app-canvas/75' : 'text-app-muted'}`}>
                    {candidate.baseRestsSec.length} rounds
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div class="space-y-5">
          <section class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
            <div class="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <label class="block">
                <span class="text-xs uppercase tracking-[0.28em] text-app-muted">Name</span>
                <input
                  value={draft.name}
                  onInput={(event) =>
                    setDraft((current) => ({ ...current, name: event.currentTarget.value }))
                  }
                  class="mt-3 w-full rounded-[1.2rem] border border-app-line bg-app-canvas px-4 py-3 text-base outline-none"
                />
                {nameConflict ? (
                  <span class="mt-2 block text-sm text-rose-600">Profile name must be unique.</span>
                ) : null}
              </label>

              <label class="block">
                <span class="text-xs uppercase tracking-[0.28em] text-app-muted">Nominal Peak</span>
                <div class="mt-3">
                  <Stepper
                    value={draft.nominalPeakHeartrate}
                    onDecrease={() =>
                      setDraft((current) => ({
                        ...current,
                        nominalPeakHeartrate: Math.max(80, current.nominalPeakHeartrate - 1),
                      }))
                    }
                    onIncrease={() =>
                      setDraft((current) => ({
                        ...current,
                        nominalPeakHeartrate: current.nominalPeakHeartrate + 1,
                      }))
                    }
                    disabled={timingLocked}
                  />
                </div>
              </label>
            </div>

            <label class="mt-5 block">
              <span class="text-xs uppercase tracking-[0.28em] text-app-muted">Notes</span>
              <textarea
                value={draft.notes}
                onInput={(event) =>
                  setDraft((current) => ({ ...current, notes: event.currentTarget.value }))
                }
                rows={4}
                class="mt-3 w-full rounded-[1.2rem] border border-app-line bg-app-canvas px-4 py-3 text-base outline-none"
              />
            </label>

            <div class="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => copyProfile(draft.id)}
                class="inline-flex min-h-12 items-center justify-center rounded-[1.2rem] border border-app-line bg-app-canvas px-5 text-sm font-semibold"
              >
                Copy Profile
              </button>
              <button
                type="button"
                onClick={() => selectProfile(draft.id)}
                class="inline-flex min-h-12 items-center justify-center rounded-[1.2rem] border border-app-line bg-app-canvas px-5 text-sm font-semibold"
              >
                Set Selected
              </button>
              <button
                type="button"
                onClick={() => updateProfile(draft.id, { ...draft, name: draft.name.trim() })}
                disabled={saveDisabled}
                class="inline-flex min-h-12 items-center justify-center rounded-[1.2rem] bg-app-accent px-5 text-sm font-semibold text-app-canvas disabled:opacity-40"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => deleteProfile(draft.id)}
                disabled={profiles.length <= 1}
                class="inline-flex min-h-12 items-center justify-center rounded-[1.2rem] border border-app-line bg-app-canvas px-5 text-sm font-semibold disabled:opacity-40"
              >
                Delete Profile
              </button>
            </div>

            <p class="mt-4 text-sm leading-6 text-app-muted">
              {timingLocked
                ? 'Timing fields are read-only because saved sessions already reference this profile. Name and notes remain editable.'
                : 'Unused profiles can still change timing values directly.'}
            </p>
          </section>

          <section class="rounded-[2rem] border border-app-line bg-app-panel p-6 shadow-card">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-[0.28em] text-app-muted">Recovery Sequence</p>
                <h3 class="mt-3 font-display text-3xl leading-none">{draft.name}</h3>
              </div>
              <p class="text-sm text-app-muted">{draft.baseRestsSec.length} recovery rounds</p>
            </div>

            <div class="mt-6 space-y-3">
              <RecoveryRow
                label="Warmup"
                value={draft.warmupSec}
                expanded={expandedRow === 'warmup'}
                locked={timingLocked}
                onToggle={() => setExpandedRow((current) => (current === 'warmup' ? null : 'warmup'))}
                onDecrease={() =>
                  setDraft((current) => ({ ...current, warmupSec: Math.max(1, current.warmupSec - 1) }))
                }
                onIncrease={() =>
                  setDraft((current) => ({ ...current, warmupSec: current.warmupSec + 1 }))
                }
              />

              {draft.baseRestsSec.map((restSec, index) => (
                <RecoveryRow
                  key={`round-${index + 1}`}
                  label={`Round ${index + 1}`}
                  value={restSec}
                  expanded={expandedRow === `round-${index + 1}`}
                  locked={timingLocked}
                  canClone
                  canDelete={draft.baseRestsSec.length > 1}
                  onToggle={() =>
                    setExpandedRow((current) =>
                      current === `round-${index + 1}` ? null : `round-${index + 1}`,
                    )
                  }
                  onClone={() =>
                    setDraft((current) => {
                      const nextRests = [...current.baseRestsSec];
                      nextRests.splice(index + 1, 0, current.baseRestsSec[index] ?? restSec);
                      return { ...current, baseRestsSec: nextRests };
                    })
                  }
                  onDelete={() =>
                    setDraft((current) => ({
                      ...current,
                      baseRestsSec:
                        current.baseRestsSec.length <= 1
                          ? current.baseRestsSec
                          : current.baseRestsSec.filter((_, currentIndex) => currentIndex !== index),
                    }))
                  }
                  onDecrease={() =>
                    setDraft((current) => ({
                      ...current,
                      baseRestsSec: current.baseRestsSec.map((entry, currentIndex) =>
                        currentIndex === index ? Math.max(1, entry - 1) : entry,
                      ),
                    }))
                  }
                  onIncrease={() =>
                    setDraft((current) => ({
                      ...current,
                      baseRestsSec: current.baseRestsSec.map((entry, currentIndex) =>
                        currentIndex === index ? entry + 1 : entry,
                      ),
                    }))
                  }
                />
              ))}

              <RecoveryRow
                label="Cooldown"
                value={draft.cooldownBaseSec}
                expanded={expandedRow === 'cooldown'}
                locked={timingLocked}
                onToggle={() =>
                  setExpandedRow((current) => (current === 'cooldown' ? null : 'cooldown'))
                }
                onDecrease={() =>
                  setDraft((current) => ({
                    ...current,
                    cooldownBaseSec: Math.max(1, current.cooldownBaseSec - 1),
                  }))
                }
                onIncrease={() =>
                  setDraft((current) => ({
                    ...current,
                    cooldownBaseSec: current.cooldownBaseSec + 1,
                  }))
                }
              />
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}

type RecoveryRowProps = {
  label: string;
  value: number;
  expanded: boolean;
  locked: boolean;
  canClone?: boolean;
  canDelete?: boolean;
  onToggle: () => void;
  onClone?: () => void;
  onDelete?: () => void;
  onDecrease: () => void;
  onIncrease: () => void;
};

function RecoveryRow({
  label,
  value,
  expanded,
  locked,
  canClone = false,
  canDelete = false,
  onToggle,
  onClone,
  onDelete,
  onDecrease,
  onIncrease,
}: RecoveryRowProps) {
  return (
    <div
      class={`overflow-hidden rounded-[1.4rem] border transition-colors duration-200 ${
        expanded ? 'border-app-accent bg-app-panel' : 'border-transparent bg-app-canvas'
      }`}
    >
      <div class="flex items-center justify-between gap-4 px-4 py-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          class="text-left font-semibold"
        >
          {label}
        </button>
        {expanded && canClone ? (
          <span class="animate-settings-row-reveal flex gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClone?.();
              }}
              disabled={locked}
              class="rounded-full border border-app-line px-3 py-1 text-xs font-semibold disabled:opacity-40"
            >
              Clone
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete?.();
              }}
              disabled={locked || !canDelete}
              class="rounded-full border border-app-line px-3 py-1 text-xs font-semibold disabled:opacity-40"
            >
              Delete
            </button>
          </span>
        ) : (
          <span class="text-sm text-app-muted">{value}s</span>
        )}
      </div>

      {expanded ? (
        <div class="animate-settings-row-reveal border-t border-app-line px-4 py-4">
          <Stepper value={value} onDecrease={onDecrease} onIncrease={onIncrease} disabled={locked} />
        </div>
      ) : null}
    </div>
  );
}

type StepperProps = {
  value: number;
  disabled?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
};

function Stepper({ value, disabled = false, onDecrease, onIncrease }: StepperProps) {
  const holdTimeoutRef = useRef<number | null>(null);
  const repeatIntervalRef = useRef<number | null>(null);

  const stopRepeat = () => {
    if (holdTimeoutRef.current !== null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }

    if (repeatIntervalRef.current !== null) {
      window.clearInterval(repeatIntervalRef.current);
      repeatIntervalRef.current = null;
    }
  };

  useEffect(() => stopRepeat, []);

  const startRepeat = (direction: 'increase' | 'decrease') => {
    if (disabled) {
      return;
    }

    const step = direction === 'increase' ? onIncrease : onDecrease;
    holdTimeoutRef.current = window.setTimeout(() => {
      const repeatStep = direction === 'increase' ? () => repeatByFive(onIncrease) : () => repeatByFive(onDecrease);
      repeatStep();
      repeatIntervalRef.current = window.setInterval(repeatStep, 140);
    }, 320);
    step();
  };

  return (
    <div class="flex items-center gap-3 select-none">
      <button
        type="button"
        onPointerDown={() => startRepeat('decrease')}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        disabled={disabled}
        class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-app-line text-lg disabled:opacity-40"
      >
        -
      </button>
      <span class="min-w-20 text-center font-display text-3xl">{value}s</span>
      <button
        type="button"
        onPointerDown={() => startRepeat('increase')}
        onPointerUp={stopRepeat}
        onPointerLeave={stopRepeat}
        onPointerCancel={stopRepeat}
        disabled={disabled}
        class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-app-line text-lg disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

function repeatByFive(action: () => void) {
  for (let step = 0; step < 5; step += 1) {
    action();
  }
}
