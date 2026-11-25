import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default [
  {
    ignores: ["**/dist/**", "**/.next/**", "**/coverage/**", "**/node_modules/**"],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "warn",
    },
  },
  {
    files: [
      "scripts/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "infra/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    rules: {
      "no-console": "off",
    },
  },
  eslintConfigPrettier,
];
