# HomeScreen

## Purpose

`HomeScreen` is the primary workout screen. It displays connection, ready, active, paused, and completed session states.

## Storybook Scope

- Storybook renders the presentational `HomeScreenView` with fixture state.
- Storybook must not create a real Bluetooth connection.
- Bluetooth, start, pause/resume, history navigation, duration changes, and scrub changes are represented by mocked callback functions.

## States

- Idle and connecting states show a centered `Connect` action.
- Ready state shows the selected profile, a pulsing `Pulse` next to the current BPM, actual work duration picker, and `Start` action.
- Running, paused, countdown, and completed states render through `SessionDisplay` without the optional `SessionDisplay` title.
- The live `SessionDisplay` layout shows the current round name, phase countdown, remaining session time, live BPM pulse, session controller, `HeartGraph`, and `RecoveryHistogram`.
- HomeScreen keeps the embedded session controller hidden initially, but still passes the active playing state so exposing it during a running session enables `Pause` and disables `Play`.
- Completed state uses the same `SessionDisplay` graph stack, keeps the session controller collapsed initially, passes the scrub position to `HeartGraph` and `RecoveryHistogram`, and shows the scrub range input below the stack.
- Ended-early and error states show the completed/session summary fallback layout.

## Behavior

- Activating `Connect` calls the supplied connection handler only.
- Activating `Start` calls the supplied start handler only.
- Changing actual work duration persists the selected value for the active profile so returning to Home restores that value.
- If no actual work duration has been persisted for the profile, Home defaults to the previous completed session's actual work duration; if there is no previous session, it falls back to the profile default.
- Activating the live session controller's `Pause` or `Play` actions calls the supplied pause/resume handler.
- Activating the live session controller's Bluetooth action calls the supplied reconnect handler.
- Activating the live session controller's Stop action calls the supplied stop handler; in the store-backed page this disconnects Bluetooth and resets Home to Idle without saving an ended-early session.
- Clicking the completed heart graph or recovery histogram calls the supplied history navigation handler.
- Moving the completed scrub range calls the supplied scrub handler.

## Storybook Coverage

The page must have Storybook stories for:

- Idle
- Ready
- Running
- Completed

The stories should verify the visible state and that mocked actions are called without invoking application services such as Bluetooth.
