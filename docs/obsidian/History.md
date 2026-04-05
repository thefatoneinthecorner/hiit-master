# History

![[Pasted image 20260405153943.png|300]]

Below the date and time for the session is displayed and below that the heart graph, which is similar to the live heart graph, except (i) the axes are labelled and (ii) it incorporates a "scrubber" that moves across the time axis and displays the exact time and heart rate as it laterally shifts.

![[Pasted image 20260405154037.png|300]]

The screenshot above shows the characteristic rising sawtooth of a typical HIIT training session. Below that the "recovery deltas" between the current session and the previous session (against the same profile) are displayed as a histogram plot (just as they are in the live session). When the scrubber is over one of the histogram bars, it will display the round number.

Finally, below the recovery deltas, a table of raw data is displayed, showing the raw stats for each round.

## Purpose

`History` combines data-management actions with browsing of previous workout sessions.

## Required capabilities

- Browse previous sessions
- Navigate between sessions
- Delete a session
- Import backup data (including profile definitions)
- Export backup data (including profile definitions)

## Session presentation

Required behavior:

- The session date is clearly visible in the detail view
- The profile name associated with the session is shown
- Round data is shown as a compact table

Required table columns:

- `Round`
- `Peak`
- `Trough`
- `Delta`

## Navigation behaviour

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
