# Current UI State

## Purpose

This document describes the workout UI behavior that is implemented in the current app build. It records what exists now, including the current live-test bug backlog.

## Current Status

The app now has a working end-to-end workout screen built on top of:

- a strict TypeScript/Preact app shell
- IndexedDB-backed storage repositories
- a `WorkoutSessionController` for timer and session state
- a Web Bluetooth heart-rate monitor adapter using the standard `heart_rate` service
- Web Audio cues for countdown and phase transitions
- screen wake-lock handling while a session is running when the browser supports it

The UI is usable as a real session runner and as a demo environment for comparison design work, but recent live testing exposed several readability and layout issues that still need correction.

## Workout Screen

The main workout screen currently includes:

- setup controls for work duration
- Bluetooth connect and disconnect controls
- a required HR connection gate before session start
- live timer state for warmup, work, rest, cooldown, paused, completed, and ended-early states
- live BPM display
- pause, resume, and end-early controls
- a current-session heart-rate chart on a full-session time axis
- a compact delta strip aligned to the same time scale
- a completed-state workflow that stays on the workout screen instead of navigating away

## Bluetooth Behavior

Implemented behavior:

- the app requests a real Web Bluetooth heart-rate monitor
- the app subscribes to `heart_rate_measurement` notifications
- the app blocks session start unless the monitor is connected
- if connection drops after start, the session may continue but becomes compromised
- connection errors are surfaced in the UI
- Bluetooth battery level is not currently read, but standard `battery_service` support is a plausible version 2 enhancement for monitors that expose it

Current limitation:

- this has browser-level coverage through the Web Bluetooth adapter and test coverage for parsing, but hardware validation still depends on manual browser/device testing

## Audio And Wake Lock

Implemented behavior:

- the app primes a Web Audio context from user interaction
- the app plays short final-countdown beeps near the end of a running phase
- the app plays a longer transition tone at phase changes
- the app requests a screen wake lock while the session is running when the browser supports it
- the app releases wake lock when the session is no longer running and attempts to reacquire it when the page becomes visible again

Current limitation:

- cue timing and volume still need live-device tuning
- wake-lock behavior still depends on browser and device support

## Comparison Mode

The live comparison view currently uses:

- a current-session heart-rate chart plotted from live samples on a full-session time axis
- lag-aware round analysis where peaks and troughs intentionally span phase boundaries
- a compact delta strip aligned to the same time scale
- per-round delta comparison against the immediately previous comparison-eligible session
- a scrubber shared across the chart and delta strip

Current chart behavior:

- the main chart shows only the current session trace
- the previous session is used for comparison metrics, not as an overlaid line on the chart
- the comparison strip encodes `currentDelta - previousDelta`
- positive deltas render above the strip baseline and negative deltas render below it
- explicit missing-heart-rate periods render as visible gaps in the current trace

## Scrubber

Implemented behavior:

- the chart and delta strip share one scrub position
- the scrubber shows a vertical guide line in the chart and strip
- scrub details are rendered in the timer card rather than over the graph
- scrub inspection is disabled while the timer is actively running
- when the scrubber is over a dropout gap, the card is intended to show a no-data state rather than implying a continuous sample

Current detail content:

- elapsed time
- round number
- current BPM when available
- current delta
- previous delta
- signed difference

## Portrait Phone Layout

There is a portrait-phone-specific condensed mode.

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
- generates a synthetic current-session trace for chart and comparison design work

This mode is intended for visualization work, not production session capture.

## Known Gaps

Important gaps between the current UI and the intended product:

- export actions are not yet surfaced in the current workout UI
- the portrait-phone layout is functional but still needs spacing and hierarchy refinement
- historical correction tools described in prototype notes are not implemented
- suspected bug: the comparison delta may appear too early, including at the start of the first work period, and needs verification against live workout data
- suspected bug: audio cue timing may include one extra beep, so countdown and transition cue counts need live verification
- suspected bug: there are no beeps and no 3-2-1 countdown at the very start of warmup, which makes session start feel silent and abrupt
- suspected bug: the beeps are too quiet for reliable use during a real workout
- suspected bug: the live BPM readout can become illegible in the active-session layout
- suspected bug: the rounds readout can become illegible in the active-session layout
- suspected bug: the countdown timer is not visually centered in its panel
- suspected bug: the rounds panel layout is poor in real use and needs redesign
- suspected UX issue: once a session is running, the setup and runtime panels provide little value and consume too much space
- suspected bug: the heart-rate graph stroke appears too heavy during live use
- suspected bug: the graph view can become vertically squashed between roughly 200 BPM and the low 20s, reducing readability
- suspected bug: the delta bars can scroll off the bottom of the viewport in live use
- suspected bug: the live graph can occasionally jump to an implausible flat line around 300 BPM before recovering, which suggests a transient sample parsing, scaling, or rendering fault

## Suggested Next UI Work

The most sensible next UI task is a live-test bugfix pass focused on readability and active-session layout.

Highest-priority follow-up items:

- fix timer, BPM, and rounds readability on phone-sized screens
- simplify the running-session layout so low-value setup/runtime panels do not dominate the screen
- correct chart scaling, stroke weight, and delta-strip overflow issues
- tune audio cue timing and volume, including startup countdown behavior
- investigate the transient 300 BPM graph fault and the early-delta display issue
