# Frontend guide: routes, features and shared client code

Read before changing `src/app/`, `src/features/`, `src/components/`, `src/hooks/`, `src/lib/` or `src/trpc/`. The root `AGENTS.md` rules apply as well.

## File structure

### `src/app` (routes)

```text
src/app/
├── layout.tsx                     # <html>, Inter via next/font/local, globals.css, <TRPCReactProvider>
├── globals.css                    # Tailwind v4 import + the single @theme token set (colors, radius, shadow, font)
├── fonts/                         # inter-latin.woff2 + Inter-LICENSE.txt
├── not-found.tsx                  # 404 via <EmptyState> (inside the workspace shell for a missing record)
├── login/page.tsx                 # signed in → redirect('/employees'); else <LoginScreen demo={env demo credentials}>
├── (workspace)/
│   ├── layout.tsx                 # getSessionUser once → redirect('/login') if absent; <WorkspaceShell user>
│   ├── loading.tsx / error.tsx    # <LoadingState> / <ErrorState retry> for every workspace page; a rejected page cursor (isInvalidCursor) drops `?cursor=` via useUrlState and reloads the first page
│   ├── employees/page.tsx                     # prefetch employees.list + lookups → <EmployeeDirectory> (create dialog)
│   ├── employees/[id]/page.tsx                # prefetchOrNotFound(employees.get) (malformed or unknown ID → 404) + salaries.history + lookups → <EmployeeProfile> (edit/salary dialogs)
│   └── reports/<report>/page.tsx              # one per report folder name; prefetch report + lookups → <…Report>
└── api/
    ├── trpc/[trpc]/route.ts       # fetchRequestHandler(appRouter, createContext); Cache-Control: no-store
    └── auth/[...all]/route.ts     # Better Auth handler (login/logout/session)
```

### `src/features`, `src/components`, `src/hooks`, `src/lib`, `src/trpc` (frontend)

