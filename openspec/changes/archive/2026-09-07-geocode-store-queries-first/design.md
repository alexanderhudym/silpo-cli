## Context

See `proposal.md` — Why. What matters here is the mechanism.

`resolveQuery` (`src/resolve/stores.ts:829`) reads a store query in this order today:

1. a coordinate pair;
2. a handle — a branch uuid or a store number the listing carries;
3. `parseQueryAddress` (`:233`), which cuts a settlement out of the text with `matchSettlement`
   (`:641`) — exact, or Levenshtein ≤ 1 for a name of at least six characters — takes a trailing
   digit-initial token as the building, and calls the rest the street;
4. `matchParsedStoresByRelevance` (`:279`), which either filters by city where no street is left, or
   builds a MiniSearch index over the stores' street text (`:303`) and searches it with prefix ≥ 4,
   fuzzy ≥ 5 at 0.2, OR-combined, then a relative floor at 0.2 of the top score and a
   discriminating-term condition, with the building number applied as a multiplier;
5. the caller's saved delivery addresses;
6. `looksLikeStoreHandle`, failing on an unknown handle;
7. the address lookup, as the last resort — and, at step 4, as a cross-check when a store matched but
   its building number disagreed, comparing the two points within `STORE_AGREEMENT_DISTANCE_KM = 2`.

Step 3 is the defect. `Дніп` is distance 2 from `дніпро`, so no settlement is recognised, and `Дніп`
is exactly the four characters the prefix rule requires, so it becomes a prefix query matching every
`Дніпров*` street. Measured against the shipped matcher and the live listing, `matchStoresByRelevance("Дніп")`
returns four Kyiv stores on наб. Дніпровська and вул. Дніпровська.

Measured, `silpo_find_address` returns per candidate a `city`, a `street`, a `houseNumber`, a
`district` and a point — the same three parts step 3 works to extract, from the server that also
issues `branch.city`.

## Goals / Non-Goals

**Goals:**

- A misspelled place resolves. That is what a typed query gets wrong, and it is what the gazetteer
  absorbs.
- Nothing in the CLI holds a rule about how a place may be spelled.
- BM25 stays the engine that matches a place against the store listing.
- No candidate is trusted for its position in the gazetteer's ranking.

**Non-Goals:**

- The store ordering signals once the stores are selected: the receipts, the page size, the
  self-pickup and Nova Poshta filters, the no-query path.
- The Nova Poshta path and `resolveDestination`, which resolve a place for the cart. The cart path
  still takes a geocoded response's first candidate, because it is choosing a value to write.
- The product path and the catalogue.

## Decisions

### The lookup reads the query; the CLI matches what it returns

The order becomes: coordinate pair, handle, then the address lookup for everything else. Each
candidate carries `city`, `street`, `houseNumber` and a point, and those are the parts the matcher is
given — the parts it used to cut out of the caller's text itself.

**The matcher is unchanged.** The MiniSearch index over the stores' streets, the prefix and fuzzy
rules, the relative floor, the discriminating-term condition and the building multipliers all stay.
What changes is what they are fed. A street the gazetteer normalised is spelled the way the listing
spells it; a street the caller typed is not.

Measured, that is what the change buys:

| query | first candidate | today's matcher |
| --- | --- | --- |
| `Дніп` | `city: Дніпро` | four Kyiv stores on Дніпровська |
| `Днопро` | `city: Дніпро` | — |
| `Кириливська Київ` | `city: Київ`, `street: вулиця Кирилівська` | — |
| `Дніпро` | `city: Дніпро` | 17 stores in Дніпро |

The typo is the case worth buying. A caller writing `Днопро` is far likelier than one writing
nonsense, and the CLI's edit distance of one, against a table of one spelling per city, is a worse
copy of what the lookup does.

*Alternative considered:* keep the CLI's parsing and widen `matchSettlement` — match a settlement the
way everything else is matched, by prefix and ranking over the listing's own names. Rejected because
it fixes only truncations. `Днопро` is not a prefix of `Дніпро` and never will be; a spelling table
would be, and the capability already forbids one.

### Every candidate is matched, and the first holds no privilege

`resolveAddress` collapses to one candidate on a single result and on an exact match, and returns
`ambiguous` otherwise; `rankingOnly` makes it take the first and list the rest as passed over. The
store path needs the whole list, so it gains an entry point that returns every candidate, and
`rankingOnly` goes with the path that used it.

Measured, `Харків Сумська` returns six candidates and the **first** is «Сумська область, Харківщина»,
a village in Sumy oblast; «Харків, Сумська вулиця» is second through fifth. The gazetteer ranks by its
own knowledge, which does not include where the stores are. Each candidate is matched against the
listing in its own right and the results are taken together, so the listing is what says which
candidate was real.

