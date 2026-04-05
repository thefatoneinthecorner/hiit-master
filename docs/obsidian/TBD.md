A few inconsistencies stood out:

  1. Reconnect behavior conflicts with Devices availability. In docs/obsidian/Devices.md, the prose says Reconnect should reconnect the
     last Bluetooth device if it has become disconnected, but the same page also says Devices is disabled unless a monitor is connected.
     If the tab is inaccessible while disconnected, the user can’t get to Reconnect. You need to choose one:

  - Devices remains available when a known device is disconnected
  - or reconnect lives somewhere else

  2. Reconnect behavior is internally contradictory. The opening prose in docs/obsidian/Devices.md specifies a silent reconnect to the
     last device, but the later “Connection behavior” section says reconnect may show the Bluetooth picker again. Those are different
     product rules.
  3. Work-duration defaults are underspecified versus the data model. docs/obsidian/Home.md says the connected setup should default to
     the previous session’s selected work duration, or 20s on first use. But docs/obsidian/Domain%20Model.md only requires
     activeProfileId in app settings and doesn’t say how that default is derived or persisted. If this is a real requirement, the model
     should explicitly state one of:

  - persist lastSelectedWorkDurationSec
  - derive from the most recent session on the active profile
  - fall back to active profile nominal
  - first-run default is 20s

  4. There is a likely nominal/default tension around work duration. docs/obsidian/README.md frames the nominal work period as
     “typically, and by default, 30 seconds,” while docs/obsidian/Home.md says first-use default selection should be 20s. That may be
     intentional, but if so it should be made explicit:

  - profile nominal default = 30s
  - initial user-selected session default = 20s

  5. Profile mutability is still partly contradictory. docs/obsidian/README.md removed immutability as a hard rule, but docs/obsidian/
     Settings.md still states that renaming a profile updates session history references, while docs/obsidian/Open%20Issues.md says
     profile mutability/versioning is unresolved. Rename propagation is fine, but the docs should say whether that rename is still
     allowed once a profile is referenced, because that’s part of the same integrity decision.
  6. Disconnect semantics need one explicit rule. The opening prose in docs/obsidian/Devices.md says Disconnect “terminates any current
     session,” but docs/obsidian/App%20Map.md says Devices is inaccessible during active sessions. Those two can both be true only if:

  - Disconnect is mostly a pre-session/post-session action
  - active-session disconnect is expected to happen via dropout/system path instead

  Everything else broadly still hangs together. The screenshots help a lot.

  The two most important fixes are:

  - resolve the Devices/Reconnect access rule
  - explicitly define how the connected Work Duration default is chosen and stored
