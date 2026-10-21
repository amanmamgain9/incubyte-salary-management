import { cn } from "@/lib/cn";
import { formatInitials } from "@/lib/format";

/** A person's initials on a soft accent tile; decorative, so the name must be shown beside it. */
export function Avatar({ name, shape = "circle" }: { name: string; shape?: "circle" | "square" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8.5 shrink-0 place-items-center bg-accent-soft text-caption font-medium text-accent-ink",
        shape === "circle" ? "rounded-full" : "rounded-control",
      )}
    >
      {formatInitials(name)}
    </span>
  );
}
