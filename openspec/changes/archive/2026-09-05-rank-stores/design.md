## Context

See [proposal.md](proposal.md) — Why. The behaviour is in
[specs/stores-and-delivery/spec.md](specs/stores-and-delivery/spec.md).

`src/resolve/place.ts` already takes its client as a parameter
(`PlaceClient = Pick<SilpoSurface, "listBranches" | "getMyDeliveryAddresses" | "findAddress">`) and
imports nothing from the daemon, so it is already callable from both the daemon process and a CLI
process — which is what lets the cart consult it later without a second implementation. It carries
`matchStores` (text against the listing), `resolveAddress` (geocoding), `resolveDestination` (the
ambiguity chain) and `matchSavedAddresses`; `src/commands/stores.ts` carries the distance sorting.
It does **not** use `RankIndex`: matching is normalised word comparison through
`normalizeForMatch` and `canonicalizeAddressWords`, not BM25. That stays.

Measured against the live service on 2026-09-05, before this design was settled:

- `silpo_list_branches` **pages correctly**: `{"limit":5}` returns five, `{"limit":500}` returns all
  455 in one call, `{"offset":450}` returns the last five. An earlier measurement,
  taken 2026-08-16 against v1.108.0, found the opposite and is stale. Its `limit` is capped at 500 by the
  tool schema and defaults to 50, so 500 is the largest page obtainable and an estate above that has
  to be paged rather than asked for in one call.
- A receipt names its store as `filId`, and that value **joins to `Branch.externalId`**: `filId 5831`
  → `1ee15e2a-7c41-6b83-9d52-4b7d0e93c468`, Київ, вул. Кирилівська 47А, matching the receipt's own
  `filialName` and `cityName`.
- `catalogProduct` is **not part of the receipt**. It is a live catalogue lookup in the branch the
  request named, joined onto each receipt line and `null` where that branch does not carry the
  product now: the same twenty receipts requested against two branches return the same 139 lines with
  a different 103 and 105 of them carrying a card, every `catalogProduct.branchId` echoing the
  requested branch while `filId` stays 5831.
- `silpo_get_my_offline_orders` requires `branchId`, `deliveryType`, `timeslotStart` and
  `timeslotEnd`, and **validates none of them against the receipts**: an unrelated branch, a slot in
  2020 and a slot in 2030 all return the same twenty receipts with the same `filId`. They shape
  `catalogProduct` and nothing else. It caps `limit` at 10.
- Measured 2026-09-05, those four are also satisfied by the **empty string**, and that is what the
  ranking sends. Empty arguments return the identical twenty receipts — same `filId`, same
  `createdAt`, row for row across both pages — and `catalogProduct` comes back `null` for every
  product, where plausible arguments fill most of them, because the server cannot look up a catalogue
  without a branch. Omitting the four entirely fails schema validation: they are required strings,
  and the empty string is how the CLI says it has nothing to say.
- `dateStart`/`dateEnd` — not `timeslotStart`/`timeslotEnd` — is the receipt date filter, defaulting
  to the last six months. It is **not monotonic**, and is therefore not used: measured 2026-09-05,
  `2026-06-01..today` returns `total: 21` while its own superset `2026-01-01..today` returns 20;
  `2026-01-01..2026-12-31` returns 0 though every receipt is dated 2026; and a 2019 window returns
  receipts from September 2025. The default is stable at 20 across every call, so the CLI passes no
  window at all rather than trading working behaviour for a lottery.
- Every one of the eight distinct addresses across eleven online orders is already a saved delivery
  address, under a different spelling (`м. Мукачево / вулиця Росвигівська` against
  `Мукачево / Росвигівська вулиця`). All fourteen saved addresses carry coordinates.

## Goals / Non-Goals

**Goals**

- One ordering, computed in one place, usable by the `stores` command and by any later caller.
- No number that has to be tuned. The one constant, the radius, is a caller-visible option.
- The reason a store placed where it did falls out of the ordering rather than being reconstructed.

