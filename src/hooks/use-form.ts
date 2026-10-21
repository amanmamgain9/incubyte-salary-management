"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { formDiff } from "@/hooks/form-diff";
import { toFieldErrors } from "@/lib/mutation-errors";

type FormValues = Record<string, string>;

type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export type ValueProps = { name: string; value: string; onChange: (value: string) => void };

export type InputProps = {
  name: string;
  value: string;
  onChange: (event: ChangeEvent<FieldElement>) => void;
};

/**
 * The one form pattern: controlled values, `changes` against the baseline, submit through a promise
 * (`mutation.mutateAsync`), and on failure field errors beside their inputs, a form message and focus on the
 * first invalid field. Values are kept on error. Forms never write their own try/catch or pending flags.
 *
 * The baseline is `initial` as it was when the form mounted: a later `initial` (e.g. the record refetched while
 * editing) never becomes the baseline by itself, so untouched fields are never sent. It only sets `outdated`;
 * `reset()` adopts the latest `initial` as the new baseline and values, on the user's request.
 */
export function useForm<V extends FormValues>(options: {
  initial: V;
  onSubmit: (values: V, changes: Partial<V>) => Promise<unknown>;
}) {
  const { initial, onSubmit } = options;
  const [form, setForm] = useState({ baseline: initial, values: initial });
  const [errors, setErrors] = useState<Partial<Record<keyof V, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const { values } = form;
  const { changes, outdated } = formDiff(form, initial);

  function setValue<K extends keyof V>(name: K, value: V[K]) {
    setForm((current) => ({ ...current, values: { ...current.values, [name]: value } }));
  }

  function reset() {
    setForm({ baseline: initial, values: initial });
    setErrors({});
    setMessage(null);
  }

  function inputProps(name: keyof V & string): InputProps {
    return { name, value: values[name] ?? "", onChange: (event) => setValue(name, event.target.value as V[typeof name]) };
  }

  /** Props for a control that reports its value directly (`<DatePicker>`, `<MonthPicker>`) instead of an event. */
  function valueProps(name: keyof V & string): ValueProps {
    return { name, value: values[name] ?? "", onChange: (value) => setValue(name, value as V[typeof name]) };
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setErrors({});
    setMessage(null);
    void Promise.resolve()
      .then(() => onSubmit(values, changes))
      .catch((error: unknown) => {
        const result = toFieldErrors(error, Object.keys(initial));
        setErrors(result.fields as Partial<Record<keyof V, string>>);
        setMessage(result.message);
        const [first] = Object.keys(result.fields);
        // The first visible control of that name: a picker also submits its value through a hidden input.
        const control = first ? form.querySelector(`[name="${CSS.escape(first)}"]:not([type="hidden"])`) : null;
        if (control instanceof HTMLElement) control.focus();
      });
  }

  return { values, changes, outdated, errors, message, inputProps, valueProps, setValue, reset, submit };
}
