# Product Spec

## Product

A mobile-first web app for running a structured HIIT session with a required Bluetooth heart-rate monitor, live heart-rate visualization, and post-session review on the same primary workout screen.

## Version

This document defines the target for version 1.

## Product Goal

Help a user complete a repeatable HIIT workout and immediately review basic recovery quality without requiring accounts, cloud sync, or manual data cleanup.

## Primary User

A single athlete using a phone during training who needs:

- a readable interval timer
- reliable audio cues
- a required live heart-rate feed
- a clear end-of-session state on the workout screen
- primary at-a-glance comparison feedback during the workout
- local history for comparing recent sessions

## Product Principles

- The workout screen must be readable at a distance during exercise.
- The session flow must require a heart-rate monitor before workout start.
- If heart-rate connection drops mid-session, the workout may continue, dropout intervals must be recorded explicitly, and the session becomes ineligible for comparison and baseline use.
- Raw captured data must be preserved.
- Version 1 should prefer deterministic behavior over clever inference.
- Review workflows should be simple and low-risk.

## Scope

### In scope for version 1

- Session setup screen
- Fixed workout template
- Start countdown and audio cues
- Warmup, work, rest, cooldown, and completed states
- Pause, resume, and end-session controls
- Required Bluetooth heart-rate monitor connection before session start
- Live BPM display
- Live heart-rate graph
- Automatic per-round peak and trough calculation from timeline windows
- Local persistence in IndexedDB
- Session history list
- Session detail and completed-session state on the workout screen
- Live comparison against the immediately previous session
- At-a-glance previous-session comparison view as the primary mobile feedback surface
- Laptop-friendly debug table view
- Export of session summaries and raw data

### Out of scope for version 1

- Accounts or cloud sync
- Multi-user support
- Editable historical correction workflows
- User-configurable workout templates and round structures
- Trend-based live interval detection as the canonical algorithm
- Coaching recommendations or performance scoring beyond simple metrics
- Apple Health / Google Fit integration

## Canonical Workout Model

Version 1 uses a fixed workout structure:

- 1 warmup phase
- 13 work rounds
- 12 recovery rest phases between rounds
- 1 cooldown phase

Default timing:

- Warmup: `300s`
- Work duration: user-configurable, default `20s`
- Base recovery sequence after each work round: `90, 75, 60, 45, 35, 30, 30, 30, 30, 30, 30, 30`
- Cooldown base: `180s`

Effective rest formula:

- `actualRest = baseRest + 30 - workDuration`

Interpretation:

- This rule is intentional and central to the product.
- The app keeps total round duration fixed so sessions remain comparable when work duration changes.

Constraints:

- Work duration is configurable from `15s` to `45s`
- Actual rest must never be less than `5s`
- Workout structure is not user-editable in version 1

## Core User Flows

### 1. Start a session

1. User opens the app.
2. User sees the setup screen with the current work duration.
3. User may change work duration.
4. User connects a Bluetooth heart-rate monitor.
5. App confirms a live heart-rate connection.
6. User starts the workout.
7. App runs a 3-second countdown with audio.
8. App enters warmup.


### 2. Run a session

During the workout the app shows:

- current phase name
- time remaining
- current round number
- current BPM or placeholder when unavailable
- a modest-resolution live graph when HR data exists
- at-a-glance comparison against the immediately previous session as the primary feedback surface

The user may:

- pause
- resume
- end the session early

The app must:

- play final-countdown beeps in the last 3 seconds of a phase
- play a transition tone at every phase change
- attempt to keep the screen awake
- detect HR connection loss during the session
- allow the workout to continue after connection loss
- record explicit missing-heart-rate samples during dropout periods
- resume normal time-synced recording if the device reconnects
- mark the session compromised and ineligible for previous-session comparison and baseline use if connection loss occurs

### 3. Complete a session

When the final cooldown finishes:

- the timer stops
- the session is marked complete
- the workout screen remains visible
- the UI changes only enough to clearly indicate completion
- the same screen continues to summarize key metrics and provide access to history

### 4. Review history

The user can open a history view and inspect prior sessions.

For each stored session the app should show at minimum:

- session date/time
- work duration
- completion status
- whether HR data exists
- per-round peak/trough summary
- graph of recorded HR samples when available

## Functional Requirements

### Setup

- The app must remember the most recently used work duration.
- The app should surface recent sessions from persisted local session history.
- The app must block workout start until a heart-rate monitor is connected.
- The app must show live connection state during setup.

### Timer Engine

- The timer engine must be implemented from pure timing data, not DOM state.
- The timer must expose current phase, round index, time remaining, and session completion status.
- The timer must support pause and resume without losing elapsed-time accuracy.
- The timer must support explicit early termination by the user.

### Heart-Rate Capture

