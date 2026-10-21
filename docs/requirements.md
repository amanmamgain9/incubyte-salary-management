# Requirements

**User:** ACME’s HR manager, managing salary records for 10,000 employees across countries.

**Goal:** Maintain accurate salary records and answer questions about annual pay and its history.

## Access

HR users sign in with email/password and can use everything; revisions identify the signed-in user. See [login and security](login.md).

## Data operations

### Find and view employees

- One search box (full/partial name or employee ID); department, country and status filters; paginated results.
- A record shows ID, name, department, work country, joining/leaving dates, status, annual base pay, currency and salary history.

### Maintain employee records

- Register joiners with details and initial salary.
- Edit name, department, work country and employment dates; status derives from dates. Country and salary currency are independent.
- Employee IDs are fixed, unique and never reused.
- Record the last working day; departed employees stay searchable.

### Maintain salaries

- Change active and upcoming employees' annual base pay and currency, effective immediately: positive, at most two decimals, no conversion.
- History is read-only and keeps the initial salary and every revision, also after departure: amount, currency, country and department at change, HR user, time and reason.
- Salary and history save together or not at all; a failed save shows its errors and keeps entered values.

## Reporting

Reports group by work country, never mix currencies, apply filters together, summarise every matching employee (not the page) and reflect saves immediately. Calculations: [tRPC contracts](trpc-contracts.md#reports).

### 1. Salary commitment

**Question:** What is our annual base salary commitment for current employees in each country?

- **List:** per country and currency, employees active today (joining date through last working day) and a full year at current salaries, not prorated.
- **Summaries:** active employees, in total and by country; number of currencies.
- **Filters:** country, department, currency.

### 2. Department breakdown

**Question:** How is each country's annual base salary commitment distributed across departments?

- **List:** per country, department and currency, employees active today: headcount, total and average pay.
- **Summaries:** headcount; total and average pay by country and currency.
- **Filters:** country, department, currency.

### 3. Salary growth by country

**Question:** How much have salary revisions increased or decreased annual base pay in each country over time?

- **List:** per month, country and currency: increases, decreases and net change of the period's revisions against each preceding entry (initial salaries are baselines; no joining/departure effects), with currency switches counted apart. Includes later leavers; uses country/department at each revision.
- **Summaries:** period totals by country and currency.
- **Filters:** revision date range, country, department.

### 4. Historical salary benchmarking

**Question:** How has typical pay changed, and which departments pay above or below their country's typical salary?

- **List:** per month-end snapshot (end date for a partial month), country, department and currency, employees active then at their latest salary and its saved country/department: headcount, total, P10, median, P90, country median (all departments, whatever the filter), gap to it and year-over-year change.
- **Summaries:** headcount and total by country and currency at the final snapshot.
- **Filters:** month range up to 15 years, country, department, currency.

## Exclusions

- **Payroll, payments and taxes:** the goal is records and reporting; payroll needs country-specific rules and integrations.
- **Bonuses and allowances:** base pay answers the brief; variable pay needs its own rules and history.
- **Currency conversion:** rates add a dated source of truth and hide real currency exposure.
- **Transfers between companies:** ACME is one organization; a country move is an edit.
- **Self-service and roles:** the only user is the HR manager; one HR role keeps access simple.
