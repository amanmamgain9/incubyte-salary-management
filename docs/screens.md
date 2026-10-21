# Screens

Static HTML design prototypes in [`docs/screens/`](screens/index.html). They cover all ten product screens and are the visual reference for the Next.js implementation.

Design rules: [visual language](design-language.md).

## Navigation

Sign in → Employees → Employee profile. Forms open as modal dialogs, never as pages: Add employee over Employees (`?dialog=create`); Edit details (`?dialog=edit`) and Change salary (`?dialog=salary`) over the profile. The `dialog` search param deep-links each one; closing returns to the page behind. The prototypes draw the forms as pages; their fields and states still apply. The shared sidebar links to all four reports; sign out returns to login.

| Screen                  | HTML                                                  | Contents and actions                                                                                                                                                                               |
| ----------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in                 | [login](screens/login.html)                           | Email/password, show password, demo credentials, inline login error.                                                                                                                               |
| Employees               | [employees](screens/employees.html)                   | Name/ID search; country, department and status filters; overview of matching employees, active, countries and employment mix; Previous/Next pagination with “x–y of N”; open record; add employee. |
| Employee profile        | [employee](screens/employee.html)                     | All employee fields, derived status, current pay, salary revision and read-only history including actor, reason and snapshot assignment.                                                           |
| Add employee            | [employee-new](screens/employee-new.html)             | Dialog over Employees. Permanent ID, name, department, country, joining date, initial annual base pay and independent currency.                                                                                           |
| Edit employee           | [employee-edit](screens/employee-edit.html)           | Dialog over the profile. Edit details and joining/leaving dates; ID locked; setting/clearing departure uses this form. Saves only changed fields; Save disabled until something changes.                                     |
| Change salary           | [salary-change](screens/salary-change.html)           | Dialog over the profile. Current salary/revision, new amount/currency, reason and immediate-save action; preserve entries on conflict. Active and upcoming employees; departed profiles hide the action.                    |
| Salary commitment       | [report-commitment](screens/report-commitment.html)   | Country/currency commitment rows; country/department/currency filters; active headcount overall and by country; currency count.                                                                    |
| Department breakdown    | [report-departments](screens/report-departments.html) | Headcount, totals and averages; country summaries; comparable department chart; same filters.                                                                                                      |
| Salary growth           | [report-growth](screens/report-growth.html)           | Date/country/department filters; monthly changes and switches; period increases/decreases/net/switches by country/currency; 12-month net change trend.                                             |
| Historical benchmarking | [report-history](screens/report-history.html)         | Month range up to 15 years (default: 24 months ending this month), country/department/currency filters; pay-range chart; full percentile/median/YoY table; final-snapshot summaries.                                                      |

## Shared behavior

- Employee dates and report dates use native date inputs, report months a native month input (`YYYY-MM` placeholder where a browser shows it as text); values are ISO strings and the last working day can be cleared.
- Country and salary currency stay separate. Pay comparisons/charts never combine currencies.
- Report summaries cover the complete matching population, independent of table pagination. Historical country medians retain all departments.
- Tables scroll horizontally on smaller screens; wide historical tables keep the month visible. Keyboard focus, labels, status text and form errors remain visible.
- Tailwind compiles `styles.input.css` into local `styles.css`. One title/action row, compact filters and one result surface; navigation collapses on mobile; filters always stay visible.
- Compact overviews and visible charts sit above directory/report rows. Figures and charts use the full matching set; currencies stay separate. Filters come first, followed by all summaries and visible trends, then rows. No report accordions. Fixed dimensions move to the scope line.
- Profiles put details and current pay above history. Forms omit explanatory sidebars; login is a single centered form.
- After a successful create, details edit or salary change, the dialog closes and the page behind it shows one success alert. While a save is pending the dialog cannot close.
- Preview states: [loading](screens/report-history.html?state=loading), [empty](screens/employees.html?state=empty), [error/retry](screens/report-growth.html?state=error), [duplicate ID](screens/employee-new.html?state=error), [salary conflict](screens/salary-change.html?state=conflict).

## Preview

Open `docs/screens/index.html` directly, or serve only that directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs/screens
```

Visit `http://127.0.0.1:8765`. Compiled CSS and the licensed Inter font are included locally; no external assets or API connection required. After style or utility-class changes, rebuild with `npx @tailwindcss/cli@4 -i docs/screens/styles.input.css -o docs/screens/styles.css --minify`. Sample forms persist only in this tab’s session storage; authentication, data and report calculations are illustrative. The directory contains 18 sample employees; organisation figures represent the planned 10,000-person dataset.

Screen fields follow [requirements](requirements.md) and [contracts](trpc-contracts.md). These mockups are for review before frontend implementation.
