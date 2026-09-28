## 1. Address parts, handles and the geocoding probe

- [x] 1.1 Add an address splitter to `src/utils/address.ts` beside `canonicalizeAddressWords`: given a
  written address, return its street-type word, its street and its building number. It runs over both
  the listing's addresses and the caller's query, so it takes a plain string and returns parts, and
  knows nothing about branches. Split at the last comma when the tail contains a digit — one address
  in the listing carries two commas and only that rule handles it.
- [x] 1.2 Add a building-number comparison alongside it: equal, equal in their numeric part only,
  conflicting, or absent on either side. `22` and `22А` are the numeric-part case; `60` and `358А`
  conflict.
- [x] 1.3 Add a settlement matcher that matches a query token against the settlements the listing
  carries **as the token is written**, allowing a single edit only for names of six characters or
  more. Do not fold vowels or match a skeleton: at edit distance 2 on a folded skeleton `Оболонь`
  matches `Обухів` and `Позняки` matches `Лісники`, and a wrong settlement is worse than none.
- [x] 1.4 Add a settlement alias table — the Russian and transliterated spellings of the settlements
  the listing carries — and consult it before the strict match. This is new data: `src/index/dictionary.ts`
  is a groceries dictionary with no place names and is not what resolves `Чернигов` → `Чернігів`. The
  listing names 83 settlements, so the table is small and closed; cover at least the ones with three or
  more branches.
- [x] 1.5 Add the handle index: a map from `branchId` and from `externalId` to the branch, built from
  the listing already in hand. Resolve a handle from a token anywhere in the query, not only from the
  whole query. Read a numeric token as a store number only when it is at least as long as the shortest
  numeric `externalId` in that listing — derive the length, do not write `4`. A numeric token of that
  length that the listing does **not** carry is not a handle and falls through to be read as part of an
  address. A non-numeric `externalId` resolves only on an exact whole-query match.
- [x] 1.6 Add the geocoding-probe reduction: drop the retailer's own name, the words for a shop, the
  words of proximity, the question words, and the prepositional forms of "district". Keep street-type
  words and the equivalents of `метро`, `площа`, `центр` and the nominative `район`. Add nothing and
  transliterate nothing.
- [x] 1.7 Unit-test each of the six against `test/` conventions, including the cases named above by
  name: `22`/`22А`, `60`/`358А`, `Оболонь`/`Обухів`, `Чернигов`, `Сільпо 1998`, `Бережанська 22`, a
  four-digit number the listing does not carry, and five phrasings of one place reducing to one probe.

## 2. Matching a store by the parts of its address

- [x] 2.1 In `src/resolve/stores.ts`, rebuild `matchStoresByRelevance` on the split: the settlement
  filters which branches are considered and contributes to no branch's score; the street is the only
  indexed field; the building number is applied afterwards as a multiplier over the street score.
- [x] 2.2 Remove `code` and `uuid` from the indexed fields entirely. Nothing in the approximate path
  may read a branch uuid or a store number; group 3 gives them their own exact path.
- [x] 2.3 Answer a query that resolves to a settlement and leaves no street with that settlement's
  stores. Without this the matcher returns nothing for `Одеса`, where the capability promises the
  city's stores and today's code delivers them.
- [x] 2.4 Restrict prefix matching to query tokens of four characters or more, and drop street-type
  words before scoring. The discrimination share stays at 0.5: with `code` and `uuid` out of the
  index its denominator counts street terms alone, so a query answering one of two branches on a
  street sits at exactly 0.5 and any lower threshold discards it — measured, a correct unambiguous
  match returned nothing at 0.4. The failure this clause named, a street-type word passing at 0.5,
  is now prevented structurally: those words are dropped before scoring.
- [x] 2.5 Name the tuned constants next to the existing `STORE_MATCH_*` ones — the three
  building-number multipliers and the relevance floor — so the next measurement can move them without
  reading the algorithm.
