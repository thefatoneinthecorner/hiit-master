# SettingsScreen

## Purpose

`SettingsScreen` provides the first-pass settings workflow for importing/exporting backup data and inspecting profile round timing.

## Layout

- The screen starts with Import and Export buttons.
- Below the buttons, the screen renders a `WheelPicker` containing profile names.
- Below the profile picker, the screen renders a `RoundSettingsTable` for the selected profile.

## Behavior

- Activating Import opens the JSON file picker.
- Activating Export calls the export callback.
- Changing the profile picker switches the displayed profile.
- Round timing edits are delegated to `RoundSettingsTable` callbacks.

## Storybook Coverage

- Backup profiles loaded from `hiit-master-backup.json`.
- The selected profile name appears in the wheel picker.
- The selected profile's full round table is visible.
- Changing the picker switches the displayed round table.