*Alternative considered:* keep the first candidate and trust the gazetteer's ranking, as
`delivery-resolution` has the cart path do. Rejected on the measurement above — the cart path is
choosing one value to write, where here the listing is available to check the ranking against.

### A street that matches nothing is answered by its settlement, ordered by the candidate's point

Measured against the live listing, **no store stands on Хрещатик** (0 of 155 in Київ) and **none on
Сумська** (0 of 15 in Харків). A street match alone answers nothing for either, though both name a
real place with real stores near it.

So where a candidate's street matches no store, that candidate's settlement answers, and the stores
are ordered by distance from the candidate's own point. Measured, the nearest store to Хрещатик is
0.15 km away on вул. Басейна, and the nearest to «Харків, Сумська вулиця» is 1.16 km away.

**This is what settles the radius question.** The radius bounds what counts as near around the point
the answer was taken from, and that point belongs to the candidate that produced the stores being
ordered. No candidate has to be judged the more central of several: each answers with its own point,
and where a street matched, the point is the matched store's, exactly as it is today.

### What the CLI stops holding

- `matchSettlement`, its Levenshtein rule and its minimum length.
- `parseQueryAddress`, `extractSettlementFromTokens`, `extractBuildingFromTokens` and the settlement
  window.
- `STORE_AGREEMENT_DISTANCE_KM`, the `ReadingAgreement` type and everything that reported an
  agreement: there is one reading now, so there is nothing to compare it against.
- The retailer's own name in `reduceGeocodingProbe`. Measured, `Сільпо Кирилівська` returns exactly
  one address and it is the store itself. Removing the name made sense while the lookup only
  cross-checked a reading the CLI had already made.

And what it keeps holding: no table of settlement spellings, no list of filler words. Both refusals
stand for the same reasons as before, and the lookup is now what makes them affordable.

### The caller's settlement is no longer appended

The append is gated today on `queryAddress.settlement !== null` — a value `parseQueryAddress` produced.
With that parse gone, the gate cannot be evaluated before the probe is sent, and appending
unconditionally would attach a settlement to queries that already name one. It goes. The account's own
settlement stays where the no-query path uses it.

This also removes the second call the append could cost: `deriveCallerSettlement` reads the saved
delivery addresses, which the matched path skips today.

### What stays where it is

- The **saved-address step** still runs, and still only where the lookup's candidates matched no
  store. It is not fetched before that is known, which is what the capability requires.
- The **unknown-handle failure** stands: a whole query shaped like a store code the listing does not
  carry fails naming it and is not geocoded.
- A handle **inside** a longer text still short-circuits, and still costs no lookup.

## Risks / Trade-offs

- **Every store query now costs an address lookup.** Today a query naming a settlement exactly costs
  none. → Verified, `rankStores` already reads the whole branch listing and the offline orders on
  every invocation; this is one call added to a command that already makes several. Dropping the
  settlement append means it is one call, not two.

- **A query the lookup cannot place now fails.** Measured, `Хрещатик Кыив` returns no address at all,
  and `Днипро` with a Russian `и` returns candidates that do not include Дніпро. Today either could
  still reach a store through the street index. → The caller is an agent, and the command's own
  description and the skill say what the argument takes; an agent that gets nothing back can ask.
  Whether the class deserves a text fallback is what the first live run says.

- **The store-resolution measurements record an arm that lost.** Over 200 address fixtures,
  reading the geocoded place first scored 125/200 against 189/200 for matching the listing first, and
  the shipped arrangement takes both readings. → That arm answered from the geocoded **point**; this
  change answers from the geocoded **parts**, through the same matcher the winning arm used. It is a
  different arm, and the prior is stated here so it is not discovered later as a surprise. The
  harness that produced those numbers has been deleted.

- **A settlement-only query becomes a lookup rather than a filter.** Today `Дніпро` equals a
  `branch.city` and returns all 17 stores; the same doc records a settlement filter answering 42 of 42
  such queries. → The candidate still carries `city: Дніпро`, and the matcher still filters by it, so
  the filter is intact; what changed is where the name came from.

- **Several candidates can produce stores in several settlements.** → Each is named in the output, so
  a caller who meant one of them can say which. That is a real change in what the answer looks like.

## Migration Plan

None. Nothing is stored and no option is added or removed. What a caller can observe is that a
misspelled place now resolves, that an answer may name more than one place, and that no answer is
marked as the less certain of two readings.

## Open Questions

None that block the work. The two questions the proposal raises — what an unplaceable query costs, and
whether a text fallback is worth keeping — are answered by the live run in group 5, and neither
changes a requirement.
