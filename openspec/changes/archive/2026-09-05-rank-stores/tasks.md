## 1. Rename the module and follow its importers

No behaviour changes in this group. It exists so that the group after it edits one file that is
already where it belongs.

- [x] 1.1 Move `src/resolve/place.ts` to `src/resolve/stores.ts` with its contents unchanged.
- [x] 1.2 Update its four importers to the new path: `src/commands/stores.ts`,
  `src/commands/carts.ts`, `src/resolve/delivery.ts`, `test/resolve-place.test.ts`. That is the whole
  set. Add no re-export and no alias at the old path — a missed importer must fail the build.
- [x] 1.3 Rename `test/resolve-place.test.ts` to `test/resolve-stores.test.ts`. Its assertions do not
  change.
- [x] 1.4 `npm test` passes with no assertion edited.

## 2. Let the fake vary by arguments

Touches `test/harness.ts` only. Group 4's CLI-level test of the receipt count needs it: `setPayloads`
keys on the tool name alone, so a fake answers identically whatever arguments a call carried, and the
assertion that the count does not follow the requested branch would pass vacuously. Group 3's tests
are module-level over hand-built clients and do not reach the harness.

- [x] 2.1 Add a way to register a responder that receives the call's arguments and returns the
  payload, leaving the existing name-keyed and array-queue forms working unchanged. Preserve the
  `peek` semantics `readCart` depends on.
- [x] 2.2 The existing suite passes untouched.

## 3. Rank stores inside the module

Touches `src/resolve/stores.ts` and its test only. The command still calls what it called before
until group 4.

- [x] 3.1 Grow the client type with `getMyOfflineOrders`. It gains nothing cart-shaped and it does
  not gain `getMyOnlineOrders`: the type is where the spec's "the ranking never reads the cart" and
  the decision to drop online orders are both enforced.
- [x] 3.2 Read the listing whole through the existing loop, paging at 500 — the schema's maximum — by
  `offset` until `meta.total` is exhausted, so one call suffices while the estate stays under 500 and
  a larger one is still read whole. Keep `STORE_LISTING_BOUND` and its truncation flag as a guard
  against an unbounded loop, set far above any plausible estate.
- [x] 3.3 Read the receipts: at most five pages at the ten `getMyOfflineOrders` caps `limit` to,
  supplying the **empty string** for each of its four required arguments — `branchId`,
  `deliveryType`, `timeslotStart`, `timeslotEnd`. There is no company argument. Measured, the four
  are not validated against the receipts and the empty form returns the same receipts as a plausible
  one, while additionally making `catalogProduct` `null` throughout, so the field that must not decide
  a count is absent rather than merely unread (design.md — Context). Take nothing from the listing:
  the read must not vary with `--pickup`/`--np`, and a filter excluding every store must not cost the
  caller their history. Pass no `dateStart`/`dateEnd` — measured non-monotonic. Count per store from
  `OfflineOrder.filId` joined to `Branch.externalId` on the string form, keeping the date of the most
  recent and the number of receipts whose `filId` matched no store. Do **not** read
  `products[].catalogProduct.branchId`. That "the receipt's own store" is an assumption about `filId`
  is recorded in design.md, not in a source comment — this repository forbids those.
- [x] 3.4 Read the saved delivery addresses as points, skipping any without coordinates.
- [x] 3.5 Add a **new** matcher beside `matchStores`, and leave `matchStores` and
  `matchSavedAddresses` byte-identical. Both have a second caller — `resolveDestination` calls saved
  addresses first, then stores, to decide where a cart is delivered — and that path is governed by
  `openspec/specs/delivery-resolution/spec.md`, which this change does not modify. Swapping either in
  place changes which shop a `cart setup --to` writes. The new matcher is a BM25 index over the
  listing: `minisearch`,
  already a dependency, with its **default word tokenizer and `prefix: true` — not the character
  trigrams `src/index/rank.ts` uses**, whose prefix collisions are worse on street names than on
  product names. Fields: the store's place, its store code, its branch uuid. `combineWith: "OR"`, and
  `canonicalizeAddressWords` applied to **both** the indexed text and the query — without it
  `вулиця Кирилівська` returns nothing, and with `AND` one unmatched word empties the answer
  (design.md — the measured table). Drop candidates below 0.2 of the top score, a fraction and never
  an absolute.
