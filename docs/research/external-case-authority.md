# An external authority for case identity

Research for GitHub issue #7. Investigated 2026-08-11 against primary sources only:
the Wikidata Query Service, the Wikidata and Wikipedia Action APIs, first-party dataset
documentation, and live API probes. Every claim below states the query that produced it.

---

## Bottom line

**Mint cases locally.** No external authority covers the cases CrimeWeb is about.

The measured evidence, against a random sample of 25 real episodes from `data/episodes.json`:

| Measure                                                                | Result                   |
| ---------------------------------------------------------------------- | ------------------------ |
| Episodes whose case has a dedicated **Wikidata item**                  | **2 / 25 (8%)**          |
| Episodes whose case has a dedicated **Wikipedia article**              | **2 / 25 (8%)**          |
| Episodes where title + overview name no identifiable person at all     | **11 / 25 (44%)**        |
| Name-titled _Snapped_ episodes (larger N) matching any Wikidata entity | **6 / 59 (10.2%)**       |
| …of those 6, entities that are a **case** rather than a person         | **1**                    |
| False-positive rate of naive name matching against Wikipedia           | **4 / 9 raw hits (44%)** |

An 8–10% hit rate cannot be a spine. A `case` table keyed on a Wikidata QID would be
92% null, and the 8% that resolved would be the least interesting cases in the catalogue
(the ones already famous enough to have an encyclopaedia article).

Worse, the two properties the v2 design most wants — victim and perpetrator — are absent
even on the items that _do_ exist. `murder of Denise Amber Lee` (Q6937848), one of the two
hits, carries only `instance of: murder` and a date. No victim, no perpetrator, no location.
See Finding 3.

**Is an external ID still worth storing opportunistically? Yes — as a nullable enrichment
column, never as a key.** Concretely:

- `case.wikidata_qid TEXT NULL` and `case.wikipedia_title TEXT NULL`, populated by a
  best-effort background pass, never by the ingest path.
- Value is real but narrow: it buys a free summary, an image, a `commons` category and an
  outbound "read more" link for the ~8% of famous cases — exactly the cases a user is most
  likely to arrive searching for.
- It must be **human-confirmed or high-confidence-only**. Naive name matching produced a 44%
  false-positive rate (Finding 4): a _Snapped_ episode titled "Sydney Powell" matched the
  Wikipedia article for Sidney Powell the attorney; "Kimberly Williams" matched a
  disambiguation page. Auto-linking on name similarity would libel people.
- Store it as an _attribute of a locally-minted case_, not as the case's identity. The local
  ID must be stable whether or not Wikidata ever gains an item.

Nothing else in the field changes this. NamUs covers missing/unidentified persons only and
has no supported public read API. The FBI Supplementary Homicide Report is genuinely
case-level and near-complete but is **anonymous by construction** — no names, so it cannot
be joined to an episode title (Finding 8). CourtListener is throttled to 5 requests/minute
and its criminal coverage is federal-heavy, while these cases are state trial courts.

---

## Method

`data/episodes.json` at the time of research holds 261 episode rows (248 unique by
show+title+air date), spanning air dates **2024-05-30 to 2026-03-08**. It declares 8 shows,
but only 5 actually have episodes: Snapped (59), The First 48 (59), 20/20 (49), 48 Hours
(47), Dateline (47). Forensic Files, Cold Case Files and American Greed have zero rows.

Sample: `random.seed(42); random.sample(unique_episodes, 25)` — reproducible.

Three passes were run against each sampled episode, each more generous than the last:

1. Search the **episode title verbatim** on the Wikipedia search API and Wikidata
   `wbsearchentities`.
2. Extract candidate person names from **title + overview**, search those.
3. Hand-read the overview for the victim/perpetrator name and search that name directly,
   plus the `"Murder of X"` and `"Killing of X"` forms, on both Wikipedia and Wikidata.

A control was run to confirm the method finds things that exist: `Ted Bundy` → Q192218,
`Murder of JonBenet Ramsey` → Q51716967, `Murder of Laci Peterson` → Q6937947,
`Murder of Travis Alexander` → Q6407802. All four resolved on the first call. The method
works; the coverage does not.

---

## Finding 1 — Wikidata does model crimes as entities, and the ontology is adequate

