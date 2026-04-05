# Settings

![[Pasted image 20260405201043.png|300]]

The Settings page allows the IndexDB database to saved to an external file and also imported from an external file. But it also maintains the "Session Profiles" (which are mainly a definition of the recovery periods for each round). There will always be at least one Session Profile on the phone and the app will not allow you to delete the last profile. If there is more than one profile then you can nominate with Profile should be the Default Profile (a.k.a. the "Active" profile). This is the profile that will be used for the next training session. The selected profile can be edited by clicking on the edit button.

![[Pasted image 20260405195611.png|300]]

The image above show the session editor. Each session has a name which the user can change, but must always be unique. They have free form arbitrary notes that the user can use as they wish. Each session has its own Nominal Work Period, typically 30 seconds. When the athlete uses the session for training successive rest periods will be taken from the "Recovery Periods" table, but the work period will always be the same and derived fro the Nominal Work Period. Furthermore each session has its own nominal peak heartrate which merely sets the initial vertical scale on the training session heart graph. Inside the table of Recovery periods and individual period can be tapped on, in which case a control panel will "slide out" allowing the period to be adjusted (supporting long presses incrementing/decrementing but 5s) as well as removed or cloned.
## Purpose

`Settings` is the session-profile management screen.

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
- When a profile name is changed, any references to that profile name in the session history are updated.

## Screen sections

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

Required behavior:

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
