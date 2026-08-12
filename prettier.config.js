// @ts-check

/**
 * Matches what vite-plus's formatter (oxfmt) was already producing, so removing
 * Vite+ does not churn the whole codebase: double quotes, semicolons, trailing
 * commas. printWidth is 100 rather than Prettier's default 80 — the existing
 * files were formatted at 100 and dropping to 80 would rewrap most of them.
 */
export default {
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  printWidth: 100,
};