Crimes are modelled as events, subclassed under **crime (Q83267)**. Instance counts, from
`https://query.wikidata.org/sparql`:

```sparql
SELECT (COUNT(DISTINCT ?x) AS ?n) WHERE { ?x wdt:P31/wdt:P279* wd:Q83267 }
```

→ **21,089** items (0.36 s).

Top classes:

```sparql
SELECT ?c ?cLabel (COUNT(DISTINCT ?x) AS ?n) WHERE {
  ?x wdt:P31 ?c . ?c wdt:P279* wd:Q83267 .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?c ?cLabel ORDER BY DESC(?n) LIMIT 25
```

→ massacre 3,613 · **murder (Q132821) 2,652** · homicide (Q149086) 1,407 · terrorist attack
1,316 · Holocaust train journey 1,256 · bomb attack 718 · mass murder (Q750215) 645 ·
mass shooting (Q21480300) 484 · attempted murder (Q81672) 354 · kidnapping (Q318296) 264 ·
**cold case (Q2055205) 244** · assassination 235 · arson 188.

Note what dominates: massacres, terrorism, the Holocaust, mass shootings. This is a
catalogue of _historical atrocities_, not of individual crimes.

**Legal case (Q2334719)** is a separate branch: `?x wdt:P31 wd:Q2334719` → **14,579** items.
These are court decisions (appellate case law), not crimes.

The properties exist and are correctly defined (fetched from
`https://www.wikidata.org/w/api.php?action=wbgetentities&props=labels|descriptions|datatype`):

| P      | Label            | Type     | Official description                                                         |
| ------ | ---------------- | -------- | ---------------------------------------------------------------------------- |
| P8032  | victim(s)        | item     | person(s) who were harmed from an act or event                               |
| P8031  | perpetrator      | item     | person or organization who carried out this harmful, illegal, or immoral act |
| P11922 | verdict          | item     | decision made at the end of a trial by the judge or jury                     |
| P1591  | defendant        | item     | person or organization accused at a trial                                    |
| P1595  | charge           | item     | offence with which someone is charged, at a trial                            |
| P1399  | convicted of     | item     | crime a person or organization was convicted of                              |
| P1840  | investigated by  | item     | person or organization involved in investigation of the item                 |
| P276   | location         | item     | location of the object, structure or event                                   |
| P585   | point in time    | time     | date something took place                                                    |
| P1120  | number of deaths | quantity | total number of people who died as a direct result                           |

So the _schema_ answer to issue #7 is yes. The _data_ answer, below, is no.

---

## Finding 2 — The properties exist but are barely populated

Global usage counts across all of Wikidata:

```sparql
SELECT ?p ?pLabel (COUNT(DISTINCT ?x) AS ?n) WHERE {
  VALUES ?prop { wdt:P11922 wdt:P1591 wdt:P1595 wdt:P8031 wdt:P8032 wdt:P1399 wdt:P1345 wdt:P1840 }
  ?x ?prop ?v . ?p wikibase:directClaim ?prop .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?p ?pLabel ORDER BY DESC(?n)
```

| Property                | Statements, entire Wikidata |
| ----------------------- | --------------------------- |
| convicted of (P1399)    | 14,969                      |
| defendant (P1591)       | 7,860                       |
| charge (P1595)          | 3,121                       |
| perpetrator (P8031)     | 2,701                       |
| victim(s) (P8032)       | 2,160                       |
| investigated by (P1840) | 887                         |
| **verdict (P11922)**    | **45**                      |

**Verdict is used 45 times in the whole of Wikidata.** It is effectively a nonexistent
property. Any v2 design that wants a verdict field must source it locally.

Restricted to the 2,652 items that are `instance of: murder`:

```sparql
SELECT ?p ?pLabel (COUNT(DISTINCT ?x) AS ?n) WHERE {
  ?x wdt:P31 wd:Q132821 . ?x ?prop ?v . ?p wikibase:directClaim ?prop .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?p ?pLabel ORDER BY DESC(?n) LIMIT 30
```

→ country 1,931 (73%) · point in time 1,692 (64%) · location 1,282 (48%) ·
number of deaths 776 (29%) · **victim(s) 463 (17%)** · **perpetrator 251 (9.5%)** ·
investigated by 67 (2.5%). Verdict does not appear at all.

