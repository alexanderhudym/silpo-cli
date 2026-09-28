## Why

`sharpen-store-query-io` settled the store path: read what the ranking needs in one wave, rank the
whole estate against the query, drop the records that are not stores, and let `--limit` trim the tail
of an order rather than page it. The catalogue path was not touched.

A measurement pass against the live catalogue has since been made, against the session's branch
`1edb7345-2b99-62cc-9e83-6fea04bfe766` (Дніпро, SelfPickup, slot 2026-09-06 17:00–17:30) and, for
every claim about what varies, against `1edb6a9b-64ea-616e-a44d-a19abd0f8ccc` (Харків) and
`1ed43e73-051b-6842-a111-a5ad042eb496` (Київ). It found that two of this capability's requirements
rest on fields that do not report what the requirements take them to report, that a third describes a
listing whose handles do not all work, and that `catalog-cache` is keyed on a branch for data that
does not vary by branch.

Underneath all of them is one modelling mistake. The CLI treats a category, a promotion and a curated
set as three kinds of one thing — a *scope* — and flattens them into a single row of kind, handle and
title so that one ranker can order them together and one resolver can settle a name across them. They
are not three kinds of one thing. They are read from different calls, carry different fields, are
selected by different request parameters, and are useful for different questions. The flattening is
what forces a caller to hand over a bare handle whose kind the CLI then has to guess, and it is what
makes a category and a promotion compete in one ranking where neither is an alternative to the other.

This change removes the abstraction rather than extending it.

Every claim below carries the reading that produced it. Where a claim is not measured, it says so.

The catalogue as measured: **1014 categories, 28 roots, three levels deep**; 11 promotions and 17
curated sets.

## What Changes

- **A category, a promotion and a set stop being three kinds of one thing. BREAKING.** Each is read,
  ranked, selected and printed as itself. The listing prints three groups rather than one sequence of
  tagged rows; a text ranks each kind within itself, because a category is not an alternative to a
  promotion and an order that mixes them answers no question; and the product listing takes one option
  per kind instead of one option taking any handle.

  The measured cost of the flattening is small and exact, which is the point: of 1042 handles, two
  collide across kinds — `pakunok-shkoliara` is both a promotion code and a category slug, and
  `tefal-sale` is both a promotion code and a set slug. A single option cannot resolve either without
  guessing. The measured cost of a mixed ranking is that a caller asking for `вино` is offered a
  curated set among the wine categories, ordered by a score that means nothing across the two.

- **The hierarchy is read from the flat listing, and the tree is read for one field.** The tree is
  currently fetched to obtain the hierarchy and the flat listing to obtain the titles the tree lacks.
  The dependency is backwards. Measured, `parentId` on the flat listing reconstructs the tree exactly:
  1014 nodes against 1014, zero orphans, zero disagreements on any node's parent, and the same depth
  histogram (28 roots, 230 at the second level, 756 at the third).

  What the tree carries and the flat listing does not is `total`, the number of products the node
  holds. That is the whole of its contribution, and it is the only part of the category hierarchy that
  varies by branch at all.

- **A category the branch stocks nothing under is not a category of that branch. BREAKING.** 249 of
  the 1014 nodes arrive with no `total`; none arrives with `total: 0`. Verified against the product
  listing: `granat-4794` carries no total and `getProducts` returns 0 for it, while `frukty-4791`
  carries 42 and returns exactly 42.

  Such a category SHALL be absent from the branch's catalogue outright — not printed and marked, and
  not resolvable by name. This is the relevance decision the change exists for: a category that can
  only ever answer with an empty listing is not somewhere to browse, and offering it as a handle costs
  the caller a call to find that out. Measured, `total` is a rollup, so all 249 stand over wholly empty
  subtrees and no scaffold case needs an exception. A promotion carries a count too and falls under the
  same rule; a set carries none, so nothing can be tested for it.

  It replaces a requirement that never fired. The capability currently marks such a category
  "unavailable" on the strength of `visible`, and `visible` was sampled over 14 categories of the
  listing — 6 empty leaves, 3 empty parents, 5 stocked — and returned `true` for all 14. Inside the
  branch's listing the field is a constant.

  Where the server reports a count for no category at all, nothing is dropped: the absence then reports
  that counts are not being published rather than that the branch is empty.

  The listing SHALL state how many categories it dropped. This is the change's largest filter and the
  one it is BREAKING for, and a listing that prints only what survived says nothing about whether nine
  categories were removed or nine hundred. The same argument that puts a count on the popular join puts
  one here, and it is the more consequential of the two.

