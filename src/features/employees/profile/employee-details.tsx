import type { EmployeeView } from "@/contracts/employees";
import { useLookups } from "@/hooks/use-lookups";
import { formatDate } from "@/lib/format";

/** Department, work country and employment dates. */
export function EmployeeDetails({ employee }: { employee: EmployeeView }) {
  const { countryName, departmentName } = useLookups();
  const facts = [
    ["Department", departmentName(employee.department_id)],
    ["Work country", countryName(employee.work_country_code)],
    ["Joined", formatDate(employee.joining_date)],
    ["Last working day", formatDate(employee.last_working_day)],
  ] as const;
  return (
    <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5 sm:gap-x-9.5 sm:gap-y-4.5">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt className="mb-1 text-label text-muted">{label}</dt>
          <dd className="text-body font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
