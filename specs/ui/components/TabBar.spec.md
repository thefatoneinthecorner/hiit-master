# TabBar

## Purpose

`TabBar` renders primary app navigation.

## Layout

- The tab bar displays `Home`, `Trends`, and `Settings`.
- The tab bar does not display `History`.
- Desktop renders the tabs as pill buttons.
- Mobile renders the tabs in a three-column bottom navigation grid.

## Behavior

- Activating an enabled tab updates app route state and navigates to the tab path.
- Disabled tabs use native disabled button semantics.

## Storybook Coverage

- Primary navigation with History omitted.