**Non-Goals**

- Persisting anything. Every signal is read per command.
- Ranking branches for a cart, or recreating a cart. This change makes the ordering callable; the
  cart's use of it is a separate change.
- A second retrieval channel. Vectors, their model, the process that holds it and the fusion that
  combines them are the change that lands on top of this one, and the number that justifies them can
  only be a delta against the lexical channel this change builds.

## Decisions

### Text matching becomes BM25 over words, replacing substring containment

`matchStores` is `normalizeForMatch(place).includes(needle)` — a substring test over
`"Київ, вул. Кирилівська, 47А"`, and it does not use `canonicalizeAddressWords`, which exists beside
it and knows `вул → вулиця`. Measured against the live listing on 2026-09-05, three of four natural
queries return nothing:

```
Кирилівська          1 match
Кирилівська 47       0    the listing writes "Кирилівська, 47А" — a comma between
вулиця Кирилівська   0    the listing writes "вул."
Київ Кирилівська    0    not a contiguous run
```

The replacement is `minisearch`, already a dependency, configured **with the default word tokenizer
and `prefix: true` — not the character trigrams `src/index/rank.ts` uses for products.** Trigrams are
what turned `сир` into `сироватка` there, and street names are denser in prefix-sharing pairs
(`Садова`/`Садовий`, `Кирилівська`/`Кирилівський`) with a worse failure — the wrong city rather than the
wrong shelf.

The exact configuration was measured against the installed `minisearch` on four stores standing for
the shapes that matter, and is not an assumption:

```
fields: place, code, uuid   prefix: true   combineWith: OR
canonicalizeAddressWords applied to BOTH the indexed text and the query
relevance floor: 0.2 of the top score

Кирилівська          a:1.0  b:1.0     both stand on it; both are answers
Кирилівська 47       a:3.3  b:1.0     47А first
вулиця Кирилівська   a:3.1  b:3.1
вул Кирилівська 47   a:6.6  b:3.1     47А first
5831                 a:1.8            alone
full uuid            a:38.9           alone; the floor cut a segment-sharing neighbour at 1.1
```

Two of those settings are load-bearing and were arrived at by measurement, not preference:

- **`canonicalizeAddressWords` runs on both sides, and is required.** Without it `вулиця Кирилівська`
  returns **nothing at all**, under `AND` and under `OR` alike: the listing is indexed as `вул`,
  prefix search asks whether the query term is a prefix of an indexed term, and `вулиця` is not a
  prefix of `вул`. It is not a nicety layered over BM25; it is what makes the two vocabularies one.
- **`OR`, not `AND`.** Under `AND` a single word the listing does not carry empties the answer —
  `вулиця Кирилівська` returns nothing even where the street matches — which is the brittleness this
  change exists to remove. Under `OR` an extra word lowers a score instead of zeroing it, and the
  relative floor removes what drifts in. A full uuid still wins outright: 38.9 against 1.1.

What BM25 buys, against what the alternative would cost:

- **IDF replaces the hand-kept alias table.** `вулиця` appears in nearly every address and earns
  nearly no weight; `Кирилівська` is rare and earns most of it. `canonicalizeAddressWords` stays as a
  preprocessor so that `вул` and `вулиця` are the same token at all, but it stops being the only
  thing standing between the caller and a miss.
- **Word independence** fixes `Київ Кирилівська`.
- **`prefix: true`** fixes `47` against `47А`.
- **A weak match still ranks** rather than vanishing, which is what a relevance floor then trims.

The store code and the branch uuid go through the same index as fields, not around it. A full uuid is
several very rare tokens landing on one document, so IDF carries it to the top without a special
case; a code colliding with a building number produces two answers in one order rather than a branch
in the code.

### Two situations, not one scoring function

