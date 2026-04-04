# Domain Model

## Core entities

### Session

A recorded workout instance.

Required persisted session data includes at least:

- session identity and timestamps
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
- `warmupSec`
- `baseRestsSec`
- `cooldownBaseSec`
- `notes`
- `isDefault`

## App settings

Required app-level stored settings include:

- `activeProfileId`

## Workout plan

Generated from the active session profile.

Required behavior:

- round count is variable and derived from the profile’s recovery list
- users can adjust work duration at session start without mutating the profile
- any work-duration adjustment is compensated for in the recovery periods so that total round durations are preserved
- warmup and cooldown are part of the workout plan

## Historical linkage

- Sessions persist the active profile name at the time of recording
- History displays that stored profile name
- Session-to-session comparison should only compare against the most recent eligible prior session on the same profile

## Import/export scope

Required backups include:

- sessions
- related session data
- session profiles
- app settings needed to restore active profile state

## Open integrity issue

- Profile mutability/versioning is intentionally unresolved
- See [[Open Issues]]
