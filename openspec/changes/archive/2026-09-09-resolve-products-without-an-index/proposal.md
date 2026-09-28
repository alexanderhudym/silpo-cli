## Why

Products are the last thing the CLI resolves against a local mirror of the shop. Stores and the
catalogue were both taken to live data — `rank-stores`, `geocode-store-queries-first`,
`sharpen-catalog-query-io`, `sharpen-catalog-resolution` — and each read better for it. The product
path still keeps a SQLite index built from order history and favourites, ranks character trigrams
over it, and multiplies the result by five boosts drawn from it.

Measured against receipt-derived ground truth nobody in the investigation authored, that layer is
not neutral. **It deletes correct answers.** Given a veto over the server's reply it emptied a
non-empty answer in **37 of 63 false misses**, and turned **30 of 50 valid Russian words** into a
reported miss. The server resolves Ukrainian morphology, Russian to Ukrainian (`хлеб` finds Хліб),
transliteration (`лактель` finds Lactel) and typos (`молококо` finds молоко); a local lexical layer
with no dictionary does none of these and vetoes on its own ignorance. Run head to head on the same
set on the same day, removing the veto and fanning the query out into per-word probes won by roughly
ten points of top-1 — a margin, not a tie.

Every ranking signal the index exists to supply was measured and none paid. Purchase history as a
boost: **one match in 221 candidates** at the caller's own branch, and that match was wrong.
Favourites: **three entries, two unresolvable** at the branch. The promotion multiplier converts
correct answers into wrong ones — a still water at 35 UAH replaced by an imported one at 179, plain
butter by garlic butter. The trigram tokenizer's own boost sweep decreases monotonically: the best
value is always none. The index is maintained so that five signals can fire, and the five signals
are noise.

Two constants in the store matcher are the same defect in miniature. `STORE_MATCH_PREFIX_MIN_LENGTH`
and `STORE_MATCH_FUZZY_MIN_LENGTH` were asserted by design, never measured — *"prefix from four
characters, fuzz from five"* — and they are fitted to the listing as it stood. The listing is not
fixed. The relative rules beside them are not fitted: a relevance floor at a fifth of the top score,
and a term-selectivity condition that already evaluates the **expanded** term, because `minisearch`
reports matched document terms rather than query terms. The absolute gates sit in front of two
relative ones that do the same work without a number.

## What Changes

**The local product index is removed, with everything that maintains it.** The SQLite store, the
corpus builder that drains order history and favourites into it, the `silpo index` command tree and
its two daemon methods, the trigram tokenizer, the history, saved, branch, category and promotion
boosts, `AUTO_SCORE_THRESHOLD` and `AUTO_MARGIN_RATIO`. No state survives a command. Reading the
same endpoint twice within one command's run is not storage and remains allowed; nothing is held in
the daemon between commands.

**The server decides composition and base order; the local layer reorders and never deletes.** A
product the local scorer failed to match keeps the position the server gave it rather than
disappearing.

**A query fans out into probes in one batched call.** The full query, each of its words longer than
two characters that is not purely numeric, and the query transliterated into Cyrillic where it
carries Latin — all sent together, because the server's limit is on probes per call rather than on
calls. Word pairs, triples and leave-one-out
variants are not built: over 46 multi-word cases they contributed 133 products and zero acceptable
ones.

**Terms are stemmed rather than prefix-matched.** A rule-based Ukrainian stemmer, written for this
repository, applied to both sides. Prefix matching off, no character n-grams, no suffix field, no
Unicode folding. This configuration carries zero fitted constants.

**Ranking is coordination, then server rank.** How many probes returned a product is the primary
order; the server's own position breaks ties within a level; `displayRatio` parsed into grams,
millilitres or counts is a multiplier and never a filter. IDF is dropped: the pool is assembled from
the query's own probes, so document frequency for the query's own terms approaches the pool size and
the ranking is driven by the least query-relevant words in a name.

**Confidence is structural, not numeric.** A term resolves automatically when every one of its words
is accounted for in the chosen product's name. Where two products tie on coordination as well, the
caller's own history and saved products break the tie, read live; failing that, the server's rank
does. Where coverage is partial, the CLI asks. No threshold is consulted, because any threshold
would be fitted to today's assortment.

**The caller's history and saved products are read live, in parallel, bounded.** Online orders,
in-store receipts and saved products are fetched alongside the search rather than mirrored ahead of
it, at most five pages each. They act only as a tie-break among candidates that already account for
the whole query, which is why the measurement that rejected them as a boost does not reach them
here: a tie-break among fully-covered candidates cannot substitute one category for another.

