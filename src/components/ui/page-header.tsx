import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The page's single title and its actions (one primary). Record pages add a `back` link above it, a `leading`
 * visual (e.g. an avatar) and a `meta` line under the title (e.g. ID and status).
 */
export function PageHeader({
  title,
  action,
  back,
  leading,
  meta,
}: {
  title: string;
  action?: ReactNode;
  back?: { href: Route; label: string };
  leading?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <>
      {back ? (
        <Link href={back.href} className="mb-3 inline-block text-label text-muted hover:text-ink">
          ← {back.label}
        </Link>
      ) : null}
      <div className="mb-6 flex min-h-control flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {leading}
          <div className="min-w-0">
            <h1 className="text-title">{title}</h1>
            {meta ? <div className="mt-1.25 flex items-center gap-2 text-label text-muted">{meta}</div> : null}
          </div>
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
    </>
  );
}
