# Settings

![[Pasted image 20260406092948.png|300]]

The Settings page allows the IndexedDB database to be saved to an external file and imported from an external file. It also maintains the session profiles, which are mainly definitions of the recovery periods for each round. The app ships with a single starter profile named `My Profile`. There will always be at least one profile on the phone, and the app will not allow the last remaining profile to be deleted. One profile is always marked as the `Selected Profile`. This is the profile that will be used for the next training session.

![[Pasted image 20260405195611.png|300]]

The image above shows the profile editor. Each profile has a name which the user can change, but it must always be unique. Profiles also have free-form arbitrary notes. Each profile has its own Nominal Work Period, typically 30 seconds. When the athlete uses the profile for training, successive rest periods will be adjusted values taken from the "Recovery Periods" table, such that the total round durations will remain fixed between sessions even if the athlete reduces the `Actual Work Duration` for a particular session. Furthermore each profile has its own nominal peak heartrate which merely sets the initial vertical scale on the training session heart graph. Inside the table of recovery periods an individual period can be tapped, in which case a control panel will slide out allowing the period to be adjusted, removed, or cloned.
## Purpose

`Settings` is the session-profile management screen.

This is not a general preferences page yet. It is primarily where backup/restore and session-profile management live.

## Scroll behavior

Required behavior:

- `Settings` is allowed to scroll vertically.

Design intent:

- `Settings` is used when the athlete is not actively training.
- It may therefore use a scrollable layout to expose profile management and backup workflows.

## Required capabilities

- Import backup data, including profile definitions
- Export backup data, including profile definitions
- Browse available session profiles
- Select a profile for the next session
- Edit a profile
- Delete a profile subject to profile rules

## Session profiles

Each profile contains:

- `name`
- `workDurationSec`
- `nominalPeakHeartrate`
- `warmupSec`
- `baseRestsSec` for recovery rounds
- `cooldownBaseSec`
- `notes`

## Profile rules

- The app ships with a starter profile named `My Profile`
- There must always be at least one profile
- One and only one profile is the `Selected Profile`
- A copied profile must get a new unique name
- When a profile name is changed, any references to that profile name in the session history are updated.
- Once a profile has been used by any saved session, its timing fields become read-only.
- Once a profile has been used by any saved session, its `name` and `notes` remain editable.
- If the athlete wants different timing values, they must clone the profile or delete the old sessions that reference it.

## Starter profile

Required starter profile definition:

- `name`: `My Profile`
- `workDurationSec`: `30`
- `warmupSec`: `300`
- `cooldownBaseSec`: `180`
- `baseRestsSec`: `90, 75, 60, 45, 35, 30, 30, 30, 30, 30, 30, 30`

Implementation note:

- The first five recovery rounds are `90`, `75`, `60`, `45`, and `35` seconds.
- The final seven recovery rounds are `30` seconds each.

## Screen sections

### Profiles

- Profile picker/list
- selected-state marker
- `Delete`
- `Select`
- `Edit`

### Profile details

- Name
- Notes
- Actions:
  - `Copy Profile`
  - `Set Selected`
  - `Save Changes`
  - `Delete Profile`

### Timing

- Home-screen `Actual Work Duration` stepper for the next session

### Recovery

Unified list containing:

- `Warmup`
- `Round 1...N`
- `Cooldown`

## Recovery list interaction

Required behavior:

- Rows are compact by default
- Tapping a row expands its controls
- The full width of a recovery row is tappable; the user should not need to tap only the row label
- Expanded state reveals:
  - for warmup/cooldown: only the stepper
  - for recovery rounds: clone/delete in the summary strip, plus stepper below

### Round row summary

- Normal state: label on left, recovery time on right
- Selected state: recovery time is replaced by clone/delete buttons

### Round row controls

- `+ / value / -` stepper remains in the reveal panel
- Reveal panel uses a short animation

### Stepper behavior

- tap changes by `1s`
- long press repeats by `5s`
- text selection/callout is suppressed on the controls

## Unsaved changes

Required behavior:

- Profile edits remain draft-only until `Save Changes` is pressed.
- If the user has unsaved profile amendments and attempts to switch to a different profile, the app must show a confirmation modal.
- The confirmation modal must make it clear that unsaved amendments will be lost if the user continues.
- The user must be able to cancel and stay on the current profile without losing the draft edits.
- The user must be able to confirm discarding the draft and proceed to the newly selected profile.

## Design intent

- Mobile-first
- Compact list rather than stack of big cards
- Recovery editing should feel sequence-based, not spreadsheet-based

## Explicit non-goals

- No general-purpose preferences unrelated to backup or session profiles
- No extra explanatory cards or helper paragraphs beyond the documented screen sections
- No additional profile-derived summaries unless explicitly specified
- No extra editor workflows or validation UI unless explicitly specified
- If a Settings detail is ambiguous, omit it rather than inventing extra copy or extra controls

## Related pages

- [[Domain Model]]
- [[Interaction Rules]]
- [[Open Issues]]
