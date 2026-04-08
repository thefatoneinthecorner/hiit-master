# Interaction Rules

## Connect/start flow

- If disconnected, `Home` should present only `Connect`
- Once connected, `Home` should present `Start`
- Device management belongs in [[Devices]], not in the main workout stack

## Session transition

- Pressing `Start` enters a startup countdown
- The session layout appears before the countdown beeps finish
- Graphs and runtime indicators should already be visible during countdown

## Mid-session device switching

- A paused session may be resumed after switching to a different heart-rate device
- Intended user flow:
  - pause
  - open [[Devices]]
  - disconnect current device
  - connect a different device
  - return to [[Home]]
  - resume

## History navigation

- Mobile: swipe horizontally between sessions
- Desktop: use explicit chevrons

## Scroll behavior

- `Home` is non-scrolling in all of its main states.
- The live `Home` session screen must remain fully usable without vertical scrolling.
- The live `Home` session screen is designed for use during training, including treadmill/gym environments where the athlete may not be able to interact with the phone.
- `Devices` is also non-scrolling; its content must remain compact enough to fit without vertical scrolling.
- `History` is allowed to scroll vertically.
- `Settings` is allowed to scroll vertically.

## Recovery row editing (Settings page)

- Tapping a row expands it
- Only one recovery-related row is expanded at a time
- Warmup and cooldown cannot be cloned or deleted
- Recovery rounds can be cloned or deleted
- Cloning inserts the new round immediately after the source round
- The last remaining recovery round (other than the warmup and cooldown) cannot be deleted

## Stepper rules

- Tap: adjust by `1s`
- Long press: repeat in `5s` increments
- Release should stop repetition immediately
- Long press repetition must continue from the current value, not from a stale value captured when the press began.
- A completed long press must not also apply a tap-sized `1s` increment on release.
- Pointer cancel/leave should stop the repeat loop just like release.
- Long press on the stepper must suppress browser context menus and touch callouts so the gesture remains owned by the control in Chrome mobile emulation and touch browsers.
- The stepper must still allow vertical dragging to scroll the surrounding panel when the user performs a scroll gesture rather than a completed press.
- When a field is read-only, the UI must not render dead stepper controls that look tappable; use an explicitly read-only presentation instead.
- Stepper tap and release handling must survive minor pointer drift in Chrome mobile emulation; do not rely solely on element-local `pointerup` / `pointerleave` events to complete or stop the gesture.

## Device-test mode

Implementation note:

- `?device-test=1` swaps the real monitor for a replay monitor
- Replays heart-rate data from the most recent stored session with samples
- Battery is hardwired to `33%`

## iPhone/native behavior

- BLE on iPhone uses native Capacitor BLE, not Web Bluetooth
- BLE on Android should also use a native Capacitor path
- Browser/Mac flow keeps the Web Bluetooth path
- Keep-awake uses native Capacitor keep-awake where available
