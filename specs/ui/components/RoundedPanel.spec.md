# RoundedPanel

## Purpose

`RoundedPanel` provides the shared rounded panel chrome used by screen sections and larger framed component groups.

## Inputs

- `children`: Content rendered inside the panel.
- `padding`: Controls inner spacing. Supported values are `none`, `sm`, `md`, and `lg`.
- `radius`: Controls corner radius. Supported values are `md`, `lg`, and `xl`.
- `class`: Optional additional class names for layout or sizing.

## Behavior

- The component renders a single `div`.
- The panel uses the product panel background, line border, and rounded radius.
- The default padding is `md`.
- The default radius is `lg`.
- It does not add headings, labels, actions, or layout beyond the panel chrome.

## Storybook Coverage

- Default panel chrome.
- Padding variants.
- Radius variants.
- No-padding mode for parent-owned spacing.
