# Comparison & Recovery Rules

## Purpose

This page captures the comparison and delta rules that are easy to lose in a rebuild but materially affect the product.

## Comparison source

Required behavior:

- A session should compare against the most recent earlier session that is comparison-eligible and recorded on the same profile.
- History view should use the same same-profile comparison rule.

Design intent:

- Recovery comparisons are only meaningful when the workout structure is comparable.

## Comparison eligibility

Required behavior:

- A session is comparison-eligible only if:
  - it completed normally
  - it was not ended early
  - it was not compromised
  - heart-rate coverage was complete
  - at least one interval produced a recovery delta

## Recovery delta definition

Required behavior:

- A `Round` is defined as a work phase followed by its recovery phase.
- For each round, compute:
  - `Peak`: highest heart rate recorded during that round
  - `Trough`: lowest heart rate recorded in that round's "recovery window" (see below)
  - `Delta`: `Peak - Trough`
- Live comparison uses:
  - `Current Delta`
  - `Previous Delta`
  - `Diff Delta = Current Delta - Previous Delta`

## Recovery window derivation

Required behavior:

- For every non-final round:
  - the recovery window starts at the start of that round's recovery phase
  - the recovery window includes the following round's work phase
  - `Trough` is the lowest heart rate recorded anywhere in that recovery window
- For the final round:
  - there is no following work phase, so a different recovery-window rule must be used
  - first calculate the time gap between the last two known troughs
  - this value is the `final inter-trough gap`
  - the final recovery window starts at the end of the final work phase
  - the final recovery window continues for `final inter-trough gap - nominal work duration`
  - `Trough` is the lowest heart rate recorded anywhere in that final recovery window

Design intent:

- The app should derive recovery from the athlete's true post-effort minimum, not from an artificially truncated rest-only window.
- Round-to-round comparison should remain stable even when the minimum is reached just after the nominal recovery boundary.

## Live reveal timing

Required behavior:

- A round’s comparison result must not always wait until the next work interval completes.
- By default, a round becomes visible at the start of the next work interval.
- It should become visible earlier during the preceding recovery period if the live heart-rate trace has already crossed the threshold where `Current Delta` is guaranteed to match or exceed the previous session’s delta for that round.

Implementation note:

- In the current logic, the early-reveal threshold is the first sample in the relevant recovery window where:
  - `sample bpm <= peak bpm - previous delta`

Design intent:

- The athlete should see success or failure as early as it becomes meaningfully inferable.

## Final-round special case

Required behavior:

- The final round cannot reveal at “next work start,” because no next work interval exists.
- The rebuild must include a final-round reveal heuristic so the last comparison does not remain hidden indefinitely.

Implementation note:

- The current heuristic estimates the final display point from the timing gap between the troughs of the last two completed recoveries.

## Live comparison display

Required behavior:

- The main chart shows heart rate against time.
- The secondary comparison strip shows round-by-round `Diff Delta` as a histogram-style plot.
- Positive and negative differences should be visually distinct.
- Zero difference should render neutrally.

## Completed-session scrubbing

Required behavior:

- Once the session is no longer running, a scrubber becomes available.
- Scrubbing should show:
  - timestamp
  - round number
  - instantaneous BPM where available
  - current delta
  - previous delta
  - diff delta

## Related pages

- [[Home]]
- [[Domain Model]]
- [[Session Lifecycle]]
- [[Edge Cases & Integrity]]
