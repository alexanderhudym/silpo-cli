Groups 2 through 5 all edit `src/resolve/stores.ts`. They are ordered by dependency and MUST be run
in sequence, never beside one another. Groups 1 and 6 touch no file the others do.

## 1. A pager that takes the total from the first page

- [x] 1.1 Add `src/utils/paginate.ts` exporting a helper that fetches page zero, reads the total the
      first page reports, issues the remaining pages concurrently, and returns the rows concatenated
      in page order rather than in completion order.
- [x] 1.2 Give it the two exits the existing loops use and no others: an empty page, or an offset
      that has reached the reported total. It takes no ceiling argument.
- [x] 1.3 Add `test/paginate.test.ts` covering a single-page listing, a listing whose pages must be
      fanned out, a listing whose later page returns fewer rows than the total promised, and a
      listing whose pages resolve out of order — the last asserting the concatenation is by page
      index.

## 2. The listing is exhaustive and holds only stores

- [x] 2.1 In `src/resolve/stores.ts`, rewrite `listStores` to page through the branch listing with
      the helper from group 1, and delete `STORE_LISTING_BOUND` and the `remaining` arithmetic.
- [x] 2.2 Apply the unusable-record exclusion inside `listStores`, so that every consumer —
      `rankStores`, `findBranch`, `resolveDestination` — sees the same estate. Drop a record that
      carries neither a settlement nor a street address, and a record whose coordinates fall outside
      latitude `44.0..52.5` or longitude `22.0..40.5`. Do not test `externalId` for a prefix and do
      not test `open`.
- [x] 2.3 Remove `truncated` from what `listStores` returns and from all four `StoreRanking`
      variants, and from every site in `rankStores` that populates it.
- [x] 2.4 In `src/commands/stores.ts`, delete `boundedNote`, its four call sites and the
      `STORE_LISTING_BOUND` import, and remove the sentence about reading up to a bounded number of
      stores from the command description, leaving the statement that the whole listing is read once
      per command.
- [x] 2.5 In `test/resolve-stores.test.ts`, delete the two tests asserting the ceiling and the
      truncation flag, and remove `truncated` from the ranking fixtures that carry it. Do the same
      for any fixture in `test/stores.test.ts`.
- [x] 2.6 Add tests that a record with neither city nor address is absent from what `listStores`
      returns, that a record with a place but coordinates outside the bounds is absent, that a record
      reporting itself closed is present, and that a query naming a settlement does not answer with a
      record whose coordinates lie elsewhere.

## 3. The two unconditional reads are issued together

- [x] 3.1 Split `readReceipts` into a read and a join: one function that pages the offline orders
      with the group 1 helper and returns the raw orders and the total, and one that takes those
      orders and the branches and returns the per-branch map, the unjoined count and the total. The
      join stays by store code, as it is today.
- [x] 3.2 In `rankStores`, issue the branch listing and the offline-order read concurrently and join
      them once both have returned, replacing the two sequential awaits at the head of the function.
- [x] 3.3 On the no-query path, issue the caller's saved delivery addresses in that same wave, since
      that path needs them unconditionally.
- [x] 3.4 Leave the query path's saved-address read exactly where it is — reached only when the
      listing matched nothing. Confirm no new call site fetches them earlier.
- [x] 3.5 Add a test that the query path issues no `getMyDeliveryAddresses` call when the query
      matched the listing, and a test that the branch listing and the offline orders are both
      in flight before either has resolved.

## 4. The settlement table and the geocoding probe

- [x] 4.1 Delete `SETTLEMENT_ALIASES` and the branch of `matchSettlement` that consults it. The
      remaining resolution is the exact case-folded match against the listing's own cities and the
      edit-distance-of-one match, both unchanged.
- [x] 4.2 Cut `GEOCODE_PROBE_STOP_WORDS` to the retailer's names alone — `сільпо`, `сильпо`,
      `silpo` — and nothing else.
- [x] 4.3 Restate the `Чернигов` regression test: it currently asserts the alias table resolves the
      settlement. It must now assert the query is answered through the geocoded place, and that no
      table is consulted.
- [x] 4.4 Restate the five-phrasings test against what the list still holds: a phrasing carrying the
      retailer's name reaches the geocoder without it, and the phrasings the skill's contract covers
      are no longer asserted to be reduced by the CLI.
- [x] 4.5 Add a test that no module under `src/` exports or holds a mapping from a settlement
      spelling to a settlement name, so that the table cannot be reintroduced quietly.

## 5. A coordinate query names who would serve the point

