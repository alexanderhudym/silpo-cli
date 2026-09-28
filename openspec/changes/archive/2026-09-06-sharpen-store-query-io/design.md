## Context

See `proposal.md` — Why. What matters here is the shape of the code the change lands in.

`rankStores` (`src/resolve/stores.ts:1129`) is the single entry point. It reads the listing, then the
receipts, then branches on whether a query was given. `listStores` pages the branch listing under a
ceiling; `readReceipts` pages the offline orders under a page count and joins them to the listing in
the same function. `resolveQuery` walks the cascade and returns a `ResolvedQuery`. `src/commands/stores.ts`
renders whatever comes back.

Two constraints shape every decision below. The measurement harness that produced
`repair-store-resolution`'s accuracy figures was deleted and cannot be rebuilt, so nothing here can
be justified by an accuracy number.
And the repository already holds an unbounded pager, `drain` (`src/index/corpus.ts:17`), used by
three readings, which makes the store listing's ceiling the odd one out rather than a policy.

## Goals / Non-Goals

**Goals:**

- The unconditional reads happen in two waves rather than four sequential calls.
- No hand-maintained table of caller spellings survives in the store path.
- Records that are not shops never reach the matcher, the ranking or the output.
- The listing read is exhaustive and the truncation machinery is gone.
- A coordinate query answers the delivery question it is usually really asking.

**Non-Goals:**

- The matcher's scoring, the cascade's order, and the confidence apparatus are untouched. This change
  removes a table the matcher consulted; it does not change how the matcher scores.
- Nothing is cached and nothing is written to disk. The command's floor is the receipt read, which
  cannot be cached without recording purchase history, so caching the listing alone would buy roughly
  0.3 s of roughly 1.2 s and was measured and dropped.
- The duplicate rows are not collapsed. See the proposal's open questions for why collapsing them
  would break the cart's branch handle.
- `drain` in `src/index/corpus.ts` is not migrated to the new pager. Three unrelated readings depend
  on it and this change has no reason to touch them.

## Decisions

### The unusable-record filter lives in `listStores`, not in the ranking

`listStores` is read by `rankStores`, by `findBranch` and by `resolveDestination`. Filtering in the
ranking alone would leave `resolveDestination` free to offer a removed record as a cart destination —
the worse of the two failures, since that one is written. Filtering at the read means every consumer
gets the same estate, and the estate is defined once.

*Alternative considered:* a filter at each call site, so a consumer could opt out. Rejected — no
consumer has a use for a record naming no place, and an opt-out is a setting nobody would set.

### The exclusion test is structural, and the one constant it adds is a closed one

Two rules, applied at the read:

- The record carries neither a settlement nor a street address. Measured, this catches 7 of 455,
  including all 5 whose `externalId` begins with `delete_`, and rests on the record failing to hold
  what the command matches, ranks and prints.
- The record's coordinates fall outside the country the estate operates in. Bounds
  `44.0..52.5` latitude and `22.0..40.5` longitude, measured against the listing: the 448 rows that
  carry a place span `44.39..51.52` and `22.29..40.19`, and exactly 2 fall outside — `567898` at
  `1.0, 1.0` and `791091` at `40.70714, 74.01086`, reading `Київ, вул. Волл Стріт, 11`.

This change deletes two hand-maintained tables and adds one hand-maintained constant, which needs
saying out loud rather than leaving for a reviewer to catch. The difference is that the tables were
keyed on what a caller might type and grew with every input they failed to anticipate, while the
bounding box is a closed geographic fact about a single-country retailer. It is four numbers that
change if Silpo opens abroad, not a list that grows if a caller spells a city differently.

*Alternative considered:* `externalId` beginning with `delete_`. Rejected — it catches a strict subset
(5 against 7), and it is a guess about how the server spells its removed rows, which is the same class
of guess as the two tables being removed.

*Alternative considered:* `open === false`. Rejected on measurement. At 14:57 local on a Saturday, 20
of 455 report closed, among them three removed records, four rows whose sibling at the same address
reports open, and thirteen genuinely shut shops — and none that looks like a shop outside its hours.
It catches `567898` but not `791091`, and it would drop thirteen real stores. The flag reports
something other than usability, and the capability already keeps it out of the ordering.

*Alternative considered:* deriving the bounds from the listing's own distribution. Rejected — the
statistic would be computed over data containing the outliers it is meant to find, and choosing the
cut-off would be as arbitrary as choosing the box, with none of its stability.

### The pager takes the total from the first page and requests the rest together

A shared helper in `src/utils/paginate.ts`: fetch page zero, read `meta.total`, issue the remaining
pages concurrently, concatenate in order. Both listings report the total on their first page —
verified live, `{"limit":500,"offset":0,"total":455}` for the branches and
`{"limit":10,"offset":0,"total":20}` for the receipts.

It terminates on the same two conditions the current loop uses: an empty page, or `offset >= total`.
Removing the ceiling therefore changes no exit, which is what makes the removal safe rather than
merely tidy.

Order is preserved by concatenating by page index rather than by completion, so the listing the
matcher indexes does not depend on which request returned first.