- [x] 2.6 Test that `Львів, вул. Шевченка, 60` answers the branch at 60 and not the one at 358А; that
  a query naming a settlement whose name also occurs inside a street name (`Дерибасівська Одеса`,
  where Odesa has a *вул. Героїв Оборони Одеси*) does not answer that street; and that a bare
  settlement answers that settlement's stores.

## 3. The cascade: handle first, both readings, agreement decides

- [x] 3.1 Reorder `resolveQuery`: coordinate pair, then handle, then the component match, then saved
  addresses, then the geocoded place. A whole query that is a handle the listing does not carry
  reports an unknown handle, as it does today.
- [x] 3.2 In `resolveAddress`, stop reporting a multi-candidate geocoder response as ambiguous **for
  the store listing's own query**. Take the first candidate as the point to order around, and carry
  the candidates it was chosen over so group 4 can print them. Leave every write path — cart
  destination, branch, delivery type, Nova Poshta office — stopping exactly as it does now.
- [x] 3.3 Send the reduced probe to `findAddress`, and append the caller's own settlement only when
  the query names none. Derive that settlement by joining the receipts `rankStores` already reads to
  `branch.city`, together with the cities of the saved delivery addresses, and pass it into the
  resolution — `resolveQuery` receives neither today, so this is plumbing, not a new call. Where the
  account yields no settlement, send the probe without one.
- [x] 3.4 Take both readings rather than returning on the first that answers. Where the matched store
  and the geocoded point lie within the agreement distance, answer the matched store; where they do
  not, answer the matched store if the query names a street the listing carries and the nearest store
  to the point otherwise; where only one reading produced anything, answer from it. Where they
  disagree, still answer — marked as the less certain kind, with the other candidate named.
- [x] 3.5 Skip the geocoding call where the query's building number matches the matched store's own,
  exactly or in its numeric part. Do not skip it merely because the street is one the listing carries:
  that also scores 381, but it stops geocoding 15 district queries that matched a street sharing their
  root, and answers all 15 wrongly with no second opinion to flag them.
- [x] 3.6 Keep the saved-address path ahead of any geocoding, so that a query naming one of the
  caller's own labels still resolves without a geocoding call.
- [x] 3.7 Expose the agreement distance as the answer's confidence, and name it as a constant. Do not
  reuse `AUTO_MARGIN_RATIO` or a score threshold for this; the whole point is that it is absolute.
- [x] 3.8 Re-state the assertion in `test/resolve-stores.test.ts` that a query matching the listing
  makes no address call: it now holds where a building number settles the match, and the opposite case
  needs its own test.
- [x] 3.9 Test the four ways an answer is reached, and test that a cart destination with several
  geocoded candidates still stops without writing.

## 4. What the answer says, what the command says, what the skill promises

- [x] 4.1 When the geocoded text differs from what the caller wrote, print the text that was looked
  up. When the answer came from one reading rather than the other, say which. When a geocoded
  candidate was chosen out of several, name it and the ones passed over.
- [x] 4.2 Replace the match line's "which of its fields the query reached" with which parts of the
  query the store answered — settlement, street, building number — and whether the resolved place
  agreed. With the street the only scored field, the old value is the same on every text result, which
  is the failure the output requirement was written against.
- [x] 4.3 When the two readings disagree, print the answer as the less certain kind rather than as a
  settled one, and offer the other candidate.
- [x] 4.4 Update the store entry in `plugin/skills/silpo/SKILL.md`: the query also takes a district, a
  metro station or a landmark, and the answer says when it is the less certain kind. Keep the entry
  literal and complete as the agent-skill capability requires — every option written inline, no
  reference to a legend.
- [x] 4.5 Update the command's own description in `src/commands/stores.ts`, which still says the query
  matches "by place, store code or branch uuid" and lists no district or landmark. The skill and the
  command must not describe the same query differently.