```text
src/features/
├── auth/
│   ├── auth-client.ts             # Better Auth React client (only auth uses it)
│   ├── login-screen.tsx           # centered brand panel + demo credentials + <LoginForm>
│   ├── login-form.tsx             # client: email/password, show password, inline error
│   └── sign-out-button.tsx        # client: signOut → queryClient.clear() → /login
├── workspace/
│   ├── workspace-shell.tsx        # nav rail + content column
│   ├── nav-items.ts               # ordered links: Employees + 4 reports, with icon names; a link is added with its route
│   ├── mobile-nav.tsx             # client: labelled collapsible menu
│   └── account-footer.tsx         # signed-in user + <SignOutButton>
├── employees/
│   ├── use-employee-mutations.ts  # employees.create/update + their invalidation
│   ├── use-employee-dialog.ts     # the employee dialog names (create, edit, salary) and saved notices → useEmployeeDialog()
│   ├── employee-fields.tsx        # field group shared by create and edit forms
│   ├── employment-status-badge.tsx  # EmploymentStatus → <Badge> label/tone (only mapping)
│   ├── saved-alert.tsx            # `?saved=` → one success <Alert> (directory and profile)
│   ├── create-employee-form.tsx   # employees.create form (ID, details, initial pay + currency); onSaved/onCancel, no dialog code
│   ├── edit-employee-form.tsx     # employees.update form ({ id, ...changes }; submit disabled until a change); ID locked; set/clear last working day
│   ├── details-patch.ts           # pure: employee → edit form values; changes → DetailsPatch (cleared date → null)
│   ├── directory/
│   │   ├── employee-directory.tsx # title/action → filters → overview → table
│   │   ├── create-employee-dialog.tsx # `?dialog=create` <Dialog> around <CreateEmployeeForm>
│   │   ├── directory-filters.tsx  # search, country, department, status
│   │   ├── directory-overview.tsx # 2–4 measures from API data, never from the current page
│   │   ├── employee-table.tsx     # rows + <Pagination>
│   │   ├── directory-data.ts      # pure: employment mix shares, scope line, has-filters
│   │   └── search-params.ts       # directory input schema from EmployeeFilters + Paging, with .catch defaults
│   └── profile/
│       ├── employee-profile.tsx   # name/status/actions → details + current pay → history; saved notice
│       ├── edit-employee-dialog.tsx   # `?dialog=edit` <Dialog> around <EditEmployeeForm>
│       ├── change-salary-dialog.tsx   # `?dialog=salary` <Dialog> around salaries' <ChangeSalaryForm>
│       ├── employee-details.tsx   # details list
│       ├── current-pay.tsx        # amount, currency, revision
│       └── search-params.ts       # profile URL (history cursor) → salaries.history input
├── salaries/
│   ├── use-salary-mutations.ts    # salaries.update + its invalidation
│   ├── change-salary-form.tsx     # current pay/revision, new amount/currency, reason, conflict reload; onSaved/onCancel, no dialog code
│   ├── salary-delta.ts            # pure: exact change and % vs current (via lib/money); null across currencies or for an invalid new amount; salaryDeltaNote for the form
│   └── salary-history-table.tsx   # read-only paginated history (rendered by employees/profile)
└── reports/
    ├── report-page.tsx            # shell: header → filters → overview/trends → table; owns query + cursor wiring and the one useLookups call
    ├── report-filters.tsx         # country/department/currency selects + period DatePicker/MonthPicker, configured per report; Apply checks the period, Reset → defaults
    ├── country-totals.tsx         # by-country/currency summary group strip (department, growth, benchmark); commitment's rows are its groups
    ├── report-scope.ts            # pure: overview scope line from the filters ("All countries · …")
    ├── search-params.ts           # mechanism: filter params defined once (`filterParams` code filters + `from`/`to` → FilterParam, clearedFilters, appliedFilters; period reports `.pick`/`.extend` them), reportFilterSearch (commitment, department), trailingMonths, periodErrors/validPeriod (the caller's period contract + `periodEndError`), filter form → patch; never imports a specific report
    └── <report>/                  # salary-commitment | department-breakdown | salary-growth | historical-salary-benchmark
        ├── <report>-report.tsx    # composes <ReportPage> with this report's parts
        ├── <report>-summary.tsx   # overview measures for this report
        ├── <report>-table.tsx     # column definitions for <Table>
        ├── <report>-chart.tsx     # not for salary-commitment; renders a bounded contract field
        ├── <report>-data.ts       # pure reshaping for summary/chart (only if there is logic) + unit test
        └── search-params.ts       # salary-growth and historical-salary-benchmark only: default period (from `today`) + URL schema, validated with its own contract

src/components/
├── ui/                            # primitives, built before any feature screen
│   ├── button.tsx                 # variants: primary | secondary | ghost | danger; size; `pending`
│   ├── alert.tsx                  # info | success | error notices (role="alert" for errors, "status" otherwise)
│   ├── page-header.tsx            # title + optional back link, leading avatar and meta line + actions (one primary)
│   ├── card.tsx                   # white data surface (no nesting) + CardHeader title row + padded CardBody (charts)
│   ├── overview.tsx / stat.tsx    # overview block: scope line + 2–4 measures + optional visual slot with its caption
│   ├── table.tsx                  # Table/Head/Row/Cell, local horizontal scroller, numeric alignment; `wide`: min width + sticky first column
│   ├── pagination.tsx             # Previous/Next over opaque cursors + "x–y of total"
│   ├── deferred-content.tsx       # dims (aria-busy) results kept on screen while the deferred next result loads
│   ├── empty-state.tsx / loading-state.tsx / error-state.tsx  # standard states (error has retry)
│   ├── form-field.tsx             # label + control slot + hint + error, wires id, label id and aria-describedby (`wide` spans both columns); FormSection/FormGrid/FormActions layout
│   ├── input.tsx / select.tsx / textarea.tsx  # 38px controls; select takes `options`
│   ├── date-picker.tsx            # <DatePicker>: the one date field (DayPicker calendar, month/year dropdowns, min/max, clearable); the only calendar-library import site
│   ├── date-picker-data.ts        # pure: the calendar's navigable range and opening day
│   ├── picker-popover.tsx         # the picker field shell: control-styled trigger named "label + value", hidden input for FormData, clear button, popover (not portalled, works in <Dialog>); the only popover-library import site
│   ├── month-picker.tsx           # <MonthPicker>: the one month field (a year of months, previous/next year, min/max, arrow/PageUp/PageDown/Home/End keys); values are first days `YYYY-MM-01`
│   ├── month-picker-data.ts       # pure: month cells (disabled/selected/this month), opening month, key moves within bounds
│   ├── dialog.tsx                 # the one modal: native <dialog> + showModal, focus trap/return, Esc and backdrop close; no close while `pending`
│   ├── amount.tsx                 # tabular right-aligned money with visible currency
│   ├── country-label.tsx          # country code marker + name (table cells)
│   ├── badge.tsx                  # neutral/semantic tones; no domain knowledge
│   ├── caption.tsx                # muted secondary line (ID, timestamp, revision, group detail); `under` spaces it below a primary line
│   ├── avatar.tsx                 # initials tile (account footer, directory rows, profile `lg`); one tint, no decorative colors
│   ├── brand.tsx                  # ACME mark + wordmark; a link only on signed-in pages (a prefetched link on /login caches its redirect)
│   └── icon.tsx                   # 18px icon wrapper; the only icon-library import site
└── charts/                        # the only chart-library import site
    ├── chart-tones.ts             # token color references (`var(--color-…)`) and axis/grid strokes for every chart
    ├── mini-bars.tsx              # the overview's small bar visual (plain elements, no library)
    ├── bar-chart.tsx              # horizontal/vertical bars, negative values
    ├── line-chart.tsx             # lines with optional range band (P10–P90) and dashed reference line; `compact` for the overview
    └── chart-legend.tsx           # legend keyed to token colors

src/hooks/
├── use-url-state.ts               # useUrlState(schema, keepsCursor?): read/patch search params (the only history.replaceState); patching any key except `cursor` and the caller's `keepsCursor` drops `cursor`
├── use-dialog.ts                  # dialogParams(dialogs, notices) → URL schema; useDialog(schema): `?dialog=` via useUrlState (`dialog`/`saved` keep the cursor), open(name), close(saved?) sets `?saved=`; names belong to the feature
├── use-form.ts                    # values, `changes` vs the baseline (`initial` at mount; `outdated` when `initial` moves, `reset()` adopts it), field errors, submit via onSubmit promise, toFieldErrors, focus first error, inputProps(name) for inputs/selects, valueProps(name) for pickers
├── form-diff.ts                   # pure, used only by use-form: a form's changes vs its baseline, and `outdated` when the latest record differs
└── use-lookups.ts                 # lookups.get → LookupNames (countryName/departmentName) + LookupOptions (select options); called once per screen, passed down as `names`/`options`

src/lib/
├── format.ts                      # formatMoney, formatCompact (exact, overview figures), formatCount, formatDate, formatTimestamp, formatMonth, formatPercent, formatInitials (the only Intl use)
├── money.ts                       # decimal string ↔ bigint minor units; divideRounded (half away from zero); compare/diff exactly on the units; toChartNumber (chart positions only)
├── dates.ts                       # todayUtc, addDays, daysBetween, addMonths, month start/end, monthsBetween (UTC)
├── search-params.ts               # parseSearchParams(schema, raw) used by pages and useUrlState; patchSearchParams (cursor rule; the caller names the params that keep it)
├── mutation-errors.ts             # toFieldErrors(error) → { fields, message }; isConflict(error)
└── cn.ts                          # className merge

src/trpc/
├── query-client.ts                # makeQueryClient: the only QueryClient factory; defaults (no retries for SSR clients), global UNAUTHORIZED handler; isInvalidCursor
├── client.tsx                     # client: TRPCReactProvider, useTRPC
└── server.tsx                     # server-only: options proxy, cached getQueryClient, prefetch, prefetchOrNotFound, HydrateClient
```

