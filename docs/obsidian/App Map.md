# App Map

## Primary tabs

- `Home`
- `Devices`
- `History`
- `Settings`

## Navigation rules

- The app uses the `preact-iso` router.
- On mobile there is a bottom action bar.
- On desktop there is a nav bar in the header.
- `Devices` is disabled unless a heart-rate monitor is connected.
- `History` and `Settings` are only accessible when no session is active and no startup countdown is running.
- `Devices` remains accessible during an active session so the user can disconnect or reconnect the monitor.
- During startup countdown, `History`, `Devices`, and `Settings` are inaccessible.

## Screen purposes

- [[Home]]: connection/start flow and live workout session
- [[Devices]]: current monitor management and live device readouts
- [[History]]: browse recorded sessions and inspect historical performance
- [[Settings]]: session profile management

## Major app states

- Disconnected setup
- Connected setup
- Startup countdown
- Active session
- Paused session
- Completed session
- History browsing
- Settings/profile editing

## Global design intent

- Mobile-first on iPhone/Android
- Desktop for development only
- Minimal design, usable at a distance of roughly 1m by a user with reasonable eyesight on small screens such as iPhone SE3
- Should be easy to use and functionality should be obvious and predictable
- Theme-able
- Device management should not clutter the main workout flow
- Data/history behaviour should live away from the primary workout CTA
- Session profiles are the source of truth for workout timing
