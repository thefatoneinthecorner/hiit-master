# SettingsScreen

## Purpose

`SettingsScreen` provides the first-pass settings workflow for importing/exporting backup data and inspecting profile round timing.

## Layout

- The screen starts with Import and Export buttons.
- Below the buttons, the screen renders a `Selected Profile` title and a `WheelPicker` containing profile names.
- Below the profile picker, the screen renders icon buttons for cloning and deleting the selected profile.
- Below those profile actions, the screen renders the selected profile's `Name` control.
- Below the name control, the screen renders a `RoundSettingsTable` for the selected profile.
- Below the round settings table, the screen renders the selected profile's `Nominal Work Period`, `Nominal Peak Heartrate`, and `Notes` controls.

## Behavior

- Activating Import opens the JSON file picker.
- Activating Export calls the export callback.
- Changing the profile picker switches the displayed profile.
- Activating Clone Profile calls the clone callback for the selected profile.
- Activating Delete Profile calls the delete callback for the selected profile.
- Delete Profile is disabled when the selected profile has existing sessions.
- Profile name, nominal work period, nominal peak heartrate, and notes edits are applied live through their corresponding callbacks.
- Round timing edits are delegated to `RoundSettingsTable` callbacks.

## Storybook Coverage

- Backup profiles loaded from `hiit-master-backup.json`.
- The `Selected Profile` title is visible above the picker.
- The selected profile name appears in the wheel picker.
- Clone and delete profile actions are visible below the picker.
- In the story fixture, every profile except the last current profile is treated as having existing sessions, so Delete Profile is disabled until a copied profile is selected.
- The selected profile's name, nominal work period, nominal peak heartrate, and notes controls are visible.
- Cloning the selected profile creates and selects a copied profile.
- The selected profile's full round table is visible.
- Changing the picker switches the displayed round table.
