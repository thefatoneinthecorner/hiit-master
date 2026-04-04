# HIIT Master Vault

This folder is an Obsidian-style product/design vault for the next implementation of HIIT Master.

The goal is not to document every implementation detail. The goal is to capture enough product intent, screen behaviour, architecture decisions, and domain rules that a fresh implementation can be produced faster and with less UI/code thrash.

## Product Overview

"HIIT Master" is a mobile app that combines and extends the functionality of the popular App Store "Seconds Pro" exercise timer and "Heart Graph" Bluetooth heart rate graphing apps, specifically for HIIT athletes. This combination of apps enables the easy analysis of heart rate data to extract peak and trough heart rates for each HIIT round. In turn, this enables comparison of recovery rates between corresponding intervals in previous sessions. Generally, if the recovery is "deeper" then the athlete can be assumed to be getting fitter.

In order to make comparison between sessions more comparable, the HIIT timer - although configurable - encourages a fixed HIIT session comprised of fixed "nominal" work periods (typically, and by default, 30 seconds) in-dispersed with variable, shortening recovery periods. BUT at the start of each session the athlete can adjust the nominal work period - but any adjustment is "zeroed out" by extending the recovery periods such that each round duration is preserved.

As well as a Heart Graph, the application displays a discrete "histogram" style plot of the recovery deltas so that the athlete can tell at a glance, and whilst in session, how they are performing relative to their previous session.

Named "profiles" allow the HIIT timer durations to be configurable, but this will be an exceptional feature. Users are encouraged to adjust the intensity of their sessions by adjusting their nominal work period rather than by switching between separate timers.

## Technology Overview

The product is a native wrapped web app. The native shell (using Capacitor) gives the web app native access to Bluetooth heart-rate devices and platform keep-awake capability. The target web stack is TypeScript and Preact, using `preact-iso` for routing and signals for global state where shared state is preferable to URL/local component state. Although designed for mobile use in production, desktop usage is supported for convenient development.

Historical session data is stored in IndexedDB.

The app does not support landscape mode.

## Document Structure

Start here:

- [[App Map]]
- [[Home]]
- [[Devices]]
- [[History]]
- [[Settings]]
- [[Domain Model]]
- [[Tech Constraints]]
- [[Comparison & Recovery Rules]]
- [[Session Lifecycle]]
- [[Edge Cases & Integrity]]
- [[Interaction Rules]]
- [[Open Issues]]
- [[V2 Backlog]]

Conventions:

- `Required behavior` means the next implementation should satisfy this.
- `Design intent` means this explains why the behavior exists.
- `Implementation note` means this is guidance for the rebuild, not a user-facing requirement.
- `Open issue` means the design is incomplete or intentionally unresolved.


