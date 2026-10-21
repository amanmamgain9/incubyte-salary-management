"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { signInWithEmail, type Credentials } from "@/features/auth/auth-client";
import { useForm } from "@/hooks/use-form";

export function LoginForm({ email }: { email: string }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const signIn = useMutation({ mutationFn: (credentials: Credentials) => signInWithEmail(credentials) });
  const form = useForm({
    initial: { email, password: "" },
    onSubmit: async (values) => {
      await signIn.mutateAsync(values);
      router.replace("/employees");
    },
  });

  return (
    <form onSubmit={form.submit}>
      {form.message ? <Alert tone="error">{form.message}</Alert> : null}
      <div className="mb-4.5">
        <FormField label="Email" error={form.errors.email}>
          <Input {...form.inputProps("email")} type="email" autoComplete="username" required />
        </FormField>
      </div>
      <div className="mb-4.5">
        <FormField label="Password" error={form.errors.password}>
          <Input
            {...form.inputProps("password")}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-pressed={showPassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="cursor-pointer p-0.75 text-label text-muted hover:text-ink"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            }
          />
        </FormField>
      </div>
      <Button type="submit" block pending={signIn.isPending}>
        Sign in
      </Button>
    </form>
  );
}
