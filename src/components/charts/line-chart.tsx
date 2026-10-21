"use client";

import { Area, CartesianGrid, ComposedChart, Line, Tooltip, XAxis, YAxis } from "recharts";
import { chartFrame, chartTones, type ChartTone } from "@/components/charts/chart-tones";
import { formatCompact } from "@/lib/format";

/** One x position: `values` per series key (null leaves a gap) and an optional low–high range for the band. */
export type LinePoint = {
  label: string;
  values: Readonly<Record<string, number | null>>;
  band?: readonly [number, number] | null;
};
export type LineSeries = { key: string; name: string; tone: ChartTone; dashed?: boolean };

const BAND_KEY = "__band";

/**
 * Lines over months with an optional range band (e.g. P10–P90) behind them and dashed reference lines. `compact`
 * drops axes, grid and tooltip for the overview's small visual. Values are plotting numbers; `unit` labels them.
 */
export function LineChart({
  points,
  series,
  band,
  label,
  unit = "",
  height = 220,
  compact = false,
}: {
  points: readonly LinePoint[];
  series: readonly LineSeries[];
  band?: { name: string; tone: ChartTone };
  label: string;
  unit?: string;
  height?: number;
  compact?: boolean;
}) {
  const data = points.map((point) => ({ label: point.label, ...point.values, [BAND_KEY]: point.band ?? null }));
  const names = new Map<string, string>(series.map((line) => [line.key, line.name]));
  if (band) names.set(BAND_KEY, band.name);
  const tick = { fill: chartFrame.axis, fontSize: chartFrame.fontSize };
  const format = (value: number) => `${formatCompact(value.toFixed(2))}${unit ? ` ${unit}` : ""}`;
  return (
    <figure role="img" aria-label={label} className="w-full">
      <ComposedChart
        responsive
        data={data}
        style={{ width: "100%", height }}
        margin={compact ? { top: 4, right: 4, bottom: 4, left: 4 } : { top: 10, right: 16, bottom: 0, left: 0 }}
      >
        {compact ? null : <CartesianGrid vertical={false} stroke={chartFrame.grid} />}
        <XAxis dataKey="label" hide={compact} tick={tick} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis
          hide={compact}
          domain={["auto", "auto"]}
          tick={tick}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={(value: number) => formatCompact(value.toFixed(2))}
        />
        {compact ? null : (
          <Tooltip
            formatter={(value, key) => [
              Array.isArray(value) ? value.map((part) => format(Number(part))).join(" – ") : format(Number(value)),
              names.get(String(key)) ?? String(key),
            ]}
          />
        )}
        {band ? (
          <Area
            dataKey={BAND_KEY}
            stroke="none"
            fill={chartTones[band.tone]}
            fillOpacity={1}
            isAnimationActive={false}
            connectNulls={false}
          />
        ) : null}
        {series.map((line) => (
          <Line
            key={line.key}
            dataKey={line.key}
            stroke={chartTones[line.tone]}
            strokeWidth={line.dashed ? 2 : 2.5}
            strokeDasharray={line.dashed ? "5 5" : undefined}
            dot={false}
            isAnimationActive={false}
            connectNulls={false}
          />
        ))}
      </ComposedChart>
    </figure>
  );
}
