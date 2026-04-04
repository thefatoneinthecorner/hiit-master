# Edge Cases & Integrity

## Purpose

This page captures product and data-handling rules that protect the meaning of the workout data.

## Implausible heart-rate samples

Required behavior:

- Implausible BPM outliers must be ignored before they affect session state, persisted samples, or chart scaling.

Implementation note:

- The current implementation ignores BPM values outside `25..240`.

Design intent:

- A single bad sample must not distort the heart-rate chart or the round analysis.

## Missing heart-rate coverage

Required behavior:

- Connection loss during an active session must create explicit missing-sample gaps.
- Missing coverage must affect session integrity.
- Sessions with incomplete HR coverage should not become comparison-eligible.

## Comparison integrity

Required behavior:

- Comparison must not use sessions that were:
  - compromised
  - ended early
  - otherwise comparison-ineligible

## Final-round analysis

Required behavior:

- The last work interval requires a special trough/recovery rule because no subsequent work interval exists.
- This behavior must be specified and tested explicitly in the rebuild.

Design intent:

- The last round should not silently lose its recovery metric just because it terminates into cooldown rather than another work block.

## Profile mutability

Open issue:

- Editing a profile after sessions have already been recorded against it changes the historical meaning of those sessions.

Likely options:

- referenced profiles become read-only
- only notes remain editable on referenced profiles
- profile versioning is introduced and sessions persist the version used

## Data portability

Required behavior:

- Import/export must include enough data to reconstruct:
  - sessions
  - interval stats
  - heart-rate samples
  - profile definitions
  - active profile selection

## Device-test mode

Implementation note:

- `?device-test=1` replays the most recent stored session with heart-rate data.
- This mode is for testing interaction flow, not for validating BLE behavior.

## Related pages

- [[Comparison & Recovery Rules]]
- [[Session Lifecycle]]
- [[Open Issues]]
