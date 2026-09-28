## Why

The CLI holds two rankers and the product search uses neither. `fill` resolves a shopping list
through BM25 over the personal index, a Russian-to-Ukrainian dictionary, a purchase-history boost and
an auto/ask/warn/miss policy. `search` sends the caller's text to the server and prints whatever came
back, in the server's order, thirty records at a time — no dictionary, no history, no ranking, no
dedup. The same account, the same index, the same catalogue, and of the two paths the smarter one is put to
work only by writing to the cart. The CLI does expose it read-only, through the command that explains
a resolution, but that explains a decision already taken rather than answering a question about the
catalogue.

That asymmetry is what makes a listing expensive for an agent. The CLI already receives every record
it needs to choose well; it just prints all of them instead of choosing. Ranking the results the
server already returned costs no extra call, cuts what the agent reads several-fold, and folds every
record it did not print into the index anyway, so the next search is cheaper still.

Around that sit four smaller faults with the same root — a surface shaped by which tool answers,
rather than by what the caller asked. Favourites, alternatives, a scope listing and a text search are
four mutually exclusive selectors because four different MCP tools answer them. The saved products
are read by one command and written by another. A product card is a command of its own, though its
static half never changes and could be held on disk. And the scope listing prints its whole
table — every category, promotion and set the branch carries — because an empty filter matches
everything.

## What Changes

- **BREAKING** — The product commands become one group, `products`: `products find` (the listing),
  `products card`, `products favorite`, `products unfavorite`. `search`, `product <handle>` and
  `favorite add|remove` are removed.
- **BREAKING** — `browse` becomes `catalog`, and takes `--limit` with a default. Today a bare
  `browse` prints all 1042 scopes the branch carries, because every title matches an empty filter.
- **BREAKING** — `fill` moves under the cart as `cart fill`, where it belongs: it is a cart write.
- **BREAKING** — Selectors stop excluding one another. A repeated selector of one kind unions
  (`--in A --in B`); selectors of different kinds intersect (`--favorites --in A`); a free-text query
  stops being a population and becomes the filter and the ordering over whichever population the
  selectors chose. Where no selector is given, the query selects the population itself: the
  catalogue's answer to it united with what the personal index holds for the same words.
- **BREAKING** — A multi-query search prints one flat, deduplicated listing instead of a group per
  query. A product matched by more than one query appears once, naming the queries that matched it.
- `products find` and `cart fill` share one ranker: one corpus, one BM25 pass, one boost formula, one
  record. They differ in what they do with the ranking — one lists, one decides — and in nothing else.
  The corpus is the same for both, and it is the union: the catalogue's answer together with the
  personal index, keyed by product identity. Neither command consults the index instead of the
  catalogue, and neither ranks the catalogue's answer alone, so a product one can name confidently is
  never one the other fails to find. A record only the index supplied carries no price, so its live
  state is fetched by identifier — only for the records that reach the printed page, under a stated
  bound. This costs the fill the zero-call warm errand it had; removing the page offset and dropping
  the default page size, in a later change, is what pays it back.
- A product record gains a `why` row naming what raised it: a promotion and its size, the caller's
  own purchase history, a saved product. The signals that carry no information for the caller — the
  branch, the scope — stay out of it.
- Being saved becomes a ranking signal. Today a favourite is folded into the index as a plain
  sighting, indistinguishable from a product that appeared once in someone else's listing.
- A promotion becomes a ranking signal, weighted above purchase history, and it is read from the
  listing's own payload rather than fetched. It affects the order of candidates and never the
  confidence in them: the thresholds that decide `auto` against `ask` are computed on relevance
  alone, so a discount can never turn a question into a silent cart write.
- Where a query resolves decisively to one product and the branch has none of it, the alternatives to
  that product are fetched and offered without being asked for — in the listing, printed below it and
  marked as alternatives; in the cart fill, put as the candidates of a question rather than written.
  The explicit selector for a product's alternatives stays, since "what else is like this" is a
  question about products that are in stock too.
- `products find --details` prints the static half of a product card — attributes, composition,
  nutrition — beside the live half the listing already carries, reading what the index holds and
  fetching only what it does not, under a stated ceiling.
- The index gains those attributes, and the scope table gains a cache. Resolving `--in` costs four
  catalogue calls today — two pages of 1014 categories, the promotions, the sets — on every
  invocation, even when the caller passed an exact handle.
- Scopes are resolved by the same ranker as products, so a scope named approximately resolves, and an
  ambiguous or weak match prints its candidates and stops rather than picking the least bad one.

## Capabilities

### New Capabilities

- `catalog-cache`: the on-disk copy of the branch's scope table — its categories, promotions and
  sets — with a refresh rhythm per kind, and the rule that it is reference data rather than part of
  the personal index.

### Modified Capabilities

- `product-search`: the selector rules invert from exclusive to composable; the batch output becomes
  one flat deduplicated listing; the listing is ranked by the CLI when a query is given; the record
  gains `why`; the card and the favourite writes join one `products` group; `--details` is added.
- `product-index`: the closed list of fields a record may carry is widened to admit a saved flag and
  the static half of a product card, and the requirement is restated as three categories — identity,
  static description, state — rather than two.
- `catalog-browsing`: `browse` is renamed `catalog` and bounded by a limit; scope resolution moves
  from exact match to the shared ranker, keeping the ambiguity outcome; the scope table is read
  through the cache.
- `list-resolution`: the ranker it specifies becomes the shared one, gains the saved and promotion
  signals, and states that a promotion orders candidates without entering the auto/ask thresholds;
  the command moves under the cart.
- `command-input`: the requirement that mutually exclusive selectors are refused before the call is
  replaced by the union/intersection rules; a scope selector resolves by rank rather than by exact
  title.
- `shopping-cart`: gains `cart fill` as a command of the cart family.
- `agent-skill`: every command entry changes name or shape, and the skill states the new selector
  algebra and what `why` means.

## Impact

- `src/commands/`: `search.ts`, `product.ts`, `favorite.ts`, `browse.ts` and `fill.ts` are regrouped;
  `index.ts` registers the new tree.
- `src/index/`: `rank.ts` becomes the shared ranker over two corpora and gains two signals;
  `store.ts` gains a saved flag, an attributes table and the scope cache tables; `enrich.ts` learns
  to record that a product is saved, the category slug it already carries being untouched.
- `src/resolve/scope.ts`: exact matching gives way to the shared ranker.
- `src/daemon/fill.ts`: its resolver and the listing come to share `src/index/rank.ts`; the daemon's
  own resolve method stays the cart's, its result carrying too little to print a product record.
- `plugin/skills/silpo/SKILL.md`: rewritten across the catalogue and cart sections.
- No new runtime dependency. `minisearch` already ships and already does BM25 over character
  trigrams; the scope corpus is roughly 1042 records and the attribute cache is rows beside the
  products already stored.
- The measurement harness: the flows and their pass criteria name no
  command and survive untouched, but the harness holds the list of command names its
  isolation gate matches against. After the rename nothing matches it, so a read-only run halts
  claiming the CLI was never called and a leak through the new commands goes unseen.
