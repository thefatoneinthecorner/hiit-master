import { IconButton } from './IconButton';
import { Stepper } from './Stepper';

const copyIcon = new URL('../../../../assets/copy.svg', import.meta.url).href;
const trashIcon = new URL('../../../../assets/trash.svg', import.meta.url).href;

interface RoundSettingsItemProps {
  label: string;
  valueSec: number;
  expanded: boolean;
  readOnly?: boolean;
  bordered?: boolean;
  deleteDisabled?: boolean;
  onToggle: () => void;
  onChange: (value: number) => void;
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

export function RoundSettingsItem({
  label,
  valueSec,
  expanded,
  readOnly = false,
  bordered = true,
  deleteDisabled = false,
  onToggle,
  onChange,
  onClone,
  onDelete
}: RoundSettingsItemProps) {
  const hasActions = !readOnly && (onClone || onDelete);
  const borderClass = bordered ? 'border border-[color:var(--line)]' : 'border border-transparent';

  function handlePanelClick(event: MouseEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('button')) {
      return;
    }

    onToggle();
  }

  return (
    <div
      class={`w-full rounded-xl ${borderClass} bg-white/30 px-4 py-3 text-left transition-colors duration-150`}
      data-testid={`round-settings-item-${label.toLowerCase().replaceAll(' ', '-')}`}
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
            {`${valueSec}s`}
          </button>
        ) : null}
      </div>
      {expanded ? (
        <div class="mt-3 flex justify-center">
          {readOnly ? (
            <ReadOnlyValue value={`${valueSec}s`} />
          ) : (
            <Stepper value={valueSec} onChange={onChange} />
          )}
        </div>
      ) : null}
    </div>
  );
}
