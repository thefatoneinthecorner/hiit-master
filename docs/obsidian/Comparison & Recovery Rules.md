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

- For each round, compute:
  - `Peak`: highest heart rate in the work interval
  - `Trough`: lowest heart rate in the recovery window used for that round
  - `Delta`: `Peak - Trough`
- Live comparison uses:
  - `Current Delta`
  - `Previous Delta`
  - `Diff Delta = Current Delta - Previous Delta`

## Final-round recovery calculation

Required behavior:

- The final round must still produce a recovery delta even though there is no following work interval.
- The rebuild must include an explicit last-round recovery rule rather than assuming every round can look forward to the next work interval.

Implementation note:

- Earlier rounds can measure trough using a window that extends into the next work interval.
- The final round cannot do that.
- The current implementation estimates the final-round trough by:
  - taking the trough timing offset from the previous round relative to the start of the following work interval
  - projecting that offset onto the final cooldown region
  - estimating BPM at that projected time from the live sample series

Design intent:

- The final round should remain analytically comparable instead of being dropped or treated inconsistently.

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