So even in the best case — a murder that Wikidata has bothered to create an item for —
there is a **17% chance it names the victim** and a **9.5% chance it names the perpetrator**.

---

## Finding 3 — The decisive test: 25 random real episodes, 2/25 resolve

Sample drawn with `random.seed(42)` over the 248 unique episodes. "Case named?" means a
victim or perpetrator name is recoverable from the episode title plus TMDB overview.

| #   | Show         | Episode title                           | Case name recoverable  | Wikidata item for the case                     | Wikipedia article for the case          |
| --- | ------------ | --------------------------------------- | ---------------------- | ---------------------------------------------- | --------------------------------------- |
| 1   | Dateline     | Deadly Mirage                           | Rob Limon              | —                                              | —                                       |
| 2   | 20/20        | Ride or Die                             | _no name given_        | —                                              | —                                       |
| 3   | The First 48 | Murder in the Bud Room & A Mother Taken | _no name given_        | —                                              | —                                       |
| 4   | 20/20        | Meet the Other Me                       | _no name given_        | —                                              | —                                       |
| 5   | Dateline     | The Night of the Audition               | Shannon Madill Burgess | —                                              | —                                       |
| 6   | 48 Hours     | Coached To Kill                         | _no name given_        | —                                              | —                                       |
| 7   | 48 Hours     | Murder in the Parking Garage            | Kenneth Fandrich       | —                                              | —                                       |
| 8   | 48 Hours     | The Setup Murder of Kristil Krug        | Kristil Krug           | —                                              | —                                       |
| 9   | Dateline     | The Killer Among Them                   | Lance Herndon          | —                                              | —                                       |
| 10  | 20/20        | Meddler or Murderer?                    | _no name given_        | —                                              | —                                       |
| 11  | 48 Hours     | The Blackout Murder of Livye Lewis      | Livye Lewis            | —                                              | —                                       |
| 12  | The First 48 | Hunted on the Highway                   | _no name given_        | —                                              | —                                       |
| 13  | The First 48 | Inside The Tape Special #16             | _no name given_        | —                                              | —                                       |
| 14  | Dateline     | The Haunted House Confession            | Chantay Blankinship    | —                                              | —                                       |
| 15  | 20/20        | Badass Detective                        | _no name given_        | —                                              | —                                       |
| 16  | Dateline     | Under the Bay Bridge                    | Bob Lee                | _victim only_ — Q117455148 (`human`)           | _victim only_ — "Bob Lee (businessman)" |
| 17  | 48 Hours     | Facing a Monster                        | C.C. Opanowski         | —                                              | —                                       |
| 18  | Snapped      | Samantha Rabon                          | Samantha Rabon         | —                                              | —                                       |
| 19  | Snapped      | Antonetta Stevens                       | Antonetta Stevens      | —                                              | —                                       |
| 20  | The First 48 | Betrayal                                | _no name given_        | —                                              | —                                       |
| 21  | 20/20        | Life on the Line                        | Denise Amber Lee       | **Q6937848** `murder of Denise Amber Lee`      | **"Murder of Denise Amber Lee"**        |
| 22  | 20/20        | What Happened to the McStays?           | Joseph & Summer McStay | **Q16211094** `McStay family murder`           | **"McStay family murders"**             |
| 23  | 20/20        | Dirty Little Secret                     | Kari Baker             | _book only_ — Q5245641 `Deadly Little Secrets` | _book only_                             |
| 24  | Snapped      | Angela Sanford                          | Angela Sanford         | —                                              | —                                       |
| 25  | The First 48 | Sudden Impact                           | _no name given_        | —                                              | —                                       |

**2 / 25 = 8% full hits.** One partial (#16: the victim is notable as a tech executive, so
the _person_ has an item; the killing does not). One tangential (#23: a true-crime book about
the case has an item; the case does not).

**11 / 25 = 44% of episodes name nobody at all.** "Ride or Die" is described as _"a 24-year-old
mother is brutally shot and killed outside her workplace"_; "Meddler or Murderer?" as
_"a wealthy grandmother goes on trial accused in the murder-for-hire of a family member"_.
No external authority can help here because there is nothing to look up — a human could not
resolve these either without watching the episode. This is an independent argument for local
minting: **the case record must be able to exist before it is identified.**

