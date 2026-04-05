# Devices

![[Pasted image 20260405153842.png|300]]

This page displays the name of the connected heart rate monitor ("Polar OH1 36F91927" in the above diagram), its battery status and a live BPM indicator which "pulses" on every data point detected and also changes to red and then fades to grey. The "Reconnect" button should connect to the last Bluetooth device if it has become disconnected and is available. The Disconnect button disconnects the heart rate monitor and terminates any current session.
## Purpose

`Devices` is the dedicated monitor-management screen. It exists to keep connection controls out of the main workout flow.

## Availability

Required behavior:

- The `Devices` tab is disabled unless a monitor is connected.

Design intent:

- Users should not navigate into an empty device-management screen when nothing is connected.

## Contents

- Connected device name
- Battery card
- Live BPM card with pulsing heart icon
- Bottom-pinned action buttons:
  - `Reconnect`
  - `Disconnect`

## Readouts

### Live BPM

- Large numeric BPM readout
- Heart icon pulses on every incoming sample, even if BPM value does not change

### Battery

- Best-effort BLE battery read
- Styled similarly to BPM card
- In `device-test=1` mode, battery is hardwired to `33%`

## Connection behavior

- `Reconnect` performs a disconnect and a fresh connect flow
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
