import type { Route } from "next";
import type { IconName } from "@/components/ui/icon";

export type NavItem = { href: Route; label: string; icon: IconName };

/** Ordered rail links per section. A report joins `reports` when its route exists; unbuilt routes are never linked. */
export const navSections: ReadonlyArray<{ label: string; items: readonly NavItem[] }> = [
  { label: "People", items: [{ href: "/employees", label: "Employees", icon: "employees" }] },
  {
    label: "Reports",
    items: [
      { href: "/reports/salary-commitment", label: "Salary commitment", icon: "commitment" },
      { href: "/reports/department-breakdown", label: "Departments", icon: "departments" },
      { href: "/reports/salary-growth", label: "Salary growth", icon: "growth" },
    ],
  },
];
