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
- On mobile the bottom action bar is pinned to the bottom edge of the viewport.
- Mobile screen content must be laid out so it is not obscured by the bottom action bar or safe-area inset.
- The mobile layout must reserve space for the bottom action bar in CSS rather than allowing screens to slide underneath it.
- That reserved space should be only the minimum needed for the fixed bar and safe-area inset; it must not leave an additional dead margin below the content.
- When a fixed mobile action bar is present, the viewport itself must not be the vertical scrolling surface.
- Any scrollbar for scrollable screens must belong to the content region above the action bar, so the scrollbar track ends above the bar rather than continuing behind it.
- On iPhone-style mobile layouts, the bottom action bar should read as a full-width native-style toolbar, not as a floating inset panel/card with outer margins around it.
- `Devices` is accessible when a heart-rate monitor is connected, or while a session is active.
- `History` and `Settings` are only accessible when no session is active and no startup countdown is running.
- `Devices` remains accessible during an active session so the user can disconnect or reconnect the monitor.
- During startup countdown, `History`, `Devices`, and `Settings` are inaccessible.
- A session is not considered active until the startup countdown has completed.
- A paused session is still considered active.

## Screen purposes

- [[Home]]: connection/start flow and live workout session
- [[Devices]]: current monitor management and live device readouts
- [[History]]: browse recorded sessions and inspect historical performance
- [[Settings]]: session profile management
- [[Theme]]: visual token contract, default values, and contrast rules

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
- Minimal means only the documented content and actions should appear on a screen
- `Home` and `Devices` are deliberately non-scrolling screens
- Non-scrolling screens must still remain fully visible above the mobile action bar on short target viewports; they should compress internally rather than clipping.
- `History` and `Settings` are deliberately scrollable screens
- Should be easy to use and functionality should be obvious and predictable
- Theme-able
- Theme defaults and token semantics are fixed by [[Theme]]
- Screen fidelity and non-deviation rules are fixed by [[Design Constraints]]
- Device management should not clutter the main workout flow
- Data/history behaviour should live away from the primary workout CTA
- Session profiles are the source of truth for workout timing