- **The popular listing is never printed as handles of its own. BREAKING.** `silpo_get_popular_categories`
  returns 4 rows, and the same 4 across four delivery types and five branches. Two of them —
  `frukty-381` and `syry-napivtverdi-1472` — are absent from the branch's listing, return 0 products
  at Дніпро and at Харків, report `visible: false` with an empty path, and have no children when
  queried by their own uuid. `--popular` prints them today as browsable rows, and a product listing on
  either returns nothing.

  They are not junk, they are stale. Followed in a browser, `silpo.ua/category/frukty-381` redirects to
  `frukty-4791` (42 products) and `syry-napivtverdi-1472` to `napivtverdi-tenero-vershkovyi-inshi-5013`
  (31 products). The redirect is the only thing that resolves them: the titles do not match their
  targets — "Сири напівтверді" against "Напівтверді (тенеро, вершковий, інші)" — and no such redirect
  exists on the tool surface.

  The records carry `media.cover`, `media.icon` and `tileSize`, and `updatedAt` of 2023-02-27 for both
  stale rows and 2023-10-11 for a third. It is a tile block for a home screen, curated three years ago.
  `silpo.ua` itself no longer calls it: of the 21 distinct `sf-ecom-api` endpoints the home page
  requests, `/categories/popular` is not one.

  It is still read, concurrently, because it costs nothing in wall clock and a refreshed list would
  then work with no further change. It contributes by **joining the branch's own categories on the
  slug**. A category that joins is marked, and the root above it leads the hierarchy with its row
  naming which descendant moved it — naming the root itself popular would be false. A popular row that
  joins nothing is dropped. The read SHALL NOT be able to fail the command, and the listing SHALL say
  how many of the popular rows it joined, so that the bet this makes stays checkable from the output.

- **A scope is opened from the CLI's own table, not from a further call.** `getCategory` returns
  `children: null` for every one of the 14 categories sampled, including `spetsialni-propozytsii-5189`,
  which carries 5 children in the tree. The path, the title, the children and the count are therefore
  all assembled from the table the CLI already holds. The one field the call alone carries is
  `priceRange`, and it SHALL NOT be paid for with a call of its own: prices are visible one step
  further on, in the products of that category.

- **The listing without a query is the whole catalogue, and the page size does not apply to it.** Today
  it is a 30-row slice of 1042 mixed rows in server order, which answers no question. It becomes the
  hierarchy in full, then the promotions, then the sets.

  Measured, that is 765 categories, 11 promotions and 17 sets: 793 rows and 49.0 KB, against 65.0 KB
  for the same three groups with the empty categories kept. Cutting them is what pays for the depth.

- **`--offset` is removed, and `--limit` only trims.** An order with no meaningful tail is not
  something to page through. `--limit` defaults to 10 and only ever trims the bottom of a ranked order;
  it does not apply where no text was given.

- **A category is found by title, slug or identifier, and a promotion by title or code.** `getCategory`
  accepts the slug alone — a uuid returns 404, as does the numeric tail of a slug — so the identifier
  and the code are handles the CLI matches within its own table and never forwards.

  Where a text ranks a category and one of its own descendants, the deepest wins, and a matched
  category prints its children as the narrowings available from it. That is navigation, not a repair of
  coverage: measured over five parents, `getProducts` on a parent returns exactly the parent's `total` —
  97, 42, 498, 370, 911 — each differing from the naive sum of its children's totals — 155, 46, 498,
  378, 1094 — so a parent's listing already holds its whole subtree, deduplicated.

  Ambiguity within one kind remains and is answered as it is today, by printing the candidates and
  stopping. Measured, 18 category titles are carried by two categories each — `Шоколадні фігурки`
  stands under both `Шоколад` and `Власна Кондитерська` — so the path is what tells such candidates
  apart and SHALL be printed with them.

- **The scope cache is retired, table and all. BREAKING.** `catalog-cache` keys the table by branch.
  Measured, the flat category listing is byte-identical between Дніпро and Харків, the tree has the
  same 1014 nodes in the same root order at all three branches and under both SelfPickup and
  DeliveryHome, and the 17 sets are byte-identical between branches and identical with and without a
  delivery type. The key was carrying a distinction that does not exist.

  What does vary by branch is read on every invocation in any case: `total`, which differs for 777 of
  1014 categories between Дніпро and Харків, and the promotions, which are 11 at Дніпро against 7 at
  Харків with 6 of the shared codes differing in product count.

Deliberately not in this change: the ranker's scoring function in `src/index/rank.ts`, which the
product path shares. It already drops candidates beneath a relevance floor, so this change adds no
claim that it fails to; what it adds is a tie-break applied over the scores it returns. And enriching
the personal index with the category a product sits in — measured, 0 of its 254 products carry a
`categorySlug`, because it is written only when a product is seen through a single-category listing, so
ranking by the caller's own history is not reachable from here and is named rather than attempted.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `catalog-browsing`: the listing becomes three groups rather than one sequence of tagged rows, each
  ranked within its kind; `--tree`, `--popular` and `--offset` go; the hierarchy is stated as read from
  the flat listing's parent relation with the count joined from the tree; the unavailable-category
  requirement is restated as absence, in the listing and in resolution alike; the listing with no text
  becomes the whole catalogue exempt from the page size; a matched category prints its children and its
  path; the popular listing becomes a mark and a lead position joined on the slug, with the join
  counted in the output.
