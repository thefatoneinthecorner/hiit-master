import { useState } from 'preact/hooks';
import { RoundSettingsItem } from './RoundSettingsItem';

interface RoundSettingsTableProps {
  warmupSec: number;
  baseRestsSec: number[];
  cooldownBaseSec: number;
  readOnly?: boolean;
  onWarmupChange?: (value: number) => void;
  onRecoveryChange?: (index: number, value: number) => void;
  onCooldownChange?: (value: number) => void;
  onCloneRecovery?: (index: number) => void;
  onDeleteRecovery?: (index: number) => void;
}

export function RoundSettingsTable({
  warmupSec,
  baseRestsSec,
  cooldownBaseSec,
  readOnly = false,
  onWarmupChange,
  onRecoveryChange,
  onCooldownChange,
  onCloneRecovery,
  onDeleteRecovery
}: RoundSettingsTableProps) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  return (
    <div class="space-y-2" data-testid="round-settings-table">
      <RoundSettingsItem
        label="Warmup"
        valueSec={warmupSec}
        expanded={expandedKey === 'warmup'}
        bordered={false}
        readOnly={readOnly}
        onToggle={() => setExpandedKey(expandedKey === 'warmup' ? null : 'warmup')}
        onChange={(value) => onWarmupChange?.(value)}
      />
      {baseRestsSec.map((value, index) => {
        const key = `round-${index}`;
        const expanded = expandedKey === key;

        return (
          <RoundSettingsItem
            key={key}
            label={`Round ${index + 1}`}
            valueSec={value}
            expanded={expanded}
            bordered={false}
            readOnly={readOnly}
            deleteDisabled={baseRestsSec.length <= 1}
            onToggle={() => setExpandedKey(expanded ? null : key)}
            onChange={(next) => onRecoveryChange?.(index, next)}
            onClone={() => onCloneRecovery?.(index)}
            onDelete={() => onDeleteRecovery?.(index)}
          />
        );
      })}
      <RoundSettingsItem
        label="Cooldown"
        valueSec={cooldownBaseSec}
        expanded={expandedKey === 'cooldown'}
        bordered={false}
        readOnly={readOnly}
        onToggle={() => setExpandedKey(expandedKey === 'cooldown' ? null : 'cooldown')}
        onChange={(value) => onCooldownChange?.(value)}
      />
    </div>
  );
}
