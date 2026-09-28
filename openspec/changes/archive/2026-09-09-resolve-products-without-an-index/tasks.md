## 1. A Ukrainian stemmer

Porter's suffix-stripping algorithm, adapted to Ukrainian. The algorithm supplies the structure; a
description of Ukrainian grammar supplies the endings.

- [x] 1.1 Add `src/utils/stem.ts` exporting one function that reduces a Ukrainian word to a stem.
      Follow Porter's structure: locate the region of the word that follows its first vowel and strip
      only inside it, so that stripping can never eat the root.
- [x] 1.2 Strip in this fixed order, stopping at the first group that matches: a perfective gerund;
      else a reflexive ending followed by an adjective or participle ending; else, if that adjective
      or participle ending matched, a verb ending; else a noun ending. The order is the part that is
      not obvious — a noun ending tried first eats endings that belong to earlier groups.
- [x] 1.3 Then strip a trailing `и`; then the derivational `-ість`/`-ость` only where the word has the
      consonant-vowel shape that licenses it; then a trailing soft sign, a superlative marker, and a
      doubled `нн` reduced to one.
- [x] 1.4 Take each ending list from a description of Ukrainian grammar — the Wikipedia articles on
      прикметник, дієприкметник, дієслово, іменник and рефлексивне дієслово are adequate. Record in
      the change's `design.md` which source each list came from. The lists are Ukrainian: the
      catalogue is Ukrainian, and a Russian query reaches it through the server rather than through
      the stemmer.
- [x] 1.5 Anchor every ending pattern to the end of the word, so that nothing is stripped from the
      middle of one.
- [x] 1.6 Add `test/stem.test.ts` covering, at minimum: `картопля` and `картоплі` reduce alike;
      `молоко` and `молочний` do not; `слабогазований`, `слабоалкогольний` and `слабосолена` reduce
      to three distinct stems; a one-syllable word and an empty string are returned unchanged rather
      than emptied.

## 2. The store matcher loses its prefix length gate

- [x] 2.1 In `src/resolve/stores.ts`, delete `STORE_MATCH_PREFIX_MIN_LENGTH` so that prefix matching
      applies to every term. **Keep `STORE_MATCH_FUZZY_MIN_LENGTH`.** The two look alike and are not:
      `minisearch` computes the edit allowance as `Math.round(term.length * fuzzy)`, so at a ratio of
      0.2 a three- or four-character term is allowed one edit, and nothing downstream can tell a word
      reached by an edit from a word the query contained.
- [x] 2.2 Leave `STORE_MATCH_RELEVANCE_RATIO` and `STORE_MATCH_DISCRIMINATION_SHARE` exactly as they
      are. They are the two relative conditions the spec now names as what bounds a match, and they
      are not part of this change.
- [x] 2.3 Bound the receipt read in `readOfflineOrders` to five pages. Do not report the bound in any
      output; the spec requires it stay silent.
- [x] 2.4 In `test/resolve-stores.test.ts`, add a case where a short street term matches by prefix and
      survives on its expanded term's selectivity; a case where a near-universal word still returns
      nothing; and a case pinning that a three-character term does not reach a store by one edit.
      Keep every existing store case passing unchanged.

## 3. The shared matcher takes its matching rule as an argument

- [x] 3.1 In `src/resolve/matching.ts`, make `buildMatcher` take the search options it should use —
      at minimum whether to match by prefix and what to do to a term before indexing and before
      searching — rather than hard-coding `prefix: true`.
- [x] 3.2 Have `categories.ts`, `promotions.ts` and `sets.ts` pass the rule they use today, so their
      behaviour is bit-identical to what ships now. This group changes no catalogue outcome.
- [x] 3.3 Confirm the catalogue tests pass with no expectation edited. An edited catalogue expectation
      in this group means the refactor changed behaviour and is wrong.

## 4. The live product resolver

- [x] 4.1 Create `src/resolve/products.ts`. Move `src/index/normalize.ts`, `product-name.ts` and
      `restrictions.ts` into `src/resolve/` beside it — they are pure functions over text and survive
      the change untouched. Rename their tests to match — `test/index-normalize.test.ts`,
      `test/index-product-name.test.ts` and `test/index-restrictions.test.ts` become
      `test/normalize.test.ts`, `test/product-name.test.ts` and `test/restrictions.test.ts` — so that
      group 8's deletion of `test/index-*.test.ts` cannot take them.
- [x] 4.2 Implement probe expansion, all of it before any call: the query itself; each of its words
      longer than two characters and not purely numeric; and the query transliterated into Cyrillic
      where it carries Latin characters, using the transliterator the catalogue resolver already
      depends on. There is no second stage — the words go with the query, not after it. Normalise `’` and `&` out of every probe before it is
      sent — the server returns nothing for either.
