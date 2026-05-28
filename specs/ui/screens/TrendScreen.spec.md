# TrendScreen

## Purpose

`TrendScreen` displays long-term recovery variation trends across saved sessions.

## Layout

- Between `NormalisedCovGraph` and the embedded `HeartGraph`, the page renders the selected point title using the selected point's profile name and actual work duration, for example `Full Timer 2, 30s work`.
- The selected point title uses matching typography to the `Normalised CoV` graph title: small caps for non-initial letters and regular caps for initial letters.
- The primary content is `NormalisedCovGraph`.
- The graph uses normalized CoV points derived from saved sessions.
- Below the trend graph, the page renders a crosshair `HeartGraph` for the session represented by the currently scrubbed trend point.
- Scrubbing the trend graph with the mouse or pointer updates the selected trend point and switches the `HeartGraph` to that point's session.
- The trend graph only scrubs while the pointer is pressed.
- Once trend scrubbing starts, pointer capture allows dragging beyond the graph extents before release.
- The embedded `HeartGraph` uses the same crosshair presentation as the `Backup Session Crosshair` story: duration time scale, phase labels, lag-aware delta labels, shaded phase interval, and dashed min/max BPM markers.
- The embedded `HeartGraph` receives previous comparison-eligible sessions in reverse chronological order so its crosshair label can display delta-diff arrows against the newest previous session with the corresponding interval.
- Previous session deltas use the same phase-aware HeartGraph calculation as the current session, including cooldown deltas.
- Pressing or dragging inside the embedded `HeartGraph` moves that graph's crosshair within the selected session.
- Changing the selected trend point resets the embedded `HeartGraph` crosshair to its default scrub position for the newly selected session.

## Navigation

- The app route is `/trend`.
- The TabBar displays `Trends` between `Home` and `History`.
- Trend is disabled while a session or countdown is active.

## Storybook Scope

- Storybook renders the presentational `TrendScreenView` with fixture trend points.
- Storybook uses sessions from `hiit-master-backup.json` and re-derives their analysis from saved plans and samples.
- Storybook uses a mocked scrubber change handler and does not access IndexedDB.