*Alternative considered:* keeping the sequential loop and only removing the ceiling. Rejected — an
unbounded sequential loop is the one shape where a growing estate turns into a linearly growing wait.
Fanning out is what makes unboundedness defensible.

*Alternative considered:* generalising `drain` in place. Rejected as scope: three readings depend on
its current shape and none of them is this change's business.

### `readReceipts` splits into a read and a join

Today it fetches the orders and joins them to the branches in one function, which is why the branch
listing looks like a prerequisite. Splitting it into `readOfflineOrders(client)` — returning the raw
orders and the total — and `joinReceipts(orders, branches)` — returning the per-branch map, the
unjoined count and the total — makes the independence structural rather than a comment, and lets
`rankStores` await both reads together and join afterwards.

The receipt itself carries `filId`, `createdAt` and `cityName`, so the join is by store code exactly
as the capability requires, and nothing about the join changes.

### The coordinate pair is parsed before any read is issued

`parseCoordinatePair` is pure and costs nothing, so `rankStores` can know it holds a point before it
opens a connection. Where it does, `getAvailableDeliveryTypes` joins the first wave beside the
listing and the receipts, and its answer is joined to the listing afterwards to name each serving
branch as a store rather than a uuid. Verified live, all three branches it returned at
`50.4501, 30.5234` are rows the listing carries.

`PlaceClient` gains `getAvailableDeliveryTypes`. The types that return no branch are carried through
as such rather than dropped, so the output can distinguish a type with no polygon from one that was
not asked about.

### The probe's stop-list keeps only the retailer's names

`сільпо`, `сильпо`, `silpo`, and nothing else.

The rule is mechanistic and not statistical: the geocoder indexes the retailer's own shops as places,
so the retailer's name in the probe names precisely the class of thing the caller is trying to locate
*relative to*. Verified live — `сільпо` returns `Дніпро, Сільпо`, `silpo` returns
`Київ, Басейна вулиця, 6, Льо Сільпо`. Every other candidate token names something unrelated and
coincidental, which the rest of the query outweighs.

*Alternative considered, measured, and rejected:* keep any token that, alone, geocodes to a place.
This looked like a testable criterion and is not one. Measured over the 18 tokens the current list
holds, 16 return a place: `магазин` returns a village called Магазин in Сумська область, `де`
returns Дергачі, `в` returns Таврія В, `який` returns a forestry note in Тернопільська область. The
geocoder is a fuzzy search over point-of-interest names and will match nearly any token to something,
so the criterion does not discriminate and cannot decide the list.

That failure is itself the argument for moving the rest to the contract: with the harness gone there
is no measurement that can decide which filler words to keep, and a list nobody can test is a list
that grows by opinion.

### The settlement fallback and the second matching pass are not built

The first draft proposed taking the settlement from the geocoded candidate's `city` where the strict
match found none, which required matching a second time after geocoding. Measured, the geocoded point
with the default radius already selects the stores a settlement filter would — `Чернігів` 8 of 8
within 4.2 km, `Львів` 31 within 6.5, `Харків` 15 within 10.0, `Одеса` 35 within 12.6, `Київ` 153 of
155 with the other two being the junk rows this change removes. The existing path answers it, so
neither the fallback nor the second pass is built, and the cascade keeps the order
`repair-store-resolution` settled.

## Risks / Trade-offs

- **A Russian or former spelling of a renamed settlement regresses from a correct answer to an empty
  one.** Measured: `findAddress("Днепропетровск")` returns `Ucrainca` in Moldova, where the table
  answers `Дніпро` today. → The skill's contract asks for the current Ukrainian name, and the CLI
  already prints the text it looked up and the place it settled on, so the failure is visible in the
  answer rather than silent. Accepted as the price of the contract.

- **The bounding box is a constant that will be wrong if the estate crosses a border.** → It excludes
  only records, never narrows a query, and its failure mode is a missing store rather than a wrong
  one. The two rows it currently removes are named in this design, so a reader can check whether it
  is still earning its place.

- **The fan-out multiplies concurrent requests against the server.** At 455 stores and 20 receipts it
  is two requests in the first wave and none in the second. A much larger estate would issue many at
  once. → The page size is already the server's maximum, so the number of requests is fixed by the
  estate whatever the order; only their arrangement changes. If the server objects, the mitigation is
  a concurrency cap in the pager, which is a change to one helper.

- **Removing `truncated` touches every `StoreRanking` variant and roughly ten test fixtures.** →
  Mechanical, and the build fails on each site rather than any of them being missed silently.

- **The unusable-record filter changes what `findBranch` and `resolveDestination` can return.** A
  branch uuid naming a removed record now resolves to nothing where it previously resolved to a
  useless record. → That is the intended behaviour, and the failure it produces names the handle,
  which is the existing unknown-handle path.

## Migration Plan

None. No stored state, no on-disk format, no external contract. The only externally visible removals
are the truncation warning, which no caller can have depended on because the bound never fired, and
the nine records, which were never usable.

## Open Questions

- **What `open` actually reports.** The evidence is one snapshot at one time of day. One call after
  closing time, diffed against it, settles it. Nothing in this change depends on the answer, because
  `open` neither filters nor orders, and it is printed either way.
