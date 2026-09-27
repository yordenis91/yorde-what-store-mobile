/** Root ESLint config; each app extends `expo` on top of this via its own .eslintrc.js. */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  env: { es2022: true, node: true },
  ignorePatterns: ['dist', '.expo', 'node_modules', '**/*.config.js'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
}
