const { eslint } = require("project-chore/api");

const spellChecker = eslint.rules["spellcheck/spell-checker"];

module.exports = {
  rules: {
    "spellcheck/spell-checker": [
      "warn",
      { ...spellChecker, skipWords: [...spellChecker.skipWords, "wnd"] }
    ]
  }
};
