# Decision Log

## Purpose

This file records important product and technical decisions after they are made.

## Format

Each entry should include:

- decision ID
- date
- status
- decision
- rationale
- consequences

## Decisions

### D-007. Frontend implementation stack

Date: 2026-03-29

Status: `Decided`

Decision:

Use strict TypeScript, Preact, and a React-style functional component architecture for the rebuild. Ship as a single-page app suitable for GitHub hosting. Prefer explicit types and avoid `any` unless stronger typing is disproportionately expensive.

Rationale:

- TypeScript strict mode will keep the timer, storage, and analysis logic honest.
- Preact preserves the lightweight prototype direction.
- Functional components fit the intended coding style.
- SPA deployment keeps GitHub hosting simple.

Consequences:

- The project should be scaffolded with a TypeScript-first toolchain.
- Routing, asset paths, and build output should be compatible with GitHub Pages-style hosting.
- Domain logic should use explicit types at module boundaries.

### D-008. Session comparison in version 1

Date: 2026-03-29

Status: `Decided`

Decision:

Version 1 must compare the current session against the immediately previous session, including during a live workout. The primary comparison metric is per-round delta, defined as `(peak - trough)`. The core UI requirement is glanceable comparison feedback during the session; a histogram-style view is one candidate presentation, but the final visual encoding remains open.

Rationale:

- This is a core feedback mechanism for the training method.
- The round-duration rule makes same-round comparison meaningful even when work duration changes.
- Live comparison increases the value of the app during the workout, not only afterward.

Consequences:

- The app must load the previous comparison-eligible session before or at session start.
- Live analysis needs to expose current per-round deltas as they become available.
- The UI must support an in-session comparison view without undermining workout readability.
- Multiple visual encodings can be explored as long as the comparison remains quickly legible.
- Baseline selection beyond the immediately previous session is deferred to version 2.

### D-009. Export formats for version 1

Date: 2026-03-29

Status: `Decided`

Decision:

Version 1 must support both JSON export and CSV export. JSON is for structured data portability and future tooling. CSV is for spreadsheet-style review.

Rationale:

- Different users and workflows need different export formats.
- JSON is the better canonical machine-readable export.
- CSV is the lowest-friction format for ad hoc analysis.

Consequences:

- Export requirements should be tested for both formats.
- The session model needs a clear mapping into both a structured export and a flat tabular export.

### D-010. End-of-session UI behavior

Date: 2026-03-29

Status: `Decided`

Decision:

When a workout ends, the app should keep the user on the same workout screen and only change the UI enough to clearly indicate that the session is over.

Rationale:

- The live workout screen is also the immediate review surface.
- Avoiding an automatic view transition keeps the experience simpler on a phone.

Consequences:

- The live screen must support both active and completed states.
- Completion styling and controls need to be explicit without replacing the whole layout.

### D-011. Responsive data presentation

Date: 2026-03-29

Status: `Decided`

Decision:

The app must work on a phone-sized screen in production, with timer and at-a-glance previous-session comparison as the primary mobile feedback. Tabular per-round data is primarily a laptop-sized debug/analysis view and an export concern.

Rationale:

- The production use case is phone-first.
- Dense table presentation is less important on mobile than timer and comparison visibility.
- Iterating on the data model and analysis is easier with a larger development view.

Consequences:

- The UI should be responsive rather than split into separate products.
- Mobile layouts can de-emphasize or omit dense tabular tables in favor of timer, graph, and histogram feedback.
- Larger screens should expose richer table visibility without changing the underlying session model.
- Export remains the durable path for full tabular inspection.

## Pending Decisions

### D-001. Canonical client-side storage

Status: `Proposed`

Decision:

Use IndexedDB as the canonical client-side store for sessions, raw heart-rate samples, and derived stats.

Rationale:

- The project needs structured local persistence.
- Raw samples and session metadata are a poor fit for `localStorage`.
- The richer prototypes already moved in this direction.

Consequences:

- `localStorage` history from the timer-only prototype becomes legacy data.
- Storage access should be isolated behind an adapter.

### D-002. Canonical interval-analysis algorithm for version 1

Status: `Proposed`

Decision:

Use fixed timing windows to derive per-round peak and trough values.

Rationale:

- It is deterministic.
- It is easy to test.
- It can be recomputed from raw data.
- It avoids fragile phase-detection heuristics in the first release.

Consequences:

- Trend-based detection is deferred.
- Session timing metadata must be stored precisely.

### D-003. Heart-rate connection requirement

Date: 2026-03-29

Status: `Decided`

Decision:

A workout session cannot start unless a heart-rate monitor is connected. If the heart-rate connection drops during the workout, the user may finish the session, but the session must be marked compromised for comparison and baseline use. During dropout periods the app must record explicit missing-heart-rate samples as zero/null values, and if the connection resumes the app must continue recording on the same session timeline.

Rationale:

- Heart-rate capture is required for the product's core feedback model.
- Live comparison depends on current-session heart-rate data.
- Baseline and previous-session comparison should rely only on sessions with complete HR coverage.

Consequences:

- The setup flow must block session start until HR connection succeeds.
- The runtime must detect connection loss and downgrade session eligibility.
- History needs an eligibility flag for use as previous-session comparison or baseline input.
- Raw sample storage must preserve dropout intervals in time order.
- The UI must clearly distinguish completed workouts from comparison-eligible workouts.

### D-004. Historical correction workflow

Status: `Proposed`

Decision:

Do not allow manual offset-based correction of canonical interval stats in version 1.

Rationale:

- Raw-versus-derived data boundaries are not stable yet.
- Correction tools would complicate storage, auditability, and tests.

Consequences:

- The initial results flow stays simpler.
- Future correction tools, if added, should layer on top of raw data rather than overwrite it silently.

### D-005. Version 1 workout shape

Date: 2026-03-29

Status: `Decided`

Decision:

Keep the workout structure fixed at warmup + 13 rounds + cooldown for version 1. Treat configurable workout templates as a version 2 requirement.

Rationale:

- This matches the prototypes.
- It reduces scope.
- It simplifies graph overlays and analysis windows.

Consequences:

- User-configurable round templates are deferred to version 2.
- Tests can use a single canonical session model.

### D-006. Canonical round-duration rule

Date: 2026-03-29

Status: `Decided`

Decision:

Use `actualRest = baseRest + 30 - workDuration` as the canonical timing rule. This keeps each round's total duration fixed as work duration changes.

Rationale:

- This is central to the product's training method.
- It makes sessions easier to compare when work duration increases.
- It gives the app a stable basis for session-to-session analysis.

Consequences:

- Timing logic, stored session metadata, and analysis windows must preserve this rule exactly.
- History comparisons can rely on fixed round durations across sessions with different work durations.
- Alternative timing models are out of scope for version 1.
