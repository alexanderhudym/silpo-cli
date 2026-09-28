## Why

Four things surfaced while `repair-store-resolution` was implemented and reviewed. None of them is a
defect in that change — it does what its specs say — and none was in its scope. All four are about
what the store path *asks of the world*: how many round trips it makes, what data it maintains by
hand, and what it assumes about the text it is handed.

The first draft of this proposal rested on reading the code and on a handful of live calls. A
measurement pass against the live listing has since been made, and it settled both of that draft's
open questions, invalidated one of its four changes outright, and found two problems it had not
looked for. Every claim below carries the reading that produced it. Where a claim is not measured,
it says so.

The listing as measured on 2026-09-06: **455 rows, one page** — the tool caps `limit` at 500 and
reports `total: 455`. The whole estate is one call of roughly 130 KB, and `listBranches` returns in
about 0.3 s against about 0.35 s for a page of receipts.

## What Changes

- **The ranking's two unconditional reads are issued together, and each is drained in two waves.**
  `rankStores` awaits the store listing and then awaits the receipts (`src/resolve/stores.ts:1130-1132`).
  The dependency is false: `readReceipts(client, branches)` uses `branches` only to build a join map
  from `externalId` to `branchId` — the `getMyOfflineOrders` call itself does not depend on the
  listing. Both are read on every invocation and both are paginated, so the two page loops run one
  after the other today for no reason. They are to run concurrently and be joined after.

  Both listings report `meta.total` on their first page — verified: the branch listing returns
  `{"limit":500,"offset":0,"total":455}` and the receipt listing `{"limit":10,"offset":0,"total":20}`.
  The remaining pages are therefore known after the first and SHALL be issued together rather than
  one at a time. The unconditional read becomes two waves whatever the size of either listing.

  Measured on the account this was taken against, the saving is modest: 20 receipts is two pages, so
  the fan-out buys nothing there and the concurrency buys about 0.3 s of roughly 1.2 s. It grows
  with the receipt history — five pages of receipts is about 1.75 s sequential against about 0.7 s
  in two waves — and it is what makes removing the listing bound below safe at any size.

  The caller's saved addresses are **not** to join that fan-out on the query path. They are needed
  there only when the listing matched nothing, and fetching them eagerly is precisely the defect two
  successive review passes raised against `repair-store-resolution` — the capability says the caller's
  settlement "SHALL NOT be asked of the server by a call made only for it". On the no-query path they
  are needed unconditionally and may be read concurrently with the other two.

- **The settlement alias table is deleted, and nothing replaces it.** `SETTLEMENT_ALIASES` is a
  hand-written map of Russian and transliterated spellings to the settlements the listing carries. It
  is unbounded in principle and grows by hand with every spelling a caller invents.

  It has exactly one class of user. `matchSettlement` already resolves a settlement by exact
  case-folded match against the cities the listing carries, and by an edit distance of one for names
  of six characters or more. Every Ukrainian spelling therefore resolves without the table. The table
  serves Russian and Latin spellings and nothing else, and when the skill's contract says which
  spelling to send, it has no users left.

  Deleting it does not cost the bare-settlement answer, which was the reason to fear its removal.
  Measured, the settlement filter and the geocoded point with the default fifteen-kilometre radius
  select the same stores: `Чернігів` holds 8 stores, all within 4.2 km of the geocoded city point;
  `Львів` 31 within 6.5 km; `Харків` 15 within 10.0 km; `Одеса` 35 within 12.6 km; `Київ` 155, of
  which 153 fall inside the radius and the two that do not are the junk rows the next change removes.

  This retires the fallback the first draft proposed — taking the settlement from the geocoded
  candidate's own `city` field and matching a second time — and with it the second matching pass and
  the cascade reordering that draft left open. Nothing is added in the table's place.

  *The cost, stated rather than discovered:* a Russian spelling of a renamed city regresses.
  Verified live, `findAddress("Дніпропетровськ")` returns `city: "Дніпро"` and
  `findAddress("Кіровоград")` returns `city: "Кропивницький"` — the geocoder knows the
  decommunization renamings in Ukrainian. But `findAddress("Днепропетровск")` returns
  `city: "Ucrainca"`, a street in Moldova, followed by Dzhankoy and Simferopol. Today the table
  answers that query with the 17 stores of Дніпро; without it the query resolves to Moldova, no store
  falls within the radius, and the answer is empty with the Moldovan candidate named in the header
  the CLI already prints. That is visibly wrong rather than quietly wrong, and it is the price of
  moving the spelling into the contract.

  *Considered and rejected:* a transliteration library. `transliter`, `@sindresorhus/transliterate` and
  `cyrillic-to-translit-js` are all healthy and all solve the Latin half only. `Чернигов` → `Чернігів`
  is not a character mapping — `Chernigov` and `Chernihiv` are both correct transliterations of
  different source words — so no transliterator unifies them. *Also considered:* GeoNames
  `alternateNamesV2`, which does carry `ru`/`uk`/`en` variants tagged by language, at the cost of a
  multi-megabyte dataset, a join on `geonameid`, the `isHistoric`/`isPreferredName` columns that
  decommunization renamings make load-bearing, and uneven coverage of small settlements. It is a
  gazetteer we would maintain to duplicate one we already query.