- [x] 4.6 Check whether the printed shape now contradicts anything in the `output-rendering`
  capability. If it does, that is a spec finding for the user, not an edit to this change's specs.

## 5. Pinning the behaviour the measurement bought

The harness that produced the numbers in `proposal.md` has been deleted, and it could not have been
re-run against this code in any case: its arms were a reimplementation rather than a call into `src/`,
and rebuilding the 41% baseline is impossible once `matchStoresByRelevance` is rebuilt, because that
function *was* the baseline. The named cases become tests instead.

- [x] 5.1 Add a regression test per named failure, each asserting the store that must be answered:
  `Киев, Кольцевая дорога 1` (must not answer a Boyarka store on a uuid digit); a bare `2` (must not
  match most of the estate); `Silpo Volodymyra Ivasiuka Kyiv` (must not answer the empty-address
  tombstone); `Львів, вул. Шевченка, 60`; `Дерибасівська Одеса`; `Оболонь`; `Позняки`; `Одеса`;
  `Чернигов`; and one place asked in all five phrasings, which must all answer the same store.
- [x] 5.2 Assert the round-trip contract directly: a query whose building number matches makes no
  address call; a query naming only a street makes one; a query naming a saved address label makes
  none.
- [x] 5.3 Record beside the measurements that the harness is gone and what would
  have to be rebuilt to measure again — the branch listing, the fixture families and the cached
  geocoder responses — so that a future measurement starts from the description rather than from
  scratch.

## Review checklist

- [x] No index built anywhere in the store path lists `externalId` or `branchId` among its fields, and
  no approximate search — prefix, fuzzy or scored — can reach either value.
- [x] The shortest store number is computed from the listing at hand. Search the diff for a literal
  `4` standing for a digit count; there should not be one.
- [x] A four-digit number the listing does not carry does not turn a query into a refusal. Find the
  branch that decides a handle is unknown and confirm it is reached only by a whole-query handle.
- [x] The settlement appears only where the set of candidate branches is narrowed, never in anything
  that produces or adds to a score.
- [x] A query that resolves to a settlement and leaves no street still returns that settlement's
  stores rather than falling through to a radius around a point.
- [x] The building number is applied once, after the street score, and a conflicting number lowers a
  candidate rather than merely failing to raise it.
- [x] The settlement matcher compares tokens as written. No call to a vowel-folding or skeleton
  function reaches it, and its edit allowance is conditioned on the name's length.
- [x] The settlement alias table is its own data. Confirm nothing in the store path imports
  `src/index/dictionary.ts`, which holds groceries and would silently do nothing here.
- [x] The geocoding probe is built by removing tokens. Nothing is appended to it except the caller's
  settlement, and that only under the named condition.
- [x] The caller's settlement reaches the resolution as an argument. No call to the server exists
  whose only purpose is to learn it.
- [x] Both readings are computed before either is chosen between, except where the building number
  settled it, and the distance between them is computed once and used for both the choice and the
  confidence that is printed.
- [x] The confidence is a distance compared against a named constant. No BM25 score, ratio or margin
  is consulted for it.
- [x] A disagreement produces an answer, not a refusal.
- [x] Every write path still stops on an ambiguity it cannot separate. Find each caller that writes a
  cart field from a geocoded candidate and confirm none of them now takes a first candidate.
- [x] The match line differs between two stores that matched the same query. Read the two lines the
  Шевченка test produces and confirm they are not identical.
- [x] Nothing built from the listing — the handle map, the split addresses, the street index — outlives
  the command that built it, and nothing is written to disk.
- [x] No new runtime dependency appears in `package.json`.
- [x] The tuned constants are named at module scope beside the existing `STORE_MATCH_*` ones, and each
  is read from exactly one place.
- [x] An answer that rests on a geocoded place rather than a matched address is distinguishable as
  such in what is printed, without the reader knowing the internals.
- [x] The command's own description and the shipped skill list the same query forms.
- [x] `npm test` passes, and its output is the run reported — not a summary of it.
