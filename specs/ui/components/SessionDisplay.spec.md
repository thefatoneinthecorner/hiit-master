# SessionDisplay

## Purpose

`SessionDisplay` composes the active session display from existing session components. It presents an optional session title, session details summary, optional session controller, heart graph, and recovery histogram in a vertical stack.

## Inputs

- `title`: Optional heading displayed at the top of the stack.
- `roundName`, `countdownSeconds`, `remainingSeconds`, `bpm`, `pulseActive`, `pulseBeating`, and `pulseBeatKey`: Values rendered through `SessionDetails`.
- `sensorName`, `batteryPercent`, `playing`, `onBluetooth`, `onPlay`, `onPause`, and `onStop`: Values passed to `SessionController`.
- `samples`, `totalDurationSec`, `nominalPeakHeartrate`, and `scrubElapsedSec`: Values passed to `HeartGraph`.
- `recoveryRounds`, `roundDurationsSec`, `roundEndElapsedSec`, and `recoveryScaleMaxAbs`: Values passed to `RecoveryHistogram`.
- `onScrubPointerMove`: Optional pointer movement handler used by replay stories to move shared chart scrubbers.
- `sessionControllerVisible`: Initial disclosure state for the session controller row. Defaults to true.

## Layout

- The component renders as a vertical stack.
- When `title` is provided, the top row is the session title.
- When `title` is omitted, no title row or placeholder space is rendered.
- The next row displays `SessionDetails`.
- `SessionDetails` shows the current phase label, current countdown, live pulse, current BPM, remaining title, and remaining session time.
- Work and rest round phase labels include suffixes in the form `Round N: Work` and `Round N: Rest`.
- The current round name and `Remaining` labels use matching uppercase label typography.
- The live pulse is centered in the time/pulse/BPM row.
- The next row contains `SessionController` in a `CollapsiblePanel`.
- The session controller row is initially visible unless `sessionControllerVisible` is false.
- The rows below the sensor details are `HeartGraph` and `RecoveryHistogram`.
- Live-session replay data must pass `scrubElapsedSec: null` so the history scrubber is not displayed.
- The embedded `HeartGraph` uses duration-based x scaling so the heart-rate line keeps a stable session timeline while live samples arrive.
- The embedded `RecoveryHistogram` receives only recovery rounds that are visible at the current replay elapsed time, so it starts empty and fills as recoveries complete.
- The embedded `RecoveryHistogram` uses full-session elapsed recovery endpoints so bars line up horizontally with the same timeline as `HeartGraph`.
- In replay, recovery histogram bar right edges align with the end of each round's rest phase. The final round aligns with the final recovery analysis endpoint, not the cooldown endpoint.
- In replay, the recovery histogram vertical scale uses a high-water magnitude so it may grow as larger live values appear, but it must not shrink while replay advances.

## Behavior

- Activating `SessionDetails` toggles the session controller row.
- The disclosure exposes `aria-expanded`.
- The disclosure caret reflects the open and closed state.
- Bluetooth, Play, Pause, and Stop actions remain callable when the controller row is open.
- In the latest-session replay story, Pause freezes replay advancement and Play resumes real-time advancement.
- The controller visually disables Play while replay is playing, and disables Pause while replay is paused.
- In the latest-session replay story, a recovery histogram bar always appears when the live comparison reaches zero/parity.
- A round's recovery calculation window is the round's rest phase plus the following round's work phase, matching `RoundAnalysis.recoveryWindowStartSec` through `recoveryWindowEndSec`.
- While that recovery calculation window is still in progress, a visible recovery histogram bar renders the live comparison delta from the lowest BPM observed so far in that calculation window, not from the current BPM.
- During replay, visible recovery bars are calculated only from heart-rate samples that have appeared in the replay stream; they must not jump to an unobserved completed trough from final analysis data.
- Once a round's recovery calculation window ends, its recovery histogram bar remains based on the lowest observed replay sample within that calculation window.
- The first recovery histogram bar must not appear before zero/parity unless its recovery window has ended.
- If a round's recovery histogram bar has not appeared by the start of the next work phase, it appears at that point even if the live comparison is still negative and outside the visible histogram magnitude threshold.
- If at least one histogram bar is already visible, another recovery bar may appear earlier when its live comparison magnitude is within the current displayed live histogram magnitude, including high-water live values from already visible bars.
- A recovery bar also appears at the recovery window end as a fallback.

## Replay Debug Controls

- The latest-session replay story includes debug controls for visual inspection.
- Pressing Space toggles replay playback between paused and playing.
- Holding the right arrow key fast-forwards the replay by advancing samples on animation frames until the key is released.
- Holding the left arrow key rewinds the replay by moving samples backward on animation frames until the key is released.
- Pressing `S` toggles a shared scrubber on both `HeartGraph` and `RecoveryHistogram`.
- When the shared scrubber is visible, moving the mouse over `SessionDisplay` maps the pointer x-coordinate to elapsed time and moves both scrubbers together.
- These controls are required in Storybook for debugging and regression inspection, even if they are not exposed in the production active-session UI.

## Storybook Coverage

The component must have Storybook stories for:

- Active Session
- Controller Initially Hidden
- Latest Session Replay

The stories should verify the `SessionDetails` summary structure, initial visible controller, optional initially hidden controller, disclosure toggling, graph rendering, histogram rendering, session controller action callbacks, and a real-time replay of the latest persisted session data with heart pulses driven by each incoming sample tick.
