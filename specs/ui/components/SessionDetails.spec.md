# SessionDetails

## Purpose

`SessionDetails` displays a session summary panel with a disclosure caret, current round time remaining, live pulse, current BPM, and remaining session time.

## Inputs

- `open`: Controls the disclosure state and caret orientation.
- `onToggle`: Called when the component is activated.
- `timeRemaining`: Current round or interval time remaining.
- `bpm`: Current heart-rate value.
- `remainingValue`: Optional remaining session time value.
- `primaryTitle`: Optional first-row title, defaulting to `Session`.
- `remainingTitle`: Optional secondary title.
- `label`: Optional accessible toggle label. Defaults from the open state.
- `controls`: Optional id of the controlled panel.
- `pulseActive`: Whether the pulse is shown as active.
- `pulseBeating`: Whether the pulse animation runs. Defaults from `pulseActive`.
- `pulseBeatKey`: Optional value used to restart the pulse animation when a new live or replay sample arrives.
- `class`: Optional additional classes applied to the panel surface.

## Layout

- The component owns the surrounding panel border and background.
- The first row title is rendered inside a plain `DisclosureToggle`.
- The disclosure caret aligns with the first row title.
- The first row title remains centered in the row while the caret sits on the right edge.
- The first row title uses the same typography as the `Remaining` title.
- The visible content uses `SessionDetailsStack`.
- The primary content row contains three equal columns:
  - time remaining
  - pulse
  - BPM value
- The pulse column is in the exact horizontal center of the row.
- The secondary title and value show the remaining session time when provided.
- When both `remainingTitle` and `remainingValue` are omitted, no secondary title/value row is rendered.

## Behavior

- Clicking anywhere inside the component activates the same disclosure toggle behavior.
- The toggle exposes `aria-expanded`.
- The disclosure caret reflects the open and closed state.
- The pulse uses the active and beating states passed to the component.
- When `pulseBeatKey` changes, the rendered pulse is recreated so the pulse animation starts again for that sample.

## Storybook Coverage

The component must have Storybook stories for:

- Default
- Initially Closed

The stories should verify the summary content, first-row caret alignment, pulse centering, and click-to-toggle behavior from multiple places inside the component.