## Frontend rules

**Boundaries** (import directions and library import sites are enforced by `eslint.config.mjs`)
- Cross-feature imports are for rendering only: `employees` → `salaries` (`<SalaryHistoryTable>`, `<ChangeSalaryForm>`) and `workspace` → `auth` (`<SignOutButton>`). Shared logic moves to `hooks`/`lib` instead, as a mechanism the feature configures: names and defaults stay in the feature (`useEmployeeDialog` over `useDialog`, a report's period in its `search-params.ts`).

**App Router and data**
- **`src/app` is routing only:** page/layout/loading/error/not-found/route. A page parses params, prefetches and renders one feature component.
- `(workspace)/layout.tsx` and `login/page.tsx` are the only callers of `getSessionUser`. The layout redirect is UX only; procedures are the security boundary.
- Server pages: `await props.searchParams` (`PageProps<'/route'>`), build the input with the feature's `search-params.ts`, `prefetch(trpc.x.queryOptions(input))`, render `<HydrateClient><Feature /></HydrateClient>`. Prefetch every query the client tree suspends on: SSR never calls `/api/trpc`.
- The client component builds its query input with the same `search-params.ts` function and the same `today` (passed from the page as a prop), so it hits the prefetched cache.
- Data-reading components use `useSuspenseQuery(trpc.x.queryOptions(input))`, with the URL input passed through `useDeferredValue` so a filter or page change keeps the current results (dimmed) instead of the route's loading state. `"use client"` goes on the component that needs hooks; keep its children presentational.
- Every route renders real content; no redirect-only or placeholder pages (redirects go in `next.config.ts`).
- UNAUTHORIZED is handled once in `trpc/query-client.ts` (clear cache, refresh the route so the workspace layout redirects to `/login`); pages and components never check for it.

**UI and styling**
- Build screens from `src/components/ui`. Never paste Tailwind class strings for buttons, alerts, headers, cards, tables or fields; add a variant instead.
- Colors, radii and shadows come only from `@theme` tokens in `src/app/globals.css`, ported once from `docs/screens/styles.input.css`. No hex/rgb/hsl values or arbitrary color classes (`bg-[#…]`) in components.
- Every date goes through `<DatePicker>` and every month through `<MonthPicker>` (`components/ui`): controlled with ISO strings (a month is its first day, `YYYY-MM-01`), `min`/`max` for bounds, `clearable` for optional dates. No native date/month inputs and no other date library. In a `useForm` form spread `valueProps(name)`; in a form read with FormData (report filters) hold the value in state and pass `name`, which submits it through a hidden input.
- Every amount renders through `<Amount>` with its currency. Currencies are never summed or charted together.
- Every form is a modal: `<Dialog>` (`components/ui/dialog.tsx`) opened and closed only through `useDialog` (`?dialog=`), wrapped per feature with its own names (`useEmployeeDialog`). Dialog files wrap a dialog-agnostic form (`onSaved`/`onCancel` props) and pass `pending` from `useIsMutating({ mutationKey })`. Never copy dialog plumbing (`showModal`, backdrop, focus, `replaceState`) anywhere else.

**URL state**
- Intentional: filters, pages and dialogs replace the current history entry (`replaceState`), so links and reloads keep the state but Back leaves the page instead of stepping through filter, page or dialog changes.
- All search-param state goes through `useUrlState(schema)`. No direct `URLSearchParams`, `router.replace` with hand-built strings, `history.replaceState` or `as` casts.
- URL schemas derive from contract inputs (`.pick()`, coercion, `.catch(default)`), so bad params fall back to defaults.
- Defaults are functions of `today` owned by the feature that uses them (a report's period: its own `search-params.ts`). Never hardcode dates or codes in components.

**Forms and mutations** (one pattern for every form)
- `useForm({ initial, onSubmit })` + `<FormField>` + `inputProps(name)`. `onSubmit` returns `mutation.mutateAsync(...)`; `useForm` maps errors through `toFieldErrors`, keeps values and focuses the first error. Forms never write their own try/catch, `onError` or pending flags; pending is `mutation.isPending`.
- The edit form sends `{ id, ...changes }`: only fields that differ from the baseline, the `initial` captured when the form mounted (a cleared date is `null`). A refetched `initial` never re-baselines silently: it sets `outdated` (the form shows a notice) and only `reset()` adopts it. Its submit is disabled while `changes` is empty, so an empty patch is never sent.
- Each feature's `use-<feature>-mutations.ts` owns its mutations and invalidation by path key: employee writes invalidate `trpc.employees.pathKey()` and `trpc.reports.pathKey()`; salary writes also invalidate `trpc.salaries.pathKey()`. `onSuccess` returns the invalidation promise, so `mutateAsync` resolves once the page behind is fresh. Never `invalidateQueries()` without a key.
- On success the dialog calls `close("created" | "details" | "salary")`: it closes and the page behind (directory for create, profile otherwise) shows one `<Alert tone="success">` from `?saved=`.
- Salary `CONFLICT` (`isConflict(update.error)`): keep form values, show the error with a reload action that refetches `employees.get` and adopts the new revision (`update.reset()` clears the error); the user resubmits.

```tsx
// hooks/use-form.ts
export function useForm<V extends Record<string, string>>(options: { // values are input strings; a cleared date "" is sent as null
  initial: V; onSubmit: (values: V, changes: Partial<V>) => Promise<unknown>;
}): { values: V; changes: Partial<V>; outdated: boolean; errors: Partial<Record<keyof V, string>>; message: string | null;
  inputProps: (name: keyof V & string) => InputProps; valueProps: (name: keyof V & string) => ValueProps; setValue: <K extends keyof V>(name: K, value: V[K]) => void;
  reset: () => void; submit: (event: FormEvent) => void }; // preventDefault → onSubmit → on error: toFieldErrors, focus first error
// features/employees/edit-employee-form.tsx — knows nothing about dialogs
const form = useForm({ initial, onSubmit: async (_values, changes) => {
  await update.mutateAsync({ id, ...changes }); onSaved();
} });
<Button type="submit" pending={update.isPending} disabled={Object.keys(form.changes).length === 0}>Save</Button>
// features/employees/profile/edit-employee-dialog.tsx — the dialog wraps the form
const dialog = useEmployeeDialog();
const pending = useIsMutating({ mutationKey: trpc.employees.update.mutationKey() }) > 0;
<Dialog open={dialog.current === "edit"} title="Edit details" pending={pending} onClose={() => dialog.close()}>
  <EditEmployeeForm employee={employee} onSaved={() => dialog.close("details")} onCancel={() => dialog.close()} />
</Dialog>
```

```ts
// features/salaries/use-salary-mutations.ts — invalidation keys are explicit, per mutation
export function useSalaryMutations() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidate = () => Promise.all(
    [trpc.employees.pathKey(), trpc.salaries.pathKey(), trpc.reports.pathKey()]
      .map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
  return { update: useMutation(trpc.salaries.update.mutationOptions({ onSuccess: invalidate })) };
}
```

**Components render; data files shape**
- Screens fetch; display components receive data as props. A screen (page-level feature component, `<ReportPage>`, or a self-paging panel such as `<SalaryHistoryTable>`) reads its queries and `useLookups()` once and passes `names`/`options` down; tables, summaries, charts, details and form fields never call a data hook.
- Components contain JSX and event wiring only. Grouping, sorting, chart points and deltas live in tested `*-data.ts` (or `salary-delta.ts`) files beside them.
- Totals and counts come from the API. Never sum or count paginated rows on the client.
- Report screens differ only in summary, chart and table columns; URL parsing, query/cursor wiring and pagination live in `report-page.tsx` and are never rewritten per report.

```tsx
// features/reports/report-page.tsx — each <report>-report.tsx only fills these props
export function ReportPage<I extends Paging & FilterValues, O extends { rows: Page<unknown>; summary: unknown }, E, K extends QueryKey>(props: {
  title: string;
  today: string;                            // from the page, like every `today`
  search: z.ZodType<I, ReportParams>;       // from the report's search-params.ts, built with `today` (useMemo it)
  filters: readonly ReportFilterField[];    // controls <ReportFilters> shows, e.g. ["dates", "country"]
  period?: PeriodContract;                  // with "dates"/"months": the report's input contract, e.g. SalaryGrowthInput
  queryOptions: (input: I) => UseSuspenseQueryOptions<O, E, O, K>; // (i) => trpc.reports.salaryGrowth.queryOptions(i)
  summary: (output: O, input: I, names: LookupNames) => ReactNode;            // overview + group totals + chart
  table: (items: O["rows"]["items"], input: I, names: LookupNames) => ReactNode; // columns only; <Pagination> and the empty state belong to the shell
}): ReactNode;
```
