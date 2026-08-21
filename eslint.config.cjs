const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "wordbooks/**",
      "vocabulary-flashcards.html",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.cjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },
  {
    files: ["src/app/bootstrap.js"],
    languageOptions: {
      globals: {
        __BUILD_APP_BUILD_TARGET__: "readonly",
        __BUILD_BUILT_IN_BOOKS__: "readonly",
        __BUILD_PERSONAL_BOOKS__: "readonly",
        __BUILD_DEFAULT_BOOK_ID__: "readonly",
        __BUILD_LEGACY_BUILT_IN_BOOK_IDS__: "readonly",
        __BUILD_IMPORT_WORKER_SOURCE__: "readonly",
        __BUILD_FSRS_PACKAGE_VERSION__: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
    },
  },
];
