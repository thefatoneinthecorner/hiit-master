# Theme

## Purpose

This page defines the visual theme contract for the app.

It exists to prevent the implementation from improvising color roles, token names, or low-contrast combinations.

## Theme model

The app ships with a default light theme.

The theme is token-based. The implementation should not invent additional color roles unless the docs are updated first.

Required tokens:

- `canvas`: app background
- `panel`: cards and raised surfaces
- `ink`: primary text on `canvas` and `panel`
- `muted`: secondary text on `canvas` and `panel`
- `line`: borders, dividers, and low-emphasis strokes
- `accent`: primary action background and positive emphasis color
- `accentInk`: text and icons shown on `accent`
- `danger`: destructive emphasis background
- `dangerInk`: text and icons shown on `danger`

## Default values

Default light theme values:

- `canvas`: `#F4EFE4`
- `panel`: `#FFF9F1`
- `ink`: `#1F1A14`
- `muted`: `#6E6253`
- `line`: `#B7A992`
- `accent`: `#2F6B5D`
- `accentInk`: `#F7F4EC`
- `danger`: `#9F3A32`
- `dangerInk`: `#FFF6F4`

## Usage rules

Required behavior:

- Primary text on `canvas` and `panel` uses `ink`.
- Secondary text on `canvas` and `panel` uses `muted`.
- Borders and dividers use `line`.
- Primary CTAs and positive emphasis surfaces use `accent`.
- Text or icons placed on `accent` must use `accentInk`, never `ink`.
- Destructive actions use `danger`.
- Text or icons placed on `danger` must use `dangerInk`.
- The implementation must not place `ink` text on `accent` backgrounds.
- The implementation must not place `muted` text on `accent` backgrounds unless explicitly specified.

## Contrast requirements

Required behavior:

- All default token combinations must satisfy WCAG AA contrast for their intended use.
- Normal body text must meet a minimum contrast ratio of `4.5:1`.
- Large text and large button labels must meet a minimum contrast ratio of `3:1`.
- Interactive controls must remain readable in their default, pressed, disabled, and focused states.
- Theme overrides must preserve the same contrast requirements.

## Design intent

- The visual language should remain deliberately minimal.
- The default theme should feel calm and legible rather than ornamental.
- Contrast and glanceability take priority over visual experimentation.
- The app should remain readable at physical distance on small mobile screens.

## Related pages

- [[App Map]]
- [[Home]]
- [[Devices]]
- [[History]]
- [[Settings]]
- [[Tech Constraints]]
