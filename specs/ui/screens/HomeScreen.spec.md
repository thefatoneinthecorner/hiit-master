# HomeScreen

## Purpose

`HomeScreen` is the primary workout screen. It displays connection, ready, active, paused, and completed session states.

## Storybook Scope

- Storybook renders the presentational `HomeScreenView` with fixture state.
- Storybook must not create a real Bluetooth connection.
- Bluetooth, start, pause/resume, duration changes, and scrub changes are represented by mocked callback functions.

## States

- Idle and connecting states show a centered Duration/BPM `SliderToggle` and `Connect` action.
- Ready state shows the selected profile, a pulsing `Pulse` next to the current BPM, actual work duration picker, and `Start` action.
- Ready state hides the actual work duration picker when the application settings mode is `bpm`.
- Ready state displays a prominent warning when previous sessions exist but none qualify as a comparable session for the active profile. The warning is hidden when there are no previous sessions at all.
- Running, paused, countdown, and completed states render through `SessionDisplay` without the optional `SessionDisplay` title.
- Running state passes the application settings mode through to `SessionDisplay`, so BPM mode suppresses the recovery histogram.
- In BPM settings mode, warmup and cooldown remain timed phases.
- In BPM settings mode, work phases advance when live BPM reaches the round Max target.
- In BPM settings mode, recovery phases advance when live BPM drops to the round Min target.
- The live `SessionDisplay` layout shows the current round name, phase countdown, remaining session time, live BPM pulse, session controller, `LayeredHeartGraph`, and `RecoveryHistogram`.
- HomeScreen keeps the embedded session controller hidden initially, but still passes the active playing state so exposing it during a running session enables `Pause` and disables `Play`.
- Completed state uses the same `SessionDisplay` graph stack, keeps the session controller collapsed initially, passes the scrub position to `LayeredHeartGraph` and `RecoveryHistogram`, and shows the scrub range input below the stack.
- Ended-early and error states show the completed/session summary fallback layout.
- The Home recovery histogram is driven by live sensor samples through the same live recovery comparison path as the latest-session replay story: visible rounds are derived from elapsed time, current BPM, current samples, current analysis, and previous comparable analysis.
- Current analysis must use lag-aware peak detection: each round's peak window includes the round work phase and its following rest/cooldown phase.

## Behavior

- Activating `Connect` calls the supplied connection handler only.
- Activating the idle Duration/BPM toggle calls the supplied settings-mode handler with the selected application mode.
- Activating `Start` calls the supplied start handler only.
- The no-comparable-session warning is controlled by explicit comparable-session state from the store, not by inferring from empty graph or histogram data.
- Changing actual work duration persists the selected value for the active profile so returning to Home restores that value.
- If no actual work duration has been persisted for the profile, Home defaults to the previous completed session's actual work duration; if there is no previous session, it falls back to the profile default.
- Activating the live session controller's `Pause` or `Play` actions calls the supplied pause/resume handler.
- Activating the live session controller's Bluetooth action calls the supplied reconnect handler.
- Activating the live session controller's Stop action calls the supplied stop handler; in the store-backed page this disconnects Bluetooth and resets Home to Idle without saving an ended-early session.
- Completed session graph and histogram clicks do not navigate to a history screen.
- Moving the completed scrub range calls the supplied scrub handler.

## Storybook Coverage

The page must have Storybook stories for:

- Idle
- Ready
- Ready without comparable session
- Running
- Running BPM mode
- Completed

The stories should verify the visible state and that mocked actions are called without invoking application services such as Bluetooth.
