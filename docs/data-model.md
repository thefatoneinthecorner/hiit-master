# Data Model

## Purpose

This document defines the canonical version 1 data model for storage, analysis, and export.

## Design Principles

- Raw heart-rate samples are authoritative.
- Derived interval stats are reproducible from raw samples plus session timing metadata.
- Dropout periods must be represented explicitly.
- Comparison eligibility is a session-level rule.
- Export models should derive from canonical entities rather than duplicate source-of-truth logic.

## Entity Overview

Core entities:

- `SessionRecord`
- `HeartRateSampleRecord`
- `IntervalStatRecord`
- `AppSettingsRecord`

## SessionRecord

Represents one workout attempt.

```ts
export type SessionStatus =
  | 'ready'
  | 'countdown'
  | 'running'
  | 'paused'
  | 'completed'
  | 'ended_early'
  | 'failed';

export interface SessionRecord {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: SessionStatus;
  workDurationSec: number;
  warmupSec: number;
  baseRestsSec: number[];
  actualRestsSec: number[];
  cooldownBaseSec: number;
  totalPlannedDurationSec: number;
  roundsPlanned: number;
  hasHeartRateData: boolean;
  hrCoverageComplete: boolean;
  isCompromised: boolean;
  comparisonEligible: boolean;
  analysisVersion: number;
  deviceName: string | null;
  endedEarly: boolean;
  notes: string | null;
}
```

### Session invariants

- `roundsPlanned` is `13` in version 1.
- `actualRestsSec.length` should equal `baseRestsSec.length`.
- `comparisonEligible` must be `false` if `isCompromised` is `true`.
- `comparisonEligible` must be `false` if `hrCoverageComplete` is `false`.
- `hasHeartRateData` may remain `true` even for compromised sessions.

## HeartRateSampleRecord

Represents one raw HR sample or one explicit dropout placeholder on the session timeline.

```ts
export interface HeartRateSampleRecord {
  id: string;
  sessionId: string;
  timestampMs: number;
  bpm: number | null;
  isMissing: boolean;
}
```

### Heart-rate sample rules

- Normal HR samples: `bpm` is a positive integer, `isMissing` is `false`.
- Dropout placeholders: `bpm` is `null` in canonical storage, `isMissing` is `true`.
- Export layers may represent missing samples as `0` when a flat numeric output is required.
- Samples must remain time-ordered when loaded for analysis.

## IntervalStatRecord

Represents derived per-round metrics for a session.

```ts
export interface IntervalStatRecord {
  id: string;
  sessionId: string;
  roundIndex: number;
  peakBpm: number | null;
  troughBpm: number | null;
  deltaBpm: number | null;
  analysisVersion: number;
}
```

### Interval stat rules

- `roundIndex` is zero-based in storage.
- `deltaBpm = peakBpm - troughBpm` when both values exist.
- Missing HR windows produce `null` metrics, not guessed values.

## AppSettingsRecord

For small local preferences.

```ts
export interface AppSettingsRecord {
  id: 'app_settings';
  lastWorkDurationSec: number;
}
```

## Derived Models

These do not need their own canonical storage unless caching proves useful.

### WorkoutPlan

```ts
export interface PhaseSegment {
  phaseType: 'warmup' | 'work' | 'rest' | 'cooldown';
  roundIndex: number | null;
  startSec: number;
  endSec: number;
}

export interface WorkoutPlan {
  warmupSec: number;
  workDurationSec: number;
  baseRestsSec: number[];
  actualRestsSec: number[];
  cooldownSec: number;
  totalDurationSec: number;
  phases: PhaseSegment[];
}
```

### ComparisonRound

```ts
export interface ComparisonRound {
  roundIndex: number;
  currentDelta: number | null;
  previousDelta: number | null;
  diffDelta: number | null;
  hasCurrentData: boolean;
  hasPreviousData: boolean;
}
```

## Storage Layout

Recommended IndexedDB stores:

### `sessions`

Key: `id`

Indexes:

- `startedAt`
- `comparisonEligible`
- `status`

### `heartRateSamples`

Key: `id`

Indexes:

- `sessionId`
- compound `(sessionId, timestampMs)`

### `intervalStats`

Key: `id`

Indexes:

- `sessionId`
- compound `(sessionId, roundIndex)`

### `appSettings`

Key: `id`

## Comparison Eligibility Rule

A session is comparison-eligible when all of the following are true:

- status is `completed`
- `endedEarly` is `false`
- `isCompromised` is `false`
- `hrCoverageComplete` is `true`
- enough HR data exists to derive meaningful round deltas

The exact “enough HR data” threshold should be implemented as a pure rule and tested.

## Export Models

### Session summary JSON

Should include:

- session metadata
- timing configuration
- comparison eligibility state
- compromise state
- derived interval stats

### Raw samples JSON

Should include:

- ordered sample list
- explicit missing samples retained as `null` or annotated records

### CSV session summary

Suggested columns:

- `session_id`
- `started_at`
- `completed_at`
- `status`
- `work_duration_sec`
- `is_compromised`
- `comparison_eligible`
- `device_name`

### CSV per-round metrics

Suggested columns:

- `session_id`
- `round_index`
- `peak_bpm`
- `trough_bpm`
- `delta_bpm`

## Type Conventions

- Use `null` rather than sentinel numbers for missing canonical values.
- Use explicit discriminated unions for stateful domain concepts where possible.
- Prefer ISO 8601 strings for session-level timestamps and epoch milliseconds for dense samples.

## Versioning

`analysisVersion` must increment when interval-analysis logic changes in a way that affects derived stats.

Implication:

- cached stats can be invalidated and recomputed deterministically
- exported summaries can include analysis provenance when needed
