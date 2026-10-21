import { Overview } from "@/components/ui/overview";
import { Stat } from "@/components/ui/stat";
import type { DirectorySummary } from "@/contracts/employees";
import { employmentMix } from "@/features/employees/directory/directory-data";
import { formatCount } from "@/lib/format";

const segmentColor = {
  active: "bg-status-active",
  departed: "bg-status-departed",
  upcoming: "bg-status-upcoming",
} as const;

/** Workforce overview of every matching employee (from the API summary, never from the current page). */
export function DirectoryOverview({ summary, scope }: { summary: DirectorySummary; scope: string }) {
  const mix = employmentMix(summary);
  const description = mix.map(({ label, count }) => `${label}: ${formatCount(count)}`).join(", ");
  return (
    <Overview
      scope={scope}
      visualCaption="Employment mix"
      visual={
        <>
          <div role="img" aria-label={description} className="flex h-3 gap-0.5 overflow-hidden rounded-[3px] bg-chart-track">
            {mix.map(({ status, percent }) =>
              percent > 0 ? (
                <span key={status} className={segmentColor[status]} style={{ width: `${percent}%` }} />
              ) : null,
            )}
          </div>
          <div className="mt-1.75 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-label text-muted">
            {mix.map(({ status, label, count }) => (
              <span key={status} className="inline-flex items-center gap-1 whitespace-nowrap">
                <i className={`inline-block size-1.25 rounded-full ${segmentColor[status]}`} aria-hidden="true" />
                {label} {formatCount(count)}
              </span>
            ))}
          </div>
        </>
      }
    >
      <Stat label="Employees" value={formatCount(summary.employee_count)} />
      <Stat label="Active" value={formatCount(summary.active_count)} />
      <Stat label="Countries" value={formatCount(summary.country_count)} />
    </Overview>
  );
}
