import Link from "next/link";
import { Icon } from "@/components/ui/icon";

/** The ACME mark and wordmark, linking to the directory. `compact` hides the tagline (mobile bar). */
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/employees"
      aria-label="ACME People & pay, go to Employees"
      className="flex items-center gap-3 text-brand text-ink hover:no-underline"
    >
      <span className="grid size-8.5 shrink-0 place-items-center rounded-[10px] bg-accent text-surface shadow-button">
        <Icon name="brand" size={23} />
      </span>
      <span>
        acme
        {compact ? null : (
          <small className="mt-0.5 block text-label font-normal tracking-normal text-muted">People &amp; pay</small>
        )}
      </span>
    </Link>
  );
}
