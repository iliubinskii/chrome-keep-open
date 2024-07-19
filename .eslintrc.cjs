/**
 * @type {import("eslint").Linter.Config}
 */
const config = {
  ignorePatterns: ["!.*", "/node_modules/**", "/src/browser-polyfill.js"],
  env: {
    es2022: true
  },
  globals: {
    browser: "readonly",
    chrome: "readonly",
    importScripts: "readonly"
  },
  extends: "./.eslintrc.base.cjs",
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: 2022,
    project: "tsconfig.json",
    sourceType: "module"
  },
  rules: {
    "@cspell/spellchecker": [
      "warn",
      {
        cspell: {
          words:
            // @sorted
            ["escompat", "newtab", "packagejson", "sonarjs"]
        }
      }
    ]
  }
};

module.exports = config;
