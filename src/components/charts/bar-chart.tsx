"use client";

import {
  Bar,
  BarChart as RechartsBarChart,
  Cell,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartFrame, chartTones, type ChartTone } from "@/components/charts/chart-tones";

/** One bar: `value` positions it (plotting only); `display` is the exact or compact text people read. */
export type BarDatum = { label: string; value: number; display: string; tone: ChartTone };

const ROW_HEIGHT = 34;

/**
 * Bars on a shared zero line. `horizontal`: one row per category with its value at the end (comparisons);
 * `vertical`: columns over a time axis, negative values below the baseline (trends).
 */
export function BarChart({
  data,
  orientation,
  label,
  height = 190,
}: {
  data: readonly BarDatum[];
  orientation: "horizontal" | "vertical";
  /** Accessible name describing what the bars show, including the unit or currency. */
  label: string;
  height?: number;
}) {
  const horizontal = orientation === "horizontal";
  const tick = { fill: chartFrame.axis, fontSize: chartFrame.fontSize };
  return (
    <figure role="img" aria-label={label} className="w-full">
      <RechartsBarChart
        responsive
        data={[...data]}
        layout={horizontal ? "vertical" : "horizontal"}
        style={{ width: "100%", height: horizontal ? data.length * ROW_HEIGHT + 8 : height }}
        margin={horizontal ? { top: 4, right: 0, bottom: 4, left: 0 } : { top: 8, right: 8, bottom: 0, left: 8 }}
        barCategoryGap={horizontal ? 10 : "22%"}
      >
        {horizontal ? (
          <>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              yAxisId="label"
              type="category"
              dataKey="label"
              width={100}
              tick={{ ...tick, fontSize: 13 }}
              axisLine={false}
              tickLine={false}
            />
            {/* Values in their own right-hand column, clear of the bar tracks. */}
            <YAxis
              yAxisId="display"
              orientation="right"
              type="category"
              dataKey="display"
              width={92}
              tick={{ ...tick, fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey="label"
              tick={tick}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={6}
            />
            <YAxis hide domain={["auto", "auto"]} />
            <ReferenceLine y={0} stroke={chartFrame.baseline} />
          </>
        )}
        <Tooltip
          cursor={{ fill: chartTones.track, opacity: 0.5 }}
          formatter={(_value, _name, item) => [String(item.payload?.display ?? ""), ""]}
          separator=""
        />
        <Bar
          yAxisId={horizontal ? "label" : undefined}
          dataKey="value"
          radius={3}
          isAnimationActive={false}
          maxBarSize={horizontal ? 8 : 40}
          background={horizontal ? { fill: chartTones.track, radius: 3 } : false}
        >
          {data.map((datum) => (
            <Cell key={datum.label} fill={chartTones[datum.tone]} />
          ))}
        </Bar>
      </RechartsBarChart>
    </figure>
  );
}
