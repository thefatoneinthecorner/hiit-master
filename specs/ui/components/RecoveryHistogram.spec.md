# RecoveryHistogram

## Purpose

`RecoveryHistogram` renders a compact round-by-round comparison of recovery delta changes. It is used on the Home and History screens to show whether the current session recovered better or worse than the previous comparable session.

## Inputs

- `rounds`: Comparison rows containing round index, current delta, previous delta, and delta difference.
- `roundDurationsSec`: Optional round duration values used to place bars on the x-axis.
- `roundEndElapsedSec`: Optional full-session elapsed second values used to place each bar's right edge.
- `timelineDurationSec`: Optional full-session duration used as the x-axis denominator.
- `scrubElapsedSec`: Optional elapsed second used to draw a vertical scrub marker.
- `selectedRoundIndex`: Optional round index to label above the selected bar.
- `onClick`: Optional activation handler for opening related session history.
- `clickLabel`: Accessible label for the interactive histogram when `onClick` is supplied.
- `heightClassName`: Optional height utility for screen-specific sizing.
- `showEmptyState`: When true and no previous comparable data exists, hides round bars.
- `scaleMaxAbs`: Optional absolute magnitude used as the explicit vertical scale.

## Plot Behavior

- The center baseline is drawn at y=18.
- The x-axis spans the full width of the parent container.
- Round bars are positioned from cumulative round durations.
- Each bar's right edge aligns with the end of its round.
- Each bar width is 90% of the minimum round duration in the provided `roundDurationsSec` set.
- When `roundEndElapsedSec` and `timelineDurationSec` are supplied, each bar's right edge aligns to the full-session elapsed endpoint for its recovery interval.
- When only a prefix of rounds is supplied during live replay, `roundDurationsSec` still represents the full session timeline so visible bars keep their final x positions.
- When `roundDurationsSec` is omitted, all rounds use equal fallback durations.
- Bar height is scaled from the absolute `diffDelta` value relative to `scaleMaxAbs` when supplied, otherwise relative to the largest absolute difference in the input.
- A magnitude label in the top-left corner displays the active vertical scale magnitude.
- When empty comparable data is hidden, the magnitude label displays `0`.
- Positive `diffDelta` values draw upward from the baseline.
- Negative `diffDelta` values draw downward from the baseline.
- Null `diffDelta` values render as minimal neutral bars.
- When `showEmptyState` is true and no round has a `previousDelta`, no round bars are rendered.

## Visual Elements

- The histogram is displayed in the shared graph surface treatment.
- The graph surface does not add inner padding around the SVG.
- The SVG uses `preserveAspectRatio="none"` so the x-axis fills the rendered width.
- Bars are square-cornered and must not set SVG corner rounding.
- Positive bars use `var(--accent)`.
- Negative bars use `var(--danger)`.
- Neutral bars use `var(--line)`.
- The scrub marker uses `var(--danger)` and exposes `data-testid="recovery-histogram-scrubber"` for story verification.
- The selected round label uses `var(--muted)`.
- The magnitude label is positioned inside the top-left of the rounded panel so it is not clipped by the rounded corner.

## Interaction

- When `onClick` is supplied, the histogram behaves as a button.
- The interactive histogram must expose an accessible label.
- Click, Enter, and Space activation must call `onClick`.
- When `onClick` is not supplied, the histogram is non-interactive.

## Storybook Coverage

The component must have Storybook stories for:

- Mixed Recovery
- Duration Aligned Rounds
- Partial Replay Progress
- Full Session Timeline
- Replay Rest End Aligned
- Final Recovery End Aligned
- Fixed Replay Scale
- Scrubber
- Selected Round
- Empty Comparable Data
- Clickable Summary

The stories should verify bar colors, magnitude labelling, duration-based x-axis alignment, full-session elapsed alignment, partial replay alignment, fixed replay scaling, scrub marker rendering, selected round labelling, empty comparable data behavior, and pointer/keyboard activation.
