import type { AriaRole, ReactNode } from "react";

/**
 * The standard centered state message (empty, loading, error): optional visual, title, short hint and at most one
 * action. Render it inside the surface it replaces.
 */
export function EmptyState({
  title,
  hint,
  action,
  visual,
  role,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  visual?: ReactNode;
  role?: AriaRole;
}) {
  return (
    <div role={role} className="px-5 py-10 text-center text-muted">
      {visual ? <div className="mb-3 flex justify-center">{visual}</div> : null}
      <h2 className="text-heading text-ink">{title}</h2>
      {hint ? <p className="mt-2 text-body">{hint}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