```
query given                                    query absent
───────────                                    ────────────
coordinates       → the point                  receipts → count desc
listing (BM25)    → those stores, and the      then within radius of a
                    best one's coordinates     saved address → distance asc
                    become the point
saved addresses   → that address's point
uuid/code the listing lacks → fail, naming it
none of the above → findAddress
       ↓
matched stores first, best match first
then stores within the radius of the point, nearest first
       ↓
receipts break ties within whatever answered
```

Both columns have the same shape: **what answered directly, then what stands near it.** The query
case and the no-query case differ only in what plays the first part and what supplies the point.

Taking the point from the best text match is what makes `--radius` mean something for a named place
without a second round trip. `Львів` matches Lviv stores; the best of them is where Lviv is; the rest
of the answer is what stands within the radius of that. `Кирилівська 47` matches one store; the
radius then offers what is near it. Nothing needs to know whether the query was broad or precise.

The query, where there is one, *is* the place, and the answer is about that place. Receipts do not
decide **which** stores answer — the case that settles this is a Kyiv resident asking
`silpo stores Львів`, who means Lviv and would otherwise be handed their own Kyiv stores. Among the
stores that did answer, receipts order: between two Lviv stores that match equally, the one they
have shopped at is the better answer.

The saved-address path is what makes `stores "возле дома"` work without a model. The caller labelled
those addresses themselves, `matchSavedAddresses` already matches a query against label and place,
and the coordinates are on the record. A handful of dictionary entries (`дім`/`дом`/`house`/
`квартира`) covers the gap between the label they chose and the word they typed — cheaper and more
legible than any vector would be for fourteen strings.

**Rejected**: one weighted score over all signals, as `src/index/rank.ts` does for products. Every
weight there is a number someone chose, and product ranking can at least be measured against
fixtures. Here the two situations ask different questions, and a single score would blend them into
an answer that is right for neither.

### The store of a receipt is `filId`, and there is no second source

`OfflineOrder.filId`, joined to `Branch.externalId` on the string form. Stores carrying no
`externalId` are not matched. `products[].catalogProduct.branchId` **must not be used**, for the
reason in Context: it echoes the branch the request carried, so a count built on it would move with
the cart while looking entirely plausible.

That `filId` names the store of *that* receipt is an assumption, not a measurement — the account it
was checked on has twenty receipts over three months and one `filId`, so "the store of this receipt"
and "the account's home store" predict identical data. What is measured is that `filId` does not
follow the request and that it resolves to a branch matching the receipt's own `filialName` and
`cityName`. Under the unproven reading the counts concentrate on one store for a caller who uses
several; that store still ranks first and the others fall through to distance, so the ordering
degrades rather than inverts. The code says where it assumes this.

### The receipt read supplies nothing, not a plausible something

`getMyOfflineOrders` requires four arguments — `branchId`, `deliveryType`, `timeslotStart`,
`timeslotEnd`, and no company — that the module is forbidden to get from the cart. It sends the
**empty string** for all four. The measurement in Context shows this returns the same receipts as any
plausible value would, and that it additionally makes `catalogProduct` `null` on every line.

That second effect is the reason for the choice. `catalogProduct.branchId` echoes whatever branch the
request carried, so a receipt count built on it would move with the caller's cart while looking
entirely plausible — the defect this design exists to avoid. Sending no branch removes the field from
the payload, so the defect stops being something the code must remember not to do and becomes
something the data cannot express.

It also decouples the receipt read from the listing. An earlier shape took `branchId` from the first
branch of the listing just fetched, which made the outgoing request vary with `--pickup`/`--np` for
no reason, and — worse — meant a filter that excluded every store skipped the receipt read entirely,
costing the caller their whole history to satisfy a narrowing that has nothing to do with it.

**Rejected**: taking the four from the caller as a context argument. It would work for `stores`, which
usually has a cart, and fail for the case that most needs the receipts — a cart being recreated,
which has none. A module that answers differently depending on whether its caller happened to have a
cart is the cycle in a slower form.

