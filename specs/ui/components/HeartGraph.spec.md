# HeartGraph

## Purpose

`HeartGraph` renders a compact heart-rate chart for workout and session history screens. It plots valid BPM samples over the workout duration and can optionally show history axes and a scrub marker.

## Inputs

- `samples`: Heart-rate samples with `elapsedSec` and nullable `bpm` values.
- `totalDurationSec`: Total horizontal time range for the graph.
- `nominalPeakHeartrate`: Profile peak value used to keep the vertical scale meaningful even when samples are lower.
- `labelledAxes`: When true, displays max, min, and Time labels for history review.
- `scrubElapsedSec`: Optional elapsed second used to draw a vertical scrub marker.
- `onClick`: Optional activation handler for completed-session navigation.
- `clickLabel`: Accessible label for the interactive graph when `onClick` is supplied.
- `heightClassName`: Optional height utility for screen-specific sizing.
- `lineThickness`: Optional stroke width for the heart-rate polyline.
- `fillWidth`: Controls whether SVG aspect-ratio preservation is disabled so plot contents fill the rendered SVG width. Defaults to true.
- `timeScale`: Controls how sample elapsed time maps to x positions. `samples` normalizes across the first and last valid samples. `duration` maps x positions against `totalDurationSec`.

## Plot Behavior

- Samples with `bpm: null` are ignored when drawing the heart-rate line.
- By default, the x position is normalized across the first and last valid samples so the rendered polyline spans the full plot width.
- When `timeScale` is `duration`, x positions are calculated from `elapsedSec / totalDurationSec` so live graphs keep a stable scale as samples arrive.
- The y position is derived from the calculated BPM range.
- The minimum range includes 50 BPM.
- The maximum range is at least `nominalPeakHeartrate` and rounds up to the nearest 10 BPM.
- When no valid BPM samples exist, the graph renders a full-width baseline fallback instead of an empty SVG.

## Visual Elements

- The graph is displayed in the shared graph surface treatment.
- The graph surface and SVG fill the full width of the container they are rendered in.
- The graph surface does not add inner padding around the SVG.
- Axis labels do not change the SVG plot viewBox or reserve plot margin.
- Axis labels are rendered outside the stretched SVG coordinate system so label text is not distorted.
- `fillWidth` controls SVG aspect-ratio preservation independently from `labelledAxes`.
- When `fillWidth` is true, the SVG uses `preserveAspectRatio="none"`.
- When `fillWidth` is false, the SVG uses `preserveAspectRatio="xMidYMid meet"`.
- Horizontal dashed gridlines are drawn at 50 BPM intervals.
- The heart-rate polyline uses `var(--accent)`.
- The heart-rate polyline stroke width is controlled by `lineThickness` and defaults to `1.8`.
- The heart-rate polyline uses a non-scaling stroke so segment thickness stays visually consistent when the SVG stretches to fill the container.
- The heart-rate polyline uses rounded joins and caps.
- The scrub marker uses `var(--danger)`.
- The scrub marker exposes `data-testid="heart-graph-scrubber"` for story verification.
- Labelled axes are only shown when `labelledAxes` is true.

## Interaction

- When `onClick` is supplied, the graph behaves as a button.
- The interactive graph must expose an accessible label.
- Click, Enter, and Space activation must call `onClick`.
- When `onClick` is not supplied, the graph is non-interactive.

## Storybook Coverage

The component must have Storybook stories for:

- Live Session
- History With Scrub
- Empty Samples
- Thick Line
- Full Width Parent
- Preserved Aspect Ratio
- Duration Scale Live Replay
- Scrubber
- Clickable Completed Session

The stories should verify plotted SVG output, full-width layout classes, full-width rendered polyline measurement, configurable line thickness, explicit aspect-ratio mode, duration-based x scaling, labelled axis visibility, scrub marker rendering, empty-data fallback, and pointer/keyboard activation.
