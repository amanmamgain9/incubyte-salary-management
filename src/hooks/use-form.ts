"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { toFieldErrors } from "@/lib/mutation-errors";

type FormValues = Record<string, string>;

type FieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export type InputProps = {
  name: string;
  value: string;
  onChange: (event: ChangeEvent<FieldElement>) => void;
};

/**
 * The one form pattern: controlled values, `changes` against `initial`, submit through a promise
 * (`mutation.mutateAsync`), and on failure field errors beside their inputs, a form message and focus on the
 * first invalid field. Values are kept on error. Forms never write their own try/catch or pending flags.
 */
export function useForm<V extends FormValues>(options: {
  initial: V;
  onSubmit: (values: V, changes: Partial<V>) => Promise<unknown>;
}) {
  const { initial, onSubmit } = options;
  const [values, setValues] = useState<V>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof V, string>>>({});
  const [message, setMessage] = useState<string | null>(null);

  const changes: Partial<V> = {};
  for (const name of Object.keys(initial) as Array<keyof V>) {
    if (values[name] !== initial[name]) changes[name] = values[name];
  }

  function setValue<K extends keyof V>(name: K, value: V[K]) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function inputProps(name: keyof V & string): InputProps {
    return { name, value: values[name] ?? "", onChange: (event) => setValue(name, event.target.value as V[typeof name]) };
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
        const control = first ? form.elements.namedItem(first) : null;
        if (control instanceof HTMLElement) control.focus();
      });
  }

  return { values, changes, errors, message, inputProps, setValue, submit };
}
