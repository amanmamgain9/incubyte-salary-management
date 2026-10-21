# tRPC contracts

Procedures at `/api/trpc` use [Zod validation](https://trpc.io/docs/server/validators) and the HR session from [login](login.md). Better Auth owns login/logout at `/api/auth`; no duplicate auth procedures.

## Shared shapes

Models reference [data-model.md](data-model.md). Money is a decimal string; counts/revisions are integers. Dates are `YYYY-MM-DD`; timestamps are ISO UTC strings. `?` means optional input; `null` clears the last working day.

```text
Paging = { cursor?: String, limit?: Integer }
Page<T> = { items: T[], next_cursor: String | null, total_count: Integer }
EmployeeView = Employee + {
    employment_status: "upcoming" | "active" | "departed",
    salary_revision: Integer
}
HistoryView = SalaryHistoryEntry + { changed_by_name: String }
```

- Default page size 50; maximum 100. Cursors are opaque; reset when filters change.
- Employees sort by ID ascending; history by revision descending. Report ordering is specified below. `total_count` counts matching rows before pagination.
- No filter means all values. Blank search means no search; search matches name/ID case-insensitively, including partial matches.

## Employee operations

`EmployeeInput`: `id`, `name`, `department_id`, `work_country_code`, `joining_date`, `annual_base_pay`, `salary_currency_code`.

`DetailsPatch`: optional `name`, `department_id`, `work_country_code`, `joining_date`, `last_working_day`; require at least one field. Salary and ID are excluded.

`EmployeeFilters`: optional `search`, `department_id`, `work_country_code`, `employment_status`.

| Procedure | Type | Input | Output |
| --- | --- | --- | --- |
| `lookups.get` | Query | None | `{ countries: Country[], departments: Department[], currencies: Currency[] }` |
| `employees.list` | Query | `EmployeeFilters + Paging` | `Page<EmployeeView>` |
| `employees.get` | Query | `{ id }` | `EmployeeView` |
| `employees.create` | Mutation | `EmployeeInput` | `EmployeeView` |
| `employees.update` | Mutation | `{ id, changes: DetailsPatch }` | `EmployeeView` |
| `salaries.history` | Query | `{ employee_id } + Paging` | `Page<HistoryView>` |
| `salaries.update` | Mutation | `{ employee_id, expected_revision, annual_base_pay, salary_currency_code, reason }` | `EmployeeView` |

- Creation saves initial history as revision 1 with reason `Initial salary`.
- Record a departure through `employees.update` by setting `last_working_day`.
- `salary_revision` is the latest history revision. Salary updates require it as `expected_revision` and return the new revision after commit.
- Server assigns history ID, revision, timestamp, actor and country/department snapshots. Details edits preserve existing history.

## Reports

All are queries. Each returns `{ rows: Page<Row>, summary }`; summaries cover all matching records, independent of pagination. Monetary summaries stay grouped by country and currency.

### `reports.salaryCommitment`

- **Input:** Optional `work_country_code`, `department_id`, `salary_currency_code`; plus `Paging`.
- **Row:** `{ work_country_code, salary_currency_code, employee_count, total_annual_base_pay }`.
- **Summary:** `{ employee_count, by_country: Row[] }`.
- **Order:** Country, currency ascending. Current employees and salaries; no prorating.

### `reports.departmentBreakdown`

- **Input:** Optional `work_country_code`, `department_id`, `salary_currency_code`; plus `Paging`.
- **Row:** `{ work_country_code, department_id, salary_currency_code, employee_count, total_annual_base_pay, average_annual_base_pay }`.
- **Summary:** `{ employee_count, by_country: CountrySummary[] }`; `CountrySummary` has the row fields except `department_id`.
- **Order:** Country, department, currency ascending. Compute averages from matching employees; return two decimal places.

### `reports.salaryGrowth`

- **Input:** Required `from`, `to` dates; optional `work_country_code`, `department_id`; plus `Paging`. Date range is inclusive by UTC calendar date.
- **Row:** `{ month, work_country_code, salary_currency_code, increases, decreases, net_change }`; month is `YYYY-MM` in UTC.
- **Summary:** `{ by_country: GrowthTotal[], currency_switch_count }`; `GrowthTotal` has the row fields except `month`.
- **Order:** Month, country, currency ascending. Increases/decreases are positive magnitudes; `net_change = increases - decreases`, in annual base pay.
- Find each employee's preceding revision before filtering by period/country/department. Skip initial salaries; use country/department at revision time, including later leavers.
- Compare amounts only within the same currency. Count currency switches separately; exclude them from growth amounts.

Commitment and department reports use employees active on today's UTC calendar date. All filters apply together; empty results return empty rows/groups, zero counts and no next cursor.

## Errors

Use [tRPC error codes](https://trpc.io/docs/server/error-handling):

| Code | Meaning |
| --- | --- |
| `BAD_REQUEST` | Invalid input, unknown country/department/currency, or invalid cursor; validation includes `error.data.field_errors` |
| `UNAUTHORIZED` | Missing, expired or revoked session |
| `NOT_FOUND` | Employee does not exist |
| `CONFLICT` | Employee ID already exists or salary revision is stale |
| `INTERNAL_SERVER_ERROR` | Unexpected failure; return a generic message |

Rejected writes change neither current data nor history. On revision conflict, preserve the form and reload the latest record before retrying.
