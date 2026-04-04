# Home

![[Pasted image 20260404163907.png|300]]

The "Home" screen on startup. One CTA button, "Connect" (a heart rate monitor to the app).

![[Pasted image 20260404164018.png|300]]

Once connected to a heart rate monitor, the screen shifts to the start screen show above (should include a live heart rate counter). On this screen the user can specify their "Work Duration" (*Not* "Workout Duration"), which should default to whatever they had selected in their previous session, or 20s for their very first use. This page should also display the name of the currently active profile.

![[Pasted image 20260404164159.png|300]]

Once started, the display adjusts again to display the current phase timer at the top, the Round name (either Warmup, "Round N" or Cooldown - the text colour - and that of that of the Time Left - changes according to the phase, either Work or Rest. In Work phase the text is red). Two graphs are displayed (probably clearer on the History page) - the top one being the live heart rate (and generally looks like a rising sawtooth) and the smaller one below being the "recovery delta" diff with the previous session of the current profile.
## Purpose

`Home` is the primary workout screen. It handles monitor connection, workout start, and the live in-session view.

## States

Required behavior:

- When the app starts, it should initially be disconnected.

### Disconnected setup

Required behavior:

- Shows a single primary `Connect` CTA with a heart icon.
- Hides timer, BPM, round, and total-left readouts.
- Keeps the screen visually sparse and vertically centered on mobile.

Design intent:

- The disconnected state should present one obvious next action only.

### Connected setup

Required behavior:

- Primary CTA changes to `Start` with a running icon.
- Shows live BPM.
- Shows the active profile’s name.
- Uses a fake iOS-style wheel for adjusting work duration relative to the profile's nominal work duration.

Design intent:

- It should be obvious to the user when their heart rate monitor is connected.
- Once connected, the user should feel “ready to start” with minimal noise.
- The screen should read as `set workout, then start`.

### Startup countdown

Required behavior:

- The app switches into the session view before the `3-2-1-0` beeps complete.
- Graphs, `Round`, and `Total Left` are visible during countdown.
- Countdown styling uses the green/rest visual treatment.

Design intent:

- The user should see the actual session layout before the workout begins.

### Active session

Required behavior:

- Shows timer, BPM, `Round`, `Total Left`, progress, and live comparison graphs.
- Session graphs display gridlines at configurable intervals, but are unlabelled by default.
- The main graph displays heart rate against time.
- A secondary graph positioned below displays recovery deltas as a histogram plot against the most recent eligible previous session recorded on the same profile.
- The app attempts to keep the screen awake natively on iPhone/Android.

Design intent:

- The active session should be glanceable under physical strain.
- Dense or tiny text should be minimized.

### Completed Session

Required behavior:

- Timer stays on zero.
- BPM continues to display the athlete's heart rate but the graph no longer updates.
- A scrubber becomes available allowing overall round data to be displayed, including round name, peak, trough, recovery, instantaneous timestamp, and heart rate.

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
