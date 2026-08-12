# Accepted design references — v2 surfaces

The UI prototypes have been reviewed and decided. Losing variants and the
variant switcher are deleted. What remains is the **accepted design reference**
for each surface, not v2 itself — rewrite properly when v2 is built.

Run `pnpm dev`, then:

| Surface           | URL                      | Ticket                                                     |
| ----------------- | ------------------------ | ---------------------------------------------------------- |
| Coverage timeline | `/prototype/case-feed`   | [#14](https://github.com/blazewalker59/crimeweb/issues/14) |
| Needs review      | `/prototype/corrections` | [#15](https://github.com/blazewalker59/crimeweb/issues/15) |

## /prototype/case-feed — the home screen

**Chronological coverage timeline**, chosen over a heat-ranked card grid and an
editorial ledger. Every release is a marker on a rail, newest first. Converged
cases get a blood-red marker; single-source cases a grey one.

Convergence is revealed by an **expandable disclosure** rather than stated in
prose. The button names the other source outright — "Also on Dateline", or
"Also on Dateline +1" — and expanding lists each sibling release with its date,
title, watched state, and **how far apart the coverage fell** ("same day",
"21 days apart"). That gap is the interesting number and nothing else surfaces it.

Two things removed from the prototype version:

- The flat `← also covered elsewhere` line. It stated that convergence existed
  without letting you see it.
- The joined-marker line, which only rendered when two events for one case
  happened to land adjacent in the date sort — coincidental, so it almost never
  appeared. The disclosure does that job reliably.

## /prototype/corrections — the correction surface

**Triage inbox**, chosen over side-by-side judgement and an activity feed. A
destination you visit; everything awaiting a human in one list, ordered by
confidence **ascending** so the least certain proposals come first.

That ordering is exactly what `coverage_status_idx (status, confidence)` exists
to serve in `docs/v2-schema.md`. Each row states its kind (coverage link,
duplicate, merge, external link), its confidence, and _why_ it was proposed.

## Data

`-fixture.ts` — the 10 verified cross-source convergences from
`data/episodes.json` (per issue #9), plus provisional cases and a review queue
that includes the real Sydney/Sidney Powell false positive.

Read-only throughout. Buttons are stubs; nothing mutates.
