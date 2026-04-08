# History
![[Pasted image 20260406105832.png|300]]

Below the date and time for the session (acting as its name or title), the profile name used for the session is displayed. A trash icon next to the session title allows the user to delete that session. Below that the session's heart graph, which is similar to the live heart graph, except (i) the axes are labelled (not shown) and (ii) it incorporates a "scrubber" that moves across the time axis.

Immediately below the heart graph, the UI displays the current `Round`, `Time`, and `BPM` corresponding to the scrubber position.

Below that, "recovery deltas" between the current session and the previous session (against the same profile) are displayed as a histogram plot (just as they are in the live session). When the scrubber is over one of the histogram bars, it will display the round number.

Finally, below the recovery delta histograms, a compact stats readout is displayed for the selected round, showing `Peak`, `Trough`, `Delta`, and `Delta Diff` (if available), followed by the raw table of round data.

Swiping left or right over this screen will move forwards and backwards through time.

## Purpose

`History` is the historical session browsing and inspection screen.

## Scroll behavior

Required behavior:

- `History` is allowed to scroll vertically.

Design intent:

- `History` is used when the athlete is not actively training.
- It may therefore trade compactness for richer inspection detail and longer historical content.

## Required capabilities

- Browse previous sessions
- Navigate between sessions
- Delete a session using the trash icon in the header

## Session presentation

Required behavior:

- The session date is clearly visible in the detail view
- The session name is derived from the session start date/time
- The profile name associated with the session is shown
- A trash icon in the header deletes the current session
- Round data is shown as a compact table

Required scrubber readout fields:

- `Round`
- `Time`
- `BPM`

Required table columns:

- `Round`
- `Peak`
- `Trough`
- `Delta`
- `Delta Diff`

`Delta` is the recovery for a round, defined as `Peak - Trough`.

`Delta Diff` is the difference between this session’s `Delta` for a given round and the `Delta` for the same round in the most recent eligible previous session recorded against the same profile.

## Navigation behaviour

### Mobile

- Swipe horizontally between sessions

### Desktop

- Use chevron buttons on either side of the history detail header

## Design intent

- `History` should be where all historical review and deletion lives
- Data portability should not clutter the session browsing flow

## Explicit non-goals

- No workout-start controls
- No device-management controls
- No extra explanatory or coaching copy beyond the documented readouts and labels
- No additional analysis summaries beyond the documented scrubber readouts, histogram, stats, and table
- If a History detail is ambiguous, omit it rather than inventing extra UI

## Open issue

- Trackpad vertical swipe/scroll behavior may feel inconsistent on Mac in some cases

## Related pages

- [[Domain Model]]
- [[Open Issues]]
