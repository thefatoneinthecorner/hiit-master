# Open Questions

## Purpose

This file tracks the remaining unresolved product and implementation decisions that still matter for the current version 1 work.

## Decision Status

- `Open`: not yet decided
- `Proposed`: recommended direction exists, awaiting confirmation
- `Decided`: resolved and moved to the decision log

## Questions

### Q1. Is the workout format fixed in version 1?

Status: `Decided`

Question:

Should version 1 keep the current fixed structure of warmup + 13 rounds + cooldown, or should round count and base rests be user-configurable?

Decision:

Keep the structure fixed in version 1. Make workout structure configurable in version 2.

Reason:

This stabilizes the timer engine, graph overlays, analysis windows, and tests while preserving configurability as a planned follow-on feature.

### Q2. Is the `baseRest + 30 - workDuration` rule intentional?

Status: `Decided`

Question:

Is the current rest formula a core training method you want to preserve, or is it an accidental prototype rule?

Decision:

Yes. This rule is intentional and is central to the product. The app keeps total round duration fixed so sessions remain directly comparable as work duration increases.

Why it matters:

This is the canonical timing model for version 1 and a key part of the product's value proposition.

### Q3. Is heart-rate hardware optional or required?

Status: `Decided`

Question:

Should the app allow timer-only sessions when Bluetooth is unavailable or declined?

Decision:

No. A session cannot start unless a heart-rate monitor is connected. If the connection drops after the session starts, the user may finish the workout, but the session must be marked compromised for comparison and baseline purposes. During dropout periods the app should record explicit missing-heart-rate samples as zero/null values and continue time-synced recording if the device reconnects.

Reason:

Heart-rate capture is required for the product's core live feedback and comparison model. Allowing timer-only starts would undermine the session-comparison workflow.

### Q4. What is the canonical interval-analysis algorithm?

Status: `Proposed`

Question:

Should version 1 calculate peaks and troughs from fixed timing windows or from HR trend reversals?

Recommendation:

Use fixed timing windows in version 1.

Reason:

It is deterministic, testable, and reproducible from raw data.

### Q5. Does historical correction belong in version 1?

Status: `Proposed`

Question:

Should users be able to adjust offsets and overwrite interval stats for old sessions in version 1?

Recommendation:

No. Defer manual correction tools until the raw data model and derived-analysis flow are stable.

Reason:

Editable review introduces ambiguity over what is raw versus derived data.

### Q6. What should happen when a session ends?

Status: `Decided`

Question:

Should the app stop on a plain completion screen, auto-open results, or return to the setup screen?

Decision:

The workout UI should remain in place when the session ends. The screen should change only enough to make it clear that the session is over. It should not transition to a separate post-session screen by default.

Reason:

The workout display itself is the primary review surface, and preserving it avoids an unnecessary mode switch at the end of the session.

### Q7. Which implementation style should the rebuild use?

Status: `Decided`

Question:

Should the proper rebuild stay close to the current no-build prototype style, or move to a TypeScript app with tests and a small framework?

Decision:

Move to a strict TypeScript codebase. Use Preact with a React-style functional component approach and build as a single-page app suitable for GitHub hosting. Avoid `any` except where the cost of stronger typing is not justified.

Reason:

This gives the project a maintainable typed foundation while preserving the lightweight UI model already used in the prototypes.

### Q8. What level of history comparison belongs in version 1?

Status: `Decided`

Question:

Do you want simple session review only, or explicit comparison against the previous session in version 1?

Decision:

Version 1 must include explicit comparison against the immediately previous session, and that comparison must be available during a live session. The core requirement is that the user can see at a glance how the current session is performing relative to the previous comparison-eligible session. A histogram-style view remains one candidate presentation, but the exact visual encoding is not yet fixed.

Reason:

This comparison is a core training feedback feature, not just a history convenience.

### Q9. Which export formats matter most?

Status: `Decided`

Question:

Do you primarily want CSV for spreadsheet review, JSON for future migration, or both?

Decision:

Both. Version 1 must export JSON for structured data use and CSV for spreadsheet-friendly review.

Reason:

The product needs to serve both technical and non-technical analysis workflows.

## Next Decisions To Make

The most important remaining decisions are:

1. whether the current compact comparison strip plus scrubber is the final mobile comparison pattern or still needs a different visual encoding
2. when to replace the modeled sawtooth chart with real live heart-rate sample plotting
3. whether warmup and cooldown should stay visually sparse or receive explicit rendered traces
4. what level of completed-session detail should surface by default on phone-sized screens
