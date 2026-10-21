# Data model draft

`?` means nullable. `Decimal` is exact money with two decimal places. Dates are calendar dates; timestamps are UTC.

## Employee

```text
struct Employee {
    id: String                       // permanent employee ID
    name: String
    department_id: String             // Department.id
    work_country_code: String         // Country.code
    joining_date: Date
    last_working_day: Date?
    annual_base_pay: Decimal          // current salary
    salary_currency_code: String      // Currency.code
}
```

Employment status is derived from joining date and last working day. Work country and salary currency are independent.

## Country

```text
struct Country {
    code: String                     // unique, e.g. IN
    name: String
}
```

## Currency

```text
struct Currency {
    code: String                     // unique, e.g. INR
    name: String
}
```

## Department

```text
struct Department {
    id: String
    name: String
}
```

## Salary history

```text
struct SalaryHistoryEntry {
    id: String
    employee_id: String               // Employee.id
    revision: Integer                 // increasing per employee
    annual_base_pay: Decimal
    currency_code: String             // Currency.code
    work_country_code_at_change: String // Country.code
    department_id_at_change: String   // Department.id
    changed_by: String                // HrUser.id
    changed_at: Timestamp
    reason: String
}
```

## HR user

```text
struct HrUser {
    id: String
    name: String
    email: String                    // unique, case-insensitive
    password_hash: String
}
```

Unique index on `lower(HrUser.email)`.

## Login session

```text
struct HrSession {
    token_hash: String               // primary key
    hr_user_id: String               // HrUser.id
    expires_at: Timestamp
}
```

`token_hash` is the primary key; `hr_user_id` references `HrUser.id` with `ON DELETE RESTRICT`. Index `expires_at` for cleanup.

Behavior and security: [Login](login.md).

## Database constraints

- Primary keys: each `id`; country/currency `code`.
- Fields are `NOT NULL` unless marked `?`.
- Struct references are foreign keys with `ON DELETE RESTRICT`.
- Unique `(employee_id, revision)`; positive revision numbers.
- Salary amounts: `NUMERIC(18,2)`, positive and finite.

## Indexes

[Primary and unique keys create their own indexes](https://www.postgresql.org/docs/current/ddl-constraints.html). Add:

| Record | Index | Purpose |
| --- | --- | --- |
| Employee | `(work_country_code, id)`, `(department_id, id)` | Filtered pagination |
| SalaryHistoryEntry | `(changed_at, employee_id)` | Period-based growth reports |

The unique `(employee_id, revision)` index also supports ordered salary history. Measure name search before adding further indexes.

## Storage rules

- Employee IDs remain unique and cannot be reused; records are retained after departure.
- Store the initial salary and each revision as separate snapshots; history cannot be edited or deleted.
- Order history by revision; the preceding entry supplies the previous salary.
- Lock the employee and check the expected revision before assigning the next revision.
- Create employees with initial history, and update current salary with new history, in one transaction; a failure saves neither.
- The application database role can only read/insert salary history; migrations use a separate owner role.
