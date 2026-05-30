import { IconButton } from './IconButton';
import { Stepper } from './Stepper';

const copyIcon = new URL('../../../../assets/copy.svg', import.meta.url).href;
const trashIcon = new URL('../../../../assets/trash.svg', import.meta.url).href;

interface BPMRoundSettingsItemProps {
  label: string;
  maxBpm: number;
  minBpm: number;
  expanded: boolean;
  class?: string;
  readOnly?: boolean;
  deleteDisabled?: boolean;
  onToggle: () => void;
  onMaxChange: (value: number) => void;
  onMinChange: (value: number) => void;
  onClone?: () => void;
  onDelete?: () => void;
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

export function BPMRoundSettingsItem({
  label,
  maxBpm,
  minBpm,
  expanded,
  class: className = '',
  readOnly = false,
  deleteDisabled = false,
  onToggle,
  onMaxChange,
  onMinChange,
  onClone,
  onDelete
}: BPMRoundSettingsItemProps) {
  const hasActions = !readOnly && (onClone || onDelete);

  function handlePanelClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button')) {
      return;
    }

    onToggle();
  }

  return (
    <div
      class={`w-full text-left transition-colors duration-150 ${className}`}
      data-testid={`bpm-round-settings-item-${label.toLowerCase().replaceAll(' ', '-')}`}
      onClick={handlePanelClick}
    >
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2">
          <button type="button" class="min-w-0 text-left" onClick={onToggle}>
            <span>{label}</span>
          </button>
          {expanded && hasActions && onClone ? (
            <IconButton
              label="Clone"
              iconSrc={copyIcon}
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                onClone();
              }}
            />
          ) : null}
        </div>
        {expanded && hasActions && onDelete ? (
          <IconButton
            label="Delete"
            iconSrc={trashIcon}
            size="sm"
            variant="danger"
            disabled={deleteDisabled}
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
          />
        ) : !expanded ? (
          <button type="button" class="shrink-0 text-right" onClick={onToggle}>
            {`${maxBpm}-${minBpm} bpm`}
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div class="mt-3 grid justify-items-center gap-3 sm:grid-cols-2">
          {readOnly ? (
            <>
              <ReadOnlyValue value={`${maxBpm} bpm`} />
              <ReadOnlyValue value={`${minBpm} bpm`} />
            </>
          ) : (
            <>
              <div class="grid justify-items-center gap-2">
                <div class="text-sm text-[color:var(--muted)]">Max</div>
                <Stepper value={maxBpm} suffix="bpm" onChange={(value) => onMaxChange(Math.max(value, minBpm))} />
              </div>
              <div class="grid justify-items-center gap-2">
                <div class="text-sm text-[color:var(--muted)]">Min</div>
                <Stepper value={minBpm} suffix="bpm" onChange={(value) => onMinChange(Math.min(value, maxBpm))} />
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
