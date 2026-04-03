
# HIIT Master (The Pendulum Timer)

A zero-dependency, single-file Progressive Web App (PWA) designed for a highly specific High-Intensity Interval Training (HIIT) workflow.

Unlike standard interval timers where work and rest periods are hardcoded back-to-back, HIIT Master uses a **Fixed Cycle Total** with a single **Global Work Offset**. This allows the user to scale their workout intensity based on daily fitness/recovery levels without altering the total duration of the workout.

## The Core Concept: "Global Work Offset"

The workout consists of a fixed sequence of cycles. Each cycle has a strictly defined total duration.

* The user sets a single variable: the **Work Goal** (nominally 30 seconds).
* When the user adjusts the Work Goal (e.g., down to 27s for an "easy" day), the timer automatically calculates the remaining time in that cycle and applies it to the **Rest** phase.
* **Math:** `Actual Rest = (Nominal Rest + 30) - WorkGoal`

This ensures that the "train always leaves the station on time." Cycle 4 will always start at the exact same minute and second of the workout, regardless of how long the user chose to "work" during Cycles 1-3.

## The Cycle Structure

To solve the "fence-post" problem of HIIT timing, the app defines a Cycle strictly as **`Rest -> Work`**.

1. **Cycle 1 (Warmup):** 5-minute Rest $\rightarrow$ Work
2. **Cycles 2-14:** Decreasing Rest $\rightarrow$ Work
3. **Cycle 15:** 30s Rest $\rightarrow$ Work
4. **Cooldown:** A strict 3-minute phase triggered immediately after the final Work period.

### Default Sequence (Nominal Rest Durations)

`[300s, 80s, 65s, 55s, 45s, 40s, 35s, 30s (x8)]`

---

## Features

### Two-Mode UI

* **Launchpad (Selection Mode):** * Massive D-Pad interface for selecting the Work Goal.
* Time-travel interface: Cycle back and forth through historical sessions stored in `localStorage` to view past dates and goals.
* "Impress Me" Start: A 3-second audio countdown occurs *before* launching the timer to verify the device isn't muted.


* **Hustle (Run Mode):** * Distraction-free, massive digital countdown.
* Dynamic background colors (Red = Work, Green = Rest/Warmup/Cooldown).
* 1-based cycle indexing (`1 / 15`).
* **Tabular Figures:** Uses `font-variant-numeric: tabular-nums` to ensure countdown digits never jitter or shift as numbers change.
* Responsive Landscape Mode for side-mounted phone placement.



### Audio Engine

Uses the **Web Audio API** (Oscillators) to bypass iOS silent mode quirks.

* **Lead-in:** Three 440Hz pips at 3, 2, and 1 seconds remaining in *every* phase.
* **Transition:** A solid 880Hz buzzer at 0 seconds.

### Data Persistence

* **LocalStorage:** Every started session logs the timestamp, the selected work goal, and the specific Rest sequence used.
* **CSV Export:** Generates a downloadable CSV directly from the browser for spreadsheet analysis.

### System Integrations

* **Screen Wake Lock API:** Prevents the iOS screen from going to sleep while the timer is running, requiring no user interaction.
* **PWA Ready:** Includes meta tags for "Add to Home Screen" on iOS for a full-screen, app-like experience without the Safari address bar.

---

## Developer Options (Query Parameters)

You can alter the behavior of the application on the fly using URL query parameters:

* **Enable Fast-Forward:** `?show_skip=1`
* Reveals a hidden "Skip" (⏩) button in Run Mode.
* **Smart Skip:** Clicking it advances the clock exactly to `0:03` to test the audio engine and transition logic without waiting. Clicking it again at `0:03` forces an immediate phase transition.


* **Override Rest Sequence:** `?rests=10,5,5`
* Overrides the hardcoded `RESTS` array for rapid testing or custom workouts.
* Note: The sequence provided will automatically be saved to the session history and included in the CSV export.



## Deployment

1. Drop `index.html` into a GitHub repository.
2. Enable **GitHub Pages**.
3. Open the URL in Safari on iOS, tap **Share**, and select **Add to Home Screen**.

## Current Status

The rebuilt app now also has a Capacitor iOS shell scaffold under `ios/` for native-device work.
