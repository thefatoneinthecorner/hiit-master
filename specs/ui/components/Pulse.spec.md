# Pulse

## Purpose

`Pulse` renders the heart indicator used by the Devices screen Live BPM panel. It separates connection/activity color from the transient beat animation so the heart can remain visibly active while only the pulse motion changes.

## Inputs

- `active`: Controls the visual status color.
- `beating`: Controls whether the pulse animation is applied.
- `label`: Optional accessible label for standalone use.
- `class`: Optional additional class names.

## Visual States

- When `active` is false, the heart is grey using `text-[color:var(--muted)]`.
- When `active` is true, the heart is red using `text-[color:var(--danger)]`.
- The heart remains red for the entire active Live BPM state.
- The heart must not flash by changing opacity during a beat.
- When `beating` is true, the `pulse-heart` animation class is applied.
- When `beating` is false, the `pulse-heart` animation class is not applied.
- The animated heart must be an inline-block transform target so the scale animation visibly applies to the glyph.
- If `beating` is omitted, it defaults to the same value as `active`.

## Beat Animation

- The beat animation scales the heart only.
- The animation must not change opacity.
- The heart must remain continuously visible at the start, middle, and end of each pulse.

## Accessibility

- By default, Pulse is decorative and must set `aria-hidden="true"`.
- When `label` is provided, Pulse is exposed as an image using `role="img"` and `aria-label`.
- A labelled Pulse must not also be hidden from assistive technology.

## Live BPM Story Behavior

The `Live BPM Context` Storybook story demonstrates Pulse in the Devices screen context:

- It displays the `Live BPM` heading.
- It displays the current BPM value.
- It includes a `Heart rate` range slider.
- The slider controls the displayed BPM value.
- The beat interval is derived from the selected BPM as `60000 / bpm` milliseconds.
- The heart remains active/red while the simulator is running.
- The simulator toggles only the `beating` state on each beat.
- Changing the slider updates the BPM and changes the subsequent beat interval.

## Storybook Coverage

The component must have Storybook stories for:

- Resting
- Active
- Accessible Standalone
- Live BPM Context

The stories should verify color state, animation class state, accessibility behavior, slider control behavior, and Live BPM display updates.
