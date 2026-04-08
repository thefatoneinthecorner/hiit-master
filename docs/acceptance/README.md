# Acceptance Specs

This folder contains Gherkin-style Given-When-Then specifications derived from the Obsidian product vault in [`/workspace/docs/obsidian`](/workspace/docs/obsidian).

These specs are intended to capture required behavior for the next implementation of HIIT Master.

Current feature files:

- [`Home.feature`](/workspace/docs/acceptance/Home.feature)
- [`Devices.feature`](/workspace/docs/acceptance/Devices.feature)
- [`History.feature`](/workspace/docs/acceptance/History.feature)
- [`Settings.feature`](/workspace/docs/acceptance/Settings.feature)
- [`ComparisonRules.feature`](/workspace/docs/acceptance/ComparisonRules.feature)
- [`SessionLifecycle.feature`](/workspace/docs/acceptance/SessionLifecycle.feature)

Notes:

- These are acceptance-style specs, not implementation tests.
- They are written to mirror the current product documentation rather than the current codebase.
- If the vault changes, these specs should be updated to match.
- Where a screen is documented as minimal, acceptance scenarios should assert both required presence and meaningful absence of extra UI.
- If a screen must remain sparse, prefer explicit language such as `only`, `no additional`, and `no other`.
