import type { ReactNode } from "react";
import { Brand } from "@/components/ui/brand";
import { AccountFooter } from "@/features/workspace/account-footer";
import { MobileNav } from "@/features/workspace/mobile-nav";

/** Warm white navigation rail (a top bar with a menu on small screens) beside the page content. */
export function WorkspaceShell({ user, children }: { user: { name: string }; children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="fixed -top-20 left-5 z-30 bg-ink p-3 text-surface focus:top-2.5"
      >
        Skip to content
      </a>
      <aside
        aria-label="Main navigation"
        className="flex flex-col border-b border-rail-line bg-rail px-5 py-3.5 md:fixed md:inset-y-0 md:left-0 md:z-10 md:w-rail md:overflow-y-auto md:border-r md:border-b-0 md:px-3.5 md:pt-7.5 md:pb-4.5"
      >
        <MobileNav brand={<Brand tagline="desktop" />} footer={<AccountFooter name={user.name} />} />
      </aside>
      <div className="md:ml-rail">
        <main id="main" className="mx-auto max-w-400 p-5 md:px-8.5 md:py-8">
          {children}
        </main>
      </div>
    </>
  );
}
