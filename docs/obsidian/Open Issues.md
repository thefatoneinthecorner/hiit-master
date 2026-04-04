# Open Issues

## Profile historical integrity

Editing a session profile after sessions have already been recorded against it invalidates the historical meaning of those sessions.

Likely options:

- make referenced profiles read-only, or at least the recovery timings. Updating the notes should be allowed at any time.
- introduce profile versioning and persist the version used by each session

## Trackpad vertical swipe/scroll feel

Desktop/Mac trackpad vertical swipe/scroll behavior may feel inconsistent on some screens. Dragging works, but swipe-up behavior may not feel native.

## Chart-label simplification

There is product interest in hiding some in-session chart labels for glanceability, but previous attempts disturbed layout. This needs a more careful pass if revisited.
