module.exports = {
  ignorePatterns: ["src/browser-polyfill.js"],
  extends: [
    "./node_modules/real-config/eslint",
    "./node_modules/real-config/eslint/special-locations",
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
