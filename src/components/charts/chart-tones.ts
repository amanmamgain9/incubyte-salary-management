// Chart colors as @theme token references (src/app/globals.css); charts never use color literals.
export const chartTones = {
  accent: "var(--color-accent)",
  primary: "var(--color-chart-primary)",
  secondary: "var(--color-chart-secondary)",
  increase: "var(--color-chart-increase)",
  decrease: "var(--color-chart-decrease)",
  band: "var(--color-accent-soft)",
  track: "var(--color-chart-track)",
} as const;

export type ChartTone = keyof typeof chartTones;

/** Axis, grid and baseline strokes shared by every chart. */
export const chartFrame = {
  axis: "var(--color-chart-axis)",
  grid: "var(--color-line-soft)",
  baseline: "var(--color-chart-baseline)",
  fontSize: 11,
} as const;
