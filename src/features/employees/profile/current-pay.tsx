import { Amount } from "@/components/ui/amount";
import { Caption } from "@/components/ui/caption";
import type { EmployeeView } from "@/contracts/employees";

/** Current annual base pay with its currency and the salary revision it comes from. */
export function CurrentPay({ employee }: { employee: EmployeeView }) {
  return (
    <div className="border-line sm:border-l sm:pl-5">
      <span className="text-label text-muted">Annual base pay</span>
      <strong className="my-1.5 block text-metric">
        <Amount value={employee.annual_base_pay} currency={employee.salary_currency_code} />
      </strong>
      <Caption>Revision {employee.salary_revision}</Caption>
    </div>
  );
}
