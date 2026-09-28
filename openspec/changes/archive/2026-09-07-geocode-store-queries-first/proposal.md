## Why

`silpo stores Дніп` returns four stores in Київ — on наб. Дніпровська and вул. Дніпровська. The caller
asked for Дніпро. `silpo stores Дне` and `silpo stores Днепр` match no store at all and are answered
from a geocoded point instead.

The cause is that the CLI reads the query itself, and reads it badly at one step. `parseQueryAddress`
(`src/resolve/stores.ts:233`) cuts a settlement out of the text by comparing sliding windows against
the branch listing's own city names, through `matchSettlement` (`:641`), which accepts a
case-insensitive exact match or a Levenshtein distance of at most 1 for a name of at least six
characters. Nothing else. So `Дніпро` is recognised, `Дніп` is distance 2 and is not, and whatever the
settlement step fails to claim falls through to the street index — where `Дніп`, being exactly the
four characters `STORE_MATCH_PREFIX_MIN_LENGTH` requires, becomes a prefix query matching every
`Дніпров*` street in the country.

**The CLI is maintaining a worse copy of a normalisation the server already performs.** Measured today
against `silpo_find_address`, which returns per candidate a `city`, a `street`, a `houseNumber`, a
`district` and a point:

| query | first candidate |
| --- | --- |
| `Дніпро` | `city: Дніпро` |
| `Дніп` | `city: Дніпро` |
| `Днопро` — a typo | `city: Дніпро` |
| `Кириливська Київ` — a typo | `city: Київ`, `street: вулиця Кирилівська` |
| `Київ Кирилівська 47` | `city: Київ`, `street: вулиця Кирилівська`, `houseNumber: 47` |
| `Сільпо Кирилівська` | `city: Київ`, `street: вулиця Кирилівська`, `houseNumber: 47-А` |

A typed name arrives misspelled far more often than it arrives as nonsense, and the gazetteer absorbs
that. The CLI's edit-distance rule absorbs one character of it, against a table holding one spelling
per city.

## What Changes

- **The address lookup reads the query, and the CLI stops parsing it. BREAKING** for the order in
  which a query is read. A coordinate pair and a store handle still short-circuit ahead of everything.
  Everything else goes to `silpo_find_address`, and each candidate's `city`, `street` and
  `houseNumber` are the parts the CLI used to cut out of the text itself.

- **`matchSettlement` and the query parsing go.** `parseQueryAddress`,
  `extractSettlementFromTokens`, `extractBuildingFromTokens`, the settlement window and the edit
  distance are replaced by what the lookup returns. **BREAKING** for a query the lookup cannot place at
  all: it fails naming the value rather than falling through to a street match.

- **BM25 stays the engine, and its input becomes the normalised address.** The street index over the
  stores' own streets, the relative floor and the discriminating-term condition are unchanged. What
  changes is that the street searched is the one the gazetteer returned rather than the remainder of
  the caller's text. The city narrows which stores are considered exactly as it does today, and the
  building number is compared as it is today — but all three parts now arrive already separated and
  already spelled the way the listing spells them.

- **Every candidate is considered, and the first holds no privilege. BREAKING** against `rankingOnly`,
  which takes the first and lists the rest as passed over. Measured, `Харків Сумська` returns
  «Сумська область, Харківщина» first — a village in Sumy oblast — and «Харків, Сумська вулиця» second
  through fifth. Each candidate is matched against the listing in its own right, and what they find is
  taken together.

- **Where a candidate's street matches no store, that candidate's city answers, ordered by distance
  from its point.** Measured, no store stands on Хрещатик (0 of 155 in Київ) and none on Сумська (0 of
  15 in Харків), so a street match alone answers nothing for either. The city is the answer there, and
  the candidate's point orders it — the nearest store to Хрещатик is 0.15 km away on вул. Басейна.