**BREAKING — `--offset` is withdrawn from the product listing**, leaving `--limit`, whose default
falls to 10. The store listing and the catalogue already offer no offset for this reason: a position
in a ranking is not something a caller can name.

**BREAKING — `--similar` is withdrawn as a selector.** Alternatives stop being something to browse
and become something the CLI offers when they are needed: when the product a term settled on is
unavailable, and — new — when a list asks for more of a product than the branch holds.

**A new reason to ask: enough of the product exists, but not enough of it.** The four outcomes stand.
A line whose product holds less stock than the line asked for is neither taken silently nor reported
absent; it asks, naming what is there, and offers to take what there is, to make up the rest from
alternatives, or to choose another product — a third kind of answer, over the existing answering
call.

**A shopping list is searched in one round of calls.** Every item is expanded in full before anything
is sent, and all of it goes out together, batched at the server's limit of thirty strings per call.
Six calls deliver what forty deliver when the alternative is searching an item at a time, and issuing
them together rather than in sequence takes a twenty-item list from 9.4 s to 1.4 s.

**`--details` loses its ceiling.** With no cache to miss, every printed product's card is fetched, in
parallel, however many the page holds.

**The Russian-to-Ukrainian dictionary is removed.** Its 116 hand-written pairs are a snapshot of a
translation the server already performs. Transliteration survives, as a probe sent to the server
rather than as an indexed field — measured, it has no effect as a field and is beaten head-to-head by
the shop's own slug.

**The store matcher's prefix length gate is removed**, leaving the relevance floor and the selectivity
condition to decide — the selectivity condition already judges the word a prefix reached rather than
the fragment the query offered, so it covers what the gate was guarding. The fuzzy gate is kept: an
edit allowance is not judged by anything downstream, and one edit in a three-letter word is a
different word rather than a typo. The receipt read behind the store ranking gains the same five-page
bound as the product path, so that one rule governs how deep the CLI reads a history.

## Capabilities

### New Capabilities

None. The product resolver joins the resolvers already governed by `product-search` and
`list-resolution`.

### Modified Capabilities

- `product-index`: **removed in full.** Every requirement it holds describes a local store, its
  contents, its lifecycle, its isolation and its degradation. Nothing survives the change; the
  capability directory is deleted rather than emptied.
- `product-search`: the listing's population, ranking, confidence rule, page controls, selectors and
  printed record all change. The `why` row is withdrawn, its three sources being the boosts that go.
  The alternatives selector is withdrawn; the alternatives themselves stay, offered rather than asked
  for.
- `list-resolution`: the ranking a list item is settled by, the rule that decides automatic from
  asked, the removal of the Russian dictionary requirement, the single concurrent round of searches,
  and the new
  partial-stock outcome.
- `stores-and-delivery`: the two length gates go from the street matcher; the receipt read gains a
  five-page bound.
- `shopping-cart`: the fill and the listing still share one ranker over one population, but that
  population is now the catalogue's answer alone.
- `user-account`: the permission for a receipt line to borrow a handle from the index is withdrawn.
  The permission was never exercised — the code prints an identifier only where the payload carries
  one — so this closes a spec-level licence to guess rather than removing a behaviour.
- `cli-configuration`: the home directory no longer holds a product index, and a run with its own
  home no longer has an index to isolate.
- `agent-skill`: the three commands that report, rebuild and explain the index leave the surface, and
  the skill's account of a personal index goes with them.

## Impact

**Removed:** `src/index/store.ts`, `src/index/corpus.ts`, `src/index/enrich.ts`,
`src/index/dictionary.ts`, `src/commands/index.ts`, the `indexRebuild` and `indexWhy` daemon methods,
`paths.index`, and roughly fourteen `test/index-*.test.ts` files.

**Reshaped:** `src/index/rank.ts` and `src/index/population.ts` become the live product resolver.
`src/index/` no longer describes anything and is dissolved: the resolver moves to
`src/resolve/products.ts`, beside `categories.ts`, `promotions.ts`, `sets.ts` and `stores.ts`, and the
three pure helpers that survive — `normalize.ts`, `product-name.ts`, `restrictions.ts` — move with it.
`src/commands/products.ts` loses the index-only record branch and the whole family of caveats that
exists to explain it. `src/daemon/fill.ts` loses its rank-index lifecycle.

**Added:** a Ukrainian stemmer — Porter's suffix-stripping algorithm adapted to Ukrainian grammar.

**Documentation:** the measurements behind this change are recorded in `design.md`, which is where
they are held.
