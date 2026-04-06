# Session Lifecycle

## Purpose

This page defines the expected state transitions for a workout session.

## Lifecycle states

- Disconnected setup
- Connected setup
- Startup countdown
- Running
- Paused
- Completed
- Ended early
- Compromised

## Setup

Required behavior:

- The app starts disconnected.
- The user connects a heart-rate monitor before starting a session.
- The selected profile defines the nominal workout structure.
- The user may adjust work duration for the next session without mutating the profile.

## Startup countdown

Required behavior:

- Pressing `Start` enters a startup countdown.
- The UI switches into the session layout before the countdown tones finish.
- During countdown, the screen should already show:
  - timer
  - round indicator
  - total remaining time
  - session graphs
- Countdown should use the green/rest treatment rather than the red/work treatment.

## Running

Required behavior:

- The controller advances through:
  - warmup
  - alternating work/rest rounds
  - cooldown
- Heart-rate samples append live while running.
- Keep-awake should be requested while the session is running on supported native platforms.

## Paused

Required behavior:

- The user can pause and resume.
- Paused state should preserve session progress and comparison context.
- While paused, the user may switch to [[Devices]], disconnect the current monitor, connect a different monitor, return to [[Home]], and resume the session.

## Completed

Required behavior:

- Timer remains on zero.
- BPM remains visible.
- The graph stops updating.
- The session can still be scrubbed for inspection.

## Ended early

Required behavior:

- Ending early stores the session as ended early.
- Ended-early sessions are not comparison-eligible.

## Compromised

Required behavior:

- If the heart-rate connection drops during an active session, the session becomes compromised.
- Missing heart-rate regions should be persisted as gaps rather than silently ignored.
- Compromised sessions are not comparison-eligible.

## Related pages

- [[Home]]
- [[Comparison & Recovery Rules]]
- [[Edge Cases & Integrity]]