- [x] 3.6 Parse a coordinate pair before anything else: two decimal numbers, latitude then longitude,
  separated by a comma, optionally spaced. Nothing in `src/utils/` parses one today —
  `utils/coordinate.ts` only formats — so this is a new helper with its own test, including that
  `50.4` alone is not a pair and reaches the listing as text.
- [x] 3.7 Resolve a query, first answer winning: a coordinate pair; the BM25 index over the listing;
  then the caller's own saved addresses, matched through a **wrapper** over `matchSavedAddresses`
  that adds the `дім`/`дом`/`house`/`квартира` dictionary without altering the function
  `resolveDestination` calls. Text in the shape of a branch uuid or a store code that matched no
  store fails naming it and is **not** geocoded. Anything else goes to `findAddress`, whose ambiguity
  is its own outcome and not a ranking result.
- [x] 3.8 Take the point: from the pair, from the best BM25 match's coordinates, from the saved
  address, or from the geocode — every path yields one.
- [x] 3.9 Order the answer, the same shape in both cases. With a query: the stores it matched, best
  match first; then the stores within the radius of the point, nearest first. Without a query: stores
  with receipts by count descending; then stores within the radius of a saved address, nearest first.
  A store the caller has receipts from goes ahead of one they do not where both answered equally —
  receipts order and never widen or narrow. A store the query matched is exempt from the radius.
  Break ties on branch uuid. A store with no coordinates takes part in everything but distance.
- [x] 3.10 Apply the pickup and Nova Poshta filters before the ordering, not after. A filter narrows
  the corpus the answer is drawn from; it is never a reason for a store to be in the answer.
- [x] 3.11 Return one of four outcomes: the qualifying stores in order with the count that qualified
  and the signals that applied to each — including, for a text match, its score and which field the
  query reached; nothing to rank by; a store handle the listing does not hold; or an ambiguous
  geocode with its candidates. The caller renders, and recomputes nothing.
- [x] 3.12 Tests over hand-built client objects, not through `test/harness.ts`. These assert relative
  ordering **within their own corpus** and are not evidence about the configuration: BM25 on four
  documents behaves nothing like BM25 on 455, and a store whose code is `47` can outrank a genuine
  Кирилівська store there purely on IDF. The live check is task 5.3.
  Cover: the four measured queries, each ranking the Кирилівська 47А store first —
  `Кирилівська`, `Кирилівська 47`, `вулиця Кирилівська`, `Київ Кирилівська` — asserting order and
  never a count, since a second store on the same street is a correct lower-ranked answer; a caller
  whose most-visited store is not their nearest; a query naming a city the caller has no receipts in,
  asserting their own stores elsewhere do not displace it; two stores answering one query equally,
  asserting the one with receipts prints first and the other still prints; a query naming a street in
  the listing, asserting no geocoding happened and that the best match supplied the point; a saved
  address named by its label, asserting no geocoding happened; a store code as the query; a full
  branch uuid as the query, asserting it wins outright; a uuid and a code the listing does not hold,
  asserting each fails naming it rather than being geocoded; a coordinate pair as the query, and
  `50.4` alone asserting it is not one; an account with nothing to rank by; a store with no
  coordinates; a store the query matched beyond the radius, asserting it is still printed; a store
  without receipts beyond the radius, asserting it is not; the pickup filter changing which store is
  first without becoming a reason to print one; and an ambiguous geocode.

## 4. Reshape the command

Touches `src/commands/stores.ts` and `test/stores.test.ts`.

- [x] 4.1 Replace the option surface with one positional query, `--pickup`, `--np`, `--radius` and
  `--limit`. Remove `--near`, `--offset`, `--from-distance`, `--to-distance` and both rules about
  which options may stand together. `--radius` defaults to 15 km and `--limit` to 10. Every option
  applies whether or not a query was given.
- [x] 4.2 Call the module and print at most `--limit` stores, fewer where fewer qualified, with the
  count that qualified beside the page. Move the command's own distance sorting out; it lives in the
  module now.
- [x] 4.3 Print each store's record as it prints today, with a line beneath it naming every signal
  that applied — receipt count and last date, distance and the point measured from, or the query
  matched. `open` is printed and takes no part in the order.
- [x] 4.4 Handle the module's other three outcomes: nothing to rank by says so and names what would
  give the CLI an ordering; a store handle the listing does not hold fails naming it, as it does
  today; an ambiguous geocode prints the candidates and stops, as it does today. Where free text was
  geocoded, print the place it resolved to with the answer — its parts and its coordinates under one
  key — which the untouched "Address and Nova Poshta output" requirement still demands and which the
  reason line's "the point it was measured from" does not satisfy.