- [x] 4.3 Build no combinations of a query's words. No pairs, no triples, no leave-one-out. This is a
      measured negative recorded in `design.md`, not an omission to be helpfully filled in.
- [x] 4.4 Batch the probes at the server's limit of 30 per call and issue the calls concurrently.
      Pass `limit` no higher than the server's cap of 100, and never pass `offset` — the server
      ignores it silently.
- [x] 4.5 Build the matcher over `name` and the words of the slug (split on hyphens, numeric tail
      dropped), stemming both sides with the function from group 1, with prefix matching **off**, via
      the parameterised `buildMatcher` from group 3.
- [x] 4.5a The coverage test that the whole auto/ask rule rests on must compare **stems**. Today
      `buildMatcher` computes `accounted` as every lowercased query word appearing in
      `result.queryTerms`; with stemming on both sides those are stems on one side and raw words on
      the other, and the test silently fails closed. Make both sides the same thing.
- [x] 4.6 Order by coordination — how many of a term's probes returned the product — then, within one
      such level, by the best position the server gave it across the probes that returned it, then
      optionally scaled by the pack size parsed from `displayRatio`. Compute no inverse document
      frequency over the per-query pool.
- [x] 4.7 Never drop a product the server returned. A product the matcher accounted for nothing in
      keeps the server's position. Verify by test that a query in Russian returning Ukrainian products
      lists all of them.
- [x] 4.8 Implement the settlement: auto where every word of the term is accounted for in the top
      candidate and no other candidate is accounted for as fully and returned by as many probes; ask
      otherwise. No score is compared against any constant. Delete nothing from `src/index/rank.ts`
      yet — group 8 removes it; this group must not leave the tree unbuildable.
- [x] 4.9 Implement the tie-break: among candidates that all account for the term in full and tie on
      coordination, prefer one the caller has bought, then one they have saved, then the first the
      catalogue returned. Read online orders, in-store receipts and saved products concurrently with
      the search, five pages each, and hold what they return no longer than the command runs.
- [x] 4.10 Have the tie-break degrade rather than fail: a history read that errors or returns nothing
      leaves the catalogue's own order to settle it.
- [x] 4.11 Add `test/resolve-products.test.ts` covering probe expansion, the never-delete rule, the
      coverage and uniqueness settlement, and each of the three tie-break steps in turn.

## 5. The products command

- [x] 5.1 Rewrite `src/commands/products.ts` to resolve through `src/resolve/products.ts`. Remove the
      `PoolItem` union, `indexOnlyItem`, `resolveIndexOnlyLiveStates`, `partialProductText` and
      `rankedRecord` — every one exists to carry a record the catalogue did not return.
- [x] 5.2 Remove `--offset` from the listing. Keep `--limit` and make its default 10. `DEFAULT_PAGE_SIZE`
      is also the `limit` passed to the alternatives call; give that call its own number rather than
      letting the page default shrink it from thirty to ten as a side effect.
- [x] 5.3 Remove `--similar` as a selector, with `runLoneSimilar`, `readAllSimilar` and the `similar`
      arm of `SelectorKind` and `checkSort`. Keep the automatic alternatives lookup that fires when
      the top match is unavailable, and update the message that names the selectors.
- [x] 5.4 Remove the `why` row and `reasonText`. Remove `FILTER_EXCLUDES_INDEX_NOTE`,
      `LIVE_FETCH_TRUNCATED_NOTE`, `LIVE_FETCH_CEILING`, `DETAILS_FETCH_CEILING` and
      `DETAILS_TRUNCATED_NOTE`, and every branch that printed them.
- [x] 5.5 With `--details`, fetch a card for every product on the printed page, with no ceiling on
      coverage. Where one card cannot be had, print that product without attributes and name it in
      the summary. Bound how many of those calls are in flight at once — `--limit` has no maximum, so
      `--limit 500 --details` would otherwise open five hundred sockets. The bound is on concurrency,
      not on which products are covered.
- [x] 5.6 Print the external product id from the numeric tail of the slug wherever the payload carries
      a slug and no id of its own — `toExternalId` in `src/utils/slug.ts` already does this. Print no
      identifier recovered any other way.
- [x] 5.7 Resolve a favourite write by looking the product up where the printed record did not supply
      both identifiers. Remove `probeIndex` and `probedExternalId`.
- [x] 5.8 Update the command description: the read ceiling and the batch cap stay, the details ceiling
      and the live-fetch ceiling go, and no sentence may still describe a personal index.
- [x] 5.9 Update `test/products-find.test.ts` and `test/products-details.test.ts`.

## 6. The fill path

