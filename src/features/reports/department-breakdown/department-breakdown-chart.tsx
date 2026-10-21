"use client";

import { BarChart } from "@/components/charts/bar-chart";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { DepartmentPoint } from "@/contracts/reports/department-breakdown";
import { departmentComparison } from "@/features/reports/department-breakdown/department-breakdown-data";
import { useLookups } from "@/hooks/use-lookups";

/** Annual base pay per department, drawn only when the API gives the single-group totals (one currency). */
export function DepartmentBreakdownChart({ points, currency }: { points: readonly DepartmentPoint[]; currency: string }) {
  const { departmentName } = useLookups();
  const bars = departmentComparison(points, departmentName, currency);
  if (!bars) return null;
  return (
    <Card label="Department comparison">
      <CardHeader title="Department comparison" />
      <CardBody>
        <BarChart orientation="horizontal" data={bars} label={`Annual base pay by department in ${currency}`} />
      </CardBody>
    </Card>
  );
}
