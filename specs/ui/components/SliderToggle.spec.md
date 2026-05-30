# SliderToggle

## Purpose

`SliderToggle` lets the user choose between two mutually exclusive options.

## Props

- `options`: Exactly two options, each with a `value` and `label`.
- `value`: The currently selected option value.
- `onChange`: Called with the selected option value when an option is activated.
- `label`: Accessible group label for the toggle.

## Behavior

- The selected option is marked with `aria-pressed="true"`.
- Activating the inactive option calls `onChange` with that option's value.
- The selected option is shown with a sliding accent highlight.

## Storybook Coverage

- The story uses `duration` and `bpm` options.
- The selected option changes when the user activates the other option.
