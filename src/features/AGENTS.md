# Frontend guide: routes, features and shared client code

Read before changing `src/app/`, `src/features/`, `src/components/`, `src/hooks/`, `src/lib/` or `src/trpc/`. The root `AGENTS.md` rules apply as well.

## File structure

### `src/app` (routes)

```text
src/app/
├── layout.tsx                     # <html>, Inter via next/font/local, globals.css, <TRPCReactProvider>
├── globals.css                    # Tailwind v4 import + the single @theme token set (colors, radius, shadow, font)
├── fonts/                         # inter-latin.woff2 + Inter-LICENSE.txt
├── not-found.tsx                  # 404 via <EmptyState>
├── login/page.tsx                 # signed in → redirect('/employees'); else <LoginScreen demo={env demo credentials}>
├── (workspace)/
│   ├── layout.tsx                 # getSessionUser once → redirect('/login') if absent; <WorkspaceShell user>
│   ├── loading.tsx / error.tsx    # <LoadingState> / <ErrorState retry> for every workspace page
│   ├── employees/page.tsx                     # prefetch employees.list + lookups → <EmployeeDirectory> (create dialog)
│   ├── employees/[id]/page.tsx                # employees.get (404 → notFound()) + salaries.history + lookups → <EmployeeProfile> (edit/salary dialogs)
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
│   ├── employee-fields.tsx        # field group shared by create and edit forms
│   ├── employment-status-badge.tsx  # EmploymentStatus → <Badge> label/tone (only mapping)
│   ├── create-employee-form.tsx   # employees.create form (ID, details, initial pay + currency); onSaved/onCancel, no dialog code
│   ├── edit-employee-form.tsx     # employees.update form ({ id, ...changes }; submit disabled until a change); ID locked; set/clear last working day
│   ├── directory/
│   │   ├── employee-directory.tsx # title/action → filters → overview → table
│   │   ├── create-employee-dialog.tsx # <Dialog name="create"> around <CreateEmployeeForm>
│   │   ├── directory-filters.tsx  # search, country, department, status
│   │   ├── directory-overview.tsx # 2–4 measures from API data, never from the current page
│   │   ├── employee-table.tsx     # rows + <Pagination>
│   │   ├── directory-data.ts      # pure: employment mix shares, scope line, has-filters
│   │   └── search-params.ts       # directory input schema from EmployeeFilters + Paging, with .catch defaults
│   └── profile/
│       ├── employee-profile.tsx   # name/status/actions → details + current pay → history; saved notice
│       ├── edit-employee-dialog.tsx   # <Dialog name="edit"> around <EditEmployeeForm>
│       ├── change-salary-dialog.tsx   # <Dialog name="salary"> around salaries' <ChangeSalaryForm>
│       ├── employee-details.tsx   # details list
│       └── current-pay.tsx        # amount, currency, revision
├── salaries/
│   ├── use-salary-mutations.ts    # salaries.update + its invalidation
│   ├── change-salary-form.tsx     # current pay/revision, new amount/currency, reason, conflict reload; onSaved/onCancel, no dialog code
│   ├── salary-delta.ts            # pure: exact change and % vs current (via lib/money); null across currencies or for an invalid new amount
│   └── salary-history-table.tsx   # read-only paginated history (rendered by employees/profile)
└── reports/
    ├── report-page.tsx            # shell: header → filters → overview/trends → table; owns query + cursor wiring
    ├── report-filters.tsx         # country/department/currency/date/month controls, configured per report
    ├── country-totals.tsx         # by-country/currency summary groups used by all four reports
    ├── search-params.ts           # build a report's input from URL params + defaults(today)
    └── <report>/                  # salary-commitment | department-breakdown | salary-growth | historical-salary-benchmark
        ├── <report>-report.tsx    # composes <ReportPage> with this report's parts
        ├── <report>-summary.tsx   # overview measures for this report
        ├── <report>-table.tsx     # column definitions for <Table>
        ├── <report>-chart.tsx     # not for salary-commitment; renders a bounded contract field
        └── <report>-data.ts       # pure reshaping for summary/chart (only if there is logic) + unit test

src/components/
├── ui/                            # primitives, built before any feature screen
│   ├── button.tsx                 # variants: primary | secondary | ghost | danger; size; `pending`
│   ├── alert.tsx                  # info | success | error notices (role="alert" for errors, "status" otherwise)
│   ├── page-header.tsx            # title + optional back link + one primary action
│   ├── card.tsx                   # white data surface (no nesting)
│   ├── overview.tsx / stat.tsx    # overview block: scope line + 2–4 measures + optional visual slot
│   ├── table.tsx                  # Table/Head/Row/Cell, local horizontal scroller, numeric alignment, sticky first column
│   ├── pagination.tsx             # Previous/Next over opaque cursors + "x–y of total"
│   ├── empty-state.tsx / loading-state.tsx / error-state.tsx  # standard states (error has retry)
│   ├── form-field.tsx             # label + control slot + hint + error, wires aria-describedby
│   ├── input.tsx / select.tsx / textarea.tsx  # 38px controls; select takes `options`
│   ├── date-picker.tsx            # the one DayPicker + Radix popover (dates and months, clearable)
│   ├── dialog.tsx                 # the one modal: native <dialog> + showModal, focus trap/return, Esc and backdrop close; no close while `pending`
│   ├── amount.tsx                 # tabular right-aligned money with visible currency
│   ├── badge.tsx                  # neutral/semantic tones; no domain knowledge
│   ├── avatar.tsx                 # initials tile (account footer, directory rows); one tint, no decorative colors
│   ├── brand.tsx                  # ACME mark + wordmark linking to /employees (login, nav rail)
│   └── icon.tsx                   # 18px icon wrapper; the only icon-library import site
└── charts/                        # the only chart-library import site
    ├── bar-chart.tsx              # horizontal/vertical bars, negative values
    ├── line-chart.tsx             # lines with optional range band (P10–P90) and reference line
    └── chart-legend.tsx           # legend keyed to token colors

src/hooks/
├── use-url-state.ts               # useUrlState(schema): read/patch search params (the only history.replaceState); patching any key except `cursor`, `dialog`, `saved` drops `cursor`
├── use-dialog.ts                  # useDialog(): `?dialog=create|edit|salary` via useUrlState; open(name), close(saved?) sets `?saved=`
├── use-form.ts                    # values, `changes` vs initial, field errors, submit via onSubmit promise, toFieldErrors, focus first error, inputProps(name)
└── use-lookups.ts                 # lookups.get + countryName/departmentName/currencyName + select options

src/lib/
├── format.ts                      # formatMoney, formatCount, formatDate, formatMonth, formatPercent, formatInitials (the only Intl use)
├── money.ts                       # decimal string ↔ bigint minor units; compare/diff exactly on the units
├── dates.ts                       # todayUtc, month start/end, addMonths, monthsBetween (UTC)
├── search-params.ts               # parseSearchParams(schema, raw) used by pages and useUrlState; patchSearchParams (cursor rule)
├── mutation-errors.ts             # toFieldErrors(error) → { fields, message }
├── product-defaults.ts            # default report ranges (benchmark: 24 months ending this month) and form selections, from `today`
└── cn.ts                          # className merge

src/trpc/
├── query-client.ts                # makeQueryClient: the only QueryClient factory; defaults, dehydrate, global UNAUTHORIZED handler
├── client.tsx                     # client: TRPCReactProvider, useTRPC
├── server.tsx                     # server-only: options proxy, cached getQueryClient, prefetch, HydrateClient
└── router-types.ts                # RouterInputs / RouterOutputs (the only place they are derived)
```