### The two hits are themselves nearly empty

```sparql
SELECT ?x ?xLabel ?cLabel ?vLabel ?pLabel ?loc ?date WHERE {
  VALUES ?x { wd:Q16211094 wd:Q6937848 wd:Q117455148 }
  ?x wdt:P31 ?c .
  OPTIONAL { ?x wdt:P8032 ?v } OPTIONAL { ?x wdt:P8031 ?p }
  OPTIONAL { ?x wdt:P276 ?loc } OPTIONAL { ?x wdt:P585 ?date }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
```

- **Q6937848** `murder of Denise Amber Lee` — `instance of: murder`, `point in time: 2008-01-17`.
  **No victim, no perpetrator, no location.** The victim's name exists only in the label string.
- **Q16211094** `McStay family murder` — `instance of: mass murder`, `point in time: 2010-02-01`,
  `location: California (Q99)`. **No victim, no perpetrator.** Location is state-level.
- **Q117455148** `Bob Lee` — `instance of: human`. A person, not a case.

Even at 8% coverage, the payload is a label and a date. Everything the v2 case record needs
would still have to be authored locally.

---

## Finding 4 — Larger-N test: all 59 name-titled _Snapped_ episodes

_Snapped_ is the most favourable possible test — every one of its 59 unique titles in the
dataset is bare `Firstname Lastname`, i.e. a perpetrator name handed to the matcher for free.
Each was checked for an exact en.wikipedia page under the title, `Murder of <title>` and
`Trial of <title>` (via `action=query&prop=pageprops&redirects=1`), plus a Wikidata
`wbsearchentities` lookup.

Raw "hits" were 9. After adjudicating each against `wdt:P31`, **4 were false positives**:

| Title             | Matched                                                                   | Verdict                                |
| ----------------- | ------------------------------------------------------------------------- | -------------------------------------- |
| Brookey Lee West  | Q67088207 `American murderer`, `instance of: human`                       | ✅ correct (perpetrator)               |
| Ashley Benefield  | → "Black Swan manslaughter case", Q128795227                              | ✅ correct (case)                      |
| Kimberly Saenz    | Q6409909 `Kimberly Clark Saenz`, `human`                                  | ✅ correct (perpetrator)               |
| Ezra McCandless   | Q103431979, redirects to "Murder of Alex Woodworth"                       | ✅ correct (perpetrator)               |
| Kelsey Turner     | Q115581683 `American fashion model`, `human`                              | ✅ correct (perpetrator)               |
| Mary Lee Orsini   | Q120122625 `convicted murderer`, `human` (Wikidata only, no enwiki page)  | ✅ correct (perpetrator)               |
| Jennifer Blake    | Q16800094 — `instance of: Wikimedia human name disambiguation page`       | ❌ **disambiguation page**             |
| Kimberly Williams | Q364579 — `instance of: Wikimedia disambiguation page`                    | ❌ **disambiguation page**             |
| Sydney Powell     | → "Sidney Powell", Q101713828 `American attorney and conspiracy theorist` | ❌ **wrong person entirely**           |
| Debra Taylor      | → "Faryion Wardrip", Q3739851 `American serial killer`                    | ❌ **redirect to an unrelated killer** |

**6 true matches / 59 = 10.2%.** Of those six, **five are person items for the perpetrator**
and only one (Q128795227) is a case-shaped entity.

And that one case item is, on inspection, a stub:

```sparql
SELECT ?p ?v ?vLabel WHERE { wd:Q128795227 ?prop ?v . ?p wikibase:directClaim ?prop .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }
```

→ `country: United States`, `number of deaths: 1`. **No `instance of` at all.** No date, no
location, no victim, no perpetrator. It would not even be returned by the
`?x wdt:P31/wdt:P279* wd:Q83267` query used in Finding 1.

The 4/9 (44%) false-positive rate is the operationally important number. It means an
auto-linker keyed on name similarity would, roughly half the time, attach a murder case to a
living unrelated person. That is a defamation risk, not just a data-quality one.

---

## Finding 5 — What Wikidata's US crime items actually _are_

