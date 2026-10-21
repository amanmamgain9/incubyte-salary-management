import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

// ---------------------------------------------------------------------------
// Import boundaries (AGENTS.md §6). Each boundary is its own rule id (an alias of
// @typescript-eslint/no-restricted-imports), so boundaries never override each
// other: a file gets every boundary whose `files` match. Zones of one boundary
// are disjoint, or ordered general → specific (last match wins).
// ---------------------------------------------------------------------------

const allSources = ["**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}"];
const ban = (regex, message, options = {}) => ({ regex, message, ...options });

// Server modules importable without `server-only` (scripts, drizzle-kit, unit tests).
const scriptSafeFiles = [
  "src/server/env.ts",
  "src/server/db/{connect,owner}.ts",
  "src/server/db/schema/**",
  "src/server/**/queries.ts",
  "src/server/employees/status.ts",
  "src/server/reports/filters.ts",
  "src/server/core/errors.ts",
];
const notScriptSafeServer =
  "^@/server(?:$|/(?!(?:env|db/connect|db/owner|db/schema(?:/.*)?|.+/queries|employees/status|reports/filters|core/errors)$))";

// Cross-feature imports allowed besides a feature's own folder (AGENTS.md §5).
const featureImports = { auth: [], workspace: ["auth"], employees: ["salaries"], salaries: [], reports: [] };
const featureMessage = "Cross-feature imports: only employees → salaries and workspace → auth; share via hooks/lib.";

