# Media resolves onto Cases by LLM extraction, not string matching

CrimeWeb v1 shipped a 722-line fuzzy matcher (`src/lib/matching/fuzzy.ts`) that extracts names, locations and years from episode text and scores pairs by string similarity. We are replacing it: an LLM reads title and overview at ingest and emits **structured case attributes**, resolution runs over those attributes, and links below a confidence threshold become proposals a human confirms rather than facts.

A benchmark against hand-built ground truth (10 cross-show cases read from all 261 episodes) showed the matcher has no usable operating point: **19% precision at 55% recall**, or **100% precision at 18% recall**. It scores the Menendez pair — which shares the literal string "The Menendez Brothers" across Dateline and 20/20 — at **zero**, because its extractor returns no names for one episode and the garbage term `"freedom latest"` for the other. Its false positives come from treating common nouns as surnames: `Room`, `Homicide`, `County`.

## Why the problem is semantic

There are **zero identical episode titles across different shows** in the dataset, so cross-show linking gets no help from string equality. Independently, **34 episodes (13%) are within-show duplicates** — 32 of them in The First 48, over half that show — and most are the same case with reworded prose ("bullets fly at a Gwinnett County nightclub" versus "at a nightclub in Gwinnett County"), so string equality misses those too. Within-show deduplication turns out to be numerically the larger resolution problem, and the same extraction pass addresses both.

## Considered options

- **Fuzzy as a pre-filter with the LLM adjudicating** its candidates. Rejected because the matcher's recall at usable precision is 18% — it never surfaces the hardest and most valuable pairs, so the LLM would never see them.
- **Fully automatic LLM linking** with no human gate. Rejected because a wrong Merge is far more destructive than a wrong Coverage link, and ADR-0002 deliberately ships no moderation queue, so nobody would notice. Research on external authorities measured a 44% false-positive rate for naive name matching against real people, which is a standing warning about confident wrong answers.
- **Hand-curated cases.** Rejected because the catalogue grows continuously across TV and streaming; 261 episodes already exceeds what hand-curation sustains.

## Consequences

- Ingest gains a per-item LLM call, so its cost and failure modes now matter — see the ingest ticket. A Workers AI binding is already available on the dinnertable stack.
- Coverage links must carry a **confidence score and provenance**, since the confirm-or-auto-apply decision reads them.
- The human confirmation step needs somewhere to live; that is the correction surface.
- `scripts/prototype-resolution/evaluate.ts` retains the hand-built ground truth and should be kept as a regression benchmark until the real pipeline has its own tests.
