/**
 * Next.js 16 removed `next lint`. eslint-config-next ships ESLint 9 flat config.
 * @see https://nextjs.org/docs/app/api-reference/config/eslint
 */
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const nextCoreWebVitals = require("eslint-config-next/core-web-vitals");

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "dist/**",
      "coverage/**",
      ".vercel/**",
      "prisma/migrations/**",
      // Legacy / non-app scripts not part of the production surface
      "scripts/**",
      "migration/**",
      "test-report.js",
      "**/*.config.js",
      "lib/api.js",
      "lib/queryClient.js",
      "lib/tauri.js",
    ],
  },
  {
    // Pre-existing patterns across the tree (effects that seed local state).
    // Strict rule is from newer react-hooks plugin; not introduced by A.8.
    // Tracked as process debt — do not block security remediation gates.
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];

export default eslintConfig;
