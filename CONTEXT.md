# CrimeWeb

A true crime tracker built around **cases** rather than releases. It surfaces which criminal cases are being covered right now across television and streaming, and cross-references coverage of the same case between sources.

## Language

### The case graph

**Case**:
A single criminal incident — one criminal event, regardless of how many victims or perpetrators it involved. The Menendez killings are one Case; a serial killer's eight separate attacks are eight Cases.
_Avoid_: crime, story, incident, matter

**Case Series**:
A named grouping of Cases understood as one subject — the Gilgo Beach murders, the Zodiac killings. Exists so linked incidents can be surfaced as one thing without a known perpetrator to join them on.
_Avoid_: collection, cluster, group, saga

**Provisional Case**:
A Case minted from coverage that could not be resolved to any existing Case. It is a real incident with too little metadata to identify; it stops being provisional when confirmed or merged.
_Avoid_: unresolved, pending, orphan, draft

**Merge**:
Combining two Cases judged to be the same incident. The primary correction operation on the case graph, and the expected fate of duplicate Provisional Cases.
_Avoid_: dedupe, link, join

### Media and coverage

**Media Item**:
A single piece of true crime programming — one television episode, one documentary film, or one limited series. The thing a source publishes.
_Avoid_: episode, release, title, content

**Coverage**:
The relationship asserting that a Media Item is about a Case or a Case Series. Coverage is many-to-many: one Media Item can cover several Cases, and one Case attracts coverage from many sources over time.
_Avoid_: match, related episode, link, association

**Source**:
The programme or outlet a Media Item comes from — Dateline, 20/20, Netflix.
_Avoid_: show, network, provider, publisher

### Surfacing

**Convergence**:
Two or more distinct Sources covering the same Case within the decay window. The signal the product exists to surface, and rare — roughly one case in twenty attracts it.
_Avoid_: overlap, cluster, cross-reference, pile-on

**Heat**:
A Case's current rank in the feed: recency of its coverage, multiplied by how many distinct Sources have converged on it. Depth within a single Source does not raise Heat.
_Avoid_: score, trending, popularity, buzz
