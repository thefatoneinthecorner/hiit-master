# Reverse-Engineered Product Spec

## Purpose

This project is a browser-based HIIT workout tool that combines:

- A configurable interval timer for a fixed-length HIIT session
- Live heart-rate capture from a Bluetooth heart-rate monitor
- A heart-rate graph over the full session timeline
- Per-round peak/trough analysis
- Historical session review and comparison

The current codebase contains three prototype variants:

- `index.html`: timer-first prototype
- `heart.html`: heart-analysis-first prototype
- `combined.html`: merged dashboard prototype

This document describes the behavior that currently exists or is strongly implied by those prototypes. It is a baseline spec for a proper rebuild, not a claim that all current behavior is correct.

## Product Vision

The app is intended to support repeatable HIIT workouts where the user:

1. Selects or reuses a work interval target
2. Starts a guided timer with warmup, work, rest, and cooldown phases
3. Connects a Bluetooth heart-rate monitor
4. Watches live heart rate during the workout
5. Reviews the resulting heart-rate curve and per-interval recovery data
6. Compares a session to earlier sessions and optionally corrects alignment assumptions

## Core Domain Model

### Workout structure

The workout uses:

- 1 warmup rest block at the beginning
- 13 work rounds
- 12 normal recovery rest blocks between work rounds
- 1 cooldown block after the final round

The rest baseline sequence in the prototypes is:

- Warmup: `300s`
- Recovery blocks: `90, 75, 60, 45, 35, 30, 30, 30, 30, 30, 30, 30`
- Cooldown: derived from `180 + 30 - workGoal`

The effective recovery formula used by the timer is:

- `actualRest = baseRest + 30 - workGoal`

Implication:

- Shorter work intervals increase recovery time
- Longer work intervals decrease recovery time
- The system appears to target a constant `work + rest` pair duration relative to a 30-second reference

### Session

A session currently includes some or all of:

- `date`
- `goal` or `workGoal`
- `rests`
- `offset`
- `intervals`
- raw heart-rate samples keyed by session date

### Interval stats

Each round stores:

- `peak`: high heart rate during or near the work period
- `trough`: low heart rate during or near the recovery period

The prototypes use two competing interpretations:

- `heart.html` uses stateful live phase detection from heart-rate changes
- `combined.html` computes stats retrospectively from timeline windows

This is a major product decision that needs to be resolved in the rebuild.

## Functional Requirements Derived From Existing Prototypes

### 1. Launch and session setup

The app should provide a pre-workout setup view where the user can:

- Increase or decrease the target work duration
- Review prior sessions
- Reuse a previous goal
- Start a new session

Observed behavior:

- Default work goal is the last used goal, otherwise `20s` in `index.html`
- Goal can be adjusted with up/down controls
- Prior sessions can be browsed with left/right controls
- Starting a session triggers a 3-second audible countdown

### 2. Timer execution

The app should run a full-screen timer view showing:

- Current round number
- Time remaining in current phase
- Current phase name
- Controls for pause/resume, quit, and optionally skip

Observed phases:

- `WARMUP`
- `WORK`
- `REST`
- `COOLDOWN`
- terminal completion state

Observed timer behavior:

- The session starts in warmup
- Warmup is followed by work
- Each work block is followed by a computed recovery block
- The final work block is followed by cooldown
- The timer emits audible tones in the final 3 seconds of a phase
- The timer emits a longer tone at phase transitions

### 3. Audio guidance

The app should generate audible cues using the Web Audio API.

Observed behavior:

- Audio context is created lazily on user interaction
- Tones use a triangle oscillator
- Output is routed through a compressor/limiter
- Final countdown uses short beeps
- Phase transition uses a longer beep

### 4. Wake lock

The app should attempt to keep the screen awake during an active session.

Observed behavior:

- The Wake Lock API is requested when a workout starts or Bluetooth is connected
- The app attempts to reacquire wake lock on visibility changes

### 5. Bluetooth heart-rate monitor integration

The app should support Bluetooth heart-rate sensors using the Web Bluetooth heart-rate service.

Observed behavior:

- The app requests a Bluetooth device exposing `heart_rate`
- It subscribes to `heart_rate_measurement`
- BPM is read from byte index `1`
- Live BPM is displayed prominently

Fallback behavior in `combined.html`:

- If Bluetooth connection fails or is unavailable, the user may still start a timer-only session after a confirmation prompt

This fallback should be formalized rather than left as an error-path side effect.

### 6. Live heart-rate graph

The app should display a live graph of heart-rate samples across the session timeline.

Observed behavior:

- Samples are appended over time
- The graph auto-scales to the min/max BPM in the loaded sample set
- Background phase bands show warmup, work, rest, and cooldown
- A scrubber shows approximate timestamp, BPM, and inferred phase at a cursor position

### 7. Per-round heart-rate analysis

The app should summarize each round in a table.

Observed fields across prototypes:

- Actual peak
- Actual trough
- Calculated peak
- Calculated trough
- Delta (`peak - trough`)
- Difference versus prior session

Observed uses:

- Live monitoring of current round
- Post-session review
- Historical comparison
- Manual correction and save-back in recall mode

### 8. History and persistence

The app should store workout history locally.

Observed storage mechanisms:

- `index.html` uses `localStorage` under `hiit_history`
- `heart.html` and `combined.html` use IndexedDB database `HIITAnalyzerDB`
- IndexedDB stores `sessions` and `raw_data`

