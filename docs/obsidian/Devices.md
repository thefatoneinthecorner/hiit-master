# Devices

## Purpose

`Devices` is the dedicated monitor-management screen. It exists to keep connection controls out of the main workout flow.

## Availability

Current behavior:

- The `Devices` tab is disabled unless a monitor is connected.

Design intent:

- Users should not navigate into an empty device-management screen when nothing is connected.

## Contents

- Connected device name
- Battery card
- Live BPM card with pulsing heart icon
- Bottom-pinned actions:
  - `Reconnect`
  - `Disconnect`

## Current readouts

### Live BPM

- Large numeric BPM readout
- Heart icon pulses on every incoming sample, even if BPM value does not change

### Battery

- Best-effort BLE battery read
- Styled similarly to BPM card
- In `device-test=1` mode, battery is hardwired to `33%`

## Connection behavior

- `Reconnect` currently performs a disconnect and a fresh connect flow
- This may show the Bluetooth picker again
- `Disconnect` ends the current monitor connection

## Design intent

- Device status should feel like a simple, focused utility screen
- Avoid showing session-derived concepts here

## Explicit non-goals

- No history browsing
- No workout start flow
- No session “compromised” status here

## Related pages

- [[Home]]
- [[Interaction Rules]]
- [[Open Issues]]