**Rejected**: narrowing the read with `dateStart`/`dateEnd`. It is the real date filter, but it is
measurably non-monotonic (Context), and the default six months already returns the whole history this
account holds.

**The risk this accepts** is that the server may begin validating those arguments, and an empty
string is the first thing a validator would reject — this choice trades away tolerance for loose
validation in exchange for `catalogProduct` being unreachable. If validation arrives, the receipt read
fails and the visit signal disappears while distance still answers. That is a degradation, not a
wrong answer, and it is visible: the reason lines stop naming receipts.

### Online orders are not read at all

They were considered twice and dropped twice. Their branch is the one Silpo picked to fulfil from.
Their address carries no coordinates and, measured, is always a saved address under a different
spelling — so geocoding them buys points already held, at the price of a spelling match that can
invent one. Dropping them removes a read, a client-type member, and an ambiguity case.

### The radius bounds nearness, not the answer

Fifteen kilometres by default, an option. It applies where nearness is why a store is in the answer:
around the point a query named, and around each saved address where no query was given. A store with
receipts, or one the query matched by text, code or uuid, is not subject to it — it is in the answer
for another reason, and a radius measured from somewhere else would drop the store the caller asked
for.

The bound is what makes "near one of my places" mean anything: the account measured has fourteen
saved addresses across seven settlements, and without a radius almost every branch in the country is
near one of them.

### The whole listing is read to exhaustion, one page where one suffices

`limit: 500` returns all 455 today, measured, so the ordinary case costs one call. Ten default pages
would cost ten round trips for the same bytes.

But 500 is also the schema's maximum page size, so "one call" and "the whole listing" are the same
thing only while the estate stays under 500. `listStores` therefore keeps its loop and pages by
`offset` until `meta.total` is exhausted, rather than stopping at one page: an estate of 501 must
return 501, not the first 500 with the rest silently missing.

`STORE_LISTING_BOUND` survives as a guard against an unbounded loop rather than as the read's real
limit, and sits far above any plausible estate (5000). An estate outgrowing even that is reported
rather than silently cut, because a ranking over part of the listing is not the ranking the caller was
promised.

The caller's own `--limit` is never forwarded. Ranking the server's first fifty branches would order
the wrong set.

### The ranking gets its own matchers; the destination chain keeps the old ones

`matchStores` and `matchSavedAddresses` each have a second caller, and it is not this command:
`resolveDestination` (`src/resolve/place.ts:151,163`) calls both, saved addresses first, to decide
where a cart is delivered. That path is governed by
`openspec/specs/delivery-resolution/spec.md:97-125`, which this change does not modify.

So the BM25 index and the label dictionary are **new functions used only by the ranking**. The two
existing matchers keep their containment behaviour, byte for byte, and keep serving the destination
chain. Replacing them in place would have changed which store a `cart setup --to` writes — prefix
matching turns one candidate into several, or several into one, and `delivery-resolution` specifies
what happens at exactly that fork. It would also falsify
`delivery-resolution/spec.md:102`, which says a store listing is not ordered by anything the caller
cares about; after this change the ranking's listing is, and the destination chain's is not.

This is the cost of the rename being a move and not a rewrite: two matchers, one precise and one
recall-oriented, living in one file with different callers. The alternative — one matcher serving
both — is a cart written to the wrong shop to save a function.

### The module keeps address resolution and gains ranking

`src/resolve/place.ts` becomes `src/resolve/stores.ts`. `resolveAddress`, `resolveDestination` and
`matchSavedAddresses` move with it unchanged — they are about places, the file is about stores and
the places they stand at, and splitting them would put the geocoder somewhere the store ranker has to
import from anyway.

`resolveDestination` keeps stopping on ambiguity. The ordered answer belongs to the read path; the
destination chain writes a cart, where taking the first of several candidates is a different and
worse mistake.

