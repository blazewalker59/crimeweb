export { extractNames, extractKeywords, suggestCaseName } from './patterns'
export {
  findMatchingCases,
  areTitlesSimilar,
  findBestMatchingCase,
  detectRerun,
  groupSimilarEpisodes,
  calculateSimilarity,
  type MatchResult,
} from './fuzzy'
export {
  suggestCaseForEpisode,
  checkForRerun,
  batchSuggestCases,
  getCrossCoverageStats,
  type CaseSuggestion,
} from './suggest'
