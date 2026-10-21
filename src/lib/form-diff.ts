type FormValues = Record<string, string>;

/** What a form has changed against the values it opened with, and whether the record has moved on since. */
export type FormDiff<V extends FormValues> = { changes: Partial<V>; outdated: boolean };

/**
 * Compares a form's values with its `baseline` (the values it opened with), never with the latest record, so a
 * refetch while editing cannot turn untouched fields into changes. `outdated`: `latest` holds a value that is
 * neither the baseline nor the form's own value (a field that already matches, e.g. after this form's save, is not).
 */
export function formDiff<V extends FormValues>(state: { baseline: V; values: V }, latest: V): FormDiff<V> {
  const { baseline, values } = state;
  const changes: Partial<V> = {};
  let outdated = false;
  for (const name of Object.keys(baseline) as Array<keyof V>) {
    if (values[name] !== baseline[name]) changes[name] = values[name];
    if (latest[name] !== baseline[name] && latest[name] !== values[name]) outdated = true;
  }
  return { changes, outdated };
}
