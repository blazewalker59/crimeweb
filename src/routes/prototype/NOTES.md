# PROTOTYPE — v2 surfaces

Throwaway UI prototypes for the two remaining wayfinder tickets. **Neither ticket
is resolved** — both are HITL, and the whole point is your reaction.

Run `pnpm dev`, then:

| Ticket                                                                        | URL                                |
| ----------------------------------------------------------------------------- | ---------------------------------- |
| [The home screen](https://github.com/blazewalker59/crimeweb/issues/14)        | `/prototype/case-feed?variant=A`   |
| [The correction surface](https://github.com/blazewalker59/crimeweb/issues/15) | `/prototype/corrections?variant=A` |

Flip variants with the floating yellow bar at the bottom, or the ← / → arrow
keys. The bar is hidden in production builds.

## /prototype/case-feed — issue #14

Question: convergence is the differentiator but happens ~once every ten weeks.
Make it unmissable **without** reserving space that sits empty the rest of the time.

- **A — Heat grid.** Dense ranked card grid. Convergence carried by the card:
  blood-red ring, a "2 SOURCES" ribbon, stacked source badges. Costs no layout
  when nothing has converged.
- **B — Coverage timeline.** Not ranked at all. Chronological rail; convergence
  appears as _geometry_ — markers for the same case are drawn joined.
- **C — Editorial ledger.** Hierarchy inverted: the relationship is the headline
  ("20/20 and Dateline both covered this — on the same day"), the case is the
  subhead. Single-source items are deliberately quieter rows.

## /prototype/corrections — issue #15

Question: ADR-0002 ships no moderation queue, so audit + reversal is the entire
mechanism. The hard part is **noticing** a wrong link, not fixing it.

- **A — Triage inbox.** A destination you visit. Everything pending, ordered by
  confidence ascending — exactly what `coverage_status_idx (status, confidence)`
  was put in the schema to serve.
- **B — Side-by-side judgement.** One decision at a time, both items physically
  adjacent so the call is possible at a glance. Optimises decision _quality_
  over throughput, which matters because a wrong Merge is destructive.
- **C — Activity feed.** Rejects the queue premise. Machine and human changes
  stream past together, each undoable in place. The only variant that serves
  ADR-0002 literally, and the only one that shows auto-applied links at all.

## Data

`fixture.ts` — built from the real ground truth in issue #9: the 10 verified
cross-source convergences from `data/episodes.json`, plus provisional cases and
a review queue. The Sydney/Sidney Powell row in the queue is the real
false-positive class measured at 44%.

Read-only throughout. Buttons are stubs; nothing mutates.

## When a variant wins

Record which and why on the ticket, fold the winner into a real route, then
delete this directory and `src/components/PrototypeSwitcher.tsx`.
