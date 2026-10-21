import { cn } from "@/lib/cn";
import { formatInitials } from "@/lib/format";

const sizes = { md: "size-8.5 text-caption", lg: "size-10.5 text-[15px]" } as const;

/** A person's initials on a soft accent tile; decorative, so the name must be shown beside it. */
export function Avatar({
  name,
  shape = "circle",
  size = "md",
}: {
  name: string;
  shape?: "circle" | "square";
  /** `lg` heads a record page (the profile). */
  size?: keyof typeof sizes;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center bg-accent-soft font-medium text-accent-ink",
        sizes[size],
        shape === "circle" ? "rounded-full" : "rounded-control",
      )}
    >
      {formatInitials(name)}
    </span>
  );
}
