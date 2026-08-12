# A Case is the criminal incident, not the victim or the prosecution

CrimeWeb v2 makes the Case its central entity, so the unit had to be pinned down before anything else could be modelled. We define one Case as **one criminal incident**, regardless of how many victims or perpetrators it involved: the Menendez killings are a single Case with two victims and two perpetrators, while a serial killer's eight separate attacks are eight Cases grouped by a Case Series.

## Considered options

- **The victim** — would have given the cleanest key, since person names are by far the most available signal in source metadata (~85% of episodes, versus 34% for location and 14% for year). Rejected because it shatters multi-victim incidents into fragments that no documentary ever treats separately, and it fails outright on unidentified victims and on non-homicide crime such as fraud.
- **The investigation or legal matter** — closest to how journalists and courts talk, and it would have absorbed retrials and resentencings naturally. Rejected because its boundary moves every time charges are filed, and unsolved crimes have no prosecution to anchor to — which is precisely when a case is most newsworthy.
- **The story as media tells it** — maximally matched our data, but circular: Cases could not exist independently of coverage, and two sources framing the same crime differently could split one incident into two.

## Consequences

- Linked incidents need a **Case Series** to be surfaced as one subject. A perpetrator-based grouping was rejected because it fails on unsolved serial cases (Zodiac, Long Island before Heuermann) — exactly the ones that draw the most coverage.
- Because only 8% of source metadata carries both a location and a year, **identity cannot be a natural key** over case attributes. A Case is identified by an opaque locally-minted ID; its only other required field is a display title, and every descriptive attribute is nullable.
- Deciding whether two Media Items describe the same incident is therefore a **semantic judgement**, not field equality. There are zero identical episode titles across different shows in the current dataset, so string matching cannot carry it.