- [x] 6.1 Rewrite `src/daemon/fill.ts` to resolve through `src/resolve/products.ts`. Remove the
      rank-index lifecycle — the field, `refreshRankIndex`, and the version tracking.
- [x] 6.2 Search a list in one round of calls. Expand every item in full first — its text, each of its
      words, its transliteration where it carries Latin — then send all of those strings together,
      batched at the server's thirty per call, every call issued at the same time. There is no second
      round: nothing is withheld from the first, so there is nothing to send after it.
- [x] 6.3 Add the partial-stock outcome: where the branch holds some of the resolved product but less
      than the item asked for, resolve to `ask` under a rule of its own, carrying the product, the
      stock and the quantity asked for, with the alternatives fetched as candidates. It is an `ask`,
      not a fifth outcome — the four stand.
- [x] 6.4 Extend the answering form so the caller can say "take what there is", "make up the rest from
      the alternatives", or "take this other product". Keep the existing pick shape for the third.
- [x] 6.5 Resolve a pick by fetching the product; there is no stored record to shortcut it with.
- [x] 6.6 Remove `indexRebuild` and `indexWhy` from `src/daemon/protocol.ts`, their handlers from
      `src/daemon/main.ts`, and `rebuildIndex` and `explainIndex` from `src/daemon/client.ts`. Remove
      the rank index the daemon holds.
- [x] 6.7 Give `QUESTION_OPTIONS` a home. It is `8`, it lives in `src/index/rank.ts` today, and three
      files import it — `src/commands/products.ts`, `src/commands/fill.ts` and `src/daemon/fill.ts`.
      The spec still requires it, so move it beside the resolver rather than losing it with `rank.ts`.
- [x] 6.8 Update `src/commands/fill.ts` for the new outcome and the new answer forms, and drop its
      `findProductById` import.
- [x] 6.9 Update `test/daemon-fill*.test.ts` and `test/fill.test.ts`, including a case for a branch
      holding fewer than the item asked for.

## 7. Receipt lines stop borrowing a handle

- [x] 7.1 In `src/commands/me.ts`, drop the `foldOfflineOrders` and `foldOnlineOrders` imports and the
      calls that fed the index after printing. The receipt output itself needs no change: it already
      prints an identifier only where the payload carries one, so the spec's permission to borrow one
      from the index was never exercised. Confirm that by reading the code before editing it.
- [x] 7.2 Update the receipt tests: a line with no catalogue product prints quantity, name and price
      and nothing else, whatever any other listing in the same run printed.

## 8. Remove the index

- [x] 8.1 Delete `src/index/store.ts`, `corpus.ts`, `enrich.ts`, `dictionary.ts`, `rank.ts` and
      `population.ts`, and the now-empty `src/index/` directory.
- [x] 8.2 Delete `src/commands/index.ts` and its registration in `src/program.ts`.
- [x] 8.3 Remove `index` from `paths` in `src/config/paths.ts`. Leave every other path untouched.
- [x] 8.4 Delete every `test/index-*.test.ts` and `test/commands-index.test.ts`, and remove the index
      helpers from `test/harness.ts`.
- [x] 8.5 Grep the whole tree for `index.db`, `SILPO_HOME`-scoped index setup, `foldProduct`,
      `upsertProduct`, `listProducts` and `buildRankIndex`, and confirm nothing references them.
- [x] 8.6 Build and run the full suite. `npm test` is the only correct invocation; its pretest builds.

## 9. The skill, the help and the documents

- [x] 9.1 Update `plugin/skills/silpo/SKILL.md`. The three index commands never had entries — they are
      among the ten the skill deliberately omits — so the entry count stays at thirty and the leaf
      count falls to thirty-seven. What must go is the prose: the paragraph describing a personal
      index of what the account has bought, saved and seen; the mention of `index why`; the account of
      the listing drawing the catalogue's answer together with the index and pricing index-only
      records by a further call; and the claim that a term can resolve without a search.
- [x] 9.1a Correct the `products find` entry itself: its literal signature carries `--offset` and
      `--similar`, and both are withdrawn. The skill's own requirement is that a command entry names
      only options the command accepts.
- [x] 9.1b State that the caller's purchases and saved products separate two candidates that match a
      query equally well, and that they are read with the search rather than kept between commands.
      Do not otherwise shorten the skill — its size is separate work.
- [x] 9.2 Remove the `eval` script from `package.json` and delete the eval it runs, which
      measures an index that no longer exists.
- [x] 9.3 Check `README.md` for any account of the index or of `--offset` and `--similar`, and correct
      what it says.

## 10. What the review and the reading of it found

