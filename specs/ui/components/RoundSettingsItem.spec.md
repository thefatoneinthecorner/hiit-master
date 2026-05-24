# RoundSettingsItem

## Purpose

`RoundSettingsItem` renders one editable row in the Settings screen rounds list. It is used for the Warmup item, each numbered Round item, and the Cooldown item. The parent screen owns list ordering, expansion state, and persistence; this component owns the presentation and per-item controls.

## Inputs

- `label`: Display label for the row, such as `Warmup`, `Round 1`, or `Cooldown`.
- `valueSec`: Duration value displayed and edited for the row, in seconds.
- `expanded`: Whether the row detail area is open.
- `readOnly`: When true, the row must show read-only detail content instead of editable controls.
- `deleteDisabled`: When true, the Delete action must be disabled.
- `onToggle`: Called when the row label or collapsed value is activated.
- `onChange`: Called by the Stepper when the duration changes.
- `onClone`: Optional action for duplicating a round.
- `onDelete`: Optional action for deleting a round.

## Collapsed State

- The item is shown as a single bordered rounded row.
- The row label is displayed on the left.
- The current duration is displayed on the right as `{valueSec}s`.
- Activating either the label or duration invokes `onToggle`.
- No Stepper is visible.
- Clone and Delete controls are not visible.

## Expanded Editable State

- The item keeps all expanded content inside the same bordered rounded row.
- The label remains in the top-left area and toggles the row through `onToggle`.
- The collapsed right-side duration text is hidden while expanded.
- The Stepper is displayed below the header, centered horizontally within the item.
- The Stepper receives `valueSec` and calls `onChange` with the next duration value.

## Round Actions

When the item is expanded, editable, and action callbacks are supplied:

- Clone is rendered as an `IconButton` using `assets/copy.svg`.
- Clone is positioned next to the round name in the left side of the header.
- Activating Clone invokes `onClone`.
- Clone must not invoke `onToggle`.
- Delete is rendered as an `IconButton` using `assets/trash.svg`.
- Delete is positioned in the right-hand corner of the header.
- Activating Delete invokes `onDelete`.
- Delete must not invoke `onToggle`.
- When `deleteDisabled` is true, the Delete icon button is disabled and must not invoke `onDelete`.

## Read-Only State

- When `readOnly` is true and the item is expanded, the detail area shows a read-only value panel.
- The read-only panel displays `Read only` and `{valueSec}s`.
- The Stepper is not visible.
- Clone and Delete controls are not visible, even if callbacks are supplied.

## Accessibility

- The row label is exposed as a button with its visible label as the accessible name.
- The collapsed duration value is exposed as a button with `{valueSec}s` as the accessible name.
- Clone and Delete are icon-only buttons with accessible names `Clone` and `Delete`.
- Decorative SVG icon imagery must not add duplicate accessible names.
- Disabled Delete must use native disabled button semantics.

## Storybook Coverage

The component must have Storybook stories for:

- Collapsed Warmup
- Expanded Editable Round
- Expanded Round Actions
- Read Only Expanded
- Delete Disabled

The stories should verify visible state, action callbacks, disabled behavior, and that Clone/Delete clicks do not toggle the row.