- **The geocoding probe's stop-list moves into the skill's contract.** `GEOCODE_PROBE_STOP_WORDS`
  removes the retailer's name, words for a shop, words of proximity and question words. The list is
  unbounded for the same reason the alias table was: it is a standing guess about how a caller might
  phrase a request, and every phrasing it does not anticipate is a new entry.

  The caller is an agent, and `plugin/skills/silpo/SKILL.md` is where its contract is stated. An agent
  told to send the place rather than the sentence strips its own filler better than any list will, and
  the phrasings the list exists to survive stop arriving.

  What stays in the list is what the agent cannot know: tokens that actively poison the geocoder. The
  retailer's own name is the case — the geocoder indexes Silpo shops as places, so `Сільпо` in the
  probe returns the shop instead of the street. That is not filler. Politeness and question words are,
  and they belong to the contract.

  Nothing in the contract asks the agent to classify the place it is sending. The CLI does not detect
  a metro station, a district or a landmark and has no branch that would use such a detection: the
  geocoding path is reached by the listing matching nothing, whatever the text was. Verified live,
  the geocoder digests those forms as they are — `метро Політехнічний інститут`, `Політехнічний
  інститут`, `Оболонь` and `Осокорки` all return Kyiv coordinates as their first candidate. The
  contract asks for a place instead of a sentence about a place, and nothing more.

  Against this: `repair-store-resolution` measured the reduction taking five phrasings of one place from
  1, 1, 2, 1 and 0 out of 40 to 29 out of 40 for all five. That measurement was over synthesised human
  phrasings — the population a stated contract prevents from arriving. It is evidence the reduction
  works, not evidence the list is where the work belongs.

- **A coordinate query says which branches would serve that point.** `silpo_get_available_delivery_types`
  takes a latitude and a longitude — it takes no `branchId`, it **returns** them, one per
  polygon-based type (`DeliveryHome`, `WideAssortDelivery`, `B2B`); for `SelfPickup` and `NovaPoshta`
  it returns `null`. It is already used where it belongs, on the cart path
  (`src/resolve/delivery.ts:173`).

  They are three branches and not one, and they are three *different* branches. Verified live at
  `50.4501, 30.5234`: `DeliveryHome` is served by branch `2045` at вул. Басейна 6,
  `WideAssortDelivery` by `3279` at вул. Борщагівська 154А, and `B2B` by `3370` at
  вул. Липківського 1А. All three are rows the listing carries, so each can be named as a store the
  caller can act on rather than as a bare uuid.

  "Which branch serves this point" and "which stores stand near this point" are different questions,
  and the store listing answers the second: the capability fixes distance as the great-circle line to
  the coordinates the listing already carries, and the ordering as the CLI's own work over that
  listing. The serving branches SHALL NOT become part of the ordering.

  They are worth **reporting** alongside it. A caller who passed a coordinate pair is usually asking a
  delivery question, and the answer to it exists behind one call. That call costs nothing in wall
  clock: the coordinates are parsed before any read is issued, so it belongs in the first wave beside
  the store listing rather than after it.

- **A record that names no place, or stands nowhere a store could stand, is not a store.** The listing
  carries rows that are not shops and that the ranking prints as though they were. Measured, 9 of the
  455 fall into two classes.

  Seven rows carry neither a city nor a street address. Five of them are named
  `delete_filia_silpo_ferma_2286`, `delete_filia_silpo_ivasuka46` and the like — records of stores
  that were removed. The remaining two are `2505`, which carries no coordinates either, and `3656`,
  whose coordinates put it in Kazakhstan. The harm is not hypothetical: three of the five removed
  records carry valid Kyiv coordinates, and `delete_filia_silpo_stalingrad46` sits at
  `50.5202300, 30.5145200`, one metre from store `1998` at просп. Володимира Івасюка 46 — its own
  removed predecessor. Any query resolving near that point prints it as a nameless store beside the
  live one.

  Two further rows name a place but stand nowhere: `791091` reads `Київ, вул. Волл Стріт, 11` with
  coordinates `40.70714, 74.01086`, and `567898` reads `Київ, вул. Бориса Гмирі, 20` at `1.0, 1.0`.
  A query naming Київ returns the first of them, because the settlement filter reads `city` and not
  the coordinates.

  The test SHALL be structural and not a naming convention. `externalId` beginning with `delete_`
  catches five rows; carrying neither a city nor an address catches all five and two more, and rests
  on the record failing to hold what the command prints and ranks by rather than on a prefix the
  server may spell differently tomorrow. Adding a hand-maintained prefix list to this change would
  reintroduce, in a third place, exactly what the two changes above remove.

  `open` SHALL NOT be that test. Measured at 14:57 local on a Saturday — the middle of the trading
  day — 20 of the 455 rows report `open: false`, among them three of the removed records, four rows
  whose sibling at the same address reports open, and thirteen genuinely shut shops. No row looks
  like a shop outside its hours. The field appears to report whether the record is active rather than
  whether the door is open, and it catches `567898` but not `791091`. It stays printed and stays out
  of the ordering, exactly as the capability already requires.

