/**@type {import('eslint').Linter.Config} */
// eslint-disable-next-line no-undef
module.exports = {
   root: true,
   parser: "@typescript-eslint/parser",
   plugins: ["@typescript-eslint"],
   extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:prettier/recommended",
   ],
   rules: {
      "semi": ["error", "always"],
      "no-unused-vars": "warn",
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "prettier/prettier": "error",
   },
};
