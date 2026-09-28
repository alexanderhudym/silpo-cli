# Tasks

## 1. The lookup returns every candidate

Owns `src/resolve/stores.ts`'s address-resolution functions and `test/resolve-stores.test.ts`.

- [x] 1.1 Give the store path an entry point that returns **every** candidate the lookup found, with
      each candidate's `city`, `street`, `houseNumber` and point. `resolveAddress` collapses to one on
      a single result and on an exact match and returns `ambiguous` otherwise, which the cart path
      still needs — so add rather than reshape, and say which of the two each caller uses.
- [x] 1.2 Delete `rankingOnly` and `AddressResolutionOptions`. The cart's destination path keeps taking
      the first candidate of a geocoded response, by its own code rather than by an option the store
      path shared with it.
- [x] 1.3 Widen `StoreRanking` to carry the places the answer came from, more than one where more than
      one produced stores. Today it carries a single `resolvedPlace`.

## 2. The CLI stops parsing the query

Owns `src/resolve/stores.ts`. Depends on group 1.

- [x] 2.1 Reorder `resolveQuery`: coordinate pair, handle, then the lookup. The two short-circuits keep
      their behaviour exactly — a handle is still found inside a longer text, a number the listing does
      not carry still falls through, and neither makes a lookup call.
- [x] 2.2 Feed `matchParsedStoresByRelevance` a candidate's `city`, `street` and `houseNumber` instead
      of a `QueryAddress` the CLI parsed. **Change nothing inside it**: the index, the prefix and fuzzy
      rules, the relative floor, the discriminating-term condition and the building multipliers all
      stay as they are.
- [x] 2.3 Match every candidate, not the first. Take the results together and order them as the
      capability requires.
- [x] 2.4 Where a candidate's street matched no store, answer with that candidate's settlement, ordered
      by distance from the candidate's own point. Measured, no store stands on Хрещатик or on Сумська,
      so this is the common case and not a corner.
- [x] 2.5 Keep the radius as it is. It bounds what counts as near around the point the answer was taken
      from — the matched store's where a street matched, the candidate's where its settlement answered.
- [x] 2.6 Delete `matchSettlement`, `extractSettlementFromTokens`, `extractBuildingFromTokens`,
      `parseQueryAddress`, `STORE_MATCH_SETTLEMENT_WINDOW_MAX` and `SETTLEMENT_STRICT_EDIT_MIN_LENGTH`.
- [x] 2.7 Delete `STORE_AGREEMENT_DISTANCE_KM`, the `ReadingAgreement` type, the agreement branch in
      `resolveQuery` and `MatchSignal.agreement`. One reading has nothing to disagree with.
- [x] 2.8 Stop appending the caller's settlement to the probe, and delete `buildGeocodingProbe`'s
      settlement branch and `deriveCallerSettlement` if nothing else calls it. The gate was a value
      `parseQueryAddress` produced.
- [x] 2.9 Stop removing the retailer's own name in `reduceGeocodingProbe`. Keep whatever else it
      removes, or delete it if that was all it did.
- [x] 2.10 Leave the saved-address step where it is: reached when the candidates matched no store, and
      not fetched before that is known. Leave the unknown-handle failure exactly as it is.
- [x] 2.11 Grep for every name deleted above plus everything that becomes unreferenced —
      `sortMatchesByScoreThenReceipts`, `branchStreet`, `branchBuilding`, `MatchedParts`,
      `StoreMatch.parts`, `splitAddress` — and confirm each remaining reference is deliberate. Check
      `canonicalizeAddressWords` and `stripStreetTypeWords` before deleting either: both are used by
      `resolveAddress`'s exact-match rule, which `delivery-resolution` requires, and
      `stripStreetTypeWords` is pinned by `test/address.test.ts`.
- [x] 2.12 Run `npm test`.

## 3. What the command says

Owns `src/commands/stores.ts` and `test/stores.test.ts`. Depends on group 2.

- [x] 3.1 Name the place the answer came from, and every place where more than one candidate produced
      stores.
- [x] 3.2 Say when a candidate's settlement answered because its street matched no store, so a caller
      sees they were given the stores of a place rather than of a street.
- [x] 3.3 Delete `agreementText`, `BUILDING_PART_TEXT`'s agreement entries and the confidence line that
      marks an answer as resting on a place rather than a matched address. `restsOnPlace` becomes
      meaningless once every text query is placed by the lookup — decide whether the flag goes or is
      redefined, and say which.
- [x] 3.4 Update the command's own description: it says the stores it matches come first and that the
      two readings of an address may disagree.
- [x] 3.5 Run `npm test`.

## 4. The tests

Owns `test/resolve-stores.test.ts` and `test/stores.test.ts`. Depends on group 3.

- [x] 4.1 `test/resolve-stores.test.ts` holds 104 tests and roughly 44 references to
      `matchStoresByRelevance` and `matchSettlement`. Work through them: a test of the street index
      still stands if it is given a candidate's parts; a test of settlement parsing does not stand at
      all. Say in the notes which were repointed and which were dropped.
