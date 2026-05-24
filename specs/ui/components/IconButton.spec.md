# IconButton

## Purpose

`IconButton` renders an icon-only circular button with a required accessible label. It is used for compact actions such as Clone and Delete in `RoundSettingsItem`.

## Inputs

- `label`: Required accessible name exposed through `aria-label`.
- `iconSrc`: SVG asset used as the masked icon.
- `variant`: Optional visual variant. Supports `default`, `danger`, and `ghost`, defaulting to `default`.
- `size`: Optional button size. Supports `sm`, `md`, and `lg`, defaulting to `md`.
- `type`: Optional native button type, defaulting to `button`.
- `disabled`: Optional native disabled state.
- Other button attributes and handlers are passed through to the native button.

## Layout

- The button is circular, inline-flex, and fixed-size for each size variant.
- The icon is centered inside the circle.
- The icon is rendered from the SVG asset as a CSS mask so it inherits `currentColor`.
- The icon is decorative and hidden from assistive technology.
- The button must not render visible text.

## Visual States

- `default` uses the standard panel background, line border, and ink color.
- `danger` uses the danger background, border, and danger ink color.
- `ghost` uses a transparent background and transparent border.
- Disabled buttons use native disabled semantics and reduced opacity.

## Storybook Coverage

The component must have Storybook stories for:

- Default
- Danger
- Ghost Small
- Large
- Disabled

The stories should verify accessible naming, icon rendering, variant classes, size classes, click callbacks, and disabled behavior.
