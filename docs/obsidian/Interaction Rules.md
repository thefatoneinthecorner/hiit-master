# Interaction Rules

## Connect/start flow

- If disconnected, `Home` should present only `Connect`
- Once connected, `Home` should present `Start`
- Device management belongs in [[Devices]], not in the main workout stack

## Session transition

- Pressing `Start` enters a startup countdown
- The session layout appears before the countdown beeps finish
- Graphs and runtime indicators should already be visible during countdown

## History navigation

- Mobile: swipe horizontally between sessions
- Desktop: use explicit chevrons

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