- [x] 10.1 Read the pack size from the payload rather than from the product's name. `matchesSpecification`
      in `src/resolve/products.ts` parses `parseProductName(product.name)` for `packSize`/`packUnit`;
      the record states it in `displayRatio`, and `weighted` says whether the product is sold by
      weight, in which case the price is per kilogram and there is no package to compare. Keep the
      name as the fallback only where the payload states nothing.
- [x] 10.2 Compare a pack size only within compatible units. `PACK_SIZE_UNIT_SCALE` gives `г`, `мл` and
      `шт` the same scale of 1, so a five-piece pack outranks a one-litre bottle on a bare numeric
      comparison. Mass against mass, volume against volume, count against count; anything else is not
      comparable and SHALL leave the order alone.
- [x] 10.3 Add the promotion tie-break: among candidates that all account for the term in full and tie
      on coordination, prefer one the caller has bought, then one they have saved, then one the shop
      is promoting — `oldPrice` above `price`, or a `specialPrices` entry — then the first the
      catalogue returned. It costs no call and SHALL survive a history read that failed.
- [x] 10.4 Keep the promotion out of the listing's order. The listing settles no term, so it never
      reaches a tie-break; a promotion stays a fact printed about a product there.
- [x] 10.5 Delete `DETAILS_CONCURRENCY` and fetch every printed product's card at once.
- [x] 10.6 Collapse `runFind`'s five branches to two. The three lone-scope branches are one call with a
      different argument; fold them together with the lone saved-products case into the single path
      that reads one population with the server's own sort, and leave the second path for everything
      the CLI assembles and orders itself. Change no outcome: `--sort-by` is accepted exactly where it
      is accepted today and refused with the same reason everywhere else.
- [x] 10.7 Bring `plugin/skills/silpo/SKILL.md` back in step with the `products find` description: the
      per-probe cap and the note that says when it was what stopped the reading.
- [x] 10.8 Update `test/resolve-products.test.ts` and `test/products-find.test.ts` for the promotion
      tie-break, the unit-compatible pack comparison and the payload-sourced pack size, including a
      case where a discounted candidate that answers only part of the term does not win.

## 11. What the review of group 10 found

- [x] 11.1 A weighted product SHALL NOT fall through to a size parsed out of its name. `weighted` is
      itself a statement that the product has no package; the name is the fallback only where the
      product is not weighted and `displayRatio` states no size. Correct the test that currently pins
      the fall-through as intended behaviour.
- [x] 11.2 Bring the skill's account of the tie-break up to what the code does: four steps, the shop's
      promotion third and the catalogue's own first last. It names two today.
- [x] 11.3 Correct the skill's claim that nothing but coordination and the shop's position enters the
      listing's order. The size of one package scales it within a compatible unit, as the spec permits.

## Review checklist

- [x] No file under `src/` reads or writes anything under the home directory except configuration,
      credentials, the log and the background endpoint. `node:sqlite` is imported nowhere.
- [x] No value a product resolution depends on outlives the command that produced it. Nothing is
      memoised in the daemon across invocations; what is memoised within one invocation is only there
      to avoid calling one endpoint twice for one operation.
- [x] Search the product resolution path for a numeric literal compared against a score, a count of
      candidates, or a share of a corpus. There is none. What remains is the server's own limits — 30
      probes and 100 per page — plus two bounds the CLI chooses on how much it will spend and print:
      five pages of history and ten records. None is consulted when deciding what a query means.
- [x] A product the server returned for a query appears in the listing regardless of what the matcher
      made of it. There is no filter, floor or veto between the server's answer and the ordering.
- [x] The matcher searches with prefix matching off and no character n-grams. `trigrams` exists
      nowhere. The catalogue's own matchers still search exactly as they did before the change.
- [x] Every ending pattern in the stemmer is anchored to the end of the word, and no list contains an
      ending that is Russian rather than Ukrainian.
- [x] The stemmer's output for `слабогазований`, `слабоалкогольний` and `слабосолена` is three
      distinct values.
- [x] The auto/ask decision reads only two things: whether every word of the term is accounted for,
      and whether another candidate is accounted for as fully and returned by as many probes. It reads
      no score.
- [x] The history tie-break is reachable only for candidates that account for the term in full. Trace
      the code path and confirm there is no route by which a bought product that does not answer the
      term can be chosen.
- [x] A history read that throws or returns nothing leaves the resolution working, ordered by the
      catalogue.
- [x] The listing offers no `--offset` and no `--similar`, and the alternatives call still fires when
      the top match is unavailable.
- [x] `--details` fetches one card per printed product, concurrently, with no ceiling, and a card that
      fails leaves the rest of the page intact.
- [x] A receipt line with no catalogue product prints no identifier under any circumstance.
- [x] The skill names no store the CLI keeps, and the command entries it carries are exactly the
      thirty leaves the agent drives.
- [x] `npm test` builds and passes.
