# The case graph is global truth; user state is private

CrimeWeb v2 is gated by an invite allowlist of roughly seven trusted people, following the model in the dinnertable repo. Given that, **any member's assertion about the case graph — Coverage links, Merges, Case metadata — becomes fact for everyone immediately**, recorded with who made it and when, and reversible by anyone. Separately, **per-user state (viewed status, watchlist) is private** and visible only to its owner.

## Considered options

- **Proposal plus corroboration**, where an assertion stays pending until a second member confirms it. Rejected because seven casual users would leave most proposals unconfirmed indefinitely, stalling the graph — it builds voting machinery to solve a problem a trusted, non-adversarial group does not have.
- **Per-user overrides**, where everyone maintains their own view of the graph. This is closest to the v1 behaviour, where match decisions live in `localStorage`. Rejected because it destroys the shared value: seven people would each redo identical curation, and cross-referencing stops being a shared asset.
- **Owner-only curation** with read-only access for everyone else. Rejected because it makes one person the bottleneck on a continuously growing catalogue.

## Consequences

- There is deliberately **no approval flow, no moderation queue and no conflict resolution UI**. The audit trail plus one-click reversal is the entire mechanism. This is only defensible while the allowlist stays small and trusted — opening signup would invalidate this decision.
- Every graph mutation needs **actor and timestamp** columns, not just a value. Attribution is what makes reversal safe.
- Ranking may personalise off private user state — surfacing cases whose coverage you have not watched — without exposing that state to anyone else.
- A social layer (seeing who watched what) can be added additively later. It was rejected for now because viewing habits in this domain are more personal than, say, recipe favourites, and sharing cannot be un-shipped.
