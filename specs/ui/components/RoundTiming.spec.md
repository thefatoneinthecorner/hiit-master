# RoundTiming

## Purpose

`RoundTiming` renders the primary timing panel used on the active Home screen. It groups the current round name, the current round countdown, and the remaining session time in one panel.

## Inputs

- `roundName`: Name displayed at the top of the timing panel.
- `countdownSeconds`: Seconds remaining in the current round or phase.
- `remainingSeconds`: Seconds remaining in the full session.
- `emphasis`: Visual emphasis for the current round state.

## Display Behavior

- `countdownSeconds` is formatted as `m:ss`.
- `remainingSeconds` is formatted as `m:ss`.
- Negative or fractional values are clamped down to whole non-negative seconds before display.
- The current round countdown is the dominant value in the panel.
- Session remaining time is displayed below the current round countdown.
- The round name label and remaining label use the same uppercase label typography.
- The remaining time value uses the same secondary value typography as the SessionDisplay Live BPM value.

## Visual States

- `work` emphasis uses `var(--danger)`.
- `recovery` emphasis uses `var(--accent)`.
- The panel uses the same rounded border, line, panel background, and centered layout as the original Home screen timing panel.

## Storybook Coverage

The component must have Storybook stories for:

- Work Round
- Recovery Round
- Cool Down

The stories should verify round naming, timer formatting, remaining time display, and emphasis color state.
