import { chartTones, type ChartTone } from "@/components/charts/chart-tones";

/** Legend entries keyed to the same token colors as the chart's series. */
export function ChartLegend({ items }: { items: ReadonlyArray<{ label: string; tone: ChartTone }> }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-4 text-label text-muted">
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.25">
          <span aria-hidden="true" className="inline-block size-1.75 rounded-[2px]" style={{ background: chartTones[item.tone] }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}