- **The listing is read until it is exhausted, and the bound is removed.** `STORE_LISTING_BOUND` caps
  the read at 5000 stores and obliges what was printed to say when that cut it short. The estate is
  455 and the server pages it 500 at a time, so the bound sits at eleven times the thing it bounds
  and has never fired.

  The repository already holds the unbounded form. `drain` (`src/index/corpus.ts:17`) reads until the
  server reports no more, and three readings use it — the online orders, the offline orders and the
  favourites. The store listing is the only reader carrying a ceiling of its own. Removing it changes
  no termination condition: the loop already breaks on an empty page or on `offset >= total`, and
  those two remain the only exits.

  With the pages of the second wave issued together, an exhaustive read costs two round trips
  whatever the estate holds, which is what makes the bound unnecessary rather than merely unused.

Deliberately not in this change: the accuracy of the matcher, the cascade, the confidence, or anything
else `repair-store-resolution` settled. The duplicate rows the listing carries are also deliberately
left alone — see the open questions.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `stores-and-delivery`: the query-reading requirement loses the obligation to carry spellings as
  data of its own, and its probe-reduction paragraph narrows to tokens that misdirect the geocoder,
  with the phrasing contract named as the skill's. The relevance requirement gains a statement that
  the reads the ranking needs unconditionally are issued together and drained together, that a read
  needed only on one path stays on that path, and that a record naming no place or standing nowhere
  real is not a store. The store-listing requirement loses the bound and the obligation to report a
  truncated read. The store-listing output requirement gains the serving branches for a coordinate
  query, stated as reported rather than ranked upon, and loses the scenario that prints a store with
  no place.
- `agent-skill`: the store entry states what a store query should be — a place in its current
  Ukrainian spelling, not a sentence about a place — so that the reduction has less to undo, and
  drops the bound from what it says the command reads.

## Impact

- `src/resolve/stores.ts`: `rankStores`'s read sequencing and the fan-out of both listings;
  `SETTLEMENT_ALIASES` removed with no replacement; `GEOCODE_PROBE_STOP_WORDS` cut back;
  `STORE_LISTING_BOUND` and `truncated` removed from `listStores` and from all four `StoreRanking`
  variants; the unusable-record filter added to `listStores`.
- `src/commands/stores.ts`: the serving branches on a coordinate answer; `boundedNote` and its four
  call sites removed.
- `plugin/skills/silpo/SKILL.md`: the query contract, the serving branches in the store entry, and
  the bound dropped from what the entry says the command reads.
- Round trips: one fewer sequential wait on every `silpo stores` invocation; one added call on a
  coordinate query, issued in the first wave and therefore free in wall clock; no change to the
  number of geocoding calls.
- `test/resolve-stores.test.ts` and `test/stores.test.ts`: the `Чернигов` regression currently asserts
  the alias table resolves it and must be re-stated against the geocoded answer. The five-phrasings
  test asserts the stop-list reduces them and must be re-stated against whatever the list keeps. The
  two bound tests and the `truncated` field in roughly ten fixtures go with the bound.
- Nothing is cached, nothing is stored, and no runtime dependency is added.

## Open Questions

- **Whether the confidence apparatus still earns its place.** `restsOnPlace` and the "less certain"
  marking exist because a place no address contains was answered correctly less often than a street
  address. The skill contract above removes the population that made that true. Retiring the
  apparatus would touch what `repair-store-resolution` just settled, so it is out of scope here and
  named rather than acted on.
- **What `open` actually reports.** The reading above — that it tracks whether the record is active
  rather than whether the door is open — rests on one snapshot at one time of day. One call taken
  after closing time, diffed against that snapshot, settles it. It was not taken. Nothing in this
  change depends on the answer, because `open` neither filters nor orders.
- **Whether the duplicate rows should be collapsed in the page.** 62 groups of rows share an address,
  and 57 of them hold exactly one row with `hasPickup: true`. They are functional identities rather
  than duplicates: at вул. Борщагівська 154А the row `getAvailableDeliveryTypes` names for
  `WideAssortDelivery` is `3279`, whose `hasPickup` is null, while the pickup store at that address
  is `2042`. Collapsing them would mean electing one `branchId`, and the `branchId` is the handle
  `cart setup --branch` takes, so a wrong election breaks the cart. They are therefore left alone.
  What remains true is that a page of ten can spend three rows on one address, which is a question
  about what is printed and not about which rows exist.
