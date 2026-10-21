import "server-only";
import type { LookupsOutput } from "@/contracts/lookups";
import type { OperationContext } from "@/server/core/operation-context";
import { selectCountries, selectCurrencies, selectDepartments } from "@/server/lookups/queries";

export async function getLookups(op: OperationContext): Promise<LookupsOutput> {
  const [countries, departments, currencies] = await Promise.all([
    selectCountries(op.db),
    selectDepartments(op.db),
    selectCurrencies(op.db),
  ]);
  return { countries, departments, currencies };
}