- **The radius keeps its meaning.** It bounds what counts as near around the point the answer was
  taken from, which is the point of the candidate that produced the stores being ordered. No candidate
  has to be judged more central than another.

- **The retailer's own name stops being cut out of the probe. BREAKING** for what is looked up.
  Measured, `Сільпо Кирилівська` returns exactly one address and it is the store itself, at
  «вулиця Кирилівська, 47-А». The current rule removes the name because the geocoder "would return the
  shop rather than the street"; with the lookup reading the query, the shop is the better answer.

Deliberately not in this change: the store ordering signals once the stores are selected — the
receipts, the saved addresses, the page size; the Nova Poshta path; and `resolveDestination`, which
resolves a place for the cart rather than for a listing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `stores-and-delivery`: four requirements change. **A store query is read by what it names** — the
  settlement rule and the part-by-part parsing become the lookup's answer rather than the CLI's own
  reading. **Stores ordered by relevance to the caller** — the two readings stop racing, so the
  agreement rule that chose between them goes, and the listing is matched against the lookup's parts
  rather than the query's. **Store listing output** — the reason line stops reporting an agreement
  between two readings and starts naming the places the answer came from. **Address resolution** — a
  geocoded response no longer has its first candidate taken on the store path.
- `delivery-resolution`: the paragraph stating that a geocoded response takes its first candidate is
  restated for the store path, which now takes all of them. The cart's destination path is unchanged
  and still takes the first.

## Impact

- `src/resolve/stores.ts`: `resolveQuery`'s order; `matchSettlement`, `parseQueryAddress`,
  `extractSettlementFromTokens`, `extractBuildingFromTokens`, `STORE_MATCH_SETTLEMENT_WINDOW_MAX`,
  `SETTLEMENT_STRICT_EDIT_MIN_LENGTH`, `STORE_AGREEMENT_DISTANCE_KM`, the `ReadingAgreement` type and
  the `rankingOnly` option go. `matchParsedStoresByRelevance` keeps its index, its prefix and fuzzy
  rules, its relative floor, its discriminating-term condition and its building multipliers, and is
  fed a candidate's parts instead of a parsed query. `resolveAddress` gains a way to return every
  candidate rather than collapsing to one.
- The saved-address step runs today when the listing matched nothing. It keeps running, and the change
  says where it sits in the new order rather than dropping it by silence.
- The unknown-handle failure — a whole query shaped like a store code the listing does not carry —
  stands as it is and is not geocoded.
- `src/commands/stores.ts`: the reason line, `agreementText`, the confidence line marking an answer as
  resting on a place rather than a matched address, and the command's own description, which says the
  two readings of an address may disagree.
- **Every store query costs one `silpo_find_address` call.** Today a query naming a settlement exactly
  costs none. Verified: `rankStores` already reads the whole branch listing and the offline orders on
  every invocation, so this is one call added to a command that already makes several.
- `test/resolve-stores.test.ts` (104 tests) and `test/stores.test.ts`: every fixture exercising
  settlement parsing, the two-readings agreement, the passed-over list or the confidence line.
- The account of store text matching and the store-resolution measurements describe the current
  order and the measurements that chose it; both are amended rather than deleted.
- `plugin/skills/silpo/SKILL.md`: the store entry tells the agent to leave out the retailer's own name
  and describes the disagreement marking; both change.
- No runtime dependency is added or removed — `minisearch` still runs the street index — and nothing is
  written to disk.

## Open Questions

- **What a query the lookup cannot place at all now costs.** Measured, `Хрещатик Кыив` returns no
  address, and a query mixing alphabets — `Днипро` with a Russian `и` — returns candidates that do not
  include Дніпро. Today either could still find a store by street text. Whether that class deserves a
  text fallback is a judgement the first live run informs.
- **Whether the caller's own settlement is still appended to the probe.** The append is gated today on
  a settlement the CLI parsed, and that parse is gone. It must become unconditional or disappear;
  there is no third option, and the design settles which.
