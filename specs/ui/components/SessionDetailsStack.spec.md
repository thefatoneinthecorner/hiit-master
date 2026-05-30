# SessionDetailsStack

## Purpose

`SessionDetailsStack` is a pure layout component for vertically arranging session detail content. It provides consistent title typography and vertical slots without adding borders, backgrounds, or panel styling.

## Inputs

- `primaryTitle`: Required title shown at the top.
- `children`: Primary content shown in the main flexible area.
- `secondaryTitle`: Optional secondary title.
- `secondaryContent`: Optional secondary content.
- `class`: Optional additional class names for layout sizing or alignment.
- `titleAlign`: Optional title alignment. Supports `center` and `left`, defaulting to `center`.

## Layout

- The component renders as a flexbox column.
- The component uses `min-h-48` for the vertical stack height.
- The primary title is rendered first.
- The primary content is rendered next and fills the available middle space.
- The secondary title is rendered below the primary content when secondary content is present.
- The secondary content is rendered last when secondary content is present.
- When both secondary slots are omitted, no secondary row is rendered.
- Titles are centered by default.
- When `titleAlign` is `left`, both titles are left aligned.
- The component must not add a border.
- The component must not add a background.

## Typography

- The primary and secondary titles use the same typography as the existing `LIVE BPM` label:
  - `text-sm`
  - `uppercase`
  - `tracking-[0.18em]`
  - `text-[color:var(--muted)]`

## Storybook Coverage

The component must have Storybook stories for:

- Round Timing
- Live BPM
- Left Aligned Titles
- Time Pulse BPM Row

The stories should verify title typography, title alignment, primary content rendering, secondary title/content rendering, omitted secondary slots, a three-element row containing time remaining, pulse, and BPM, the pulse centered in that row, and that no border or background classes are added by the component.
