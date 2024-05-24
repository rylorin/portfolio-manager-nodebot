import { fixupPluginRules } from "@eslint/compat";
import eslint from "@eslint/js";
import prettier from "eslint-plugin-prettier/recommended";
import rxjs from "eslint-plugin-rxjs";
// import storybook from "eslint-plugin-storybook";
// import react from "eslint-plugin-react";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  // storybook.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parserOptions: { project: ["./tsconfig.json", "./tsconfig.server.json"] },
    },
    plugins: { rxjs: fixupPluginRules(rxjs) },
    rules: {
      strict: "error",
      "no-console": "off",
      "no-unsafe-optional-chaining": "error",
      "no-unused-vars": "off", // off required as we use the @typescript-eslint/no-unused-vars rule
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/ban-types": "error",
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-empty-function": "error",
      "@typescript-eslint/no-explicit-any": "off", // We allow explicit any
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-non-null-assertion": "off", // behavior mismatch between TSlint and TScompiler. I make a valid usage of non null assertions
      "@typescript-eslint/no-inferrable-types": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "off", // behavior mismatch between TSlint and TScompiler. giving too many useless errors and we allow unnecessary type assertions
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "off", // off for the moment because we have too many warnings
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "off", // off for the moment because we have too many warnings
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/restrict-plus-operands": "error",
      "@typescript-eslint/restrict-template-expressions": "error",
      "@typescript-eslint/unbound-method": "error",
      "@typescript-eslint/promise-function-async": "error",
      "rxjs/no-async-subscribe": "warn",
      "rxjs/no-ignored-observable": "warn",
      "rxjs/no-ignored-subscription": "warn",
      "rxjs/no-unbound-methods": "warn",
      "rxjs/throw-error": "warn",
    },
  },
  // {
  //   files: ["**/*.{js,mjs,cjs,jsx,mjsx,ts,tsx,mtsx}"],
  //   plugins: { react: fixupPluginRules(react) },
  //   ...react.configs.recommended,
  // },
  { ignores: ["node_modules/*", ".storybook/", "build/*", "dist/*", "**/*.spec.ts", "*.config.mjs"] },
);