## Frontend rules

**Boundaries** (import directions and library import sites are enforced by `eslint.config.mjs`)
- Cross-feature imports are for rendering only: `employees` → `salaries` (`<SalaryHistoryTable>`, `<ChangeSalaryForm>`) and `workspace` → `auth` (`<SignOutButton>`). Shared logic moves to `hooks`/`lib` instead.

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
- Every amount renders through `<Amount>` with its currency. Currencies are never summed or charted together.
- Every form is a modal: `<Dialog>` (`components/ui/dialog.tsx`) opened and closed only through `useDialog()` (`?dialog=`). Dialog files wrap a dialog-agnostic form (`onSaved`/`onCancel` props) and pass `pending` from `useIsMutating({ mutationKey })`. Never copy dialog plumbing (`showModal`, backdrop, focus, `replaceState`) anywhere else.

**URL state**
- All search-param state goes through `useUrlState(schema)`. No direct `URLSearchParams`, `router.replace` with hand-built strings, `history.replaceState` or `as` casts.
- URL schemas derive from contract inputs (`.pick()`, coercion, `.catch(default)`), so bad params fall back to defaults.
- Defaults (report ranges, form selections) come from `lib/product-defaults.ts` as functions of `today`. Never hardcode dates or codes in components.

**Forms and mutations** (one pattern for every form)
- `useForm({ initial, onSubmit })` + `<FormField>` + `inputProps(name)`. `onSubmit` returns `mutation.mutateAsync(...)`; `useForm` maps errors through `toFieldErrors`, keeps values and focuses the first error. Forms never write their own try/catch, `onError` or pending flags; pending is `mutation.isPending`.
- The edit form sends `{ id, ...changes }`: only fields that differ from `initial` (a cleared date is `null`). Its submit is disabled while `changes` is empty, so an empty patch is never sent.
- Each feature's `use-<feature>-mutations.ts` owns its mutations and invalidation by path key: employee writes invalidate `trpc.employees.pathKey()` and `trpc.reports.pathKey()`; salary writes also invalidate `trpc.salaries.pathKey()`. Never `invalidateQueries()` without a key.
- On success the dialog calls `close("created" | "details" | "salary")`: it closes and the page behind (directory for create, profile otherwise) shows one `<Alert tone="success">` from `?saved=`.
- Salary `CONFLICT`: keep form values, show the error with a reload action that refetches `employees.get` and adopts the new revision; the user resubmits.

