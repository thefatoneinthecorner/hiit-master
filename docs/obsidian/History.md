# History

## Purpose

`History` combines data-management actions with browsing of previous workout sessions.

## Current capabilities

- Browse previous sessions
- Navigate between sessions
- Delete a session
- Import backup data
- Export backup data

## Session presentation

Current behavior:

- The session date is clearly visible in the detail view
- The profile name associated with the session is shown
- Round data is shown as a compact table

Current table columns:

- `Round`
- `Peak`
- `Trough`
- `Delta`

## Navigation behavior

### Mobile

- Swipe horizontally between sessions

### Desktop

- Use chevron buttons on either side of the history detail header

## Import/export behavior

- Import and export operate on the full data model, not just sessions
- Profiles are included in backup import/export

## Design intent

- `History` should be where all historical review and data portability lives
- Import/export should not sit on the main workout screen

## Open issue

- Trackpad vertical swipe/scroll behavior may feel inconsistent on Mac in some cases

## Related pages

- [[Domain Model]]
- [[Open Issues]]