```sparql
SELECT (COUNT(DISTINCT ?x) AS ?n) WHERE {
  ?x wdt:P31/wdt:P279* wd:Q83267 ; wdt:P17 wd:Q30 ; wdt:P585 ?d . FILTER(YEAR(?d) >= 1990)
}
```

→ **743** US crime items with a date since 1990. Since 2015: **418**.

Listing the 2024 ones shows the selection criterion plainly:

```sparql
SELECT ?x ?xLabel ?cLabel ?date WHERE {
  ?x wdt:P31/wdt:P279* wd:Q83267 ; wdt:P17 wd:Q30 ; wdt:P585 ?date ; wdt:P31 ?c .
  FILTER(YEAR(?date) = 2024)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 25
```

→ Perry High School shooting · 2024 Apalachee High School shooting · Abundant Life Christian
School shooting · attempted assassination of Donald Trump in Pennsylvania · killing of Sonya
Massey · attempted assassination of Donald Trump in Florida · killing of Brian Thompson ·
Killing of Jonathan Diller · 2024 Joliet shootings · 2024 Kansas City parade shooting ·
2024 Minneapolis shooting · 2024 Methuen Shooting · 2024 Florence shooting.

Every one is a mass shooting, an assassination, a police killing or the murder of a
public figure — a **national news event**. Not one is a domestic homicide, a murder-for-hire
or a cold case. Wikidata's inclusion threshold for crime is "made the national news for a
week", which is precisely orthogonal to what Dateline and Snapped cover.

For scale: the ~418 US crime items dated 2015–2026 sit against roughly 19,000–22,000
homicides per year in the US over that period. That is on the order of **0.2%**.

---

## Finding 6 — Wikipedia articles and category structure

Wikipedia's category tree for crime exists and is well-formed, but it is small.

Via `action=query&prop=categoryinfo`:

| Category                                       | Direct pages | Subcats |
| ---------------------------------------------- | ------------ | ------- |
| Category:Murder in the United States           | 9            | 23      |
| Category:2010s murders in the United States    | 2            | 12      |
| Category:2020s murders in the United States    | 0            | 8       |
| Category:People murdered in the United States  | 0            | 11      |
| Category:Unsolved murders in the United States | 21           | 7       |
| Category:Murder in Texas                       | 51           | 10      |
| Category:Female murderers                      | 14           | 9       |

Walking `Category:2020s murders in the United States` → year subcategories → state
subcategories and summing article counts:

| Year category                           | Articles                  |
| --------------------------------------- | ------------------------- |
| 2020 murders in the United States       | 47 (+12 in state subcats) |
| 2021 murders in the United States       | 46                        |
| 2022 murders in the United States       | 54                        |
| 2023 murders in the United States       | 39                        |
| 2024 murders in the United States       | 22                        |
| 2025 murders in the United States       | 18                        |
| 2026 murders in the United States       | 13 (+4)                   |
| 2020s mass murders in the United States | 70                        |
| **Total, whole 2020s decade**           | **≈325**                  |

**English Wikipedia has on the order of 20–55 articles per year for all US murders.** The
same period saw roughly 20,000 homicides annually. Coverage is ~0.2%.

The category structure is also unusable as a partition: it is year-and-state based, has
inconsistent depth (2021–2025 have zero state subcategories while 2020 and 2026 have one
each), and is maintained by hand.

One structural note worth recording: these cases _are_ documented on Wikipedia, but as **rows
in episode-list articles**, not as case articles. Searching `"Samantha Rabon"` returns exactly
one page — `List of Snapped episodes` (Q125554155). That page is a coverage index, not a case
authority; it tells you an episode exists, which CrimeWeb already knows from TMDB.

---

## Finding 7 — Wikidata cannot anchor the _coverage_ side either

If cases can't be anchored externally, the fallback idea would be to anchor episodes
externally and hang cases off them. That fails too.

```sparql
SELECT ?series ?seriesLabel (COUNT(DISTINCT ?ep) AS ?eps) WHERE {
  VALUES ?series { wd:Q1172329 wd:Q7547316 wd:Q4031546 wd:Q197867 wd:Q7734069 }
  ?ep wdt:P179 ?series .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} GROUP BY ?series ?seriesLabel
```

