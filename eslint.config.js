// Configuration ESLint 9 (format « flat »).
//
// Elle manquait : `npm run lint` échouait, et l'étape correspondante de la CI
// avec lui. Le périmètre est volontairement restreint — les règles qui
// attrapent de vrais défauts, pas celles qui imposent un style, que
// Prettier/ruff traitent déjà ailleurs.
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist/**", "node_modules/**", "docs/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        File: "readonly",
        FileList: "readonly",
        Event: "readonly",
        RequestInit: "readonly",
        HTMLInputElement: "readonly",
        console: "readonly",
      },
    },
    plugins: { "@typescript-eslint": tsPlugin, "react-hooks": reactHooks },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // TypeScript vérifie déjà les identifiants inconnus, et mieux.
      "no-undef": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Une assertion non nulle est un raccourci qu'on veut voir, pas bloquer.
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];
