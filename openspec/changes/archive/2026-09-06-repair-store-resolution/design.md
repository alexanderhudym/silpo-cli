## Context

See `proposal.md` — Why. The current behaviour lives almost entirely in `src/resolve/stores.ts`:
`matchStoresByRelevance` builds one MiniSearch index over a `{place, code, uuid}` document and
searches it with the whole query at `prefix: true`; `resolveQuery` returns on any match that index
produces, so the geocoder below it is only reached when the index is silent; `resolveAddress` calls
`findAddress` with the caller's text verbatim and reports `ambiguous` whenever more than one candidate
comes back without an exact string match.

Two pieces of the machinery this change needs already exist. `looksLikeStoreHandle`
(`src/resolve/stores.ts:395-402`) recognises both handle shapes, but only when the whole trimmed query
is one, and it is consulted after the lexical matcher has already answered. `nearestAmong` already
orders stores by distance from a point, correctly; nothing is wrong with it except that the point it
is given is often wrong or never arrives.

Constraint from the capability: the listing is read whole, once, per command, and recorded nowhere.
Every structure this design builds — the handle map, the split addresses, the street index — is built
from that listing inside the command and discarded with it.

The numbers below were measured over 474 graded queries plus a
42-query settlement-only probe. The harness that produced them has been deleted; see
**Risks** for what that costs.

## Goals / Non-Goals

**Goals:**

- One place that decides what kind of thing the query is, before any matching happens.
- Each part of an address matched by a rule that suits it, so that no part can win on another's
  behalf.
- A confidence the CLI can act on that does not move with corpus size.
- Every constant that was tuned against the eval named, so it can be re-measured rather than
  rediscovered.

**Non-Goals:**

- Any model, embedding, vector store or second process. Settled in the proposal.
- Ukrainian toponym morphology. `у Кривому Розі` and `біля Хрещатика` stay broken; they are the
  largest named class in the residual and a separate piece of work.
- Product and category resolution.
- Changing what is fetched from the store listing, or keeping anything between commands.

## Decisions

### The query is classified before it is matched, and the cascade is reordered

New order in `resolveQuery`: coordinate pair → **handle** → component match → saved addresses →
geocoded place, with the last two readings taken together rather than in sequence (below).

The handle step moves in front because it is exact and cannot be wrong: a query holding a uuid or a
store number the listing carries has exactly one answer, and letting an approximate matcher see that
query first is how `Киев, Кольцевая дорога 1` came to answer a store in Boyarka on the strength of `1`
occurring inside a uuid. A bare `2` matches 305 of the 455 stores today.

*Alternative considered:* keep the cascade and only fix the index. Rejected — with `code` and `uuid`
out of the index, a bare handle would fall through to the geocoder and be answered as an address.

### The handle threshold is derived from the listing, and an unmatched number is not a handle

Every numeric store code in the listing is four or six digits and no smaller than 1932; no branch
address carries a building number of four digits or more; and across the 474 eval queries, of 80
numeric tokens, none equals a real store code. The minimum length SHALL be computed from the listing
that was just read rather than hardcoded as 4: the listing is in hand, deriving it costs nothing, and
it fails safe if Silpo ever issues a short code where a hardcoded 4 would silently stop resolving it.

**A number of handle shape that the listing does not carry is not a handle.** It falls through to be
read as part of an address. The alternative — treating any unmatched four-digit token as an unknown
handle — turns a query carrying a postal code or a year into a refusal, a path that was never
measured and that the capability's own failure case does not ask for: that case is a *whole query*
that is a handle, and it stays as it is.

Five branches carry a non-numeric `externalId` — `delete_filia_silpo_ivasuka46` and four siblings,
tombstones whose address is empty. Those resolve only on an exact whole-query match, never on a token
inside prose, which is what stops `Silpo … Kyiv` from matching one.

*Verified:* both `branchId` and `externalId` are unique across the 455-store listing, so the index is
a plain map and a hit is unambiguous. Across eight framings the exact path resolves 150/150 and fires
on none of the 474 address or place queries.