Series QIDs resolved from en.wikipedia `pageprops`: Dateline NBC Q1172329, Snapped Q7547316,
48 Hours Q4031546, 20/20 Q197867, The First 48 Q7734069.

Result: **one row — 48 Hours, 1 episode.** Across five long-running series and thousands of
broadcast episodes, Wikidata holds exactly **one** episode item. TMDB (already in use) is
categorically better here and there is no reason to add Wikidata to the coverage path.

---

## Finding 8 — Other public datasets with an ID space

### NamUs — National Missing and Unidentified Persons System (US DOJ / NIJ)

- Covers "missing, unidentified, and unclaimed person cases across the United States"
  ([namus.nij.ojp.gov](https://namus.nij.ojp.gov/)).
- **It does have a real ID space and it is live.** Probing the site's backend directly:

  ```
  POST https://www.namus.gov/api/CaseSets/NamUs/MissingPersons/Search
  {"take":2,"skip":0,"projections":["namus2Number","firstName","lastName",
   "dateOfLastContact","cityOfLastContact","stateOfLastContact"],"predicates":[],"sort":[]}
  ```

  → HTTP 200, `{"count":26611,"results":[{"namus2Number":565,"firstName":"Oliver",
"lastName":"Smith","dateOfLastContact":"1996-04-10T00:00:00","cityOfLastContact":"Columbus",
"stateOfLastContact":"Georgia", ...}]}`

  26,611 missing-person cases, each with a stable `namus2Number`, victim name, date and
  city/state. `GET /api/CaseSets/NamUs/MissingPersons/Cases/1` also returns 200/JSON.

- **But this is not a supported public API.** It is the website's own backend, undocumented
  and unversioned. NamUs' only documented programmatic interface is
  [Data Imports](https://namus.nij.ojp.gov/dashboards/data-imports), which is explicitly
  inbound-only — _"this data import will be unidirectional, from the client to NamUs"_ — and
  gated behind _"Server-to-server (key and certificate) authentication ... based on OJP and
  NamUs standards"_ for "trusted external clients". There is no public read contract to
  depend on, and building ingest on an undocumented government endpoint is a liability.
- **Scope mismatch anyway.** NamUs holds missing/unidentified/unclaimed persons. The typical
  Dateline or Snapped case is a _solved_ homicide with a named, convicted perpetrator — which
  by definition has left NamUs' population. It could enrich the cold-case and
  missing-persons slice of the catalogue; it cannot anchor it.

### Murder Accountability Project / FBI Supplementary Homicide Report

MAP republishes the FBI SHR plus "nearly 39,000 homicides obtained by MAP through the Freedom
of Information Act", as SPSS and CSV, case-level, 1976–present, 31 variables
([murderdata.org/p/data-docs.html](https://www.murderdata.org/p/data-docs.html), last updated
2026-03-22).

This is the most genuinely _complete_ case-level homicide dataset in existence. It is also
unusable for identity. Fetching the first 2 KB of `SHR76_24a.csv` directly gives the header:

```
ID,CNTYFIPS,Ori,State,Agency,Agentype,Source,Solved,Year,Month,Incident,ActionType,
Homicide,Situation,VicAge,VicSex,VicRace,VicEthnic,OffAge,OffSex,OffRace,OffEthnic,
Weapon,Relationship,Circumstance,Subcircum,VicCount,OffCount,FileDate,MSA
```

and a sample row:

```
197603001AK00101,"Anchorage, AK",AK00101,Alaska,Anchorage,Municipal police,FBI,Yes,1976,
March,1,Normal update,Murder and non-negligent manslaughter,Single victim/single offender,
48,Male,Unknown,...
```

There **is** a stable per-incident ID (`197603001AK00101` = year + month + incident sequence +
agency ORI). There are **no names** — victims and offenders are described only by age, sex,
race and ethnicity. The SHR is anonymous by construction. There is therefore no join key
between an episode titled "Trista Hrabak" and an SHR record. Useful as a statistical
backdrop; worthless as a case authority.

### CourtListener / RECAP (Free Law Project)

[REST API v4](https://wiki.free.law/c/courtlistener/help/api/rest/v4/overview) exposes
dockets, opinions, RECAP/PACER items, parties and attorneys across ~3,359 jurisdictions, with
stable numeric IDs and token auth. Two disqualifiers:

- **Rate limits: 5 requests/minute, 50/hour, 125/day** for default authenticated users,
  as rolling concurrent throttles. That is roughly 125 case lookups _per day_ — not an
  ingest-time authority for a catalogue of thousands of episodes.
- **Coverage shape.** Its bulk is federal appellate and PACER material. These cases are
  state-court first-degree murder trials, which are exactly where US court-record digitisation
  is weakest. A docket number is also not a case identity — one case can span multiple dockets
  across defendants and appeals.

### FBI Crime Data Explorer

`https://cde.ucr.cjis.gov/` renders client-side and returned no content to a fetch; the
`api.usa.gov/crime/fbi/cde/` root returned HTTP 403 without a key. Regardless, CDE publishes
UCR/NIBRS aggregate and incident-level statistics, which have the same anonymity property as
the SHR above. Not an identity authority.

---

## Finding 9 — Operational profile, if you use Wikidata as enrichment anyway

**Latency is fine.** Measured from this machine, n=5 each, median:

| Call                           | Median     |
| ------------------------------ | ---------- |
| WDQS SPARQL exact-label lookup | **0.29 s** |
| Wikidata `wbsearchentities`    | **0.36 s** |
| en.wikipedia `list=search`     | **0.48 s** |

Broader analytical queries ran 0.3–15 s. One query — property-usage across
`?x wdt:P31/wdt:P279* wd:Q2334719` — returned **HTTP 504 Gateway Timeout**, a live
demonstration of the documented ceiling.

**WDQS limits** ([Wikidata Query Service/User Manual](https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual)):

- Query timeout: **60 seconds** — _"Every query will timeout when it takes more time to
  execute than this configured deadline."_
- _"One client (user agent + IP) is allowed 60 seconds of processing time each 60 seconds"_
- _"One client is allowed 30 error queries per minute"_
- _"Currently access to the service is limited to 5 parallel queries per IP"_
- Over-limit responses are **HTTP 429** with a `Retry-After` header.
- _"Clients who don't comply with the User-Agent policy may be blocked completely — make sure
  to send a good User-Agent header."_

**Wikimedia API limits** ([Wikimedia APIs/Rate limits](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits)),
per minute: unidentified clients **10**; unauthenticated with a proper User-Agent **200**;
authenticated established editors **2000**. The User-Agent must _"include a meaningful
User-Agent header that includes contact information such as an email or full URL."_

**Licence** ([Wikidata:Data access](https://www.wikidata.org/wiki/Wikidata:Data_access)):
_"All that data is licensed CC0, 'No rights reserved', for the public domain."_ Attribution
appreciated, not required. English Wikipedia prose is CC BY-SA 4.0 and would require
attribution if quoted.

Practical implication: 200 req/min unauthenticated is ample for a **background** enrichment
pass over a few thousand cases, but the 5-parallel-query and 60s-per-60s WDQS budget means
this must be a queued back-off job, not a synchronous call in the ingest path or a request
handler.

---

## Recommendation

1. **Mint case IDs locally.** The case is a first-class local entity with a locally-generated
   stable ID. Justification: 8% Wikidata coverage, 8% Wikipedia coverage, and 44% of episodes
   that name nobody identifiable at all — a case record must be creatable from an episode
   alone.
2. **Author victim / perpetrator / location / date / verdict locally.** Even where an external
   item exists, victim is present on 17% of murder items, perpetrator on 9.5%, and verdict on
   45 items in the entirety of Wikidata. There is nothing to inherit.
3. **Store `wikidata_qid` and `wikipedia_title` as nullable enrichment**, populated by a
   throttled background job, never on the ingest path. Expect ~8–10% fill.
4. **Never auto-link on name similarity.** Measured 44% false-positive rate on the most
   favourable input available (bare `Firstname Lastname` titles). Require either an exact
   `instance of` check that the target is a crime or a `human` with a murder-related
   description, plus corroboration on date or location — or a human confirmation step.
5. **Do not model coverage via Wikidata.** It has one episode item across all five shows;
   TMDB already does this better.
6. Optionally revisit **NamUs** later, scoped narrowly to the cold-case / still-missing slice,
   accepting that its only endpoint is undocumented.
