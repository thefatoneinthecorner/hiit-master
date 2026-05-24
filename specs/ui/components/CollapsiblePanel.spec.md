# CollapsiblePanel

## Purpose

`CollapsiblePanel` provides reusable expand/collapse layout behavior for arbitrary child content. It owns the height transition behavior while the parent owns the open state and the child component owns its own content.

## Inputs

- `open`: Controls whether the panel is expanded.
- `children`: Content rendered inside the collapsible area.
- `class`: Optional additional class names for the outer transition container.

## Behavior

- When `open` is true, child content is revealed at its natural height.
- When `open` is false, child content is clipped to zero height.
- The transition eases between collapsed and expanded states over 250ms.
- The component must not unmount children when closed.
- Closed content must be inert so focusable descendants are not reachable while hidden.
- The component must not know about the content it wraps.

## Layout

- The outer container clips overflow so collapsed content is not visible.
- The panel transitions `height` over 250ms.
- On each open-state change, the component measures the current visible height and the target content height.
- The component forces a layout boundary before applying the target height so the browser performs the transition.
- The open transition ends at the measured child content height, then restores `height: auto`.
- The closed state transitions to `height: 0`.

## Storybook Coverage

The component must have a Storybook story where its child is `HeartSensorDetails`.

The story should verify:

- The panel starts open with `HeartSensorDetails` visible.
- A toggle control can collapse the panel.
- A toggle control can reopen the panel.
- `HeartSensorDetails` actions remain callable while open.
