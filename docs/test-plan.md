# Test Plan

## Purpose

This document defines the version 1 testing strategy for the HIIT timer and heart-rate comparison app.

## Testing Goals

- protect the workout timing model
- protect comparison eligibility rules
- protect dropout handling
- protect deterministic interval analysis
- protect persistence and export behavior

## Test Layers

### 1. Domain unit tests

Highest priority.

Targets:

- workout plan generation
- actual rest calculation
- elapsed-time to phase mapping
- interval window generation
- peak/trough derivation
- delta and comparison math
- comparison eligibility rules
- dropout sample handling

These tests should run without DOM or browser APIs.

### 2. Application/service tests

Targets:

- session start flow
- HR-required gating
- dropout compromise transitions
- reconnect continuity
- previous-session selection
- completed-session state shaping

Use mocked adapters.

### 3. Infrastructure tests

Targets:

- IndexedDB repository behavior
- export shaping and file content generation
- adapter-level Bluetooth event handling where practical

### 4. UI tests

Targets:

- setup gating before HR connection
- workout screen state changes
- completed-state rendering on same screen
- larger-screen debug table visibility
- compact mobile comparison presence

These should focus on critical behavior, not brittle layout details.

## Domain Test Matrix

### Workout timing

Test cases:

- generates correct actual rests for minimum, default, and maximum work durations
- preserves fixed round-duration rule across work-duration changes
- returns correct total session duration
- maps elapsed seconds to correct phase and round boundaries
- handles cooldown correctly

### Interval analysis

Test cases:

- derives peak from work window only
- derives trough from following rest window only
- ignores missing samples when valid samples exist
- returns `null` when a window has no valid HR samples
- remains deterministic for identical sample inputs

### Comparison math

Test cases:

- computes `delta = peak - trough`
- computes `diff = currentDelta - previousDelta`
- leaves diff `null` when either side is missing
- preserves round alignment across sessions with different work durations

### Compromise and eligibility rules

Test cases:

- completed session with full HR coverage is comparison-eligible
- dropout marks session compromised
- compromised session is not comparison-eligible
- ended-early session is not comparison-eligible
- reconnect does not clear prior compromise status

## Application Test Matrix

### Session start

Test cases:

- cannot start without HR connection
- can start after successful HR connection
- countdown transitions to running state

### Runtime dropout

Test cases:

- disconnect event marks session compromised
- missing samples are appended during dropout window
- reconnect resumes normal sample ingestion on same timeline
- timer continues despite dropout

### Previous-session selection

Test cases:

- chooses most recent eligible completed session
- skips compromised sessions
- skips ended-early sessions
- returns no comparison source when none is eligible

## Storage Test Matrix

### Sessions repository

Test cases:

- saves and reloads session metadata
- persists compromise and eligibility flags
- sorts sessions by start time correctly

### Samples repository

Test cases:

- stores ordered HR samples
- stores explicit missing samples
- loads samples in time order

### Interval stats repository

Test cases:

- saves per-round derived stats
- reloads stats by session and round
- supports analysis-version checks

## Export Test Matrix

### JSON export

Test cases:

- includes session summary fields
- includes raw samples with missing markers preserved
- includes tabular metrics structure

### CSV export

Test cases:

- emits expected headers
- flattens per-round metrics correctly
- represents missing values consistently

## UI Test Matrix

### Setup screen

Test cases:

- start button disabled until HR connected
- work-duration control updates displayed value

### Workout screen

Test cases:

- shows timer and phase updates
- shows comparison surface when previous eligible session exists
- shows graceful fallback when no previous eligible session exists
- shows compromised state after dropout

### Responsive behavior

Test cases:

- larger-screen debug table renders on laptop-sized viewport
- mobile view does not require dense table to remain functional

## Fixtures

Create reusable fixtures for:

- clean completed session
- compromised session with dropout and reconnect
- session with no prior eligible comparison source
- pair of sessions with increasing work duration but fixed round durations
- sample series with explicit missing intervals

## Recommended Tooling

If the scaffold uses Vite + Preact:

- unit/service tests: `vitest`
- component tests: `@testing-library/preact`
- browser-level smoke tests later: `playwright`

## Minimum Pre-UI Implementation Test Set

Before significant UI work, implement tests for:

1. workout plan generation
2. phase mapping
3. interval analysis
4. comparison eligibility
5. previous-session selection
6. dropout recording and reconnect continuity

Those tests should lock the core product behavior before presentation iteration begins.
