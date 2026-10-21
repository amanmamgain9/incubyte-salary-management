import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/** The ACME mark and wordmark, linking to the directory. `tagline="desktop"` hides the tagline in the mobile bar. */
export function Brand({ tagline = "always" }: { tagline?: "always" | "desktop" }) {
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
        <small
          className={cn(
            "mt-0.5 text-label font-normal tracking-normal text-muted",
            tagline === "always" ? "block" : "hidden md:block",
          )}
        >
          People &amp; pay
        </small>
      </span>
    </Link>
  );
}
