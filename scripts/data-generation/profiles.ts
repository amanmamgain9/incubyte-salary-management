// Synthetic population profiles (docs/data-generation.md). Pure data: no database or env access.
import type { Country, Currency, Department } from "@/contracts/lookups";

/** The seeded lookups: 7 work countries, 6 salary currencies and 5 shared departments. */
export const SEED_LOOKUPS: { countries: Country[]; currencies: Currency[]; departments: Department[] } = {
  countries: [
    { code: "IN", name: "India" },
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "CA", name: "Canada" },
    { code: "SG", name: "Singapore" },
  ],
  currencies: [
    { code: "INR", name: "Indian Rupee" },
    { code: "USD", name: "US Dollar" },
    { code: "GBP", name: "British Pound" },
    { code: "EUR", name: "Euro" },
    { code: "CAD", name: "Canadian Dollar" },
    { code: "SGD", name: "Singapore Dollar" },
  ],
  departments: [
    { id: "engineering", name: "Engineering" },
    { id: "sales", name: "Sales" },
    { id: "operations", name: "Operations" },
    { id: "finance", name: "Finance" },
    { id: "people", name: "People" },
  ],
};
