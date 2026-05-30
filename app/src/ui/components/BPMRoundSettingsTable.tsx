import { useState } from 'preact/hooks';
import { BPMRoundSettingsItem } from './BPMRoundSettingsItem';
import { RoundSettingsItem } from './RoundSettingsItem';
import type { BPMRoundTarget } from '../../domain/shared/types';

interface BPMRoundSettingsTableProps {
  warmupSec: number;
  bpmTargets: BPMRoundTarget[];
  cooldownBaseSec: number;
  readOnly?: boolean;
  onWarmupChange?: (value: number) => void;
  onRecoveryMaxChange?: (index: number, value: number) => void;
  onRecoveryMinChange?: (index: number, value: number) => void;
  onCooldownChange?: (value: number) => void;
  onCloneRecovery?: (index: number) => void;
  onDeleteRecovery?: (index: number) => void;
}

export function BPMRoundSettingsTable({
  warmupSec,
  bpmTargets,
  cooldownBaseSec,
  readOnly = false,
  onWarmupChange,
  onRecoveryMaxChange,
  onRecoveryMinChange,
  onCooldownChange,
  onCloneRecovery,
  onDeleteRecovery
}: BPMRoundSettingsTableProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <div data-testid="bpm-round-settings-table">
      <RoundSettingsItem
        label="Warmup"
        valueSec={warmupSec}
        expanded={expandedKey === 'warmup'}
        class="px-4 py-1"
        readOnly={readOnly}
        onToggle={() => setExpandedKey(expandedKey === 'warmup' ? null : 'warmup')}
        onChange={(value) => onWarmupChange?.(value)}
      />
      {bpmTargets.map((target, index) => {
        const key = `round-${index}`;
        const expanded = expandedKey === key;

        return (
          <BPMRoundSettingsItem
            key={key}
            label={`Round ${index + 1}`}
            maxBpm={target.maxBpm}
            minBpm={target.minBpm}
            expanded={expanded}
            class="px-4 py-1"
            readOnly={readOnly}
            deleteDisabled={bpmTargets.length <= 1}
            onToggle={() => setExpandedKey(expanded ? null : key)}
            onMaxChange={(next) => onRecoveryMaxChange?.(index, next)}
            onMinChange={(next) => onRecoveryMinChange?.(index, next)}
            onClone={() => onCloneRecovery?.(index)}
            onDelete={() => onDeleteRecovery?.(index)}
          />
        );
      })}
      <RoundSettingsItem
        label="Cooldown"
        valueSec={cooldownBaseSec}
        expanded={expandedKey === 'cooldown'}
        class="px-4 py-1"
        readOnly={readOnly}
        onToggle={() => setExpandedKey(expandedKey === 'cooldown' ? null : 'cooldown')}
        onChange={(value) => onCooldownChange?.(value)}
      />
    </div>
  );
}
