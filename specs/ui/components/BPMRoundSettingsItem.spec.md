# BPMRoundSettingsItem

## Purpose

`BPMRoundSettingsItem` is the BPM-settings clone of `RoundSettingsItem`.

## Behavior

- Collapsed state shows the row label and current BPM range.
- Activating the row or label toggles expanded state through `onToggle`.
- Expanded editable state shows two BPM-formatted `Stepper` controls.
- The first stepper is labeled `Max`.
- The second stepper is labeled `Min`.
- Min changes are clamped so Min never exceeds Max.
- Expanded round rows may show clone and delete icon actions.
- Read-only state shows a read-only value and hides clone/delete actions.

## Storybook Coverage

- Collapsed row toggle behavior.
- Expanded editable row behavior with Max and Min BPM steppers.
- Min clamping at Max.
- Expanded clone/delete actions.
