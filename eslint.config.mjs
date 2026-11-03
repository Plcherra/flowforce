import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import i18next from "eslint-plugin-i18next";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";
import hardcodedBaseline from "./scripts/i18n-hardcoded-baseline.json" with { type: "json" };

const openPrLiteralFiles = [
  ...new Set(hardcodedBaseline.map((entry) => entry.split(": ")[0])),
];

export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "android/**",
      "dist/**",
      "dist-ssr/**",
      "ios/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "docs/test-results/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2023,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "warn",
      "no-useless-escape": "warn",
      "@typescript-eslint/naming-convention": [
        "warn",
        {
          selector: "variable",
          modifiers: ["destructured"],
          format: null,
        },
        {
          selector: "variable",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        {
          selector: "function",
          filter: {
            regex: "^__",
            match: true,
          },
          format: null,
        },
        {
          selector: "function",
          format: ["camelCase", "PascalCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "typeParameter",
          format: null,
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{jsx,tsx}", "app/**/*.{jsx,tsx}"],
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "error",
        {
          mode: "jsx-text-only",
          "should-validate-template": false,
          callees: {
            exclude: ["i18n.t", "t", "cn", "clsx", "cva", "logger", "console"],
          },
          words: {
            exclude: ["[^A-Za-z]*", "[A-Za-z]", "https?://\\S+", "XP", "ID", "NS", "KB"],
          },
        },
      ],
    },
  },
  {
    files: openPrLiteralFiles,
    rules: {
      "i18next/no-literal-string": "off",
    },
  },
  eslintConfigPrettier,
);
