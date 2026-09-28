## Why

`silpo stores <query>` answers the wrong store more often than the right one. Measured over 474 store
queries — 49 written by hand, 225 spellings of 25 real branch addresses, 200 districts, metro stations
and landmarks in five phrasings each, all graded by how far the answered store is from the place the
query named — it is right **194 times out of 474 (41%)**, answers a store **more than 50 kilometres**
from the place asked about **151 times**, and refuses to answer at all 56 times.

Every cause is a defect in how the CLI reads the query, and every repair is deterministic. Together
they take the same 474 queries to **382 correct (81%)** — 191 wins to 3 losses, p < 1e-4 — with
catastrophes from 151 to **21** and refusals from 56 to **17**, adding no dependency and no stored
data. Broken out: hand-written 18 → 33 of 49, address spellings 146 → 179 of 200, places no address
contains **5 → 145 of 200**.

This supersedes `rank-stores-vectors`, which proposed embedding the store listing and fusing a vector
ranking with the lexical one. That was measured and abandoned: a bi-encoder asked which store is in
Obolon scores 20% precision@5 against a 45% random baseline, and a cross-encoder over the same
candidate pool this change produces scores **286/474 against the repairs' 382, losing 100 queries and
winning 30 (p < 1e-4)** — with a correct answer present in the pool it was given in 414 of 474 cases.
Knowing which district a street lies in is encyclopedic geography, not text similarity, and a store
address is two to five tokens, which is where a cross-encoder drifts to character overlap.

## What Changes

- **Store handles resolve exactly, before anything else is matched.** A branch uuid or a store number
  is looked up in a map keyed on `branchId` and `externalId` and answered directly. Across eight
  framings — bare, upper-cased, embedded in Ukrainian and Russian prose, followed by a settlement —
  that path resolves 150 of 150 and fires on none of the 474 address or place queries.
  `looksLikeStoreHandle` recognises both shapes today but requires the whole query to be one, so
  `Сільпо 1998` never reaches it, and it is consulted only after the lexical matcher has answered.
- **`code` and `uuid` leave the fuzzy index.** They decide the top match for 60 of the 474 queries and
  every one is noise: a query token matches hex inside a uuid (`Киев, Кольцевая дорога 1` answers a
  Boyarka store because `1` occurs in its uuid; a bare `2` matches 305 of 455 stores), and the Latin
  `silpo` matches a tombstone record whose `externalId` is `delete_filia_silpo_ivasuka46` and whose
  address is empty. Every numeric store code is four or six digits and no smaller than 1932; no branch
  address carries a building number of four digits or more; so no building number can be read as a
  code. **BREAKING** only for a *partial* code — `199` today prefix-matches ten stores in different
  cities and will stop doing so. Whole handles keep working, in prose as well as alone.
- **The address is matched by component instead of as one string.** Settlement, street and building
  number are matched by the rule each deserves: the settlement filters the corpus rather than scoring
  inside it, the street is fuzzy, the building number is near-exact and penalised when it conflicts,
  and the street-type word takes no part in the score. Today all four compete inside one `place`
  field, which is why `Львів, вул. Шевченка, 60` answers Шевченка 358А, and why the word `Одеси`
  inside the street name *Героїв Оборони Одеси* out-scores every genuine Odesa match.
- **A query naming only a settlement is answered by that settlement.** Component matching has nothing
  to score when the query leaves no street, and would answer nothing where the capability promises the
  settlement's stores. The settlement filter answers it: 42 of 42 across fourteen cities and three
  phrasings, against 40 of 42 for what ships today.
- **Lexical hygiene.** `prefix: true` applies to the whole query, so a one-letter preposition matches
  by prefix; the discrimination share of 0.5 lets a street-type word through; an apostrophe splits a
  token. Prefix matching is restricted to tokens of four characters or more and the share tightened.
- **The query is cleaned before it is geocoded.** The retailer's own name, the deictics and the
  question words are stripped, and the street-type words, `метро`, `площа` and `центр` are kept. Over
  the same 40 places, what ships today scores 1, 1, 2, 1 and 0 out of 40 for the five phrasings; after
  the repairs it scores **29 out of 40 for every one of them**, because they reduce to the same probe.
- **The geocoder's own ranking is used instead of discarded, for the store listing only.** See the
  narrowed requirement below.