`PlaceClient` grows `getMyOfflineOrders`. It does not grow anything cart-shaped: the spec forbids the
ranking from reading the cart, and the type is where that is enforced cheaply.

### The module's answer admits five outcomes

Ordered stores; nothing to rank by; the query matched and geocoded nothing; a store handle the
listing does not hold; and the geocode was ambiguous.

The last three are failures of resolving the query rather than of the ranking, and they are separate
because they call for different answers. An ambiguous geocode prints the candidates and stops, as
"Address resolution" requires. An unknown handle fails naming it. A query that resolved to nothing
fails naming the query — collapsing it into "nothing to rank by" would tell a caller with a full
account that they have no receipts and no saved addresses, and advise them to name a place in the
query they just named.

"Nothing to rank by" itself carries what the account holds, because it covers two situations that
must not read alike: an account that genuinely has neither receipts nor saved addresses, and an
account that has both, whose filters left nothing qualifying. The second is answered by naming the
filters, never by claiming the account is empty.

## Risks / Trade-offs

- **The server may start validating the receipt read's four arguments.** The empty strings the read
  sends are the first thing a validator would reject, so this change is *less* tolerant of that than
  a plausible-looking value would have been — deliberately, in exchange for `catalogProduct` being
  absent from the payload rather than merely unread. → The visit signal disappears, distance still
  answers, and the reason lines stop naming receipts. Detectable from the output; no wrong answer is
  produced.
- **A receipt's `filId` may name a store the listing has no `externalId` for.** → That store gets no
  count. The output requirement makes this visible by printing how many receipts joined, so a true
  absence can be told from a failed join.
- **The relevance floor is a number nobody has measured.** Too low and `--limit` fills with stores
  the query barely touched; too high and a real match is dropped. → It is expressed relative to the
  top score, not absolutely, so it does not drift with corpus size the way
  `AUTO_SCORE_THRESHOLD = 750` does in `src/index/rank.ts`. It is chosen against the real listing,
  not against fixtures — see the next risk.
- **BM25 behaves differently on four documents than on 455, so unit fixtures cannot settle the
  configuration.** On a four-store index a store whose *code* is `47` outranks a genuine store on
  Кирилівська for the query `Кирилівська 47`, because IDF makes a rare code beat a common street.
  With 455 stores the term statistics are nothing like it, in that direction or the other. → The unit
  fixtures assert relative ordering within their own tiny corpus and are not evidence about the
  configuration. The four queries are re-run against the live listing after the command is reshaped,
  and the result is recorded beside the before-numbers.
- **A misspelt street that also fails to geocode returns nothing.** → Accepted here. This is the
  recall gap a second retrieval channel would close, and closing it is the next change's job,
  measured as a delta against this one rather than assumed.
- **Nothing here is measured against fixtures.** There is no eval for store ranking and this change
  does not build one. → The reason line is the instrument: every ordering decision is named in the
  output, so a wrong one is visible in the first run rather than inferred.

## Migration Plan

The rename lands with its importers in the same step: `src/commands/stores.ts`,
`src/commands/carts.ts` and `src/resolve/delivery.ts` follow `place.ts` to `stores.ts`, and
`test/resolve-place.test.ts` follows to match. These four are the complete set of importers. No
compatibility shim and no re-export: the old path disappears, and a missed importer fails the build.

`silpo stores --near <text>` becomes `silpo stores <text>`. `--has-pickup <bool>` and
`--has-np <bool>` become the switches `--pickup` and `--np`. The removed options fail as unknown
options, which names them, rather than being accepted and ignored.

`test/harness.ts` cannot vary a response by the arguments a call carried — `setPayloads` keys on the
tool name alone. The test that proves the receipt count does not follow the requested branch needs
that, so the harness gains it.

There is nothing to roll back beyond the commit: no stored state is written, read or migrated.

## Open Questions

None.
