"use client";

import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingState } from "@/components/ui/loading-state";
import { Paging } from "@/contracts/paging";
import { useUrlState } from "@/hooks/use-url-state";
import { isInvalidCursor } from "@/trpc/query-client";

const pagePosition = z.object({ cursor: Paging.shape.cursor.catch(undefined) });

export default function WorkspaceError({ error, retry }: { error: unknown; retry: () => void }) {
  const { reset } = useQueryErrorResetBoundary();
  const [{ cursor }, patch] = useUrlState(pagePosition);
  const staleCursor = isInvalidCursor(error);
  const recovered = useRef<unknown>(null);

  // Let failed queries fetch again, then re-render the segment.
  const retryQueries = () => {
    reset();
    retry();
  };

  // A rejected page cursor (an old link, or a list that changed): drop it, then load the first page once the URL
  // no longer carries it.
  useEffect(() => {
    if (!staleCursor || recovered.current === error) return;
    if (cursor !== undefined) {
      patch({ cursor: undefined });
      return;
    }
    recovered.current = error;
    reset();
    retry();
  }, [error, staleCursor, cursor, patch, reset, retry]);

  return (
    <Card>{staleCursor ? <LoadingState label="Loading" /> : <ErrorState onRetry={retryQueries} />}</Card>
  );
}