- **The caller's settlement is appended to the geocoding probe only when the query names none**, and
  is taken from what the account already tells the CLI — the settlements of the stores its receipts
  name and of its saved delivery addresses.
- **A lexical match no longer ends the search.** `resolveQuery` returns on any match at all, with no
  test of whether the match is any good, so the geocoder below it is unreachable whenever the index
  says anything. Both readings are taken instead, and their agreement decides. The geocoding call is
  skipped where the query's building number matches a store's own — 86 of 474 queries, all 86 correct
  — leaving 388 calls where today roughly 210 are made.
- **Agreement between the two readings becomes the confidence signal.** The distance between them
  separates a right answer from a wrong one at **AUC 0.845**, against 0.668 for the match score
  itself. Within 2 km the answer was right in **148 of 148** cases; beyond 2 km, 72% of 109. It is a
  by-product of answering rather than extra work.
- **A district, a metro station or a landmark becomes a query form the CLI promises.** It is not one
  today, in the capability or in the shipped skill, yet it is the class the repairs move furthest —
  5 of 200 answered correctly before, 145 after. Left unstated, the agent has no reason to send such a
  query and will reword it into something else first, and the capability goes unused.

Deliberately not in this change: product search, category resolution, and any model or embedding.

## Capabilities

### New Capabilities

None. This changes how existing capabilities behave, not what the CLI offers.

### Modified Capabilities

- `stores-and-delivery`: a new requirement states how a store query is read — exact handle resolution
  before matching, component matching of an address, a settlement alone answered by the settlement,
  the reduction applied before geocoding, and what happens when the two readings disagree. The
  store-listing requirement's list of query forms gains a place no store address contains, with the
  obligation to say when that answer is the less certain kind. The relevance requirement's resolution
  order is rewritten: handles resolve exactly rather than being "matched the same way with no form
  privileged over another", and the listing and the geocoded place stop being alternatives. The output
  requirement's match line stops naming which field the query reached — with the street the only
  scored field that value is constant — and names which parts of the query the store answered instead.
  Its address-resolution requirement is narrowed: **within the store listing**, a ranked geocoder
  response is a ranking and its first candidate may be used as the point to order stores around,
  provided the answer names the candidate used and the ones it passed over.
- `delivery-resolution`: the "Ambiguity prints the candidates and stops" requirement is scoped to
  where its stated reason holds. Its justification is that *"a store listing is not ordered by
  anything the caller cares about"*, and that is true of the branch listing and false of a geocoder
  response. The rule stands unchanged wherever a candidate is chosen in order to **write** — cart
  destination, branch, delivery type, Nova Poshta office — and for candidates drawn from the branch
  listing. It stops applying to a geocoded candidate used as a read-only ranking origin.

## Impact

- `src/resolve/stores.ts` throughout: `matchStoresByRelevance`, `resolveAddress`, `resolveQuery`,
  `rankStores`, and the ordering of the cascade. New helpers for handle lookup, address splitting,
  settlement matching and the geocoding probe.
- `src/utils/address.ts`: the address split, which is wanted on both the listing and the query.
- A settlement alias table is new. The ru→uk dictionary in `src/index/dictionary.ts` holds groceries
  and no place names, so `Чернигов` → `Чернігів` needs data that does not exist yet.
- Output: the match line changes shape, and an answer now reports the probe that was looked up, which
  reading answered, and the geocoded candidate it was measured from. Covered by the
  `stores-and-delivery` output delta; `output-rendering` is to be checked against the new shape during
  implementation.
- `src/commands/stores.ts`: its own description still says the query matches "by place, store code or
  branch uuid" and lists no district or landmark.
- `plugin/skills/silpo/SKILL.md`: the store entry's list of query forms, which today reads "a
  settlement, an address, a coordinate pair, a store's branch uuid, or its store code".
- Round trips: the geocoder is called on 388 of 474 measured queries, where today it is called on
  roughly 210 — the price of a second reading on the queries a building number does not settle. The
  store listing read is unchanged. Nothing is cached and nothing is stored.
- `test/resolve-stores.test.ts` asserts that a query matching the listing performs no address call.
  That assertion holds only where a building number settles the match, and must be re-stated.
- `openspec/changes/rank-stores-vectors` is removed by this change.
- The harness that produced these numbers has been deleted; what it measured and how is recorded,
  and the numbers cannot be re-taken from the repository.
