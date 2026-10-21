import { Brand } from "@/components/ui/brand";
import { LoginForm } from "@/features/auth/login-form";

/** Centered sign-in panel: brand, form and the seeded demo account's credentials (docs/login.md). */
export function LoginScreen({ demo }: { demo: { email: string; password: string } }) {
  return (
    <main id="main" className="grid min-h-screen place-items-center px-5 py-8">
      <div className="w-full max-w-100 rounded-panel border border-line bg-surface p-7.5 shadow-panel">
        <div className="mb-8">
          <Brand />
        </div>
        <h1 className="mb-6 text-title">Sign in</h1>
        <LoginForm email={demo.email} />
        <section aria-labelledby="demo-title" className="mt-6 border-t border-line pt-5">
          <h2 id="demo-title" className="text-label font-medium text-muted">
            Demo account
          </h2>
          <dl className="mt-3 grid grid-cols-[75px_1fr] gap-2 text-label">
            <dt className="text-muted">Email</dt>
            <dd className="font-mono">{demo.email}</dd>
            <dt className="text-muted">Password</dt>
            <dd className="font-mono">{demo.password}</dd>
          </dl>
        </section>
      </div>
    </main>
  );
}
