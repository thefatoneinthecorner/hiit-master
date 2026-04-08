# Architecture

## Purpose

This document defines the version 1 application architecture for the HIIT timer and heart-rate comparison app.

## Architecture Goals

- Keep timer and analysis logic deterministic and testable.
- Isolate browser-specific APIs behind adapters.
- Preserve raw session data as the source of truth.
- Support phone-first runtime UI and laptop-friendly debug inspection.
- Allow the comparison presentation layer to evolve without rewriting domain logic.

## High-Level Structure

The app should be organized into five layers:

1. `domain`
2. `application`
3. `infrastructure`
4. `ui`
5. `tests`

### Domain layer

Pure business logic with no browser or framework dependencies.

Responsibilities:

- workout timing model
- phase calculation
- round schedule generation
- session eligibility rules
- interval analysis
- previous-session comparison math
- export shaping

This layer should be fully unit-testable.

### Application layer

State orchestration and use cases.

Responsibilities:

- start session flow
- HR connection workflow
- live workout state transitions
- dropout handling
- history loading
- comparison session selection
- export actions

This layer coordinates domain functions and infrastructure adapters.

### Infrastructure layer

Browser integrations and persistence adapters.

Responsibilities:

- IndexedDB storage
- Web Bluetooth HR connection
- Wake Lock API
- Web Audio cue generation
- clock/timer integration
- file export/download helpers

No domain rules should live here.

### UI layer

Preact components, hooks, and view models.

Responsibilities:

- setup screen
- workout screen
- comparison view
- compact graph
- larger-screen debug table
- history access
- export actions

The UI should consume typed application services and derived view models rather than embedding business rules.

## Recommended Source Layout

```text
src/
  app/
    App.tsx
    routes.ts
    providers/
  domain/
    session/
    workout/
    analysis/
    comparison/
    export/
    shared/
  application/
    session/
    history/
    export/
    bluetooth/
  infrastructure/
    storage/
    bluetooth/
    audio/
    wakelock/
    clock/
    export/
  ui/
    screens/
    components/
    hooks/
    view-models/
    theme/
  test/
    fixtures/
    builders/
```

Theme token roles, default values, and contrast constraints are product-level requirements defined in `docs/obsidian/Theme.md`. Architecture may describe where theme code lives, but it must not redefine token semantics independently.

## Core Runtime Model

The runtime should treat a workout session as a state machine.

Primary states:

- `idle`
- `connecting_hr`
- `ready`
- `countdown`
- `running`
- `paused`
- `completed`
- `ended_early`
- `error`

Additional orthogonal session flags:

- `isCompromised`
- `comparisonEligible`
- `hrConnected`
- `hrCoverageComplete`

## Domain Modules

### `domain/workout`

Responsibilities:

- generate canonical workout plan from work duration
- calculate actual rest durations
- expose phase schedule
- map elapsed time to phase and round

Key outputs:

- session schedule
- phase segments
- total duration
- round windows for work/rest analysis

### `domain/session`

Responsibilities:

- session status rules
- compromise rules
- comparison-eligibility rules
- completion rules

### `domain/analysis`

Responsibilities:

- derive per-round peak from work windows
- derive per-round trough from following rest windows
- skip missing values correctly
- preserve deterministic recomputation

### `domain/comparison`

Responsibilities:

- choose previous comparison-eligible session
- compute current round deltas
- compute previous round deltas
- compute per-round diff values
- shape glanceable comparison data for the UI

### `domain/export`

Responsibilities:

- transform canonical session records into export payloads
- create JSON export structures
- create tabular CSV rows

## Infrastructure Adapters

### Storage adapter

Expose a typed interface over IndexedDB.

Suggested responsibilities:

- save session metadata
- append HR samples
- load session by id
- list sessions
- load samples for session
- save derived stats
- query previous comparison-eligible session

### Bluetooth adapter

Expose typed HR device events.

Suggested events:

- `connected`
- `disconnected`
- `sample`
- `error`

The adapter should not decide whether a session is compromised. It should only report connection state and measurements.

### Audio adapter

Responsibilities:

- initialize audio context
- play countdown cue
- play phase transition cue

### Wake lock adapter

Responsibilities:

- request wake lock
- release wake lock
- re-request on visibility changes when appropriate

### Export adapter

Responsibilities:

- create downloadable blobs/files
- trigger browser download

## UI Composition Strategy

### Mobile-first runtime layout

Prioritized elements:

1. timer
2. current phase / round context
3. at-a-glance comparison surface
4. compact heart graph
5. compact status / controls


## View Model Strategy

Use view-model shaping functions between application state and Preact components.

Benefits:

- keeps formatting out of components
- centralizes null/missing handling
- allows presentation experiments without rewriting domain logic

Example view models:

- `WorkoutScreenViewModel`
- `ComparisonViewModel`
- `HeartGraphViewModel`
- `DebugTableViewModel`

## Persistence Strategy

IndexedDB is the canonical local store.

Recommended object stores:

- `sessions`
- `heartRateSamples`
- `intervalStats`

Optional future stores:

- `exportJobs`
- `appSettings`

Raw heart-rate samples remain authoritative. Derived stats can be cached but must be recomputable.

## Time and Dropout Handling

The session timeline must remain continuous even during HR dropout.

Rules:

- timer progression does not depend on HR availability
- dropout intervals should produce explicit missing samples
- reconnect resumes sampling on the same session timeline
- compromised sessions remain stored but are excluded from comparison-eligible history

## Comparison Presentation Boundary

The comparison metric is fixed in version 1:

- per-round delta = `peak - trough`
- comparison diff = `currentDelta - previousDelta`

The visual encoding is intentionally not fixed in architecture.

Allowed render strategies include:

- bars
- colored graph sections
- line weight changes
- dash patterns
- hybrid approaches

The domain should output comparison values and status, not presentation primitives.

## Error Handling Principles

- setup errors should block workout start when HR connection is missing
- runtime HR disconnection should not terminate the timer
- storage errors should fail loudly in development and visibly in UI where needed
- export failures should not corrupt stored data
