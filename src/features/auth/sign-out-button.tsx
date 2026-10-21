"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import { signOut } from "@/features/auth/auth-client";

/** Revokes the session, drops every cached query and returns to the login page. */
export function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: () => {
      queryClient.clear();
      router.replace("/login");
    },
  });
  return (
    <button
      type="button"
      aria-label="Sign out"
      title="Sign out"
      disabled={signOutMutation.isPending}
      onClick={() => signOutMutation.mutate()}
      className="ml-auto cursor-pointer p-1.25 text-muted hover:text-accent disabled:opacity-40"
    >
      <Icon name={signOutMutation.isPending ? "spinner" : "sign-out"} />
    </button>
  );
}