### The address is split, and each part gets its own rule

`{settlement, street, building}` on both sides. Parsing a listing address: strip a leading street-type
token, split at the last comma when the tail contains a digit — verified against all 455 addresses,
including the one that carries two commas. Parsing a query: the settlement comes from a strict match
against the settlements the listing carries; the building is the first token starting with a digit;
the rest, minus street-type words, is the street.

- **Settlement filters, it does not score.** This is the decision that matters. A settlement kept as a
  scored field is why `Дерибасівська Одеса`, `Аркадія Одеса` and `Таїрова Одеса` all answered
  *вул. Героїв Оборони Одеси* 11 to 22 km away — the token `Одеси` inside a street name outscored
  every genuine Odesa match.
- **Street is matched approximately** — prefix from four characters, fuzz from five — because case
  endings, transliteration and typos all land there.
- **Building is applied as a multiplier over the street score,** not as another indexed term: exact
  match multiplies up, a bare number matching the numeric part multiplies up less, a contradiction
  multiplies down. A building number competing as one term among many is why
  `Львів, вул. Шевченка, 60` answered Шевченка 358А.

Measured: 356 → 371 of 474 at the point it was introduced, 17 wins to 2 losses, p = 0.0007.

*Alternative considered:* keep one index and give MiniSearch per-field boosts. Rejected — a boosted
field still scores, and the settlement-inside-a-street-name failure is a scoring failure. Only
removing the settlement from the scored set fixes it.

### A settlement alone is answered by the settlement

The component matcher scores streets, and a query naming only a settlement leaves no street to score,
so it returns nothing. Measured directly: across fourteen cities with three or more branches, in three
phrasings each, the component matcher answers **0 of 42** while what ships today answers 40 of 42 and
returns 99% of the named city's stores. Answering such a query from the settlement filter alone scores
42 of 42 at 100% coverage.

This is not a refinement, it is a hole the split opens, and the eval families did not cover it — every
fixture in them names a street or a place. It was found by reading the capability, not by measuring.

### Settlement matching must be strict, and needs an alias table of its own

Matching a settlement on a vowel-folded skeleton at edit distance 2 makes `Оболонь` a match for
`Обухів`, `Позняки` for `Лісники` and `районе` for `Рівне`. A false settlement match is worse than
none: it narrows the corpus to the wrong settlement *and* suppresses the caller's own. The rule is the
token as written, with a single edit allowed only for names of six characters or more.

That strictness has a cost the eval names precisely: `Чернигов` is two edits from `Чернігів` and is
missed, which is one of the only two queries the component split regresses on.

**The fix needs new data.** An earlier draft of this design said to run "the existing ru→uk
dictionary" first. That is wrong: `src/index/dictionary.ts` holds 115 groceries terms and no place
names, `lookup()` is an exact whole-term map, and it is imported only by the product index and fill
paths. Applying it to a store query is a no-op. A settlement alias table — the Russian and
transliterated spellings of the settlements the listing carries — is new data this change introduces.
It is small and closed: the listing names 83 settlements.

### The geocoding probe is a reduction, not a rewrite

A small stop-list, applied by whole token: the retailer's own name, words for a shop, words of
proximity, question words, and the prepositional forms of "district" that only occur in the idiom for
"near". Street-type words, `метро`, `площа`, `центр` and the nominative `район` are kept — a geocoder
reads those.

Nothing is added and nothing is transliterated. This is deliberate: the same investigation measured a
transliteration expansion on the *product* request side collapsing coverage from 62/120 to 29/120,
because the server ANDs query tokens and a bogus expansion empties the result. Removal is safe in a
way addition is not.

The property this buys is exact: over 40 places in five phrasings, what ships today scores 1, 1, 2, 1
and 0 out of 40, and the repaired pipeline scores **29 out of 40 for every one of the five**, because
after reduction they are the same string.

