# DisclosureToggle

## Purpose

`DisclosureToggle` displays arbitrary child content with a caret on the right. It is used to toggle related content between open and closed states while animating the caret orientation.

## Inputs

- `open`: Controls the expanded state and caret orientation.
- `children`: Content displayed on the left side of the toggle.
- `label`: Accessible button label.
- `controls`: Optional id of the controlled panel.
- `onToggle`: Called when the toggle is activated.
- `class`: Optional additional class names.
- `shape`: Optional visual shape, either `pill` or `panel`. Defaults to `pill`.
- `caretAlign`: Optional caret alignment, either `center` or `start`. Defaults to `center`.
- `chrome`: Optional visual chrome, either `default` or `plain`. Defaults to `default`.
- `caretPlacement`: Optional caret placement, either `inline` or `edge`. Defaults to `inline`.
- `testId`: Optional test id applied to the button.

## Layout

- The component renders as a full-width button.
- Child content is displayed on the left.
- The caret is displayed on the right.
- The caret is decorative and hidden from assistive technology.
- The button exposes `aria-expanded` based on `open`.
- When `controls` is supplied, the button exposes `aria-controls`.
- The `pill` shape renders as a rounded pill and vertically centers its content.
- The `panel` shape renders with the larger rounded panel radius used by `SessionDisplay` and stretches its child content to fill the panel.
- When `caretAlign` is `start`, the caret aligns to the top of the toggle content so it can line up with a first-row title.
- When `chrome` is `plain`, the toggle removes its own panel background, border, and padding so parent components can own the surrounding layout.
- When `caretPlacement` is `edge`, the caret is positioned on the right edge while the child content remains centered.

## Caret Behavior

- The caret is a visible right-facing chevron in the closed state.
- The caret rotates to point downward in the open state.
- The orientation change is animated over 250ms.
- The caret animation must use transform transitions, not layout changes.

## Storybook Coverage

The component must have a Storybook story where:

- The child content is `Pulse`.
- The open/closed state controls a `CollapsiblePanel`.
- The `CollapsiblePanel` child is `HeartSensorDetails`.
- Activating the toggle updates `aria-expanded`.
- HeartSensorDetails actions remain callable while the panel is open.
