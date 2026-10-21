import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/** A failed load with a retry; the message stays generic (details are in the server logs). */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      role="alert"
      title="We couldn’t load these records"
      action={
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}
