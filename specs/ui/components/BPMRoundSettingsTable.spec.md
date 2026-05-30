# BPMRoundSettingsTable

## Purpose

`BPMRoundSettingsTable` renders BPM settings for recovery rounds using `BPMRoundSettingsItem`.

## Behavior

- Renders warmup and cooldown as duration rows in seconds.
- Renders each recovery round as a BPM row with Max and Min values.
- Only one row is expanded at a time.
- Max/Min BPM edits, clone, and delete actions are delegated through callbacks.

## Storybook Coverage

- Full Timer 2 fixture renders the complete BPM round table.
- Warmup and cooldown still display second-formatted duration controls.
- Expanding a recovery round exposes the BPM round item actions and Max/Min BPM steppers.
