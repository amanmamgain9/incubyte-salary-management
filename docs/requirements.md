# Requirements

**User:** ACME’s HR manager, managing salary records for 10,000 employees across countries.

**Goal:** Maintain accurate salary records and answer questions about annual pay and its history.

## Access

HR users sign in with email/password and can perform all employee operations and view all reports. Salary history remains read-only; revisions identify the signed-in user. See [login and security](login.md).

## Data operations

### Find and view employees

- Search in one box by full/partial name or employee ID; filter by department, country and employment status. Browse paginated results.
- Open a record: employee ID, name, department, work country, joining/leaving dates, status, annual base pay, currency and salary history.

### Maintain employee records

- Register joiners with employee details and initial salary.
- Edit name, department, work country and employment dates; derive status from dates.
- Store work country separately from salary currency; changing country does not change currency.
- Employee IDs are fixed, unique and never reused.
- Record the last working day; retain departed employees as searchable records.

### Maintain salaries

- Update annual base pay and currency; changes apply immediately. Require a positive amount with at most two decimal places; changing currency does not convert it.
- Preserve the initial salary and every revision in read-only history, including after departure.
- Record each salary version with amount, currency, country and department at change, HR user, time and reason.
- Save salary and history together; failed saves change neither. Show errors and preserve entered values.

## Reporting

Commitment and department reports include employees active today, from joining date through last working day. Group by work country; keep salary currencies separate. Reflect saved changes immediately.

### 1. Salary commitment

**Question:** What is our annual base salary commitment for current employees in each country?

#### List

- One row per work country and salary currency: active employee count and annual commitment, a full year at current salaries without prorating.

#### Summaries

- Matching active employees, in total and by country; number of salary currencies.

#### Filters

- Work country, department and salary currency; apply together to the list and summaries.

### 2. Department breakdown

**Question:** How is each country's annual base salary commitment distributed across departments?

#### List

- One row per work country, department and salary currency: employee count, total and average annual base pay.

#### Summaries

- Matching headcount; total and average annual base pay by country and currency, calculated from matching employees.

#### Filters

- Work country, department and salary currency; apply together to the list and summaries.

### 3. Salary growth by country

**Question:** How much have salary revisions increased or decreased annual base pay in each country over time?

Use revisions during the selected period, including employees who later leave. Exclude joining/departure effects; use country and department recorded at each revision.

Compare each revision with the preceding salary entry, even when that entry falls outside the selected period. The initial salary is the baseline.

#### List

- One row per month, country and currency: total increases, decreases and net annual base pay change.
- Show currency switches separately without calculating growth across currencies.

#### Summaries

- Total increases, decreases and net annual base pay change for the selected period, by country and currency.

#### Filters

- Revision date range, country and department; apply together to the list and summaries.

### 4. Historical salary benchmarking

**Question:** How has typical pay changed, and which departments pay above or below their country's typical salary?

Reconstruct each employee's latest salary at month end; use the selected end date for the final partial month. Include employees active at that snapshot. Use country/department saved with the salary entry; intervening transfer dates are not recorded.

#### List

- One row per month, country, department and currency: headcount, total annual base pay, P10, median and P90.
- Country median, department median's percentage difference from it, and year-over-year median change; null when the prior-year group is absent.

#### Summaries

- For the final selected snapshot: matching headcount and total annual base pay by country/currency.

#### Filters

- Month range up to 15 years, country, department and salary currency; apply together.
- Country medians include all departments in the same country/currency. Department filtering preserves this reference; prior-year comparisons include the preceding year's data outside the selected range.

## Exclusions

- **Payroll, payments and taxes:** the goal is salary records and reporting, not paying people; payroll needs country-specific rules and integrations.
- **Bonuses and allowances:** annual base pay answers the brief's questions; variable pay needs its own rules and history.
- **Currency conversion:** exchange rates add a dated source of truth and hide real currency exposure; reports keep currencies separate instead.
- **Transfers between companies:** ACME is one organization; a move between countries is an edit, not a new employment.
- **Employee self-service and roles:** the only user is the HR manager; one authenticated HR role keeps access simple.