- The app must attempt Bluetooth connection using the standard `heart_rate` service.
- The app must subscribe to heart-rate measurement notifications.
- The app must store raw heart-rate samples with session identifier and timestamp.
- The app must prevent workout start if Bluetooth is unavailable, denied, or disconnected during setup.
- The app must detect disconnection during an active session.
- The app must record explicit missing-heart-rate samples during dropout intervals.
- The app must continue the same session timeline if the device reconnects.
- The app must persist session-level compromise and eligibility states for comparison and baseline use.

### Graphing

- On phone-sized screens, the graph should remain secondary to timer and at-a-glance comparison feedback.
- The app must plot recorded heart-rate samples on a session timeline.
- The graph must visually distinguish warmup, work, rest, and cooldown windows.
- The graph should support a scrubber or hover inspection on devices that support it.
- The graph must render historical sessions from persisted raw samples.

### Interval Analysis

Version 1 canonical algorithm:

- Per-round `peak` is the maximum BPM within the round's work window.
- Per-round `trough` is the minimum BPM within the following recovery window.
- If no samples exist in a window, the metric is empty.

Rules:

- Calculated stats are deterministic from the saved raw data and session timing definition.
- Raw samples are authoritative.
- Derived interval stats may be cached, but must be reproducible from raw data.
- Manual correction of interval boundaries is out of scope for version 1.

### Comparison

Version 1 comparison requirements:

- The app must identify the immediately previous comparison-eligible session from local history.
- The app must calculate per-round delta as `peak - trough`.
- The app must calculate per-round comparison as `currentDelta - previousDelta`.
- On phone-sized screens, the in-session comparison view is the primary feedback surface.
- The visual encoding may use histogram bars, graph segment styling, color, line weight, dash patterns, or a combination, provided the comparison remains legible at a glance.
- The mobile comparison view must support at least the 12/13 most recent round comparisons, with later rounds prioritized for visibility.
- If necessary on smaller screens, older comparison elements may scroll off to the left while the most recent elements remain visible.
- The app must provide the same comparison in the completed-session state.
- If there is no previous comparison-eligible session, the app must gracefully show that comparison is unavailable.

### Completed Session State

The completed workout screen must include:

- total session duration
- work duration used
- whether the session was compromised by HR dropout
- previous-session comparison view when a previous comparison-eligible session exists
- per-round delta values where both inputs exist
- access to prior sessions
- export actions

On larger laptop-sized screens used for development and analysis, the UI should also expose a tabular debug view with per-round metrics.

### History and Persistence

- IndexedDB is the canonical client-side store.
- The app must store sessions and raw heart-rate samples separately.
- The app should store derived stats with a version marker for recomputation if the algorithm changes.
- The app must not rely on `localStorage` for canonical session data.

### Export

Version 1 export must provide both JSON and CSV.

Required export payloads:

- session summary JSON
- raw sample JSON
- tabular metrics export in JSON
- CSV session summary
- CSV per-round metrics export

## Data Model

### Session

Required fields:

- `id`
- `startedAt`
- `completedAt`
- `status`
- `workDurationSec`
- `warmupSec`
- `baseRestsSec[]`
- `cooldownBaseSec`
- `actualRestsSec[]`
- `hasHeartRateData`
- `hrCoverageComplete`
- `isCompromised`
- `comparisonEligible`
- `analysisVersion`

Optional fields:

- `notes`
- `deviceName`
- `endedEarly`

### HeartRateSample

Required fields:

- `id`
- `sessionId`
- `timestamp`
- `bpm`
- `isMissing`

### IntervalStat

Required fields:

- `sessionId`
- `roundIndex`
- `peakBpm`
- `troughBpm`

## Non-Functional Requirements

- Phone-sized screens are the primary production target.
- On mobile, the timer and at-a-glance comparison view have priority over dense tabular presentation.
- The UI should remain usable on larger laptop-sized screens during development and analysis.
- Dense tabular data presentation on mobile is not required for version 1.
- Larger-screen tabular views are explicitly supported for debugging and analysis.
- Mobile-first layout
- Large tap targets
- High contrast during active workout
- Support for portrait and landscape on phone-sized devices
- Local-first operation after page load
- Graceful behavior when Wake Lock is unavailable
- Graceful behavior when Bluetooth is unavailable

## Success Criteria For Version 1

- A user can complete a full session without touching the app during the run.
- A user can complete a session without a heart-rate monitor.
- A user with a supported heart-rate monitor can capture and review raw HR data.
- A completed session can be reopened later and yield the same derived interval stats.
- Core timing and interval-analysis logic are covered by automated tests.

## Technical Direction

- Language: TypeScript in strict mode
- UI library: Preact
- Component style: React-style functional components
- App model: single-page application
- Hosting target: GitHub-hosted static site
- Typing policy: avoid `any` unless stronger typing is disproportionately expensive

## Build Priorities

1. Domain model and pure timer engine
2. IndexedDB storage layer
3. Interval-analysis logic and fixtures
4. Setup / workout / results UI
5. Bluetooth integration
6. History and export
