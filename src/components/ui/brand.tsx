import type { Route } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/**
 * The ACME mark and wordmark; with `href`, a link. `tagline="desktop"` hides the tagline in the mobile bar.
 * Signed-out pages render it without `href`: a prefetched workspace link would cache the redirect to /login.
 */
export function Brand({ href, tagline = "always" }: { href?: Route; tagline?: "always" | "desktop" }) {
  const content = (
    <>
      <span className="grid size-8.5 shrink-0 place-items-center rounded-[10px] bg-accent text-surface shadow-button">
        <Icon name="brand" size={23} />
      </span>
      <span>
        acme
        <small
          className={cn(
            "mt-0.5 text-label font-normal tracking-normal text-muted",
            tagline === "always" ? "block" : "hidden md:block",
          )}
        >
          People &amp; pay
        </small>
      </span>
    </>
  );
  const className = "flex items-center gap-3 text-brand text-ink";
  if (!href) return <div className={className}>{content}</div>;
  return (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}
