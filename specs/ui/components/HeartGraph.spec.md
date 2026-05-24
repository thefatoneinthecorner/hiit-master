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
- `crosshairScrubber`: When true, renders the scrubber as crosshairs with pill labels and suppresses axes and axis labels.
- `phases`: Optional workout phase segments used to append the current phase label to the crosshair time pill.
- `analysis`: Optional round analysis used as a fallback source for the crosshair delta when phase windows or samples are unavailable.
- `previousAnalysis`: Optional previous-session round analysis used to append a delta-diff indicator to the crosshair time pill.
- `previousAnalyses`: Optional previous-session round analyses, ordered newest first, used to find the newest previous session with the same round interval.
- `previousSessions`: Optional previous sessions, ordered newest first, with samples, phases, and analysis used to calculate the previous delta with the same phase-aware rules as the current delta.
- `onScrubElapsedSecChange`: Optional callback called while the user presses or drags inside the graph to move the scrub elapsed second.

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
- Horizontal dashed gridlines are suppressed when `crosshairScrubber` is true.
- The heart-rate polyline uses `var(--accent)`.
- The heart-rate polyline stroke width is controlled by `lineThickness` and defaults to `1.8`.
- The heart-rate polyline uses a non-scaling stroke so segment thickness stays visually consistent when the SVG stretches to fill the container.
- The heart-rate polyline uses rounded joins and caps.
- The scrub marker uses `var(--danger)`.
- The scrub marker exposes `data-testid="heart-graph-scrubber"` for story verification.
- When `crosshairScrubber` is true and `scrubElapsedSec` is supplied, the scrubber includes a horizontal danger-coloured line at the nearest valid BPM sample and exposes `data-testid="heart-graph-scrubber-horizontal"`.
- When `crosshairScrubber` is true and the scrubbed point is inside a workout phase, the exact phase timer interval is shown as a subtle background band from that phase's `startSec` to `endSec`.
- The phase interval band exposes `data-testid="heart-graph-phase-interval"`.
- When `crosshairScrubber` is true and a phase delta can be calculated, fixed dashed vertical lines show the timestamps where the minimum and maximum BPM values used for that phase delta were recorded.
- The minimum BPM marker exposes `data-testid="heart-graph-min-marker"` and the maximum BPM marker exposes `data-testid="heart-graph-max-marker"`.
- The minimum and maximum BPM markers must remain fixed while scrubbing within the same phase.
- When `crosshairScrubber` is true and a valid scrubbed sample exists, the selected BPM is shown in a pill using `data-testid="heart-graph-crosshair-bpm"`.
- When `crosshairScrubber` is true and `scrubElapsedSec` is supplied, the selected elapsed time is shown in a pill using `data-testid="heart-graph-crosshair-time"`.
- The crosshair time pill uses `MM:SS` followed by the phase label when `phases` are supplied.
- Warmup and cooldown phases append `Warmup` or `Cooldown`.
- Work and rest phases append `RNN W` or `RNN R`, where `NN` is the round number.
- For work and rest/cooldown phases, the crosshair time pill appends a stable phase delta using a triangular delta symbol.
- When `previousAnalysis` or `previousAnalyses` contains the same round index and both current and previous deltas are available, the crosshair time pill appends the delta difference after the current delta.
- `previousAnalyses` is interpreted as chronological previous sessions, newest first; the first session containing the same round delta is used.
- When `previousSessions` is supplied, it takes precedence over `previousAnalysis` and `previousAnalyses`.
- Previous session deltas are calculated from the matching previous session phase, samples, and phase list using the same physiological-lag rules as the current crosshair label.
- For cooldown, the previous delta must be calculated from the previous cooldown phase, not from the stored round recovery analysis when those differ.
- Positive delta differences use an up arrow, for example `↑7`.
- Negative delta differences use a down arrow, for example `↓3`.
- If the previous session does not contain the corresponding round interval or has no delta, no delta-diff indicator is displayed.
- Work phase delta accounts for physiological lag by using the minimum BPM during the current work phase and the maximum BPM across that work phase plus the following rest/cooldown phase.
- Rest/cooldown phase delta accounts for physiological lag by using the maximum BPM across the current round's work plus rest/cooldown phase and the minimum BPM across that rest/cooldown phase plus the following work phase when present.
- The crosshair delta is fixed for the selected phase. It must not change as the user scrubs within that same phase.
- If phase windows or samples are unavailable, the crosshair delta falls back to the matching `RoundAnalysis.delta`.
- Labelled axes are only shown when `labelledAxes` is true and `crosshairScrubber` is false.

## Interaction

- When `onClick` is supplied, the graph behaves as a button.
- The interactive graph must expose an accessible label.
- Click, Enter, and Space activation must call `onClick`.
- When `onClick` is not supplied, the graph is non-interactive.
- When `onScrubElapsedSecChange` is supplied, pressing or touching inside the graph calls it with the elapsed second for the pointer x-position.
- While the pointer remains pressed, moving inside or outside the graph continues updating the scrub elapsed second using pointer capture.
- Releasing or cancelling the pointer stops scrub updates.

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
- Backup Session Crosshair
- Negative Delta Diff

The stories should verify plotted SVG output, full-width layout classes, full-width rendered polyline measurement, configurable line thickness, explicit aspect-ratio mode, duration-based x scaling, labelled axis visibility, scrub marker rendering, crosshair scrubber labels, axis suppression in crosshair mode, empty-data fallback, and pointer/keyboard activation.
