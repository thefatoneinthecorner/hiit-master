# Domain Model

## Core entities

### Session

A recorded workout instance.

Current persisted session data includes at least:

- session identity and timestamps
- interval stats
- heart-rate samples
- `profileName`

## Session profile

A saved timing profile that defines the workout plan.

Current fields:

- `id`
- `name`
- `workDurationSec`
- `warmupSec`
- `baseRestsSec`
- `cooldownBaseSec`
- `notes`
- `isDefault`

## App settings

Current app-level stored settings include:

- `activeProfileId`

## Workout plan

Generated from the active session profile.

Important current rule:

- round count is variable and derived from the profile’s recovery list

## Historical linkage

- Sessions persist the active profile name at the time of recording
- History displays that stored profile name

## Import/export scope

Current backups include:

- sessions
- related session data
- session profiles
- app settings needed to restore active profile state

## Open integrity issue

- If profiles are editable after sessions exist, historical meaning becomes ambiguous
- See [[Open Issues]]
