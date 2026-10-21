import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginScreen } from "@/features/auth/login-screen";
import { getSessionUser } from "@/server/auth/session";
import { getEnv } from "@/server/env";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getSessionUser(await headers())) redirect("/employees");
  const { DEMO_HR_EMAIL, DEMO_HR_PASSWORD } = getEnv();
  return <LoginScreen demo={{ email: DEMO_HR_EMAIL, password: DEMO_HR_PASSWORD }} />;
}