*Alternative considered, and it is close:* keeping the retailer's own name in the probe. The geocoder
indexes Silpo shops as places, so `Silpo Kulparkivska Lviv` returns the shop itself rather than the
street. Measured at 381 of 474 against 382 — a wash overall (15 wins, 14 losses) — but it trades:
street addresses 189 against 179, places 135 against 145, and the five phrasings stop reducing to one
probe (29, 25, 29, 27, 25). Stripping is specified because the flat row is the property this design is
for, and because the class it favours is the one being newly promised.

*Alternative considered:* keep the name only when the query names a known street. Measured at 380 —
the same trade again, because the street detector fires on the district queries too.

### Both readings are taken, and their agreement decides

The cascade does not stop at the first reading that produces something. Both the component match and
the geocoded point are computed, and what happens next depends on whether they name the same place:

- **They agree**, within the agreement distance — answer the matched store, which is the more specific
  of the two.
- **They disagree** — one has to win, and only here does precedence arise: the matched store when the
  query names a street the listing carries, the nearest store to the geocoded point otherwise.
- **Only one produced anything** — that one. Nearly 200 of 474, almost all the geocoder answering a
  district or a landmark that appears in no store address.

Measured at 380 of 474 when introduced, 11 wins to 2 losses against stopping at the matched reading.

*Alternative considered:* decide the precedence up front — route first, then match once. Measured at
378, and it is a trade rather than a gain: street addresses fall 189 → 179 of 200 while districts and
landmarks rise 125 → 143. Taking both readings keeps the 189 **and** takes 135 of the 200, because a
precedence rule applied where the two readings already agree can only be wrong there, never right.

*Alternative considered:* borrow the settlement from the geocoded candidate and hand it to the matcher
as a filter, instead of comparing answers. 379 overall but 178 of 200 on street addresses — a borrowed
settlement is sometimes the wrong one.

### Where the geocoding call is skipped, and what that costs a standing promise

The capability says today that a street the listing already carries is answered **with no geocoding
performed**. Taking both readings breaks that, and `test/resolve-stores.test.ts:862` asserts it.

The call is skipped where the building number settles the match — exact, or matching in its numeric
part. That bucket is 86 of 474 queries and was correct in **86 of 86**, so a second opinion could not
have changed any of them. 388 calls remain, against roughly 210 today.

*Alternative considered, and rejected on grounds other than accuracy:* skip the call whenever the
matcher answered on a street the listing carries, which preserves the promise verbatim and costs 240
calls instead of 388. It scores identically — 381 against 381, no wins, no losses — but the queries it
stops geocoding include 15 district queries that matched a street sharing their root (`Печерськ`
against *Печерська*, `Дарниця` against *Дарницький*), all 15 answered wrongly. Under this option they
are answered wrongly and presented as certain; under the specified one they are answered wrongly and
marked uncertain. The requirement is therefore modified rather than preserved: it was written to avoid
a pointless round trip, and the round trip turns out not to be pointless — it is what tells the caller
when a street match is a false friend.

The saved-address path keeps its promise unchanged: saved addresses are consulted before any
geocoding, and a query that matches one is answered from it.

### Agreement is the confidence, at 2 km

Both readings produce a point: the matched store's own coordinates, and the geocoded candidate's.
`greatCircleKm` is already imported in this file (`src/resolve/stores.ts:8`).

| the two readings land | n | correct |
| --- | ---: | ---: |
| within 1 km | 121 | 100% |
| within 2 km | 148 | **100%** |
| within 3 km | 159 | 99% |
| further than 2 km | 109 | 72% |

AUC 0.845, against 0.668 for the matcher's own street score and 0.647 for how close the geocoded point
fell to any store. 2 km is the largest cut that holds every case; 148 of 148 is one sample and should
be read as "no counter-example here", not as a guarantee.

*Alternative considered:* threshold the match score, as `AUTO_SCORE_THRESHOLD` does today. Rejected for
the reason the investigation gives for products — a BM25 score has no absolute meaning, it moves with
corpus size and document length, and here it measures 0.668 where agreement measures 0.845.

Where the readings disagree the CLI still answers, marked as the less certain kind, with the other
candidate named. Withholding there would turn 100-odd answered queries into refusals, and nothing is
being written.