```tsx
// hooks/use-form.ts
export function useForm<V extends Record<string, string>>(options: { // values are input strings; a cleared date "" is sent as null
  initial: V; onSubmit: (values: V, changes: Partial<V>) => Promise<unknown>;
}): { values: V; changes: Partial<V>; errors: Partial<Record<keyof V, string>>; message: string | null;
  inputProps: (name: keyof V & string) => InputProps; setValue: <K extends keyof V>(name: K, value: V[K]) => void;
  submit: (event: FormEvent) => void }; // preventDefault → onSubmit → on error: toFieldErrors, focus first error
// features/employees/edit-employee-form.tsx — knows nothing about dialogs
const form = useForm({ initial, onSubmit: async (_values, changes) => {
  await update.mutateAsync({ id, ...changes }); onSaved();
} });
<Button type="submit" pending={update.isPending} disabled={Object.keys(form.changes).length === 0}>Save</Button>
// features/employees/profile/edit-employee-dialog.tsx — the dialog wraps the form
const dialog = useDialog();
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
- Components contain JSX and event wiring only. Grouping, sorting, chart points and deltas live in tested `*-data.ts` (or `salary-delta.ts`) files beside them.
- Totals and counts come from the API. Never sum or count paginated rows on the client.
- Report screens differ only in summary, chart and table columns; URL parsing, query/cursor wiring and pagination live in `report-page.tsx` and are never rewritten per report.

```tsx
// features/reports/report-page.tsx — each <report>-report.tsx only fills these props
export function ReportPage<I extends Paging, O extends { rows: Page<unknown>; summary: unknown }>(props: {
  title: string;
  search: z.ZodType<I>;                     // from the report's search-params.ts, built with `today`
  filters: ReportFilterField[];             // controls <ReportFilters> shows, e.g. ["date_range", "country"]
  queryOptions: (input: I) => UseSuspenseQueryOptions<O>; // (i) => trpc.reports.salaryGrowth.queryOptions(i)
  summary: (output: O, input: I) => ReactNode;            // overview + chart
  table: (items: O["rows"]["items"]) => ReactNode;        // columns only; <Pagination> belongs to the shell
}): ReactNode;
```
