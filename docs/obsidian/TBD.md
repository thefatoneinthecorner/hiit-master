Findings

  1. docs/obsidian/App%20Map.md:14 and docs/obsidian/App%20Map.md:17 conflict on Devices availability.
     The page is said to be disabled unless a monitor is connected, but it also needs to remain usable
     during an active session so the user can disconnect/reconnect. That breaks down if the connection
     drops mid-session. The rule probably needs to become “available when connected, or whenever a
     session is active.”
  2. docs/obsidian/README.md:11 still says the athlete can “adjust the nominal work period” at session
     start. That contradicts the terminology in docs/obsidian/Training%20Method.md:8, docs/obsidian/
     Home.md:9, and docs/obsidian/Domain%20Model.md:47, which distinguish Nominal Work Period from
     session-level Actual Work Duration. The README should use the same distinction.
  3. docs/obsidian/Settings.md:9 says that when a profile is used for training, “the work period will
     always be the same and derived from the Nominal Work Period.” That conflicts with the selected-
     session behavior in docs/obsidian/Home.md:9 and docs/obsidian/Training%20Method.md:30, where the
     athlete can shorten the actual work duration for a session.
  4. docs/obsidian/Edge%20Cases%20%26%20Integrity.md:68 still says backups must restore active profile
     selection. That’s an old term; it should now match the rest of the vault and say selected profile
     selection or similar.
  5. docs/obsidian/Settings.md:21 and docs/obsidian/Settings.md:22 have awkward wording: “Select the
     selected profile” and “Edit a selected profile.” They’re understandable, but for a clean source
     spec I’d tighten them to something like “Select a profile for the next session” and “Edit a
     profile.”
