import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";

// Renders inside the workspace shell for a missing record, and alone for an unknown URL.
export default function NotFound() {
  return (
    <div className="grid place-items-center px-5 py-16">
      <div className="w-full max-w-100 rounded-panel border border-line bg-surface shadow-panel">
        <EmptyState
          title="Page not found"
          hint="This page or employee record does not exist."
          action={
            <Link href="/employees" className="text-body font-semibold text-accent-ink hover:text-accent">
              Go to employees
            </Link>
          }
        />
      </div>
    </div>
  );
}