- `catalog-cache`: every requirement is removed. The capability retires and its tables go with it.
- `product-search`: the scope option splits into one option per kind; naming a category the branch
  stocks nothing under fails rather than printing an empty listing, because such a category is not part
  of the branch's catalogue; a category names its whole subtree; the selectors are re-enumerated as five
  rather than three, and the server-side ordering is restated as available over one catalogue population
  of any one kind rather than over "a single scope"; the intersection across kinds is stated as the
  CLI's own work rather than the catalogue tool's, the tool being able to express only the simplest case
  of it.
- `command-input`: the scope selector is restated as one option per kind, over the handle forms each
  kind has, with cross-kind ambiguity gone because kinds no longer compete. The requirement that no
  argument's form is inspected or rewritten gains its third named exception — a category identifier
  matched inside the CLI's table and replaced by the slug, the category call accepting no other form —
  and loses the category-with-its-subtree lookup, which this change deletes.
- `output-rendering`: the browse listing no longer tags every record with its kind, because it no
  longer interleaves kinds — the kind names the group. The rule that hoisted a kind when the listing
  narrowed to one loses the two options it named.
- `agent-skill`: the catalogue entry is restated for the new surface, gains what a catalogue query
  should be and what the count on a row means, and states the composition rule over the split options.

## Impact

- `src/resolve/scope.ts`: `ScopeRow`, `scopeRows`, `rankScopes`, `resolveScope` and
  `scopeCandidatesText` are replaced by per-kind tables, rankings and resolutions.
- `src/commands/catalog.ts`: `--tree`, `--popular` and `--offset` removed with their branches;
  `listCategories` moved onto `paginate`; the tree joined to the flat listing; empty categories
  filtered; the popular join; three renderers in place of one.
- `src/index/store.ts`: the six exported scope-cache readers and writers, the private `readScopeCache`
  and `writeScopeCache` that hold the SQL, the five cached shapes, `findCachedScopeHandle`,
  `isScopeCacheUnavailable`, `scopeCacheDeliveryType`, `SCOPE_CACHE_LIFETIME_MS`, `NO_DELIVERY_TYPE`,
  the `scopeCacheUnavailable` flag, the two scope tables in the schema, and the two `DELETE` statements
  `clearProducts` issues against them.
- `src/commands/products.ts`: `--in` replaced by `--category`, `--promotion` and `--set`;
  `scopeRequestFields` and the union and intersection paths restated over the split.
- `src/mcp/tools/get-category.ts` and `src/mcp/entities/category.ts`: `getCategory` is called from no
  command; the tool definition stays on the typed surface, unused, as other uncalled tools do.
- `plugin/skills/silpo/SKILL.md`: the catalogue entry, the split options and the query contract.
- Round trips: five reads in two waves on every invocation, against four today plus a cache read. The
  four are already concurrent — `readScopes` issues the three kinds through `Promise.all` and
  `listCategories` fans out the pages after the first — so what the change saves is the cache
  round-trip and the `getCategory` call on every category opened, not a serialisation that was never
  there. What it adds is the hierarchy and the popular listing to the same wave.
- `test/catalog.test.ts`, `test/products-find.test.ts`, `test/resolve-scope.test.ts`,
  `test/index-store-scope-cache.test.ts`, `test/index-store-scope-cache-write-fault.test.ts`,
  `test/index-store-degraded.test.ts`, `test/index-store-read-fault.test.ts`, and the category fixtures.
- Nothing is cached, nothing is written to disk, and no runtime dependency is added.

## Open Questions

- **Whether `priceRange` is worth a call per opened category.** This change says no. The cost is that a
  caller asking what a category costs has to list its products. Nothing else depends on the answer.
- **What the home page's own category tiles would be worth.** `silpo.ua` merchandises 103 category
  slugs across 17 tile widgets and 10 more in carousels, all in the current namespace, from
  `ui-config/main-page-config`. It is a real curated ordering and it is not on the tool surface, so it
  is named rather than pursued.
- **Whether the popular join is worth keeping if it stays at 2 of 4.** It costs one concurrent call and
  contributes a mark and a lead position. It is kept because a refreshed list would work without a
  further change; the listing prints how many rows it joined so that a later reader can settle it from
  the output rather than by re-running the measurement.

Every figure above was taken from an MCP payload rather than from a rendering, and `silpo raw` — which
this change does not touch — calls any tool on the typed surface and prints what it returns. Deleting
`--tree` and `--popular` therefore deletes none of the evidence: the counts, the emptiness, the
`parentId` reconstruction and the cross-branch comparisons are all re-takeable exactly as they were
taken. The one figure that is not is the size of the old `--tree` rendering, which ceases to exist.
