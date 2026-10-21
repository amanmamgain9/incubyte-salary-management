import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { WorkspaceShell } from "@/features/workspace/workspace-shell";
import { getSessionUser } from "@/server/auth/session";

// The session is read once here for every workspace page. The redirect is UX only; procedures enforce auth.
export default async function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getSessionUser(await headers());
  if (!user) redirect("/login");
  return <WorkspaceShell user={user}>{children}</WorkspaceShell>;
}