### What is printed says how the query was read

The reduced probe when it differs from the caller's text, which reading the answer came from, the
geocoded candidate that was measured from alongside the ones passed over, and whether the two agreed.

This also repairs something the change would otherwise break. The output capability requires the match
line to carry "which of its fields the query reached", so that two matched stores can be told apart.
With the street the only scored field, that value becomes constant — the exact failure the requirement
names. It is replaced by which *parts* of the query the store answered: settlement, street, building
number, and whether the resolved place agreed.

### Placement

`src/utils/address.ts` takes the address split, beside `canonicalizeAddressWords` and `formatAddress`
— it is knowledge about how an address is written, and the parser is wanted on both the listing and
the query. The handle map, the probe stop-list, the settlement matcher and its alias table, and the
reordered cascade stay in `src/resolve/stores.ts`, which is where the cascade is.

The caller's settlement, needed when the query names none, is derivable from what `rankStores` already
reads — but not where `resolveQuery` currently stands. `readReceipts` returns counts keyed by
`branchId` and no settlement, and `resolveQuery(client, text, branches)` receives neither the receipts
nor the saved addresses; it fetches saved addresses itself, and only after the matching step. The
settlement is a join from those receipts to `branch.city`, plus the saved addresses' own cities, and
that value has to be passed into the resolution rather than fetched there. No new server call is
needed; plumbing is. Where the account offers no settlement, the probe goes without one.

## Risks / Trade-offs

- **The measurement cannot be re-taken.** The harness was deleted after this change was written. Its
  arms were a reimplementation, not a call into `src/`, so even while it existed it could not have
  told anyone whether the shipped code matched the measured design — and rebuilding the 41% baseline
  is impossible once `matchStoresByRelevance` is rebuilt, because the baseline *was*
  `matchStoresByRelevance`. → The named failure cases become tests in `test/`, which is a better place
  for them; what was measured and how is recorded, so a future
  measurement can be rebuilt from the description rather than re-derived.
- **The constants were tuned across many arms on one 474-query set.** Roughly twenty configurations
  were measured against the same fixtures, and the last several differed by one or two queries. Treat
  382 as "about 80%", not as a figure to defend, and treat the 100%-correct buckets as small samples.
  → Named constants and named test cases, not a claim that the numbers are final.
- **Partial store codes stop resolving.** `199` today prefix-matches ten stores in different cities;
  after this it matches nothing. → Accepted by the repository owner. The ten were undistinguishable
  anyway, and whole handles keep working in prose as well as alone.
- **The CLI now depends on the geocoder's ordering, where before it refused to read it.** → The
  agreement check is exactly the guard against a bad ordering, and for street addresses the matched
  reading is still the one that answers. The failure mode is a wrong answer where there used to be no
  answer, so what is printed must name the candidate it used.
- **The stop-list and the settlement alias table are hand-written and language-specific.** → They are
  data, covered by tests, and a word that is not on the list leaves today's behaviour unchanged rather
  than degrading it.
- **The eval's tolerances are stricter than some queries deserve.** Eight of the thirteen remaining
  address-family errors are a sibling branch on the street the caller actually named. → Not fixed
  here; noted so that a future measurement does not read them as ranking failures.
- **Latin-script queries lose ground.** Stripping the retailer's name costs the transliterated class
  22 → 12 of 25, because `Silpo …` was finding the shop as a place. → Accepted as part of the
  strip-versus-keep trade above; it is the smallest of the affected classes and the alternative costs
  more elsewhere.

## Migration Plan

Nothing persists and nothing is cached, so there is no data to migrate and no compatibility window.
Rollback is a revert. The command's interface does not change: the same single positional value, the
same options.

## Open Questions

- **How far the geocoding call can be skipped.** It is skipped where the building number settles the
  match, at no measured cost. Whether a strong street match with no building number is safe to skip is
  the same question one step weaker; the answer measured identical in accuracy but silently wrong on
  15 district queries, which is why it was not taken. A better test than "names a known street" would
  reopen it. Deferrable: it changes how many calls are made, not what is answered.