- [x] 4.2 `test/stores.test.ts` pins the geocoded first candidate, the passed-over list and the
      confidence line. Each needs a disposition, not a deletion.
- [x] 4.3 The store-resolution measurements call that suite a floor a future change must not
      fall below. Several pinned regressions — `Дерибасівська Одеса`, `Львів вул. Шевченка 60`, the
      bare `2`, the Boyarka uuid digit — test the parsing that is going. Each must be rewritten to pin
      the same outcome through the new path, or explicitly retired with a reason.
- [x] 4.4 Cover: a candidate the lookup ranked first dropped because it matched no store while a later
      one answered; several candidates producing stores in several settlements; a candidate whose
      street matched nothing answered by its settlement; a handle inside a sentence answered with no
      lookup; and a query the lookup cannot place failing naming the value.

## 5. Live verification

Depends on group 4. These are the queries the change was measured on.

- [x] 5.1 `stores "Дніп"` — stores in Дніпро. Today it returns four Kyiv stores on Дніпровська; that is
      the defect this change exists for.
- [x] 5.2 `stores "Днопро"` — a typo, and the case the change is really buying. Stores in Дніпро.
- [x] 5.3 `stores "Дніпро"` — unchanged, 17 stores.
- [x] 5.4 `stores "Харків Сумська"` — answered from the Харків candidates, not from «Сумська область,
      Харківщина», which the lookup returns first. No store stands on Сумська, so the Харків stores
      answer, nearest first.
- [x] 5.5 `stores "вулиця Хрещатик"` — no store stands on Хрещатик; the Київ stores answer, the first
      at 0.15 km on вул. Басейна.
- [x] 5.6 `stores "Київ Кирилівська 47"` — the store at 47А answers, the building number having been
      compared as it is today.
- [x] 5.7 `stores "Сільпо Кирилівська"` — the retailer's name reaches the lookup and the store itself
      comes back.
- [x] 5.8 `stores "5831"` and `stores <branch uuid>` — answered exactly, with no lookup made.
- [x] 5.9 `stores "Хрещатик Кыив"` — the lookup returns nothing; the command fails naming the value.
      Record what that looks like, since it is the class the change gives up.

## 6. The record

Depends on group 5.

- [x] 6.1 Amend the account of store text matching. It describes the substring-to-BM25 change and the
      discriminating-term fix, both of which survive; what changes is where the street comes from.
- [x] 6.2 Amend the store-resolution measurements. Do not overwrite them: they record that reading
      the geocoded place first scored 125/200 on addresses against 189/200 for matching the listing
      first. Add this change's own numbers beside that, and say plainly that this change reads the
      geocoded **parts** through the winning matcher rather than answering from the geocoded point.
- [x] 6.3 Update `plugin/skills/silpo/SKILL.md`. It tells the agent to leave out the retailer's own
      name and describes the disagreement marking; both are now wrong. State what the argument takes —
      a settlement, an address, a coordinate pair, a store handle — and that a misspelling is resolved
      where the map knows it and fails where it does not, so the agent can ask rather than guess.

## 7. The sweep

Depends on all of the above.

- [x] 7.1 Grep for every name deleted in group 2 across `src/`, `test/`, `plugin/` and the measurement notes.
- [x] 7.2 Run `npm test` and report the output as it is.
- [x] 7.3 Run the store command against the live server across the whole of group 5 and read the
      output, not the exit code.

## Review checklist

Check these against the code, not against the task list.

### The reading

- [x] `resolveQuery` makes three decisions: coordinate pair, handle, place. Nothing else in it inspects
      the text.
- [x] `matchSettlement`, `parseQueryAddress` and the token extraction appear nowhere.
- [x] No candidate is chosen for its position. Find where candidates are consumed and confirm the
      first is treated as the fourth.
- [x] The caller's settlement is appended to no probe.
- [x] The retailer's name reaches the lookup.
- [x] A handle and a coordinate pair make no lookup call.

### The matcher

- [x] `matchParsedStoresByRelevance` is unchanged inside: the index, prefix ≥ 4, fuzzy ≥ 5 at 0.2, the
      relative floor at 0.2, the discriminating-term condition and the building multipliers. Diff it.
- [x] `minisearch` is still imported by `src/resolve/stores.ts`.
- [x] The street it searches comes from a candidate, never from the caller's text.

### The answer

- [x] A candidate whose street matched no store is answered by its settlement, ordered from that
      candidate's point.
- [x] The radius bounds around the point the answer was taken from, and a caller-supplied radius still
      means what it meant.
- [x] The output names every place the answer came from.
- [x] Nothing reports two readings agreeing or disagreeing, and no answer is marked the less certain
      of two.

### What was not touched

- [x] `resolveDestination` and the Nova Poshta path behave as they did, and the cart's destination is
      still written only where one candidate is clearly meant — a single candidate, or exactly one
      matching the caller's text — and the candidates are still printed with nothing written where
      several remain that nothing separates.
- [x] The saved-address step still runs only where the candidates matched no store.
- [x] The unknown-handle failure still fails and is still not geocoded.
- [x] The no-query path, the receipts, the page size and the pickup filters are as they were.
