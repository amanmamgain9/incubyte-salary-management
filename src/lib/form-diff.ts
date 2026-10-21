type FormValues = Record<string, string>;

/** What a form has changed against the values it opened with, and whether the record has moved on since. */
export type FormDiff<V extends FormValues> = { changes: Partial<V>; outdated: boolean };

/**
 * Compares a form's values with its `baseline` (the values it opened with), never with the latest record, so a
 * refetch while editing cannot turn untouched fields into changes. `outdated`: `latest` differs from the baseline.
 */
export function formDiff<V extends FormValues>(_state: { baseline: V; values: V }, _latest: V): FormDiff<V> {
  throw new Error("not implemented");
}
