/**
 * @filename: lint-staged.config.js
 * @type {import('lint-staged').Configuration}
 */
export default {
  "*": "prettier",
  "*.{js,jsx,ts,tsx}": ["eslint", "tsc --noEmit"],
  "*.css": "stylelint",
};
