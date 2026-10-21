# tRPC contracts

Procedures at `/api/trpc` use [Zod validation](https://trpc.io/docs/server/validators) and the HR session from [login](login.md). Better Auth owns login/logout at `/api/auth`; no duplicate auth procedures.

## Shared shapes

Models reference [data-model.md](data-model.md). Money is a decimal string; counts/revisions are integers. Dates are `YYYY-MM-DD`; timestamps are ISO UTC strings. `?` means optional input; `null` clears the last working day.

```text
Paging = { cursor?: String, limit?: Integer }
Page<T> = {
    items: T[],
    next_cursor: String | null,
    prev_cursor: String | null,
    total_count: Integer,
    range_start: Integer
}
EmployeeView = Employee + { employment_status: "upcoming" | "active" | "departed" }
HistoryView = SalaryHistoryEntry + { changed_by_name: String }
```

- Default page size 50; maximum 100. Cursors are opaque and signed; reset when filters change. A cursor reused with different filters, or altered, is `BAD_REQUEST` (invalid cursor).
- `next_cursor`/`prev_cursor` fetch the following/preceding page; `null` at either end. `range_start` is the 1-based position of the first item (0 when empty); screens show `range_start`–`range_start + items.length - 1` of `total_count`.
- Employees sort by ID ascending; history by revision descending. Report ordering is specified below. `total_count` counts matching rows before pagination.
- No filter means all values. Blank search means no search; search matches name/ID case-insensitively, including partial matches.
- Unknown country/department/currency codes in filters or writes are `BAD_REQUEST` with `field_errors` keyed by the input field. Known codes with no matches return an empty result (e.g. France + INR).

**Array limits.** Every output array except `Page.items` has a `.max(n)`:

| Arrays | One item per | `.max` |
| --- | --- | ---: |
| `lookups.get` countries; commitment `by_country` | Country | 250 |
| `lookups.get` currencies | Currency | 200 |
| `lookups.get` departments; department `by_department` | Department | 100 |
| `by_country` of department, growth and benchmark | Country/currency pair | 500 |
| Growth `trend` | Pair × last 12 months | 6,000 |
| Benchmark `trend` | Visible month | 180 |

## Employee operations

`EmployeeInput`: `id`, `name`, `department_id`, `work_country_code`, `joining_date`, `annual_base_pay`, `salary_currency_code`.

`DetailsPatch`: optional `name`, `department_id`, `work_country_code`, `joining_date`, `last_working_day`; require at least one field. Salary and ID are excluded. Fields sit beside `id` in the input; no nesting.

`EmployeeFilters`: optional `search`, `department_id`, `work_country_code`, `employment_status`.

| Procedure | Type | Input | Output |
| --- | --- | --- | --- |
| `lookups.get` | Query | None | `{ countries: Country[], departments: Department[], currencies: Currency[] }` |
| `employees.list` | Query | `EmployeeFilters + Paging` | `{ rows: Page<EmployeeView>, summary: DirectorySummary }` |
| `employees.get` | Query | `{ id }` | `EmployeeView` |
| `employees.create` | Mutation | `EmployeeInput` | `EmployeeView` |
| `employees.update` | Mutation | `{ id } + DetailsPatch` | `EmployeeView` |
| `salaries.history` | Query | `{ employee_id } + Paging` | `Page<HistoryView>` |
| `salaries.update` | Mutation | `{ employee_id, expected_revision, annual_base_pay, salary_currency_code, reason }` | `EmployeeView` |

- `DirectorySummary`: `{ employee_count, active_count, upcoming_count, departed_count, country_count }` over all matching employees, independent of pagination.
- Creation saves initial history as revision 1 with reason `Initial salary`.
- Record a departure through `employees.update` by setting `last_working_day`; `null` clears it.
- Details edits validate against stored values: `last_working_day` ≥ `joining_date` and ≥ the UTC date of the latest revision after the initial salary; `joining_date` no later than the UTC date of the first revision after the initial salary. Violations are `BAD_REQUEST` keyed by the submitted field. Clients send only changed fields.
- `salary_revision` is stored on the employee and equals the latest history revision. Salary updates require it as `expected_revision` and return the new revision after commit.
- Salary updates need an employee active today (UTC); upcoming or departed is `BAD_REQUEST` with `field_errors.employee_id`. Revisions therefore fall between joining and the last working day.
- Server assigns history ID, revision, timestamp, actor and country/department snapshots. Details edits preserve existing history.

## Reports

All are queries. Each returns `{ rows: Page<Row>, summary }`; summaries cover all matching records, independent of pagination. Monetary summaries stay grouped by country and currency.

Chart series live in `summary`: bounded by grouping and month range, never the full row set. Single-group fields are `null` unless all matching records share one country/currency (benchmark: country/department/currency); charts never combine currencies.

Commitment and department reports use employees active on today's UTC calendar date. All filters apply together; empty results return empty rows/groups/series, zero counts and no cursors.

### `reports.salaryCommitment`

- **Input:** Optional `work_country_code`, `department_id`, `salary_currency_code`; plus `Paging`.
- **Row:** `{ work_country_code, salary_currency_code, employee_count, total_annual_base_pay }`.
- **Summary:** `{ employee_count, currency_count, by_country: CountryCount[] }`; `CountryCount` is `{ work_country_code, employee_count }`, one per matching country, country ascending. Commitment amounts are the rows.
- **Order:** Country, currency ascending. Current employees and salaries; no prorating.

### `reports.departmentBreakdown`

- **Input:** Optional `work_country_code`, `department_id`, `salary_currency_code`; plus `Paging`.
- **Row:** `{ work_country_code, department_id, salary_currency_code, employee_count, total_annual_base_pay, average_annual_base_pay }`.
- **Summary:** `{ employee_count, by_country: CountrySummary[], by_department: DepartmentPoint[] }`; `CountrySummary` has the row fields except `department_id`.
- **Chart:** `DepartmentPoint` is `{ department_id, employee_count, total_annual_base_pay: Decimal | null }`, one per matching department, department ascending; the total is the single-group department comparison.
- **Order:** Country, department, currency ascending. Compute averages from matching employees; return two decimal places.

### `reports.salaryGrowth`

- **Input:** Required `from` ≤ `to` dates, `to` no later than today UTC; optional `work_country_code`, `department_id`; plus `Paging`. Date range is inclusive by UTC calendar date.
- **Row:** `{ month, work_country_code, salary_currency_code, increases, decreases, net_change, currency_switch_count }`; month is `YYYY-MM` in UTC.
- **Summary:** `{ by_country: GrowthTotal[], currency_switch_count, trend: GrowthPoint[] }`; `GrowthTotal` has the row fields except `month`; the top-level count totals all groups.
- **Chart:** `GrowthPoint` is `{ month, work_country_code, salary_currency_code, net_change }` for the last 12 months of the period (ending at `to`), every month for each `by_country` group, zero without revisions. Order: country, currency, month ascending.
- **Order:** Month, country, currency ascending. Increases/decreases are positive magnitudes; `net_change = increases - decreases`, in annual base pay.
- Find each employee's preceding revision before filtering by period/country/department. Skip initial salaries; use country/department at revision time, including later leavers.
- Compare amounts only within the same currency. Count currency switches separately under the new currency; exclude them from growth amounts.

### `reports.historicalSalaryBenchmark`

- **Input:** Required `from` (first day of a month), `to` (inclusive snapshot end date, no later than today UTC); at most 180 visible months. Optional `work_country_code`, `department_id`, `salary_currency_code`; plus `Paging`.
- **Row:** `{ month, work_country_code, department_id, salary_currency_code, employee_count, total_annual_base_pay, p10_annual_base_pay, median_annual_base_pay, p90_annual_base_pay, country_median_annual_base_pay, median_gap_percent, median_yoy_percent }`.
- **Summary:** `{ snapshot_date: to, employee_count, by_country: SnapshotTotal[], trend: BenchmarkPoint[] }`; `SnapshotTotal` is `{ work_country_code, salary_currency_code, employee_count, total_annual_base_pay }` for the final selected snapshot only.
- **Chart:** `BenchmarkPoint` is `{ month, employee_count, p10_annual_base_pay, median_annual_base_pay, p90_annual_base_pay, country_median_annual_base_pay }`, one per visible month (≤ 180), month ascending. `employee_count` covers all matching groups; amounts are single-group fields (pay-range trend).
- **Order:** Month, country, department, currency ascending. Percentages are signed decimal strings with two places; `median_yoy_percent` is null without a matching prior-year month/group.
- Select employees active at each month end (or `to` for the final partial month). Use the latest revision before the next UTC midnight and its stored country/department/currency.
- P10/median/P90 use exact numeric interpolation. `median_gap_percent = (department median / country median - 1) × 100`; year-over-year change uses the same department/country/currency 12 months earlier. Round final amounts/percentages to two places.
- Calculate country medians across all departments; apply the department filter to displayed rows and summary membership afterward. Read 12 extra months before `from` for year-over-year comparisons. Summaries cover all matching departments, independent of pagination.

## Errors

Use [tRPC error codes](https://trpc.io/docs/server/error-handling):

| Code | Meaning |
| --- | --- |
| `BAD_REQUEST` | Invalid input, unknown country/department/currency, salary change for a non-active employee, or invalid cursor; validation includes `error.data.field_errors` |
| `UNAUTHORIZED` | Missing, expired or revoked session |
| `NOT_FOUND` | Employee does not exist |
| `CONFLICT` | Employee ID already exists (with `field_errors.id`) or salary revision is stale |
| `INTERNAL_SERVER_ERROR` | Unexpected failure; return a generic message |

Rejected writes change neither current data nor history. On revision conflict, preserve the form and reload the latest record before retrying.