Observed history features:

- Browse older sessions
- Load raw HR samples for a selected session
- Compare current session deltas to the previous session
- Return from history view to live view
- Export CSV in the timer-only prototype

### 9. Historical recall and correction workflow

The combined prototype implies a review mode where the user can:

- Open a historical session
- Adjust assumed work duration
- Adjust timeline offset
- Compare computed peaks/troughs to previously stored values
- Save corrected values as the actual interval data

This is a meaningful product feature, not just a debugging tool.

## Non-Functional Requirements Implied by Current Prototypes

### Platform

- Mobile-first, full-screen web app
- Must work in mobile Safari/Chrome-class browsers with touch controls
- Landscape mode should remain usable

### Interaction qualities

- Large tap targets
- High-contrast UI
- Full-screen readability during exercise
- Minimal interaction needed once the session starts

### Reliability expectations

- Session should continue visibly and audibly without sleeping the screen
- Local persistence should survive page reloads
- Graph/history review should not destroy live session data

## Known Inconsistencies and Design Conflicts

These are the main areas where the prototypes disagree or are under-specified.

### Storage model conflict

- `index.html` stores only timer history in `localStorage`
- `heart.html` and `combined.html` store richer session data in IndexedDB

Decision needed:

- Use IndexedDB as the primary client-side store and migrate or discard `localStorage`

### Interval detection conflict

- `heart.html` infers peaks and troughs from HR trend reversals and thresholds
- `combined.html` derives stats from fixed time windows and manual offset tweaking

Decision needed:

- Define the canonical interval analysis algorithm
- Decide whether live stats are authoritative, computed stats are authoritative, or both are retained

### Workout start flow conflict

- `index.html` is timer-first
- `heart.html` is HR-monitor-first
- `combined.html` starts from a single dashboard

Decision needed:

- Define one primary start flow for version 1

### Session completion behavior

- `index.html` shows completion text and stops
- `combined.html` moves to `FINISHED` but does not define a proper results state

Decision needed:

- Specify a post-workout summary screen

### Manual correction boundaries

- `combined.html` allows editing derived stats indirectly via sliders and saving
- There is no audit trail or clear distinction between measured data and corrected interpretation

Decision needed:

- Define whether corrected values overwrite raw interpretation or are stored as a review layer

## Recommended Version 1 Product Spec

This is the clearest stable product direction suggested by the prototypes.

### Primary use case

The user starts a structured 13-round HIIT workout, optionally with a Bluetooth HR monitor, and reviews recovery quality immediately after the session.

### Version 1 features

- Session setup screen with configurable work duration
- Fixed workout template with visible warmup, 13 rounds, recovery periods, and cooldown
- Start countdown and audible cues
- Pause/resume and end session controls
- Bluetooth HR monitor connection
- Live BPM display
- Live heart-rate graph
- Automatic per-round peak/trough calculation based on timeline windows
- Session persistence in IndexedDB
- Historical session list and session detail view
- CSV or JSON export

### Version 1 features to defer

- Manual alignment offset editing
- Saving corrected historical stats back into the canonical record
- Algorithmic trend-based interval detection
- Rich session-to-session analytics beyond simple delta comparisons

## Proposed Proper Project Structure

### Product documents

- `docs/product-spec.md`
- `docs/architecture.md`
- `docs/user-flows.md`
- `docs/data-model.md`
- `docs/test-plan.md`

### Application structure

- `src/domain/`
- `src/features/timer/`
- `src/features/bluetooth/`
- `src/features/heart-rate/`
- `src/features/history/`
- `src/storage/`
- `src/ui/`

### Test layers

- Unit tests for timing and phase calculations
- Unit tests for interval-stat calculation
- Unit tests for storage adapters
- Integration tests for session lifecycle
- Browser tests for key flows where Web Bluetooth can be mocked

## Immediate Build Plan

### Phase 1: spec and scope

- Confirm the canonical workout structure
- Confirm the version 1 start flow
- Confirm whether HR is required or optional
- Confirm the authoritative interval analysis algorithm
- Freeze the version 1 feature list

### Phase 2: foundation

- Choose a framework or decide on plain TypeScript
- Set up build tooling
- Add test runner
- Add linting and formatting
- Define app state and storage schema

### Phase 3: core logic

- Implement workout timeline engine as pure functions
- Implement session state machine
- Implement heart-rate sample ingestion
- Implement interval-stat calculation

### Phase 4: UI

- Build setup screen
- Build live workout screen
- Build results screen
- Build history screen

### Phase 5: verification

- Add automated tests for timer math and stat computation
- Add regression fixtures using captured or synthetic HR traces
- Validate on mobile browsers and with a real HR sensor

## Open Product Questions

- Is the workout always 13 rounds, or should round count be configurable?
- Is the `baseRest + 30 - workGoal` rule intentional and core to the method?
- Should HR monitor connection be mandatory before starting, optional, or skippable after timeout?
- Should the app optimize for in-session readability or for post-session analysis first?
- Should historical correction tools exist in version 1, or only after the raw session model is stable?
- Do you want local-only persistence, or eventual cloud sync and accounts?

## Recommended Next Step

Use this document as the current-state baseline, then write a clean `docs/product-spec.md` that separates:

- confirmed requirements
- deferred ideas
- rejected prototype behavior
- unresolved decisions

That is the point where the project stops being a vibe-coded experiment and starts being an intentionally designed product.
