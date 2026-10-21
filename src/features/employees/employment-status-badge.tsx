import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { EmploymentStatus } from "@/contracts/employees";

/** The only EmploymentStatus → label/tone mapping, in display order. */
export const employmentStatuses: ReadonlyArray<{ status: EmploymentStatus; label: string; tone: BadgeTone }> = [
  { status: "active", label: "Active", tone: "positive" },
  { status: "departed", label: "Departed", tone: "muted" },
  { status: "upcoming", label: "Upcoming", tone: "accent" },
];

export function employmentStatusLabel(status: EmploymentStatus): string {
  return employmentStatuses.find((entry) => entry.status === status)?.label ?? status;
}

export function EmploymentStatusBadge({ status }: { status: EmploymentStatus }) {
  const tone = employmentStatuses.find((entry) => entry.status === status)?.tone ?? "neutral";
  return (
    <Badge tone={tone} dot>
      {employmentStatusLabel(status)}
    </Badge>
  );
}
