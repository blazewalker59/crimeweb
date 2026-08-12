# TMDb's discovery surface for true crime

Research note for GitHub issue #6. Investigates whether CrimeWeb v2 can _discover_ true
crime programming from the TMDb API instead of being handed a hardcoded list of show IDs.

- **Date of investigation:** 2026-08-11
- **Method:** live calls against `https://api.themoviedb.org/3` using the repo's
  `TMDB_API_KEY`, plus the official API reference at `developer.themoviedb.org`.
  Every count and title in this document came back from a real request on that date.
- **Current state being challenged:** `scripts/fetch-episodes.ts:17` — a hardcoded
  `CRIME_SHOWS` array of 8 TV IDs, walked season by season, 2 years back.

---

## Bottom line

**Discovery can replace the hardcoded array as the _source of breadth_, but a curated
list must stay in the loop permanently — demoted from "the catalog" to "a seed and a
safety net."**

The evidence, measured rather than assumed:

- A **union of 5 discover queries reaches 25 of 26** known true crime titles (96%)
  spanning both the current network shows and the streaming originals v1 needs to cover.
  That is good enough to build a catalog on.
- **No single query gets close.** The best one (`with_genres=99,80`, Documentary AND
  Crime) reaches **21/26 (81%)** and misses `20/20` outright — one of the eight shows
  already hardcoded. Anything built on one filter will silently lose titles the product
  considers core.
- The misses are not random, they are **metadata gaps at the source**. `20/20` is not
  tagged with the Crime genre at all; `American Greed` and `The Vow` have _zero_
  keywords; `Murdaugh Murders`, `The Keepers` and `LuLaRich` lack the `true crime`
  keyword. TMDb metadata is volunteer-contributed, so these gaps appear and disappear
  without notice. A discovery-only pipeline is one anonymous edit away from dropping a
  flagship show.
- Therefore: **run discovery for breadth, keep a curated ID list as a guaranteed
  floor**, and treat any curated ID that discovery fails to return as a signal to
  submit a metadata fix upstream.

Three secondary conclusions that matter as much for v1 scope:

- **Streaming coverage is genuinely good.** All 8 spot-checked Netflix/HBO titles were
  present, correctly attributed to their provider, and carried complete per-episode
  data — equal to or better than the network shows already ingested.
