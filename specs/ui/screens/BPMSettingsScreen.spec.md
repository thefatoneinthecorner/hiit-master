# BPMSettingsScreen

## Purpose

`BPMSettingsScreen` is the BPM-mode clone of `SettingsScreen`.

## Behavior

- The application renders this screen for the `/settings` route when the global settings mode is `bpm`.
- The current implementation mirrors `SettingsScreen` while hiding `Nominal Work Period`.
- `Nominal Peak Heartrate` is also hidden because BPM round targets are edited per round.
- Warmup and cooldown remain duration controls in seconds.
- Recovery rounds use BPM controls with Max and Min values.

## Storybook Coverage

- The story renders the BPM-mode clone with backup profile fixture data.
- The Full Timer 2 BPM targets are seeded from the 27 May 2026 completed session analysis peaks and troughs in `hiit-master-backup.json`.
- The profile picker, clone/delete profile actions, round table, and notes controls remain visible.
- `Nominal Work Period` is not rendered.
- `Nominal Peak Heartrate` is not rendered.
