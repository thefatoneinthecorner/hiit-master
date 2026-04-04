# Settings

## Purpose

`Settings` is currently the session-profile management screen.

This is not a general preferences page yet. It is primarily where workout timing profiles are created, copied, selected, and edited.

## Session profiles

Each profile contains:

- `name`
- `workDurationSec`
- `warmupSec`
- `baseRestsSec` for recovery rounds
- `cooldownBaseSec`
- `notes`
- `isDefault`

## Profile rules

- There is always a default profile named `Profile`
- The default profile is read-only
- The default profile cannot be deleted
- One and only one profile is active
- A copied profile must get a new unique name

## Current screen sections

### Profiles

- Profile picker/list
- Active/default markers

### Profile details

- Name
- Notes
- Actions:
  - `Copy Profile`
  - `Set Active`
  - `Save Changes`
  - `Delete Profile`

### Timing

- `Work Duration` stepper

### Recovery

Unified list containing:

- `Warmup`
- `Round 1...N`
- `Cooldown`

## Recovery list interaction

Current behavior:

- Rows are compact by default
- Tapping a row expands its controls
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

## Design intent

- Mobile-first
- Compact list rather than stack of big cards
- Recovery editing should feel sequence-based, not spreadsheet-based

## Open issue

- Profile mutability vs historical integrity is unresolved; see [[Open Issues]]

## Related pages

- [[Domain Model]]
- [[Interaction Rules]]
- [[Open Issues]]
