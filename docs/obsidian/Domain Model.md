# Domain Model

## Core entities

### Session

A recorded workout instance.

Required persisted session data includes at least:

- session identity and timestamps
- a session name derived from the session start time
- interval stats
- heart-rate samples
- `profileName`
- the actual work duration used for that session

## Session profile

A saved timing profile that defines the workout plan.

Required profile fields:

- `id`
- `name`
- `workDurationSec`
- `nominalPeakHeartrate`
- `warmupSec`
- `baseRestsSec`
- `cooldownBaseSec`
- `notes`

## App settings

Required app-level stored settings include:

- `selectedProfileId`
- enough data to derive the default `Actual Work Duration` for the Home screen from the most recent session recorded on the same selected profile

## Workout plan

Generated from the selected profile.

Required behavior:

- round count is variable and derived from the profile’s recovery list
- users can actual adjust work duration at session start without mutating the profile
- any work-duration adjustment is compensated for in the recovery periods so that total round durations are preserved
- warmup and cooldown are part of the workout plan
- the nominal profile work duration is typically `30s`
- the Home screen `Actual Work Duration` defaults to:
  - the most recent session’s chosen work duration for the same selected profile
  - otherwise two thirds of the selected profile's nominal work duration if no earlier session exists for that profile

## Historical linkage

- Sessions have both:
  - a session name, which is effectively the formatted start date/time
  - a `profileName`, which identifies the profile used when the session began
- Sessions persist the selected profile name at the time of recording
- History displays that stored profile name
- Session-to-session comparison should only compare against the most recent eligible prior session on the same profile

## Import/export scope

Required backups include:

- sessions
- related session data
- session profiles
- app settings needed to restore selected-profile state

## Profile mutability rules

- Referenced profiles are timing-immutable:
  - `workDurationSec`, `nominalPeakHeartrate`, `warmupSec`, `baseRestsSec`, and `cooldownBaseSec` cannot be changed once any session references the profile
- Referenced profiles remain editable for:
  - `name`
  - `notes`
- Renaming a profile updates the stored `profileName` reference on existing sessions
- If an athlete wants different timing values, they must either:
  - clone the profile and edit the clone
  - or delete the old training sessions that reference the profile
