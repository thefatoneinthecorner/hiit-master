# Tech Constraints

## Core stack

- Use `Preact` with `TypeScript`.
- Use `preact-iso` for routing.
- Use `Tailwind CSS` as the primary styling system.

## State management

- Use `@preact/signals` only for genuinely shared cross-screen state.
- Prefer local component state for screen-local interaction state.
- Prefer URL/router state where it improves navigation or shareability.

## Styling guidance

- Default to Tailwind for layout, spacing, typography, borders, sizing, and responsive behavior.
- Prefer component-local styling via Tailwind utilities over global stylesheet rules.
- Use global CSS only for:
  - app-wide tokens / CSS variables
  - complex animations
  - graph rendering/layout primitives
  - unavoidable platform-specific fixes
- Avoid large screen-level raw CSS files unless there is a clear need.
- Avoid selector-heavy CSS.
- Avoid deep descendant selectors.
- Avoid styling by DOM position.
- Keep class lists readable; extract repeated patterns into small wrapper components when helpful.
- When Tailwind becomes awkward for a component, use a small targeted CSS block rather than forcing an unreadable utility chain.
- Do not mix multiple competing styling approaches for the same component.

## Product-target constraints

- Keep the component tree mobile-first.
- Treat desktop as a supported development/testing layout, not the primary product target.
- Do not support landscape mode unless explicitly added later.
- Optimize for maintainability over cleverness.
- Do not introduce a heavyweight component library unless explicitly requested.

## Accessibility baseline

- Controls should be keyboard reachable.
- Focus states should remain visible.
- Use semantic buttons and inputs where possible.
- Icon-only controls must have readable labels.

## Implementation note

- This build is intended to be the production-oriented rebuild, not an exploratory prototype.
- Prefer clearer structure and stronger invariants over fast-but-fragile iteration.
- If a design detail is ambiguous, follow the product docs rather than improvising new UX patterns.
