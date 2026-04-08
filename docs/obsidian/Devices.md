# Devices

![[Pasted image 20260405153842.png|300]]

This page displays the name of the connected heart rate monitor ("Polar OH1 36F91927" in the above diagram), its battery status and a live BPM indicator which "pulses" on every data point detected and also changes to red and then fades to grey. The `Reconnect` button performs a fresh reconnect flow and may show the host OS Bluetooth picker. The `Disconnect` button disconnects the heart rate monitor and, if a session is active, that session becomes compromised.
## Purpose

`Devices` is the dedicated monitor-management screen. It exists to keep connection controls out of the main workout flow.

## Scroll behavior

Required behavior:

- `Devices` should not scroll vertically.
- The screen must remain compact enough that its device-management content fits in the available viewport without scrolling.

Design intent:

- `Devices` is a compact utility screen, not a long-form information page.
- Device management should remain accessible quickly, including during an active or paused workout.

## Availability

Required behaviour:

- The `Devices` tab is disabled unless a monitor is connected or a session has started.
- The `Devices` page remains accessible during an active session.
- The startup countdown does not count as an active session.
- A paused session still counts as an active session.

Design intent:

- Users should not navigate into an empty device-management screen when nothing is connected.
- Users must be able to disconnect or reconnect a monitor while a session is in progress.

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

- `Reconnect` performs a transient monitor disconnect and a fresh connect flow within the same session context
- This may show the host OS Bluetooth picker again
- `Reconnect` leaves an active session active
- `Disconnect` ends the current monitor connection
- If a session is active when disconnect occurs, the session ends early and becomes compromised

## Mid-session device switching

Required behavior:

- The athlete may switch to a different heart-rate device mid-session.
- Intended workflow:
  - pause the active session
  - switch to `Devices`
  - reconnect to a different monitor
  - return to `Home`
  - resume the session

Design intent:

- Temporary hardware issues should not force the athlete to abandon the workout.

## Design intent

- Device status should feel like a simple, focused utility screen
- Avoid showing session-derived concepts here

## Explicit non-goals

- No history browsing
- No workout start flow
- No session-analysis summaries or round statistics
- No extra troubleshooting or coaching copy unless explicitly specified
- No extra controls beyond `Reconnect` and `Disconnect`
- If a device-management detail is ambiguous, omit it rather than inventing new helper text or new UI

## Related pages

- [[Home]]
- [[Interaction Rules]]
- [[Open Issues]]
