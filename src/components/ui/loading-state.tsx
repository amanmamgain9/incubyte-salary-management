import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";

/** A spinner with what is loading, announced politely. */
export function LoadingState({ label }: { label: string }) {
  return (
    <EmptyState
      role="status"
      title={label}
      visual={
        <span className="text-accent">
          <Icon name="spinner" size={24} />
        </span>
      }
    />
  );
}
