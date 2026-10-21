"use client";

import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";

export default function WorkspaceError({ retry }: { error: unknown; retry: () => void }) {
  const { reset } = useQueryErrorResetBoundary();
  return (
    <Card>
      <ErrorState
        onRetry={() => {
          // Let failed queries fetch again, then re-render the segment.
          reset();
          retry();
        }}
      />
    </Card>
  );
}
