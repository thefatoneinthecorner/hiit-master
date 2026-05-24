# AGENTS

## Mission

Implement HIIT Master from the product specification.

# Agent Instructions

We are using Bun and a Spec-Driven Development (SDD) lifecycle.

1. **Stories are the Specification:** Treat `.stories.tsx` files as immutable technical contracts. If an implementation file (`.tsx`) is missing or deleted, do not guess. Query the `my-project-sb-mcp` toolset to ingest the component's manifest and requirements.
2. **Bottom-Up Implementation:** Generate the minimal code necessary to make all states defined in the Storybook file render correctly.
3. **Verify via Sandbox:** After writing or regenerating code, execute the tests using the `run-story-tests` tool. If any edge cases fail, iterate and fix the code until the story run reports 100% success.

## Required reading order

1. Start at [docs/START_HERE.md](docs/START_HERE.md).
2. Read the referenced product and acceptance documents needed to understand the current milestone and screen.
3. Use [docs/Implementation Plan.md](docs/Implementation%20Plan.md) as the execution plan.

## Execution rule

After reading the spec, execute the plan in [docs/Implementation Plan.md](docs/Implementation%20Plan.md) directly.

Do not stop for intermediate approval after each step or milestone.

Proceed autonomously unless blocked by one of the following:

- a true ambiguity in the product specification that materially affects behavior or design
- a missing dependency, missing credential, missing runtime capability, or other external blocker
- a direct conflict between specification documents that cannot be resolved reasonably from context

## Implementation constraints

- Treat the product docs as prescriptive, not illustrative.
- Prefer omission over invention where the spec is incomplete.
- Do not add extra UI, helper copy, controls, summaries, or workflows unless explicitly specified.
- Follow the design-fidelity and screen-specific constraints in the docs.
- Use the acceptance specs as behavioral guardrails, not as permission to improvise beyond the documented screens.

## Working style

- Build in the milestone order described in [docs/Implementation Plan.md](docs/Implementation%20Plan.md) unless there is a strong dependency reason to vary it.
- Verify work with appropriate tests as you go.
- Keep implementation aligned with the documented non-goals, scrolling rules, theme rules, and starter-profile defaults.

## Before finishing

- Unless you get stuck, please double check that all features have been completed.
