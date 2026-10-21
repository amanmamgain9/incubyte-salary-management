import { Button } from "@/components/ui/button";
import { formatRange } from "@/lib/format";

/** "x–y of N" plus Previous/Next over the page's opaque cursors (null at either end). */
export function Pagination({
  rangeStart,
  itemCount,
  total,
  prevCursor,
  nextCursor,
  onPage,
}: {
  rangeStart: number;
  itemCount: number;
  total: number;
  prevCursor: string | null;
  nextCursor: string | null;
  onPage: (cursor: string) => void;
}) {
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-2.5 border-t border-line px-3 py-2.5 text-label text-muted sm:flex-nowrap sm:px-4.5 sm:py-3.25"
    >
      <span aria-live="polite">{formatRange(rangeStart, itemCount, total)}</span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={prevCursor === null}
          onClick={() => prevCursor && onPage(prevCursor)}
        >
          ← Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={nextCursor === null}
          onClick={() => nextCursor && onPage(nextCursor)}
        >
          Next →
        </Button>
      </div>
    </nav>
  );
}
