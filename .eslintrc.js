module.exports = {
  ignorePatterns: ["src/browser-polyfill.js"],
  extends: [
    "./node_modules/project-chore/eslint",
    "./node_modules/project-chore/eslint/special-locations",
    "./.eslintrc.overrides",
    "./.eslintrc.rule-overrides",
    "./.eslintrc.temp"
  ],
  globals: {
    browser: "readonly",
    chrome: "readonly",
    importScripts: "readonly"
  }
};
