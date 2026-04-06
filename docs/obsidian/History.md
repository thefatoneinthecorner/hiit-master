# History

![[Pasted image 20260405192106.png|300]]

Below the date and time for the session (acting as its name or title), the profile name used for the session is displayed. Below that the session's heart graph, which is similar to the live heart graph, except (i) the axes are labelled (not shown) and (ii) it incorporates a "scrubber" that moves across the time axis and displays the exact time and heart rate as it laterally shifts in a small table immediately below.

Below the scrubber table, a table of performance data for each round is displayed.  "recovery deltas" between the current session and the previous session (against the same profile) are displayed as a histogram plot (just as they are in the live session). When the scrubber is over one of the histogram bars, it will display the round number.

Finally, below the recovery delta histograms, a table of raw data is displayed, showing the raw stats for each round.

Swiping left or right over this screen will move forwards and backwards through time.

## Purpose

`History` is the historical session browsing and inspection screen.

## Required capabilities

- Browse previous sessions
- Navigate between sessions
- Delete a session

## Session presentation

Required behavior:

- The session date is clearly visible in the detail view
- The session name is derived from the session start date/time
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

## Design intent

- `History` should be where all historical review and deletion lives
- Data portability should not clutter the session browsing flow

## Open issue

- Trackpad vertical swipe/scroll behavior may feel inconsistent on Mac in some cases

## Related pages

- [[Domain Model]]
- [[Open Issues]]
