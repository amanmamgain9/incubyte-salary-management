# Design language

A modern, quiet HR workspace. Read the overview, then work with the data.

## Composition

- One title and primary action. No introductory paragraphs or repeated headings.
- A compact overview above results: 2–4 measures; trends remain visible. Avoid repeating a full chart in miniature.
- Keep overview measures around 110–140px high on desktop; give visible trends their own clear plotting area.
- Filters always come first. Summaries, group totals and trends follow above the table; no accordions.
- Separate sections with space and subtle rules. Avoid nested cards and dashboard stacks.

## Visual system

- Warm white navigation rail, pale neutral canvas, white data surfaces. Blue-violet marks actions and selection.
- Consistent 18px navigation icons; rounded selection, quiet section labels and a compact account footer.
- Locally bundled Inter; 28px page titles, 13–14px body, 12px secondary labels. Use larger numbers only in the overview.
- Controls 38px high; comfortable table rows; tabular, right-aligned amounts. Keep currency visible.
- Soft 12px surface corners, fine borders and minimal shadow. Color carries meaning, not decoration.
- Define semantic color and shadow tokens once and use them for controls, navigation, statuses, charts and data surfaces.
- Keep prose short. No “About this report” section; calculation rules stay in the requirements.

## Screens

- **Directory:** title/action → search/filters → workforce overview → employees.
- **Reports:** title → filters → visible summaries and trends → table. Preserve country/currency groups; never combine currencies.
- **Profile:** name/status/actions → compact details and current salary → salary history.
- **Forms:** one two-column form; hints only for consequential choices; errors beside fields.
- **Login:** brand, sign-in form and visible demo credentials in a restrained centered panel.

## Responsive behavior

- Collapse navigation behind a labelled menu. Stack controls and the overview without page overflow.
- Keep wide data in one local table scroller; preserve labels, focus indicators and status messages.
- Overviews and summaries use the full matching population, independent of table pagination.
