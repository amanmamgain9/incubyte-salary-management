import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// ---------------------------------------------------------------------------
// Import boundaries (AGENTS.md §6). ESLint does not merge options of the same
// rule across config objects, so each zone below lists every restriction that
// applies to it; zones are ordered general → specific (last match wins).
// ---------------------------------------------------------------------------

const parentImports = {
  patterns: [{ regex: "^\\.\\./", message: "Use `@/…` instead of `../` (AGENTS.md §3)." }],
};
const docsImports = {
  patterns: [{ regex: "(^|/)docs(/|$)", message: "Nothing may import from docs/." }],
};
const pgImports = {
  paths: [{ name: "pg", message: "Only src/server/db/connect.ts imports `pg`." }],
  patterns: [{ regex: "^pg/", message: "Only src/server/db/connect.ts imports `pg`." }],
};
const trpcImports = {
  patterns: [{ regex: "^@trpc/", message: "Operations and queries never import `@trpc/*`." }],
};
const employeesModuleImports = {
  patterns: [
    {
      regex: "^@/server/employees(/|$)",
      message: "Module direction is employees → salaries → lookups; never the reverse.",
    },
  ],
};
const salariesModuleImports = {
  patterns: [
    {
      regex: "^@/server/salaries(/|$)",
      message: "Module direction is employees → salaries → lookups; never the reverse.",
    },
  ],
};
const serverImports = {
  patterns: [{ regex: "^@/server(/|$)", message: "Frontend code never imports `@/server`." }],
};
const componentImports = {
  patterns: [
    {
      regex: "^@/(features|trpc|hooks|contracts)(/|$)",
      message: "Components import only `@/lib` and other components.",
    },
  ],
};

const baseImports = [parentImports, docsImports, pgImports];

const restrictImports = (files, groups, ignores = []) => ({
  files,
  ignores,
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: groups.flatMap((group) => group.paths ?? []),
        patterns: groups.flatMap((group) => group.patterns ?? []),
      },
    ],
  },
});

const allSources = ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"];
const operationsAndQueries = (dir) => [`${dir}/**/operations.ts`, `${dir}/**/queries.ts`];

const importBoundaries = [
  restrictImports(allSources, baseImports, ["src/server/db/connect.ts"]),
  restrictImports(["src/server/db/connect.ts"], [parentImports, docsImports]),
  restrictImports(operationsAndQueries("src/server"), [...baseImports, trpcImports]),
  restrictImports(["src/server/salaries/**"], [...baseImports, employeesModuleImports]),
  restrictImports(operationsAndQueries("src/server/salaries"), [
    ...baseImports,
    employeesModuleImports,
    trpcImports,
  ]),
  restrictImports(["src/server/lookups/**"], [...baseImports, employeesModuleImports, salariesModuleImports]),
  restrictImports(operationsAndQueries("src/server/lookups"), [
    ...baseImports,
    employeesModuleImports,
    salariesModuleImports,
    trpcImports,
  ]),
  restrictImports(["src/{features,hooks,lib}/**"], [...baseImports, serverImports]),
  restrictImports(["src/components/**"], [...baseImports, serverImports, componentImports]),
];

// ---------------------------------------------------------------------------
// Syntax bans
// ---------------------------------------------------------------------------

const colorLiteral = "/#[0-9a-fA-F]{3,8}|\\b(rgb|rgba|hsl|hsla)\\(|\\[#/";
const colorMessage = "Use @theme tokens from src/app/globals.css, not color literals or `[#…]` values.";

const restrictedSyntax = [
  {
    selector: `JSXAttribute[name.name='className'] Literal[value=${colorLiteral}]`,
    message: colorMessage,
  },
  {
    selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=${colorLiteral}]`,
    message: colorMessage,
  },
  {
    selector: "CallExpression[callee.property.name='invalidateQueries'][arguments.length=0]",
    message: "Invalidate by path key (e.g. trpc.employees.pathKey()), never everything.",
  },
  {
    selector: "MemberExpression[object.name='sql'][property.name='raw']",
    message: "Never `sql.raw`; interpolate Drizzle tables and columns.",
  },
];

// Next route/special files and tool config files must default-export.
const defaultExportAllowed = [
  "src/app/**/{page,layout,template,default,loading,error,global-error,not-found,forbidden,unauthorized}.tsx",
  "src/app/**/{icon,apple-icon,opengraph-image,twitter-image,sitemap,robots,manifest}.{ts,tsx}",
  "*.config.{ts,mts,mjs,js,cjs}",
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "docs/**",
  ]),

  {
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Read configuration through `@/server/env` only.",
        },
      ],
      "import/no-cycle": "error",
      "import/no-default-export": "error",
      "no-restricted-syntax": ["error", ...restrictedSyntax],
    },
  },
  {
    files: ["src/server/env.ts"],
    rules: { "no-restricted-properties": "off" },
  },
  {
    files: defaultExportAllowed,
    rules: { "import/no-default-export": "off" },
  },

  ...importBoundaries,

  {
    files: ["**/*.tsx"],
    rules: { "max-lines": ["error", { max: 200 }] },
  },
  {
    files: ["**/*.ts"],
    rules: { "max-lines": ["error", { max: 300 }] },
  },

  // Type-aware rules.
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
    },
  },
]);
