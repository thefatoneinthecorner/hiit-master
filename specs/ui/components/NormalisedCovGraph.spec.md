# NormalisedCovGraph

## Purpose

`NormalisedCovGraph` displays the normalized coefficient of variation across completed sessions with usable recovery analysis data.

## Data

- Accepts an ordered list of points with `date`, optional `profileName`, optional `actualWorkDurationSec`, and `value`.
- Points with `null` or zero values are omitted from the plotted line and scrubber range.
- Values are reported in arbitrary display units by multiplying the stored normalized CoV by `10000` and displaying two decimal places.

## Layout

- The component fills the width of its parent.
- Above the graph, the component displays only the graph title `Normalised CoV` and an information button.
- In the title, the initial `N`, `C`, and `V` are regular full-size capitals; the remaining letters in `Normalised` and the `o` in `CoV` are rendered as small caps.
- The information button is rendered as a compact circular `i` button and toggles explanatory text about what the graph measures.
- The graph uses the provided valid-point range with padding so the smallest point does not sit on a baseline axis.
- The graph does not draw a horizontal axis through the smallest point.
- The x-axis is scaled by elapsed time between displayed session dates, not by evenly spaced sample number.
- The plotted x-axis has internal left and right margins, so the first and last samples do not sit against the rounded graph container.
- The graph draws subtle vertical background bands for contiguous displayed points sharing the same `profileName` and `actualWorkDurationSec`.
- The chart scrubber is drawn as danger-coloured crosshairs at the selected point, with a vertical line at the selected time and a horizontal line at the selected normalized CoV value.
- The selected normalized CoV value is also overlaid inside the graph against the left edge, moving vertically with the selected point's value.
- A date pill is overlaid inside the graph using the same typography as the normalized CoV pill.
- The date pill displays the selected date in `DD MMM YY` format followed by the relative day gap as a negative day count in round brackets, for example `23 May 26 (-4d)`.
- The graph reserves a bottom label lane so the date pill does not collide with plotted data points.
- The graph does not render an underbar or selected band description below the graph surface.
- Sample markers are rendered as absolutely positioned CSS circles outside the stretched SVG coordinate system, so they remain circular regardless of graph aspect ratio.

## Interaction

- The graph surface itself controls the selected valid point.
- The information button toggles explanatory text without changing the selected point.
- Pressing the pointer over the graph surface starts scrubbing and updates the scrubber using the pointer x-coordinate.
- Moving the pointer only updates the scrubber while the same pointer remains pressed.
- Once scrubbing starts, the graph captures the pointer so movement continues to update the scrubber even if the pointer leaves the graph extents.
- Releasing or cancelling the pointer stops scrubbing.
- Pointer scrubbing maps the graph x-coordinate onto the first and last displayed session timestamps, so selection is time-based, not sample-index-based.
- Moving the pressed pointer scrubber calls `onSelectedIndexChange` with the nearest valid-point index for the selected timestamp.
- The graph surface exposes slider semantics and supports `ArrowLeft`, `ArrowRight`, `Home`, and `End` keyboard navigation.
- No separate slider or range input is rendered.
- The in-graph scrubber labels update to show the selected date, relative age, and scaled normalized CoV value.

## Storybook Coverage

- Default session history with realistic normalized CoV values.
- Scrubbed state showing a non-latest historical point.
- Empty state with no valid normalized CoV points.