- [x] 5.1 Add `getAvailableDeliveryTypes` to `PlaceClient`.
- [x] 5.2 In `rankStores`, parse the query as a coordinate pair before any read is issued, and where
      it is one, include the delivery-type read in the first wave beside the listing and the
      receipts.
- [x] 5.3 Join each returned branch id to the listing so that a serving branch is carried as the
      store the listing holds, and carry a type the server answered with no branch through as
      unserved rather than dropping it.
- [x] 5.4 Carry the result on the ranking without letting it enter `stores` or influence any
      ordering or any distance.
- [x] 5.5 In `src/commands/stores.ts`, print the serving branches beside the ranked page, each named
      as a store and against the delivery type it serves, and each unserved type named as such.
- [x] 5.6 Add tests that a non-coordinate query issues no delivery-type call, that a coordinate query
      issues exactly one, that the serving branch appears in what is printed but not in the ranked
      stores, and that a serving branch further from the point than another store does not move in
      the ordering.

## 6. The skill's contract

- [x] 6.1 In `plugin/skills/silpo/SKILL.md`, add to the store entry what a query should be: a place
      and not a sentence about a place, naming politeness, proximity, question words and the
      retailer's own name as what to leave out, without claiming the command rejects a sentence.
- [x] 6.2 Add to the same entry that a settlement should be sent in its current Ukrainian spelling,
      that another language's name, a transliteration or a former name goes through the map and may
      resolve elsewhere, and point the reader at the line naming what was looked up and what was
      settled on as where that shows itself.
- [x] 6.3 Keep the entry's list of accepted forms, a district, a metro station and a landmark among
      them, so the reader knows to send one as it is rather than resolving it to a street address
      first. Do not add anything asking the reader to decide which form they hold or to send it
      differently — all of them go the same way a street address does.
- [x] 6.4 Remove the claim that the command reads up to 5000 stores and says so when that cut it
      short, and name the serving branches a coordinate query reports.
- [x] 6.5 Confirm the entry count the `agent-skill` capability fixes is unchanged, no rule was moved
      into a section of its own, and the file is still short enough to be read whole.

## 7. Build and verify

- [x] 7.1 Run `npm test`, which builds first. Report failures with their output rather than working
      around them.
- [x] 7.2 Run `silpo stores` with no query, with a street query, with a store code, with a settlement
      and with a coordinate pair against the live server, and confirm each answers and that the
      coordinate query names serving branches.

## Review checklist

- [x] No module under `src/` holds a mapping from a settlement spelling to a settlement name, and
      `matchSettlement` resolves only against the cities the listing carries.
- [x] The geocoding probe's stop list holds three entries, all of them the retailer's name, and no
      word of proximity, politeness or question remains in any list in the store path.
- [x] The identifier `STORE_LISTING_BOUND` does not exist, no `StoreRanking` variant carries
      `truncated`, and nothing in `src/commands/stores.ts` can print a truncation warning.
- [x] The unusable-record exclusion is applied inside `listStores` and not at any call site, so
      `findBranch` and `resolveDestination` cannot return a record that carries no place.
- [x] The exclusion tests the record's own place and coordinates. Nothing in the exclusion reads
      `externalId` for a prefix, and nothing in it reads `open`.
- [x] The bounding-box numbers appear once, named, and not inline at more than one site.
- [x] `rankStores` does not await the branch listing before issuing the offline-order read. Reading
      the head of the function shows both in flight together.
- [x] The offline-order read takes no argument derived from the branch listing, and the join to
      branches is a separate function taking both.
- [x] On the query path there is no call to `getMyDeliveryAddresses` reachable before the listing
      match has been evaluated.
- [x] The pager concatenates by page index. A test would fail if pages resolving out of order changed
      the resulting sequence.
- [x] The pager carries no ceiling parameter and no caller passes one.
- [x] `getAvailableDeliveryTypes` is reachable from `rankStores` only where the query parsed as a
      coordinate pair, and is issued in the same wave as the listing rather than after it.
- [x] The serving branches are absent from the `stores` array, from every comparator, and from every
      distance computation.
- [x] A delivery type the server answered with no branch survives to the output rather than being
      filtered out on the way.
- [x] The store entry in `plugin/skills/silpo/SKILL.md` names no store count and no truncation, and
      contains the query contract inline rather than by reference to another section.
- [x] That entry still names a district, a metro station and a landmark as forms the query takes, and
      asks nothing of the reader that depends on which of them they hold.
- [x] No test asserts that a settlement alias resolves, and no test asserts a bound or a truncation
      flag.
- [x] `npm test` passes, and its output is the run reported.
