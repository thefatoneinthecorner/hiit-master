# Implementation Plan

## Purpose

This page turns the product and architecture docs into a concrete implementation sequence with milestone exit criteria.

The intent is to reduce interpretation drift during future rebuilds.

## Milestone 0: Lock The Product Contract

### Goal

Ensure the product docs are specific enough that the rebuild is constrained rather than improvisational.

### Deliverables

- Screen docs for `Home`, `Devices`, `History`, and `Settings`
- Acceptance specs for each major screen
- Theme contract
- Design fidelity / non-deviation rules
- Scroll-behavior rules
- Starter profile definition
- Countdown audio cadence rules
- Graph behavior rules

### Exit criteria

- The intended content of each screen is explicit
- Explicit non-goals exist for each major screen
- Minimal screens are documented as minimal in enforceable terms
- The acceptance specs include both presence and meaningful absence checks where appropriate
- Known product-critical defaults are specified rather than implied

## Milestone 1: Core Domain And Data Model

### Goal

Implement the stable business logic independently of UI.

### Deliverables

- Profile model
- Workout-plan generation
- Session lifecycle state machine
- Heart-rate sample integrity filtering
- Recovery analysis
- Comparison eligibility logic
- Session persistence shape including profile snapshot data

### Exit criteria

- Domain logic is test-first or strongly test-backed
- Session timing rules are deterministic
- Recovery and comparison calculations are recomputable from stored samples
- Compromised and ended-early sessions are excluded correctly from comparison
- Persisted data is sufficient to reconstruct historical session views

## Milestone 2: Runtime Adapters

### Goal

Separate product logic from runtime/platform APIs.

### Deliverables

- BLE heart-rate adapter
- Storage adapter
- Wake-lock adapter
- Countdown audio adapter
- Backup import/export file adapter
- Clock/timer abstraction where needed for deterministic testing

### Exit criteria

- Product logic can run against both real adapters and deterministic test doubles
- Runtime failures do not silently corrupt session meaning
- BLE, storage, audio, and wake-lock behavior are isolated from UI code

## Milestone 3: Home Screen

### Goal

Implement the primary workout flow exactly as specified.

### Deliverables

- Disconnected setup
- Connected setup
- Startup countdown
- Active session
- Paused session
- Completed session
- Live heart graph
- Recovery histogram

### Exit criteria

- `Home` remains non-scrolling in all documented main states
- The screen contains only documented controls, labels, graphs, and status copy
- Countdown audio and visible countdown are acceptably aligned
- Heart graph behaves as a time-based graph, not a placeholder summary
- Completed-session graph behavior freezes correctly
- Home graph taps hand off correctly to `History`

## Milestone 4: Devices Screen

### Goal

Implement compact monitor management without polluting the workout flow.

### Deliverables

- Device status readout
- Battery card
- Live BPM card
- Reconnect behavior
- Disconnect behavior
- Active/paused-session accessibility rules

### Exit criteria

- `Devices` remains non-scrolling
- Only documented device-management content is visible
- Reconnect preserves session continuity where specified
- Disconnect and runtime dropout semantics are correct
- Device-test mode remains deterministic

## Milestone 5: History Screen

### Goal

Implement historical inspection and deletion.

### Deliverables

- Completed-session browsing
- Session navigation
- Scrubber
- Historical heart graph
- Historical recovery histogram
- Round stats and raw table
- Delete flow

### Exit criteria

- `History` is scrollable
- It contains only historical browsing and inspection UI
- Historical rendering is driven by persisted session data, not current mutable profile state
- Session-to-session comparison uses the correct previous eligible session

## Milestone 6: Settings Screen

### Goal

Implement backup/restore and session-profile management.

### Deliverables

- Import/export
- Profile list
- Selected-profile behavior
- Profile copy/delete/select/save
- Referenced-profile immutability
- Recovery round editor
- Unsaved draft handling

### Exit criteria

- `Settings` is scrollable
- Only backup and profile-management UI is present
- Starter profile is shipped with the specified defaults
- Recovery row interactions match the documented hit areas and controls
- Unsaved changes cannot be lost silently when switching profiles

## Milestone 7: Native And Runtime Polish

### Goal

Tighten the behaviors that only become obvious in a realistic mobile/gym environment.

### Deliverables

- BLE reconnect/dropout polish
- Countdown audio feel and cadence
- Wake-lock lifecycle
- Mobile viewport fit
- Export/import behavior through the target runtime shell
- Runtime failure handling and user messaging where specified

### Exit criteria

- The app behaves correctly during real-world training interruptions
- `Home` and `Devices` fit without scrolling on target mobile layouts
- Audio, BLE, storage, and wake-lock feel coherent in the actual runtime

## Milestone 8: Final Acceptance Review

### Goal

Validate the built product against the spec as a product, not just as code.

### Deliverables

- Acceptance walkthrough against all feature files
- Visual review against documented screens
- Theme and contrast review
- Scroll-behavior review
- Starter profile verification
- Graph-behavior verification

### Exit criteria

- The implementation matches the documented product behavior
- The implementation does not introduce undocumented UI or workflows
- Remaining gaps are explicitly recorded as open issues rather than silently accepted deviations

## Cross-cutting rules

- Prefer omission over invention where the docs are incomplete
- Do not add helper copy, cards, or controls unless explicitly specified
- Treat screen docs as prescriptive, not illustrative
- Verify both what is present and what must be absent
