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
    email: String                    // unique
    password_hash: String
}
```

Login uses email/password. All HR users have equal access; salary revisions identify the signed-in user.

## Storage rules

- Country/currency codes and department IDs reference their lookup records; retain referenced records.
- Employee IDs remain unique and cannot be reused; records are retained after departure.
- Store the initial salary and each revision as separate snapshots; history cannot be edited or deleted.
- Each employee's revision numbers are unique and increasing; the preceding entry supplies the previous salary.
- Store money exactly to two decimal places; keep country and currency independent.
- Write current salary and its history in one transaction; a failure saves neither.
