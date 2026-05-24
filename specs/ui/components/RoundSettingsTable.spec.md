# RoundSettingsTable

## Purpose

`RoundSettingsTable` renders the complete editable round settings list used by the Settings screen.

## Data

- Accepts `warmupSec`, `baseRestsSec`, and `cooldownBaseSec`.
- Renders one `RoundSettingsItem` for Warmup.
- Renders one `RoundSettingsItem` for each rest duration in `baseRestsSec`, labelled `Round 1`, `Round 2`, and so on.
- Renders one `RoundSettingsItem` for Cooldown.

## Behavior

- Only one row is expanded at a time.
- Clicking an already-expanded row collapses it.
- Warmup changes call `onWarmupChange`.
- Round changes call `onRecoveryChange` with the round index and new value.
- Cooldown changes call `onCooldownChange`.
- Round clone and delete actions call `onCloneRecovery` and `onDeleteRecovery` with the round index.
- Delete is disabled when there is only one round.
- `readOnly` is passed through to each item and suppresses editable controls and clone/delete actions.

## Storybook Coverage

- Full Timer 2 profile round list copied from the backup fixture.
- Interaction coverage verifies the complete list is present and an expanded round exposes the Stepper and action buttons.
- The story canvas wrapper must allow the Storybook iframe page to scroll so the complete table can be inspected in Canvas as well as Docs.
