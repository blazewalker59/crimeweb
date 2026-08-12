# PROTOTYPE — resolution benchmark

Throwaway harness built for [How media resolves onto a case](https://github.com/blazewalker59/crimeweb/issues/9).

## Question

How should a Media Item be resolved onto a Case? Specifically: is the existing
722-line fuzzy matcher (`src/lib/matching/fuzzy.ts`) a viable foundation?

## Verdict — no

Measured against hand-built ground truth (10 cross-show cases, read from all 261
episodes in `data/episodes.json`):

| minScore | proposed | correct | precision | recall |
| -------- | -------- | ------- | --------- | ------ |
| 0.3–0.65 | 31       | 6       | 19%       | 55%    |
| 0.70     | 2        | 2       | 100%      | 18%    |

No threshold yields usable precision _and_ recall. Two failure modes:

1. **Garbage extraction.** It treats common nouns as surnames — `Room (last Name)`,
   `Homicide (last Name)`, `County (last Name)` — which is where the 81% false
   positives come from.
2. **Misses the obvious.** The Menendez pair shares the literal string
   "The Menendez Brothers" across Dateline and 20/20, and scores **0**.
   `extractKeyTerms` returns no names for the 20/20 episode and the garbage term
   `"freedom latest"` for the Dateline one.

## Why the problem is semantic, not lexical

- **Zero identical episode titles across different shows** in the whole dataset.
- **34 episodes (13%) are within-show duplicates**, 32 of them in The First 48
  (54% of that show). Spot-checked, most are the same case with reworded prose —
  "bullets fly at a Gwinnett County nightclub" vs "at a nightclub in Gwinnett
  County" — so string equality misses those too.

Within-show dedup is numerically the _larger_ resolution problem in this data
(34 episodes) than cross-show case linking (11 pairs). Nobody anticipated that.

## Keep this file?

`evaluate.ts` encodes the hand-built ground truth and is worth keeping as a
regression benchmark for the LLM pipeline that replaces the matcher. Run with:

    bun scripts/prototype-resolution/evaluate.ts

Delete it once the real pipeline has its own test suite.
