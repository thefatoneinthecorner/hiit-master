# Current UI State

## Purpose

This document describes the workout UI behavior that is implemented in the current app build. It is intentionally narrower than the product spec: it records what exists now, not the full version 1 target.

## Current Status

The app now has a working end-to-end workout screen built on top of:

- a strict TypeScript/Preact app shell
- IndexedDB-backed storage repositories
- a `WorkoutSessionController` for timer and session state
- a Web Bluetooth heart-rate monitor adapter using the standard `heart_rate` service

The UI is usable as a real session runner and as a demo environment for comparison design work.

## Workout Screen

The main workout screen currently includes:

- setup controls for work duration
- Bluetooth connect and disconnect controls
- a required HR connection gate before session start
- live timer state for warmup, work, rest, cooldown, paused, completed, and ended-early states
- live BPM display
- pause, resume, and end-early controls
- a completed-state workflow that stays on the workout screen instead of navigating away

## Bluetooth Behavior

Implemented behavior:

- the app requests a real Web Bluetooth heart-rate monitor
- the app subscribes to `heart_rate_measurement` notifications
- the app blocks session start unless the monitor is connected
- if connection drops after start, the session may continue but becomes compromised
- connection errors are surfaced in the UI

Current limitation:

- this has browser-level coverage through the Web Bluetooth adapter and test coverage for parsing, but hardware validation still depends on manual browser/device testing

## Comparison Mode

The live comparison view currently uses:

- a current-session heart-rate chart plotted on a full-session time axis
- round-derived sawtooth modeling rather than a fully continuous live sample trace
- lag-aware round analysis where peaks and troughs intentionally span phase boundaries
- a compact delta strip aligned to the same time scale
- per-round delta comparison against the immediately previous comparison-eligible session
- a scrubber that snaps to the nearest work-interval midpoint

Current chart behavior:

- the main chart shows only the current session trace
- the previous session is used for comparison metrics, not as an overlaid line on the chart
- the comparison strip encodes `currentDelta - previousDelta`
- positive deltas render above the strip baseline and negative deltas render below it

## Scrubber

Implemented behavior:

- the chart and delta strip share one scrub position
- the scrubber shows a vertical guide line in the chart and strip
- scrub details are rendered in the timer card rather than over the graph
- scrub inspection is disabled while the timer is actively running

Current detail content:

- elapsed time
- round number
- current delta
- previous delta
- signed difference

## Portrait Phone Layout

There is now a portrait-phone-specific condensed mode.

When the viewport is narrow and portrait-oriented, the UI collapses to:

- timer at the top
- current-session heart-rate chart
- delta strip

In that mode the following panels are hidden:

- setup
- runtime
- history

This mode exists to evaluate mobile readability and interaction density. It is not yet final design polish.

## History

Implemented history behavior:

- sessions are loaded from IndexedDB
- the user can select a prior session from the list
- the selected session shows stored round metrics
- session metadata includes status and comparison eligibility

This is currently a simple review surface, not a polished post-session analysis flow.

## Demo Comparison Mode

A design/demo mode is available via:

- `?demo_comparison=1`

This mode currently:

- seeds a previous completed comparison-eligible session into storage
- uses fixed peak and trough values for both current and previous sessions
- drives the comparison chart and delta strip without requiring live workout capture

This mode is intended for visualization work, not production session capture.

## Known Gaps

Important gaps between the current UI and the intended product:

- the heart-rate chart is still modeled from lag-aware per-round peak and trough summaries rather than plotted from real live sample data
- scrubber detail is round-based, not sample-based
- warmup and cooldown graph treatment is still sparse and not yet visually expressive
- export actions are not yet surfaced in the current workout UI
- the portrait-phone layout is functional but still needs spacing and hierarchy refinement
- historical correction tools described in prototype notes are not implemented

## Suggested Next UI Work

The most sensible next UI feature is:

- replace the modeled chart trace with real heart-rate sample plotting for the current session

After that:

- upgrade the scrubber to inspect real samples while still showing round comparison context
- improve portrait-phone layout polish
- decide whether completed-session review should surface more detail by default or remain compact
