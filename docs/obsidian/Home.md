# Home

![[Pasted image 20260405153636.png|300]]

The "Home" screen on startup. One CTA button, "Connect" (a heart rate monitor to the app).

![[Pasted image 20260405172335.png|300]]

Once connected to a heart rate monitor, the screen shifts to the start screen shown above. The main CTA enables the athlete to start their session. Below the CTA a live heart rate readout confirms that the heart rate monitor is indeed connected. The user can update their "Work Duration", which should default to whatever they selected in their most recent previous session on the same selected profile, or `20s` if no earlier session exists for that profile. This property controls how hard the user will have to work in order to complete the session. The page also displays the name of the currently selected profile, which specifies the rest periods between work periods.

![[Pasted image 20260405153756.png|300]]

Once started, the display adjusts again to display the current phase timer at the top. Immediately after startup, the "Warmup" Round will be displayed and the timer initialised to the warmup duration, as specified by the selected profile. The phone will emit 3 short beeps followed by a long fourth beep and then the session actually begins.

During the session, the Round name updates as the session progresses. The large "phase" timer counts down and successively restarts for the duration of the next phase (either the work duration specified in the previous screen or an adjusted recovery duration taken from the session definition). The BPM continues to display the live heart rate recorded from the monitor. The "Remaining" time counts down to zero.

The very first phase is the "Warmup". After the Warmup each "Round" starts with a "work" phase followed by a "recovery" (or "rest") phase. The very last recovery phase is known as the "Cooldown".

As the session progresses the athlete's heart rate is displayed in the graph immediately under the BPM display. The vertical scale will be set to the "Nominal Peak Heartrate" specified in the profile. If the heart rate ever exceeds this, the vertical axis will adjust in `10bpm` increments as required. The horizontal axis is determined by the total length of the session which is calculated from the nominal work duration and the recovery periods for the selected profile. If the heart rate drops below its initial value, the minimum scale value will be adjusted to track the exact minimum for the session. The graph will display gridlines at multiples of `50bpm` (not shown).

Immediately below the Heartrate Graph a smaller "Recovery Delta Diff" graph is displayed. This is a "histogram" style plot derived from the difference in the "recovery delta" between this session and the previous session using the same profile. The recovery delta is simply the difference between the peak and trough for any period (although these have subtle definitions - see later). If the delta diff is positive for any given round the it should be displayed as a green upwards bar; if it is negative it should be displayed as a red downwards bar. The vertical scales adjust as required.
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
- Shows the selected profile’s name.
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
- The main graph’s default vertical scale is initialized from the selected profile’s `nominalPeakHeartrate`.
- A secondary graph positioned below displays recovery deltas as a histogram plot against the most recent eligible previous session recorded on the same profile.
- The app attempts to keep the screen awake natively on iPhone/Android.

Design intent:

- The active session should be glanceable under physical strain.
- Dense or tiny text should be minimized.

### Completed Session

Required behavior:

- Timer stays on zero.
- BPM continues to display the athlete's heart rate but the graph no longer updates.
- Tapping on either graph moves the view to the completed session in the "History" view.

## Key actions

- `Connect`
- `Start`
- pause/resume by tapping the screen in portrait mobile active session mode

## Dependencies

- Active heart-rate monitor connection
- Selected profile
- Current controller state

## Related pages

- [[Devices]]
- [[History]]
- [[Settings]]
- [[Domain Model]]
- [[Interaction Rules]]
