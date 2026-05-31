# LayeredHeartGraph

## Purpose

`LayeredHeartGraph` is an experimental host for rendering graph primitives into separate SVG and HTML overlay layers.

## Layout

- The component renders a single graph surface.
- The graph surface contains two layer targets:
  - an SVG layer for chart primitives
  - an HTML `div` overlay layer for labels and other non-SVG affordances
- The SVG layer fills the graph surface.
- The overlay layer fills the graph surface and is positioned above the SVG layer.
- The component provides both layer elements through context to its descendants.

## Portal Helpers

- `SvgLayerPortal` renders its children into the SVG layer with `createPortal`.
- `OverlayLayerPortal` renders its children into the overlay `div` layer with `createPortal`.
- Portal helpers render nothing until their target layer has been captured.

## Crosshairs

- `Crosshairs` renders vertical and horizontal SVG lines through `SvgLayerPortal`.
- `Crosshairs` renders two pill-style labels through `OverlayLayerPortal`.
- The labels use absolute positioning relative to the overlay layer.

## IntervalHighlight

- `IntervalHighlight` accepts an `Interval`.
- `IntervalHighlight` renders through `SvgLayerPortal`.
- The highlight area spans from the interval start sample elapsed time to the interval end sample elapsed time.
- The highlight area fills the graph height with a subtle shaded treatment.
- The interval max sample elapsed time is shown as a dashed vertical line.
- The interval min sample elapsed time is shown as a dashed vertical line.

## Pointer Hook

- `useLayeredHeartGraphPointerX` reports the graph-space x coordinate while a pointer is pressed.
- Pointer movement uses Pointer Events so the same behavior works for mouse and touch input.
- Pointer capture keeps drag updates flowing after the pointer moves outside the graph surface bounds.
- The hook supports `jump` movement, where pressing or dragging sets the x coordinate to the pointer location.
- The hook supports `relative` movement, where dragging adjusts from the current x coordinate by the pointer movement delta without jumping to the initial press location.
- Pointer movement must not update the x coordinate when no pointer is pressed.

## Storybook Scope

- The story renders the latest completed backup session's heart-rate samples as an SVG polyline inside `SvgLayerPortal`.
- The story verifies that both layer targets exist and that the heart-rate polyline is rendered inside the SVG layer.
- A crosshair story places the default crosshairs halfway through the latest completed session.
- An interval highlight story renders a shaded interval and min/max dashed lines over the latest completed session.
- The combined highlight and crosshair story initializes both from the same graph x position so they describe the same interval.
- Storybook covers jump and relative pointer movement modes.
- The jump pointer movement story includes interval highlighting, and the highlighted interval updates from the same x position as the crosshairs.