- **But the air-date model breaks on streaming.** Binge-dropped limited series put
  every episode on a single `air_date` (all 3 episodes of _American Nightmare_ on
  `2024-01-17`). Any "what aired this week" logic inherited from the Dateline-shaped
  ingest will misrepresent streaming releases. See
  [§6](#6-episode-level-data-for-streaming-limited-series).
- **Two things to fix regardless of the discovery decision:** our ingest throttles for a
  rate limit TMDb **disabled in December 2019** (the real ceiling is ~10× higher), and
  displaying watch-provider data **obliges us to credit JustWatch** or lose API access.
  See [§5](#5-rate-limits-and-pagination-ceilings) and
  [§4](#4-streaming-coverage-and-provider-attribution).

---

## 1. Keywords relevant to true crime

### The IDs

Retrieved via `GET /search/keyword?query=…`. These are the numeric IDs to use with
`with_keywords`:

| Keyword                  |         ID | Notes                                      |
| ------------------------ | ---------: | ------------------------------------------ |
| `true crime`             |  **33722** | The single most useful tag.                |
| `crime documentary`      | **307587** | Small but high precision; catches `20/20`. |
| `serial killer`          |  **10714** | Heavily used by _scripted_ titles too.     |
| `cold case`              | **210662** |                                            |
| `murder investigation`   | **161982** |                                            |
| `criminal investigation` | **157241** | Mostly procedural drama, low value.        |
| `murder`                 |   **9826** | Too noisy to use — see below.              |
| `based on true story`    |   **9672** | Dramatizations, not documentary.           |
| `docuseries`             | **376033** | Effectively dead — see below.              |
| `documentary`            | **282080** | A _topic_ tag, not the genre. Do not use.  |

Source: `GET /search/keyword?query=true+crime` → `total_results: 2`, returning
`33722 true crime` and `2151 drug crime`.

### Reliability of keyword tagging

This is the weak point. Across 22 spot-checked well-known true crime titles, only
**14 (64%)** carried the `true crime` keyword. Confirmed misses, each verified via
`GET /tv/{id}?append_to_response=keywords`:

| Title                   | TMDb ID      | Has `true crime`? | Keywords actually present                     |
| ----------------------- | ------------ | ----------------- | --------------------------------------------- |
| The Keepers             | tv/26101     | **No**            | corruption, nun, cover-up, murder, miniseries |
| Murdaugh Murders        | tv/218530    | **No**            | scandal, south carolina, family, power        |
| The Devil Next Door     | tv/94813     | **No**            | germany, israel, nazi, trial, war crime       |
| The Vow                 | tv/49920     | **No**            | _(empty — zero keywords)_                     |
| LuLaRich                | tv/131295    | **No**            | pyramid scheme, multi-level marketing         |
| Depp v Heard            | tv/227381    | **No**            | court case, defamation, celebrity             |
| The Tinder Swindler     | movie/923632 | **No**            | con man, fraud, romance scam                  |
| Abducted in Plain Sight | movie/470401 | **No**            | kidnapping, child molester, abduction         |

Of the eight currently hardcoded shows, **three lack the `true crime` keyword**
(`20/20`, `Cold Case Files`, `American Greed`) and `American Greed` has **no keywords
at all**. Keyword-only discovery recalls just **5 of the 8 shows the app already
ships** — worse than the status quo.

### Keywords that look useful and are not

- **`murder` (9826)** — `GET /discover/movie?with_keywords=9826` returns
  **5,398 results**, top hits including _The Lion King_ (movie/8587). It tags plot
  content, not genre. Unusable as a discovery filter.
- **`documentary` (282080)** — a topical keyword applied to films _about_ documentary
  making and assorted unrelated titles. `GET /discover/movie?with_keywords=282080`
  returns _Mariah Carey's Magical Christmas Special_ (movie/766319) in the top results.
  The genre ID 99 is the correct tool; this keyword is a trap sharing its name.
- **`docuseries` (376033)** — **5 results on TV, 0 on movies.** Essentially unused
  despite being the exact word for the format v1 targets.

### Keyword search is fuzzy

`GET /search/keyword?query=crime` returns `crimea`, `grime`, `chime`, `prime` and
`crimen` among its 185 results. Keyword IDs must be resolved once and pinned as
constants — never looked up by name at runtime.

---

## 2. Genre filters

TMDb TV and movie genre lists are separate but both use **99 = Documentary** and
**80 = Crime**.

### Documentary AND Crime is the strongest single filter

`GET /discover/tv?with_genres=99,80` (comma = AND) → **2,126 results**, and the top of
the list is almost exactly CrimeWeb's subject matter: _Dateline_ (78), _Snapped_
(10184), _48 Hours_ (3719), _The First 48_ (5146), _Forensic Files_ (11105).

`GET /discover/movie?with_genres=99,80` → **1,595 results**, top hits
_Vjeran Tomic: The Spider-Man of Paris_, _Kidnapped: Elizabeth Smart_,
_Aileen: Queen of the Serial Killers_.

Precision is high. **Recall is the problem** — see §7.

### The OR form is useless

`GET /discover/tv?with_genres=99|80` (pipe = OR) → **41,309 results**, led by
_The Mentalist_, _Law & Order: SVU_, _NCIS_, _Criminal Minds_. It collapses into "all
documentaries plus all crime drama." Not a discovery filter.

For reference, the unfiltered single genres: TV Documentary alone = **32,897**, TV
Crime alone = **10,537**, movie Documentary alone = **226,270**, movie Crime alone =
**42,398**.

### Genre tagging is more reliable than keywords, but not complete

16 of the 22 spot-checked titles (73%) carried both 99 and 80 — better than the 64%
keyword rate. The genre misses are instructive:

| Title                                 | Genres actually assigned | Why it escapes `99,80`   |
| ------------------------------------- | ------------------------ | ------------------------ |
| `20/20` (tv/2035)                     | News, Documentary        | **No Crime genre**       |
| Unsolved Mysteries (tv/126)           | Mystery, Drama, Crime    | **No Documentary genre** |
| I Just Killed My Dad (tv/206492)      | Documentary              | No Crime genre           |
| LuLaRich (tv/131295)                  | Documentary              | No Crime genre           |
| Depp v Heard (tv/227381)              | Reality, Documentary     | No Crime genre           |
| The Menendez Brothers (movie/1360610) | Documentary              | No Crime genre           |

`20/20` is the headline finding: **a show already in the hardcoded array is
unreachable by the best genre filter.** It is recoverable via
`with_genres=99,10763` (Documentary + News, 372 results) or via the
`crime documentary` keyword 307587 (66 results) — both verified to return tv/2035.

### `with_type` — useful, with one sharp edge

`/discover/tv` accepts `with_type`. The API reference only publishes _"possible values
are: [0, 1, 2, 3, 4, 5, 6]"_ with no labels; the authoritative mapping comes from a
TMDb staff post — Travis Bell, `https://www.themoviedb.org/talk/5e1a60f7459ad6001435e0ae`:

> TV discover now supports a `with_type` filter.
> Documentary: 0 / News: 1 / Miniseries: 2 / Reality: 3 / Scripted: 4 / Talk Show: 5 /
> Video: 6

Measured against `with_genres=99,80`, matching those labels:

| `with_type` | Meaning        | Results |
| ----------: | -------------- | ------: |
|           0 | Documentary    |   1,172 |
|           1 | News           |       5 |
|           2 | **Miniseries** |     535 |
|           3 | Reality        |      54 |
|           4 | Scripted       |     354 |
|           5 | Talk Show      |       3 |
|           6 | Video          |       3 |

`with_type=2` (Miniseries) is a direct handle on the "limited series" half of v1 scope,
and TMDb's own editorial rules make it a _reliable_ one. From the TV Bible
(`https://www.themoviedb.org/bible/tv`), verbatim:

> A miniseries is defined as a single-season television series telling a complete story
> in a pre-determined number of episodes. Miniseries, event series and limited series
> should be set to miniseries if they have **no more than 12 episodes**.
>
> The 'miniseries' type take precedence over the other types of TV show. Scripted and
> documentary miniseries should be set to 'miniseries'.

That precedence rule matters: **a documentary limited series is typed Miniseries (2),
not Documentary (0)** — so the two buckets are disjoint and both must be queried. It
also explains the spot-check results, where _American Nightmare_, _Don't F\*\*k with
Cats_, _Ted Bundy Tapes_, _The Keepers_ and _Wild Wild Country_ all came back
`type=Miniseries` while _Making a Murderer_, _Tiger King_ and _The Jinx_ (all
multi-season) came back `type=Documentary`.

`with_type=4` (Scripted) is the natural way to _exclude_ dramatizations. Note the Bible
also states Scripted is the **default fallback** for anything not fitting the seven
types, so it is a noisy bucket.

**The sharp edge:** `Dateline` (tv/78) is typed **News**, not Documentary — one of only
5 titles in that bucket. Filtering `with_type=0` to mean "documentary" drops the app's
single most important show.

---

## 3. `/discover` parameters

### Date windows — `air_date` vs `first_air_date` is the key distinction

Measured on `/discover/tv?with_genres=99,80`:

| Filter                          | Results | Behaviour                                                                                                                   |
| ------------------------------- | ------: | --------------------------------------------------------------------------------------------------------------------------- |
| `first_air_date.gte=2024-01-01` |     513 | Series that **premiered** in the window. Top hit _The Idaho Murders_ (2026).                                                |
| `air_date.gte=2024-01-01`       |     712 | Series with **any episode airing** in the window. Returns _Dateline_ (first aired 1992), _Snapped_ (2004), _Mayday_ (2003). |

**`air_date.*` is the parameter CrimeWeb wants.** It is the only one that surfaces
long-running series that are still producing episodes — precisely the shows in the
current hardcoded list. `first_air_date.*` would exclude every one of them.
Both accept `.gte` / `.lte` bounds.

On `/discover/movie` the equivalent is `primary_release_date.gte` / `.lte`
(`with_genres=99,80&primary_release_date.gte=2024-01-01` → 289 results).

### Boolean syntax

Verified empirically on `with_keywords`:

| Form           | Meaning       | Result |
| -------------- | ------------- | -----: |
| `33722`        | true crime    |    941 |
| `10714`        | serial killer |    311 |
| `33722,10714`  | **AND**       |     72 |
| `33722\|10714` | **OR**        |  1,180 |

Comma = AND, pipe = OR. This matches the documented behaviour
(`https://developer.themoviedb.org/reference/discover-tv`):

> Also note that a number of filters support being comma (`,`) or pipe (`|`) separated.
> Comma's are treated like an `AND` query while pipe's are treated like an `OR`.

The docs attach that note explicitly to `with_genres`, `with_keywords`, `with_companies`,
`with_status`, `with_type`, `with_watch_providers` and
`with_watch_monetization_types`. **It is _not_ documented for `with_networks`, nor for
any of the `without_*` params** — so their separator semantics are unverified from
docs.

Empirically, **`with_networks` is the exception:** `with_networks=213,49` (AND) returns
**0** — a title cannot belong to two networks — so networks must always be combined
with `|`. `with_networks=213|49|3186|453|3353` → 220 results with `with_genres=99,80`.

One documentation caveat: the `/discover/tv` page carries an "Advanced Filtering"
section discussing `region` and `with_release_type`, neither of which is a TV
parameter — that text is copy-pasted from the movie page. Do not trust it for TV.

### `sort_by` — and a silent-fallback trap

All of these returned HTTP 200 against `/discover/tv?with_genres=99,80`:

| `sort_by`             | First result                                     |
| --------------------- | ------------------------------------------------ |
| `popularity.desc`     | Mayday (2003)                                    |
| `first_air_date.desc` | Unmasking a Monster: Aileen Wuornos (2026-09-30) |
| `vote_average.desc`   | Murder 101 (2026)                                |
| `vote_count.desc`     | Don't F\*\*k with Cats (2019)                    |
| `name.asc`            | #CyberSleuths: The Idaho Murders                 |
| `air_date.desc`       | Mayday (2003) — **identical to popularity.desc** |
| `revenue.desc`        | Mayday (2003) — **identical to popularity.desc** |

The official TV `sort_by` enum (`https://developer.themoviedb.org/reference/discover-tv`,
default `popularity.desc`) is exactly:

```
first_air_date.asc/desc, name.asc/desc, original_name.asc/desc,
popularity.asc/desc, vote_average.asc/desc, vote_count.asc/desc
```

**`air_date.*` and `revenue.*` are not in it** — confirming they are invalid. Yet
neither errors; both silently fall back to popularity ordering. Unsupported sort values
fail quiet, so sorts must be verified by inspecting results, not by checking for a
non-200. (Note the asymmetry: `air_date` is a valid _filter_ on `/discover/tv` but not
a valid _sort_.)

The movie enum is different — it includes `revenue.asc/desc`, `title.asc/desc`,
`original_title.asc/desc` and `primary_release_date.asc/desc`, and there is **no
`release_date.*` sort**, only `primary_release_date.*`
(`https://developer.themoviedb.org/reference/discover-movie`).

For freshness-driven ingest, `first_air_date.desc` (TV) and `primary_release_date.desc`
(movie) are the sorts that actually work.

---

## 4. Streaming coverage and provider attribution

### Coverage is good

All 8 spot-checked Netflix titles were present in TMDb with correct provider data, and
all 8 were reachable through discovery — via **both** the availability filter and the
network filter:

| Title                          | In `with_watch_providers=8` + `watch_region=US` + `99,80` | In `with_networks=213` + `99,80` |
| ------------------------------ | --------------------------------------------------------- | -------------------------------- |
| Making a Murderer (64439)      | IN                                                        | IN                               |
| The Keepers (26101)            | IN                                                        | IN                               |
| Don't F\*\*k with Cats (96129) | IN                                                        | IN                               |
| American Nightmare (242845)    | IN                                                        | IN                               |
| Tiger King (100698)            | IN                                                        | IN                               |
| Murdaugh Murders (218530)      | IN                                                        | IN                               |
| Ted Bundy Tapes (85833)        | IN                                                        | IN                               |
| Night Stalker (114705)         | IN                                                        | IN                               |

(148 and 140 total results respectively; both sets enumerated in full and checked.)

Per-title attribution via `GET /tv/{id}/watch/providers` is accurate:

- Making a Murderer → `Netflix`, `Netflix Standard with Ads` (131 regions)
- The Jinx → `HBO Max`, `HBO Max Amazon Channel`, `YouTube TV` (96 regions)
- Dateline → `Peacock Premium`, `NBC`, `fuboTV`, `Peacock Premium Plus` (3 regions)

### Compliance: JustWatch attribution is mandatory

Before any of this ships, note the licensing condition. From
`https://developer.themoviedb.org/reference/tv-series-watch-providers`, verbatim:

> Powered by our partnership with JustWatch, you can query this method to get a list of
> the streaming/rental/purchase availabilities per country by provider.
>
> This is _not_ going to return full deep links, but rather, it's just enough
> information to display what's available where.
>
> **JustWatch Attribution Required** — In order to use this data you must attribute the
> source of the data as **JustWatch**. If we find any usage not complying with these
> terms we will revoke access to the API.

Two hard requirements follow: **the UI must credit JustWatch** wherever provider data
is shown, and the app should link to the `link` URL TMDb returns per country rather
than construct its own provider deep links (TMDb explicitly notes these are not deep
links and asks you to link back to the TMDb watch page). Non-compliance is grounds for
revoking API access — this is a launch blocker, not a nicety.

### Trap 1: `with_watch_providers` is silently ignored without `watch_region`

This is the most dangerous behavioural finding in the section.

```
GET /discover/tv?with_genres=99,80&with_watch_providers=8    -> total_results: 2126
GET /discover/tv?with_genres=99,80&with_watch_providers=8&watch_region=US -> total_results: 148
```

2,126 is exactly the count for `with_genres=99,80` with **no provider filter at all**.
Omitting `watch_region` does not error and does not warn — the provider filter is
dropped and you get the unfiltered set back, looking like a successful query.

The docs do state the dependency, though only as a terse note on the param:
`with_watch_providers` — _"use in conjunction with `watch_region`"_
(`https://developer.themoviedb.org/reference/discover-tv`). They do not say that
violating it fails silently. Note also that **`without_watch_providers` has no
published description at all**, including whether it carries the same requirement — it
does in practice, but that is undocumented.

### Trap 2: providers mean "streamable now", not "original"

`with_watch_providers=8` (Netflix) returns _48 Hours_ (3719) and _The First 48_ (5146)
— licensed CBS and A&E shows, not Netflix originals. Availability is a licensing
snapshot that churns.

For _originals_, `with_networks` is the correct parameter. Measured with
`with_genres=99,80`:

| Streamer    | Network ID | Results |
| ----------- | ---------: | ------: |
| Netflix     |        213 |     140 |
| Hulu        |        453 |      35 |
| Prime Video |       1024 |      29 |
| HBO         |         49 |      23 |
| Peacock     |       3353 |      15 |
| Paramount+  |       4330 |      11 |
| Max         |       3186 |       7 |
| Apple TV+   |       2552 |       3 |

**A streaming brand is not one network ID.** _The Jinx_ sits under HBO (49), while
Max (3186) holds only 7 titles. Any "everything on Max" query must OR the legacy and
current entities together. Expect the same for Discovery+/HBO Max, whose _provider_
IDs 520 and 1899 returned identical result sets post-merger.

### Watch provider IDs (US, TV), confirmed live

`GET /watch/providers/tv?watch_region=US`:

| Provider                  |   ID |
| ------------------------- | ---: |
| Netflix                   |    8 |
| Netflix Standard with Ads | 1796 |
| Amazon Prime Video        |    9 |
| Hulu                      |   15 |
| HBO Max                   | 1899 |
| Apple TV                  |  350 |
| Peacock Premium           |  386 |
| Peacock Premium Plus      |  387 |
| Paramount Plus Premium    | 2303 |
| Paramount Plus Essential  | 2616 |
| Discovery +               |  520 |
| Investigation Discovery   |  408 |
| AMC+                      |  526 |

Note there is **no bare "Paramount Plus" or "Peacock" entry** — the guessed IDs 531 and
the tiered names must be resolved from this endpoint, not assumed.
`with_watch_providers=531` returned **0 results**, silently.

---

## 5. Rate limits and pagination ceilings

### Pagination hard-stops at page 500

Measured against `/discover/movie?with_genres=99`:

|               `page` | Response             |
| -------------------: | -------------------- |
|          1, 100, 500 | HTTP 200, 20 results |
| 501, 502, 1000, 2000 | **HTTP 400**         |

The verbatim error body:

```json
{
  "success": false,
  "status_code": 22,
  "status_message": "Invalid page: Pages start at 1 and max at 500. They are expected to be an integer."
}
```

This matches TMDb's official errors table verbatim
(`https://developer.themoviedb.org/docs/errors`):
`| 22 | 400 | Invalid page: Pages start at 1 and max at 500. They are expected to be an integer. |`

Worth noting: **the discover reference pages do not document this ceiling at all.** The
`page` param is published as a plain `int32` with default 1 and no stated maximum on
either `/discover/tv` or `/discover/movie`. The limit only appears in the errors table
and in staff forum posts — a doc gap, not a doc you can rely on finding.

TMDb staff confirm the intended workaround. Travis Bell (TMDb staff), 2024-09-28,
`https://www.themoviedb.org/talk/66f6d91fb9fd27627950d0b4`:

> There is no way to go beyond page 500. Your best bet is to split up your query with
> another filter or two. My usual suggestion is to use
> `primary_release_date.gte`/`primary_release_date.lte`. You could split it up into
> years, or perhaps decades to keep the total within the valid 10,000 result window.

And on why the count still exceeds what you can fetch — Travis Bell (staff), 2023-09-19,
`https://www.themoviedb.org/talk/6509bab9fdc4fa01398b58f5`:

> It is still often very useful to have the `total_results`, regardless if you can't
> retrieve all of the pages.

**Effective ceiling: 500 pages × 20 results = 10,000 items per query**, regardless of
what `total_pages` claims. `/discover/movie?with_genres=99` reports
`total_pages: 11314` — **96% of that set is unreachable.**

This is not a problem for the queries CrimeWeb needs. Every recommended query is well
under the ceiling (largest is `with_genres=99,80` on TV at 2,126 / 107 pages, fully
enumerable — the last page returned 6 results as expected). But it does mean **broad
queries cannot be paginated to exhaustion**, and any strategy must be narrow enough to
fit in 10,000, or partitioned by date window as staff recommend.

### Rate limiting: the limit our script defends against was removed in 2019

**The docs are unambiguous, and they contradict the comment in our code.**
`https://developer.themoviedb.org/docs/rate-limiting`, in full:

> **Legacy Rate Limits**
> As of December 16, 2019, we have disabled the original API rate limiting (40 requests
> every 10 seconds.) […]
>
> While our legacy rate limits have been disabled for some time, we do still have some
> upper limits to help mitigate needlessly high bulk scraping. They sit somewhere in the
> **40 requests per second** range. This limit could change at any time so be respectful
> of the service we have built and respect the `429` if you receive one.

`scripts/fetch-episodes.ts` sleeps 250ms per request with the comment _"TMDb allows ~40
requests per 10 seconds"_ — that is the **legacy limit disabled over six years ago**.
The current ceiling is roughly **40 requests per _second_**, ten times more permissive
than the code assumes. The ingest is running at ~4 req/s against a ~40 req/s budget.

Empirically consistent with that:

- 60 sequential requests to `/tv/78`: **60/60 HTTP 200** in 11.0s (~5.4 req/s).
- 100 sequential requests, no delay: **100/100 HTTP 200** in 16.6s (~6 req/s).
- **No rate-limit headers of any kind** are returned. The full response header set is
  `Content-Type, Transfer-Encoding, Connection, Date, x-az, Cache-Control, Server,
X-Gateway-Cache-Status, x-task-id, ETag, Vary, X-Cache, Via, X-Amz-Cf-Pop, Alt-Svc,
X-Amz-Cf-Id, Age` — no `X-RateLimit-*`, no `Retry-After`.

The 429 error is still defined: `https://developer.themoviedb.org/docs/errors` lists
`| 25 | 429 | Your request count (#) is over the allowed limit of (40). |`

**Implication:** the 250ms sleep can be relaxed considerably — which matters, because
the union strategy in §7 requires enumerating ~300 discover pages _before_ the
per-season episode walk begins. But since the limit is explicitly undocumented
("somewhere in the 40 requests per second range"), can change at any time, and exposes
no header to adapt to, the client must use a fixed conservative rate well under 40/s
and treat 429 as retryable with backoff.

### Incremental refresh

`GET /tv/changes` returns **1,835 changed TV IDs** over the default window
(19 pages). This is the right primitive for keeping a catalog fresh without re-running
full discovery, though it is unfiltered — every TV change on TMDb, not just crime.

---

## 6. Episode-level data for streaming limited series

**Yes — episode data is complete for streaming, and in one case better than for the
network shows already ingested.**

`GET /tv/{id}/season/{n}`, latest season, field completeness:

| Show                           | Network | Type        | Eps | name  | overview  | air_date | still    |
| ------------------------------ | ------- | ----------- | --: | ----- | --------- | -------- | -------- |
| Dateline (78)                  | NBC     | News        |  33 | 33/33 | 33/33     | 33/33    | 33/33    |
| Snapped (10184)                | Oxygen  | Documentary |  16 | 16/16 | **15/16** | 16/16    | **0/16** |
| Making a Murderer (64439)      | Netflix | Documentary |  10 | 10/10 | 10/10     | 10/10    | 10/10    |
| American Nightmare (242845)    | Netflix | Miniseries  |   3 | 3/3   | 3/3       | 3/3      | 3/3      |
| Don't F\*\*k with Cats (96129) | Netflix | Miniseries  |   3 | 3/3   | 3/3       | 3/3      | 3/3      |
| Ted Bundy Tapes (85833)        | Netflix | Miniseries  |   4 | 4/4   | 4/4       | 4/4      | 4/4      |
| The Jinx (61929)               | HBO     | Documentary |   6 | 6/6   | 6/6       | 6/6      | 6/6      |
| Murdaugh Murders (218530)      | Netflix | Documentary |   3 | 3/3   | 3/3       | 3/3      | 3/3      |
| Tiger King (100698)            | Netflix | Documentary |   5 | 5/5   | 5/5       | 5/5      | 5/5      |

Every streaming title returned 100% completeness on all four fields. _Snapped_ — an
existing hardcoded show — is the only one with gaps (no stills, one missing overview).
The existing `Episode` shape in `scripts/fetch-episodes.ts` maps onto streaming series
without modification.

### The structural catch: binge drops collapse `air_date`

| Season                | Episodes |              Distinct air_dates |
| --------------------- | -------: | ------------------------------: |
| Dateline S34          |       33 | **33** (weekly, 2025-09-26 → …) |
| American Nightmare S1 |        3 |        **1** (all `2024-01-17`) |
| Making a Murderer S2  |       10 |        **1** (all `2018-10-19`) |
| Ted Bundy Tapes S1    |        4 |        **1** (all `2019-01-24`) |

The current ingest is built around a weekly-airing model where `air_date` orders
episodes and identifies "new this week." For streaming, `air_date` is a _release_ date
shared by the whole season and carries no ordering information —
`(season_number, episode_number)` is the only ordering available. Any recency, "latest
episode," or calendar feature must special-case this.

### Two smaller notes

- **`/tv/{id}/episode_groups` is empty** for Dateline, Making a Murderer and American
  Nightmare (0 groups each). The API supports 7 group types — Original air date (1),
  Absolute (2), DVD (3), Digital (4), Story arc (5), Production (6), TV (7), per
  `https://developer.themoviedb.org/reference/tv-episode-group-details` — and a
  "Digital" group would in principle be the right home for streaming release ordering.
  In practice none of our titles has any group at all, so this is not a usable
  alternative ordering. (Episode groups are also absent from the TV Bible entirely, so
  there is no editorial guidance driving contributors to populate them.)
- **`/discover` never returns episodes.** Result objects carry only
  `adult, backdrop_path, first_air_date, genre_ids, id, name, origin_country,
original_language, original_name, overview, popularity, poster_path, softcore,
vote_average, vote_count`. Discovery finds _shows_; episodes still require the
  per-season walk the current script already does. Discovery changes what goes into the
  loop, not the loop itself.

---

## 7. The decisive test: recall of a union strategy

26 known true crime TV titles — the 8 currently hardcoded plus 18 streaming/cable
titles — checked against five discover strategies. Each strategy was **enumerated in
full** (every page to its `total_pages`) and the ID sets intersected with the targets.

| #   | Strategy                 | Query                                                                     |                Total |          Recall |
| --- | ------------------------ | ------------------------------------------------------------------------- | -------------------: | --------------: |
| A   | Doc AND Crime            | `with_genres=99,80`                                                       |                2,126 |       **21/26** |
| B   | Doc AND News             | `with_genres=99,10763`                                                    |                  372 |            2/26 |
| C   | True-crime keywords (OR) | `with_keywords=33722\|307587\|10714\|210662`                              |                1,263 |           18/26 |
| D   | Doc + true crime kw      | `with_genres=99&with_keywords=33722`                                      |                  830 |           16/26 |
| E   | Streamer networks + Doc  | `with_networks=213\|49\|3186\|453\|3353\|1024\|2552\|4330&with_genres=99` |                1,369 |           16/26 |
|     | **Union of A–E**         |                                                                           | **4,034 unique IDs** | **25/26 (96%)** |

**Only one title escaped all five strategies: _Depp v Heard_ (tv/227381)** — genres
Reality + Documentary, no crime genre, no true crime keyword. Arguably outside scope,
but it demonstrates the failure mode.

Titles that would be lost without the union:

| Title                            | Caught only by      |
| -------------------------------- | ------------------- |
| `20/20` (tv/2035)                | B, C — **not A**    |
| Cold Case Files (tv/12258)       | **A only**          |
| American Greed (tv/21572)        | **A only**          |
| Unsolved Mysteries (tv/126)      | **C only**          |
| LuLaRich (tv/131295)             | **E only**          |
| I Just Killed My Dad (tv/206492) | C, D, E — **not A** |

Every strategy is load-bearing for at least one title. Dropping any one of them loses
coverage.

### Movie side

`with_genres=99,80` on `/discover/movie` was enumerated in full (1,595 results) and
checked against 4 known documentary films:

| Film                                           | Result                                        |
| ---------------------------------------------- | --------------------------------------------- |
| The Tinder Swindler (923632)                   | IN                                            |
| American Murder: The Family Next Door (743601) | IN                                            |
| Abducted in Plain Sight (470401)               | IN                                            |
| The Menendez Brothers (1360610)                | **ABSENT** — genre Documentary only, no Crime |

_The Menendez Brothers_ is recoverable via `with_genres=99&with_keywords=33722`
(364 results). The movie side needs the same union treatment as TV.

---

## 8. Additional hazards worth designing around

### Documentary vs. dramatization collide on title

`GET /search/tv?query=The Staircase` returns, in order:

| ID         | Title                                     | Year | Genres                                                      |
| ---------- | ----------------------------------------- | ---- | ----------------------------------------------------------- |
| **122196** | The Staircase                             | 2022 | `[18, 80]` Drama + Crime — **the HBO dramatization**        |
| **21421**  | The Staircase                             | 2004 | `[99, 80]` Documentary + Crime — **the actual documentary** |
| 78602      | An American Murder Mystery: The Staircase | 2018 | `[99, 80]`                                                  |
| 274566     | The Jury: Death on the Staircase          | 2024 | `[99, 80]`                                                  |

The scripted dramatization outranks the documentary in search. Note also that
tv/122196 (the _drama_) **does** carry the `true crime` keyword — so keyword filters
pull in dramatizations. `with_type=4` (Scripted) or a Drama-genre exclusion is needed
to separate them, and title-based lookup is unsafe.

### Titles appear as both TV and movie

_The Tinder Swindler_, _American Murder_, _Abducted in Plain Sight_ and _The Menendez
Brothers_ are **movies** in TMDb, not TV. A TV-only discovery pipeline misses them
entirely, and a merged catalog needs a composite key — `(media_type, id)`, since
`movie/78` and `tv/78` are different titles.

### `total_results` is not a stable number

`/discover/movie?with_genres=99` reported `total_pages: 11314` on one request and
`11315` on the next within the same run. Counts drift request to request; do not use
them for change detection.

---

## 9. Recommended shape

1. **Keep a curated seed list.** Demote it from "the catalog" to a guaranteed floor.
   `20/20` proves discovery alone drops shows already considered core.
2. **Run the A–E union** as the breadth source, deduplicating on `(media_type, id)`.
   ~4,000 TV IDs before quality filtering.
3. **Add the movie union** (`99,80` plus `99` + kw 33722) — v1 scope includes
   documentaries, which are frequently films.
4. **Always pair `with_watch_providers` with `watch_region`.** Consider asserting the
   result count differs from the unfiltered query, since the failure is silent.
5. **Use `with_networks` for originals, `with_watch_providers` for availability.**
   They answer different questions; OR together the legacy and current network IDs per
   streamer.
6. **Filter with `air_date.gte`, not `first_air_date.gte`** — the latter excludes every
   currently hardcoded show.
7. **Alert when a curated ID is absent from discovery results.** That is the signal
   that upstream metadata regressed, and the cue to submit a TMDb edit.
8. **Special-case binge drops** wherever `air_date` drives ordering or recency; use
   `(season_number, episode_number)` for ordering, never `air_date` alone.
9. **Query `with_type=0` and `with_type=2` separately.** TMDb's Bible makes Miniseries
   take precedence over Documentary, so documentary limited series — most of v1's new
   scope — are typed `2`, not `0`.
10. **Relax the throttle, keep a throttle.** The 250ms sleep in
    `scripts/fetch-episodes.ts` targets a limit removed in 2019; the real budget is
    ~40 req/s. Raise the rate to make the ~300-page discovery sweep practical, stay
    well under 40/s, and retry on 429 with backoff.
11. **Attribute JustWatch in the UI** before shipping anything that displays provider
    data. Non-compliance is grounds for API revocation.
12. **Stay under 10,000 results per query**, or partition by date window as TMDb staff
    recommend.
13. **Assert on result counts, not status codes.** The endpoint fails open — bad sorts,
    unknown provider IDs and a missing `watch_region` all return HTTP 200.

---

## 10. Where the docs and reality disagree

Recorded because each one cost time to discover:

| Topic                                      | Docs say                                                                                    | Reality                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Rate limit                                 | `/docs/rate-limiting`: legacy 40-per-10s **disabled** since 2019-12-16; current ~**40/sec** | Matches. 100-request burst at ~6 req/s → 0 throttling. Our code still throttles for the 2019 limit.  |
| Page ceiling                               | Discover reference documents **no maximum** on `page`                                       | Hard 400 at page 501. Stated only in the errors table + staff forum.                                 |
| `sort_by=air_date.desc` (TV)               | Not in the published enum                                                                   | Returns **HTTP 200**, silently falls back to popularity                                              |
| `sort_by=revenue.desc` (TV)                | Not in the published enum                                                                   | Returns **HTTP 200**, silently falls back to popularity                                              |
| `with_watch_providers` sans `watch_region` | "use in conjunction with `watch_region`"                                                    | Filter **silently dropped**, unfiltered set returned as if successful                                |
| `with_networks` separators                 | Undocumented                                                                                | `,` (AND) → always 0; only `\|` is usable                                                            |
| `without_watch_providers`                  | **No description at all**                                                                   | Requires `watch_region` in practice                                                                  |
| `with_status` codes                        | Only "[0, 1, 2, 3, 4, 5]", no labels                                                        | No current official mapping exists; two moderator posts **conflict**. Verify empirically before use. |
| TV Bible statuses                          | Bible lists **5** statuses                                                                  | `with_status` accepts **6** values. TMDb's own materials are inconsistent.                           |
| `/discover/tv` "Advanced Filtering" prose  | Describes `region`, `with_release_type`                                                     | Neither is a TV param — text copy-pasted from the movie page                                         |
| `watch-providers-tv-list` doc URL          | —                                                                                           | **404s**; correct slug is `watch-provider-tv-list` (singular)                                        |

The pattern worth internalising: **TMDb's discover endpoint fails open and quiet.**
Invalid sorts, unsupported provider IDs, and missing `watch_region` all return HTTP 200
with plausible-looking data. Any ingest built on it needs result-count assertions, not
status-code checks.

---

## Appendix: sources and verification

### Primary sources consulted

- `https://developer.themoviedb.org/reference/discover-tv` — TV param table, `sort_by` enum, AND/OR semantics
- `https://developer.themoviedb.org/reference/discover-movie` — movie params and `sort_by` enum
- `https://developer.themoviedb.org/docs/rate-limiting` — current rate limit position
- `https://developer.themoviedb.org/docs/errors` — status codes 22 (page ceiling) and 25 (429)
- `https://developer.themoviedb.org/reference/tv-series-watch-providers` — JustWatch attribution requirement
- `https://developer.themoviedb.org/reference/watch-provider-tv-list` — provider list endpoint
- `https://developer.themoviedb.org/reference/tv-episode-group-details` — episode group types
- `https://www.themoviedb.org/bible/tv` — TMDb TV Bible: miniseries definition, type precedence, statuses
- `https://www.themoviedb.org/talk/5e1a60f7459ad6001435e0ae` — staff post, `with_type` numeric mapping
- `https://www.themoviedb.org/talk/66f6d91fb9fd27627950d0b4` — staff post, 500-page ceiling and workaround
- `https://www.themoviedb.org/talk/6509bab9fdc4fa01398b58f5` — staff post, `total_results` beyond page 500

### Reproducing the measurements

Findings were produced by scripts issuing live requests against
`https://api.themoviedb.org/3`; each table above names the exact endpoint and
parameters used. To reproduce, call the documented endpoint with
`api_key=$TMDB_API_KEY`. Counts will drift as TMDb metadata is volunteer-edited — the
2026-08-11 values are recorded here as the baseline, and the recall figures in §7 in
particular should be re-measured before being relied on.

### Reference IDs

**Genres (TV & movie):** Documentary `99`, Crime `80`, News (TV) `10763`,
Drama `18`, Mystery `9648`, Reality (TV) `10764`

**TV `with_type`:** Documentary `0`, News `1`, Miniseries `2`, Reality `3`,
Scripted `4`, Talk Show `5`, Video `6`

**Keywords:** true crime `33722`, crime documentary `307587`, serial killer `10714`,
cold case `210662`, murder investigation `161982`, criminal investigation `157241`

**Networks:** Netflix `213`, HBO `49`, Max `3186`, Hulu `453`, Peacock `3353`,
Prime Video `1024`, Apple TV+ `2552`, Paramount+ `4330`

**US watch providers:** Netflix `8`, Prime Video `9`, Hulu `15`, HBO Max `1899`,
Peacock Premium `386`, Discovery+ `520`, Investigation Discovery `408`, AMC+ `526`