const boundaries = {
  "no-parent-imports": [
    { files: allSources, bans: [ban("^\\.\\./", "Use `@/…` instead of `../` (AGENTS.md §3).")] },
  ],
  "no-docs-imports": [{ files: allSources, bans: [ban("(^|/)docs(/|$)", "Nothing may import from docs/.")] }],
  "pg-site": [
    {
      files: allSources,
      ignores: ["src/server/db/connect.ts"],
      bans: [ban("^pg(/|$)", "Only src/server/db/connect.ts imports `pg`.")],
    },
  ],
  "chart-library-site": [
    {
      files: allSources,
      ignores: ["src/components/charts/**"],
      bans: [ban("^recharts(/|$)", "Only src/components/charts/** imports the chart library.")],
    },
  ],
  "icon-library-site": [
    {
      files: allSources,
      ignores: ["src/components/ui/icon.tsx"],
      bans: [ban("^lucide-react(/|$)", "Only src/components/ui/icon.tsx imports the icon library; use <Icon>.")],
    },
  ],
  "date-picker-library-site": [
    {
      files: allSources,
      ignores: ["src/components/ui/date-picker.tsx"],
      bans: [
        ban(
          "^(react-day-picker|radix-ui|@radix-ui/react-popover)(/|$)",
          "Only src/components/ui/date-picker.tsx imports DayPicker/Radix; use <DatePicker>.",
        ),
      ],
    },
  ],
  "auth-client-site": [
    {
      files: allSources,
      ignores: ["src/features/auth/auth-client.ts"],
      bans: [ban("^better-auth/(react|client)$", "Only src/features/auth/auth-client.ts creates the auth client.")],
    },
  ],

  // Backend ------------------------------------------------------------------
  "script-safe": [
    {
      files: [...scriptSafeFiles, "scripts/**"],
      bans: [
        ban("^server-only$", "Script-safe module: never import `server-only` (AGENTS.md §4)."),
        ban(notScriptSafeServer, "Script-safe code imports only script-safe server modules (AGENTS.md §4)."),
      ],
    },
  ],
  "operations-no-api": [
    {
      files: ["src/server/**/{operations,queries}.ts"],
      bans: [
        ban("^@trpc/", "Operations and queries never import `@trpc/*`."),
        ban("^@/server/api(/|$)", "Operations and queries never import `@/server/api`."),
      ],
    },
  ],
  "queries-take-executor": [
    {
      files: ["src/server/**/queries.ts"],
      bans: [
        ban("^@/server/env$", "Queries take the executor and values as arguments; never read env."),
        ban("^@/server/.+/operations$", "Layering: operations → queries, never the reverse."),
      ],
    },
  ],
  "thin-routers": [
    {
      files: ["src/server/api/routers/**"],
      bans: [
        ban("^drizzle-orm(/|$)", "Routers make one operation call; SQL lives in queries.ts."),
        ban("^@/server/(db(/|$)|.+/queries$)", "Routers make one operation call; SQL lives in queries.ts."),
      ],
    },
  ],
  "core-is-leaf": [
    {
      files: ["src/server/core/**"],
      bans: [
        ban("^@/server/(api|auth|lookups|employees|salaries|reports)(/|$)", "core/ is cross-cutting; it never imports modules."),
      ],
    },
  ],
  "module-direction": [
    {
      files: ["src/server/employees/**"],
      bans: [ban("^@/server/reports(/|$)", "Module direction: employees → salaries → lookups; reports read all.")],
    },
    {
      files: ["src/server/salaries/**"],
      bans: [
        ban("^@/server/(employees|reports)(/|$)", "Module direction: employees → salaries → lookups; never the reverse."),
      ],
    },
    {
      files: ["src/server/lookups/**"],
      bans: [
        ban(
          "^@/server/(employees|salaries|reports)(/|$)",
          "Module direction: employees → salaries → lookups; never the reverse.",
        ),
      ],
    },
  ],

  // Frontend -----------------------------------------------------------------
  "frontend-no-server": [
    {
      files: ["src/{features,components,hooks,lib,contracts}/**"],
      bans: [ban("^@/server(/|$)", "Frontend and shared code never import `@/server`.")],
    },
    {
      files: ["src/trpc/**"],
      ignores: ["src/trpc/server.tsx"],
      bans: [
        ban("^@/server(?:$|/(?!api/root$))", "Client tRPC wiring imports only the `AppRouter` type."),
        ban("^@/server/api/root$", "Client tRPC wiring imports only the `AppRouter` type (`import type`).", {
          allowTypeImports: true,
        }),
      ],
    },
    {
      files: ["src/trpc/server.tsx"],
      bans: [ban("^@/server(?:$|/(?!api/))", "trpc/server.tsx wires only `@/server/api` (router, context).")],
    },
  ],
  "shared-layer-direction": [
    {
      files: ["src/components/**"],
      bans: [ban("^@/(features|trpc|hooks|contracts)(/|$)", "Components import only `@/lib` and other components.")],
    },
    {
      files: ["src/{hooks,trpc}/**"],
      bans: [ban("^@/features(/|$)", "Shared code never imports features.")],
    },
    {
      files: ["src/{lib,contracts}/**"],
      bans: [
        ban("^@/(features|components|hooks|trpc)(/|$)", "lib and contracts are pure; no UI, hooks or tRPC wiring."),
      ],
    },
  ],
  "feature-direction": [
    // Unlisted features may not import other features at all.
    { files: ["src/features/**"], bans: [ban("^@/features/", featureMessage)] },
    ...Object.entries(featureImports).map(([feature, allowed]) => ({
      files: [`src/features/${feature}/**`],
      bans: [ban(`^@/features/(?!(?:${[feature, ...allowed].join("|")})(?:/|$))`, featureMessage)],
    })),
  ],
};

const boundaryPlugin = {
  rules: Object.fromEntries(
    Object.keys(boundaries).map((name) => [name, tseslint.plugin.rules["no-restricted-imports"]]),
  ),
};

const importBoundaries = Object.entries(boundaries).flatMap(([name, zones]) =>
  zones.map(({ files, ignores = [], bans }) => ({
    files,
    ignores,
    rules: { [`boundaries/${name}`]: ["error", { patterns: bans }] },
  })),
);

// ---------------------------------------------------------------------------
// Syntax bans
// ---------------------------------------------------------------------------

const colorLiteral = "/#[0-9a-fA-F]{3,8}(?![\\w-])|\\b(rgb|rgba|hsl|hsla)\\(|\\[#/";
const colorAttribute = "JSXAttribute[name.name=/^(className|style|fill|stroke|stopColor|color)$/]";
const colorMessage = "Use @theme tokens from src/app/globals.css, not color literals or `[#…]` values.";

const restrictedSyntax = [
  { selector: `${colorAttribute} Literal[value=${colorLiteral}]`, message: colorMessage },
  { selector: `${colorAttribute} TemplateElement[value.raw=${colorLiteral}]`, message: colorMessage },
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
    plugins: { boundaries: boundaryPlugin },
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
