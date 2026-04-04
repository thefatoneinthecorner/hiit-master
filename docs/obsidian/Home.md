# Home

## Purpose

`Home` is the primary workout screen. It handles monitor connection, workout start, and the live in-session view.

## States

### Disconnected setup

Current behavior:

- Shows a single primary `Connect` CTA with a heart icon.
- Hides timer, BPM, round, and total-left readouts.
- Keeps the screen visually sparse and vertically centered on mobile.

Design intent:

- The disconnected state should present one obvious next action only.

### Connected setup

Current behavior:

- Primary CTA changes to `Start` with a running icon.
- Shows BPM.
- Shows the active profile’s timing controls/readout.
- Uses a fake iOS-style wheel for work duration presentation.

Design intent:

- Once connected, the user should feel “ready to start” with minimal noise.
- The screen should read as `set workout, then start`.

### Startup countdown

Current behavior:

- The app switches into the session view before the `3-2-1-0` beeps complete.
- Graphs, `Round`, and `Total Left` are visible during countdown.
- Countdown styling uses the green/rest visual treatment.

Design intent:

- The user should see the actual session layout before the workout begins.

### Active session

Current behavior:

- Shows timer, BPM, `Round`, `Total Left`, progress, and live comparison graphs.
- Session graphs can optionally hide labels via a code flag.
- The app attempts to keep the screen awake natively on iPhone.

Design intent:

- The active session should be glanceable under physical strain.
- Dense or tiny text should be minimized.

## Key actions

- `Connect`
- `Start`
- pause/resume by tapping the screen in portrait mobile session mode

## Dependencies

- Active heart-rate monitor connection
- Active session profile
- Current controller state

## Related pages

- [[Devices]]
- [[Domain Model]]
- [[Interaction Rules]]