- [x] 4.5 Where receipts named a store the listing has no code for, say how many did not join, so a
  true absence can be told from a failed one. Where the listing outgrew its bound, say so.
- [x] 4.6 State in the command's own description that the whole listing is read once, that the
  distance is a straight line and not a route, and that the receipt read is bounded at five pages.
- [x] 4.7 Tests through `test/harness.ts`: the removed options fail as unknown; `--limit` prints
  fewer than asked when fewer qualify; a query matching several stores prints them ordered and
  succeeds rather than stopping; a query matching exactly one prints that store alone; and — using
  group 2's argument-aware responder, which echoes the requested branch into
  `catalogProduct.branchId` while `filId` stays fixed — two runs whose receipt reads carried
  different branches, asserting the printed counts are identical.

## 5. Follow the surface in what describes it

- [x] 5.1 Update the `silpo stores` entry in `plugin/skills/silpo/SKILL.md` to the new arguments, to
  what the two situations mean, and to the first result being the CLI's answer rather than an
  arbitrary row. Update `README.md:65`, which shows `silpo stores --near "вул. Хрещатик 1"`.
- [x] 5.2 Rewrite the earlier branch pagination record. Its central claim — that `silpo_list_branches` accepts
  `limit` and `offset` and returns all 454 regardless — is false as of 2026-09-05: `{"limit":5}`
  returns five of 455, `{"limit":500}` returns all 455, `{"offset":450}` the last five. The
  document's own "Re-check" section names exactly this outcome as the sign it is fixed. Record the
  measurement, the date, and that the CLI no longer forwards the caller's page size for its own
  reason — it ranks the whole listing.
- [x] 5.3 Re-run the four measured queries against the **live** listing and record the result and the
  date beside the before-numbers. The unit fixtures cannot stand in for this: their corpus is four
  stores and BM25's term statistics on 455 are not comparable. If a query still fails, the relevance
  floor or the field set is wrong and this is where that shows.
- [x] 5.4 `npm test` passes and the build is clean.

## Review checklist

- [x] Nothing under `src/resolve/` imports from `src/daemon/`, and the ranking's client type admits
  no cart-shaped member and no online-order tool. The cycle the spec forbids is unreachable, not
  merely unused.
- [x] `catalogProduct` is read nowhere in the ranking. A receipt count that can be changed by changing
  the branch the history was requested against is the defect this guards, and group 3's paired test
  actually exercises it through an argument-aware fake rather than passing vacuously.
- [x] A query naming a place the caller has no receipts in returns that place. No code path lets the
  receipt count reorder an answer that a query produced.
- [x] The radius filters only stores that qualified by proximity. A store with receipts and a store
  the query named survive any radius.
- [x] The ordering writes nothing and stores nothing: no SQLite table, no file, no module-level cache
  surviving the command.
- [x] `--limit` never causes a store that failed a filter or matched no query to be printed. Reducing
  it removes rows from the end and changes nothing else.
- [x] A store's printed reason is derived from what the ordering returned, not recomputed by the
  renderer. The two cannot disagree because there is only one computation.
- [x] A store carrying no coordinates is absent from distance comparisons and present everywhere else
  — not dropped from the listing, not sorted to the end by an invented distance.
- [x] `matchStores` and `matchSavedAddresses` are unchanged in behaviour and still the functions
  `resolveDestination` calls. The BM25 index and the label dictionary are separate, reached only from
  the ranking. A `cart setup --to` resolves to the same store it resolved to before this change.
- [x] `resolveAddress` and `resolveDestination` behave exactly as before the rename, and
  `resolveDestination` still stops on ambiguity.
- [x] A filter never puts a store in the answer. Passing `--np` with no query returns the caller's
  own stores and what is near their places, narrowed — not the estate's Nova Poshta stores.
- [x] Two stores that both matched a query print reasons that differ. A reader can tell why one is
  above the other without rerunning anything.
- [x] The old `src/resolve/place.ts` path does not exist and nothing re-exports it.
- [x] Every claim the command's description makes about its cost is true of the code: the number of
  listing reads, the five-page bound on the receipt read, and the distance being great-circle.
- [x] Nothing in the output leaves the caller unable to tell "no such store" from "the CLI stopped
  looking": the qualifying count, the unjoined receipt count and the listing-bound note are each
  printed when they apply.
