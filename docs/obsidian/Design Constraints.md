# Design Constraints

## Purpose

This page defines the fidelity rules for implementing the documented screens.

It exists to prevent the rebuild from improvising extra UI, extra copy, or new interaction patterns that are not explicitly documented.

## Core rule

The documented screen designs are prescriptive, not illustrative.

If the docs show or describe a screen in a minimal form, that minimal form is the requirement.

## Required behavior

- Implement only the controls, readouts, graphs, labels, and status copy that are explicitly documented.
- Treat mockups, screen descriptions, and required-behavior bullets as the source of truth for what belongs on a screen.
- If a detail is ambiguous, prefer omission over invention.
- If a design detail remains materially unclear, stop and ask rather than filling the gap with a new UX pattern.
- Do not add explanatory paragraphs, helper text, warning copy, summaries, badges, cards, or stats unless they are explicitly specified.
- Do not add secondary workflows or convenience actions unless they are explicitly specified.
- Do not merge screens, split screens, or move functionality across screens unless the docs explicitly require it.
- Do not introduce decorative or “helpful” extra UI just because there appears to be empty space.

## Minimal means

For this product, `minimal` means:

- the screen contains only the documented content and actions
- the hierarchy is visually restrained
- copy is sparse
- the next action is obvious
- unused explanatory text is omitted

Minimal does not mean:

- generic
- approximate
- free to add extra support text
- free to add extra summary surfaces

## Acceptance guidance

When writing or updating acceptance specs:

- assert the presence of required elements
- also assert the absence of extra controls or helper text where that matters
- use `only`, `no additional`, and `no other` language when the screen must remain sparse
- add explicit non-goals to screen pages when an implementation might otherwise improvise

## Related pages

- [[App Map]]
- [[Theme]]
- [[Home]]
- [[Devices]]
- [[History]]
- [[Settings]]
- [[Tech Constraints]]
