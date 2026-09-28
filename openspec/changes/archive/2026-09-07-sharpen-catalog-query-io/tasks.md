# Tasks

## 1. Three tables in place of one flattened row

Owns `src/resolve/scope.ts` and `test/resolve-scope.test.ts`. Nothing else in the change compiles until
this lands, and nothing here needs a command surface.

- [x] 1.1 Delete `ScopeRow`, `scopeRows`, `rankScopes`, `resolveScope` and `scopeCandidatesText`.
      Replace them with three tables: categories carrying identifier, slug, title, parent, depth, count,
      path and a popular flag, indexed by slug, identifier and parent; promotions carrying code, title
      and count; sets carrying slug, title and description. Introduce no type that can hold a record of
      more than one kind.
- [x] 1.2 Read the tables in one wave — the first page of the flat categories, the hierarchy, the
      promotions, the sets and the popular categories — and drain the remaining category pages through
      `paginate` in `src/utils/paginate.ts`. Take nothing from the caller but the branch, the delivery
      type and the slot. Read no cache and write none.
- [x] 1.3 Walk the category table out of the hierarchy, one record per node in the hierarchy's own
      nesting, and join the title and identifier from the flat listing by slug. Take path and depth from
      that walk, not from the flat listing's parent. A node the hierarchy carries and the flat listing
      does not keeps its place, its count and its subtree, and is left without a title.
- [x] 1.4 While building the category table, drop every category the hierarchy reports no count for,
      and its subtree with it — except where no category anywhere carries a count, in which case drop
      nothing and mark the table uncounted. Carry the number dropped on the table. Drop a promotion
      covering nothing on the same rule. Filter no set.
- [x] 1.5 Join the popular listing by slug, setting the flag on each category that joins and discarding
      rows that join nothing. Carry the number joined on the table. Isolate this read so that a
      rejection or an empty answer yields no flags and reaches no caller.
- [x] 1.6 Give each kind its own ranking and its own resolution over `RankIndex` and `settle`. Resolve a
      category by title, slug or identifier; a promotion by title or code; a set by title or slug.
      Match identifier and code inside the table and never forward them. Print candidates of one kind
      only, categories carrying their paths.
- [x] 1.7 Over the candidates a ranking returns, and before settlement, drop a category that has another
      kept candidate among its descendants. Change nothing in `src/index/rank.ts`.
- [x] 1.8 Cover in tests: the count join, a hierarchy node the flat listing lacks, the pruning rule and
      its uncounted guard, the popular join including a row that joins nothing and a read that rejects,
      resolution by each form of each kind, the deepest-category rule, and two categories carrying one
      title.

## 2. The catalogue command

Owns `src/commands/catalog.ts`, `test/catalog.test.ts` and `test/fixtures/categories.*`. Depends on
group 1.

- [x] 2.1 Remove `--tree`, `--popular` and `--offset` with the branches that served them, the
      `getCategory` call, and every import of the scope cache from `src/index/store.ts`. Keep
      `--limit`, default it to 10, and apply it only where a text was given.
- [x] 2.2 Print three groups in a fixed order — the hierarchy, then the promotions, then the sets — each
      naming its kind once on the group and on no record. Print the hierarchy nested two spaces per
      level, each category showing slug, title where known, and count.
- [x] 2.3 Lead the hierarchy with the roots the popular join marked, each such root naming the
      descendant that moved it, ordered among themselves as the popular listing returned them. In the
      hierarchy group's summary state how many categories were dropped for holding nothing and how many
      popular rows were joined, both including when the number is zero, and neither where the table was
      marked uncounted.
- [x] 2.4 Where a text was given, rank each kind within itself, trim each group to the page size, and
      summarise each group by the number its own ranking kept. Where none was given, print everything
      with no page applied.
- [x] 2.5 Print each kind in its own shape: a category with its count everywhere, its path outside the
      hierarchy, and — where the ranking kept it and it has children — those children as slug, title and
      count; a promotion with code, title and count; a set with slug, title and description only where
      it carries one. Print no price range and no web address.
- [x] 2.6 Cover in tests: the three groups, the unbounded listing, a ranked group trimmed and its count,
      a popular root leading and naming its cause, the joined count when nothing joined, a matched
      parent printing its children, and a set with and without a description.

## 3. The product listing's population options

Owns `src/commands/products.ts` and `test/products-find.test.ts`. Depends on group 1.

- [x] 3.1 Replace `--in` with `--category`, `--promotion` and `--set`, each repeatable, each resolved
      through its own table. Restate `SelectorKind` and `scopeRequestFields` over the three. Remove
      every import of the scope cache from `src/index/store.ts`, and the `UPDATE scope_cache_fetches`
      the test file issues.
- [x] 3.2 Union within one option and intersect across two, keeping `runComposed`, its `READ_CEILING`
      and its truncation note as they are. Do not delegate the intersection to the catalogue tool, and
      do not union a category with its own children.
- [x] 3.3 Keep `runLoneScope` as the single-population fast path for all three kinds, forwarding
      `limit`, `offset`, `sortBy` and `sortDirection` as it does today. Keep `checkSort` honouring a
      lone population of any one kind with no query — it admits a lone promotion or set today and must
      still do so — and keep `categorySlugOf` folding into the index only where that lone population
      was a category.
- [x] 3.4 Fail naming the value where a named category is not in the table, rather than calling the
      server to discover an empty listing.
- [x] 3.5 Restate the messages that named `--in` — the no-selector failure, the refusal of a
      server-side ordering over a union, and the option help — over the three options.
- [x] 3.6 Cover in tests: two categories unioning, a category and a promotion intersecting, a handle two
      kinds carry reaching the right one through each option, a lone promotion and a lone set each
      taking a server-side sort, a category the branch stocks nothing under failing, and the
      no-selector failure naming the three options.

## 4. Retiring the scope cache

Owns `src/index/store.ts` and the four index-store tests that touch the cache. Depends on groups 1, 2
and 3 having stopped calling it — including the two test files those groups own,
`test/catalog.test.ts` and `test/products-find.test.ts`, which issue `UPDATE scope_cache_fetches`
against the raw database and are not this group's to edit.

- [x] 4.1 Remove the six exported readers and writers, the private `readScopeCache` and
      `writeScopeCache` that hold every `scope_cache` SQL string, `findCachedScopeHandle`,
      `isScopeCacheUnavailable`, `scopeCacheDeliveryType`, the `ScopeCacheKind`, `CachedCategory`,
      `CachedPromotion`, `CachedSet`, `CachedScopeHandle` and `ScopeCacheRow` shapes,
      `SCOPE_CACHE_LIFETIME_MS`, `NO_DELIVERY_TYPE`, the module-level `scopeCacheUnavailable` flag and
      its assignment inside `open()`, and the two `CREATE TABLE` statements. Nothing here is caught by
      the compiler: `tsconfig.json` sets no `noUnusedLocals` and the repository has no linter.
- [x] 4.2 Remove the two `DELETE` statements `clearProducts` issues against those tables, leaving its
      product statements. Write no migration and touch `migrate()` and `hasSavedColumn()` not at all —
      there is no schema version in this file, the tables simply stop being created, and a database
      written before this change keeps them as orphans and must still open.
- [x] 4.3 Delete `test/index-store-scope-cache.test.ts` and
      `test/index-store-scope-cache-write-fault.test.ts`. Remove the scope-cache imports and assertions
      from `test/index-store-degraded.test.ts` and `test/index-store-read-fault.test.ts`, keeping every
      product-index assertion in both.
- [x] 4.4 Grep the whole repository for `scope_cache` and `scope_cache_fetches` and confirm no match
      outside a fixture's stored data. Check that the index opens and that `clearProducts` succeeds
      against both a database written before this change and one created after it.

## 5. The skill

Owns `plugin/skills/silpo/SKILL.md`. Depends on groups 2 and 3, whose surfaces it describes.

- [x] 5.1 Restate the catalogue entry: its argument and options as they now are, that the listing with
      no text is the whole hierarchy with the promotions and sets after it and that the page size does
      not apply to it, that a text ranks each kind in its own right and the page size only trims each
      group, and that there is no offset.
- [x] 5.2 State that the text is a name and not a description of a need, that every category carries the
      number of products it holds at this branch in this slot, and that a category holding nothing is
      neither printed nor nameable.
- [x] 5.3 State that the deepest matching category wins and that a matched category's children are
      printed as where to go next, not because naming the parent would return less.
- [x] 5.4 Restate the composition rule over `--category`, `--promotion` and `--set`: one repeated
      unions, two together intersect, the kind is named because a handle can belong to two kinds, and
      naming a category names its whole subtree.
- [x] 5.5 Carry no count measured at one branch on one day.

## 6. The sweep

Owns `test/golden.test.ts`, `test/harness.ts`, `test/commands.test.ts` and any fixture the earlier
groups left stale. Depends on all of the above. `test/commands-index.test.ts` is not in scope: it
covers the local product-index `status`, `rebuild` and `why` commands, which this change does not
touch.

- [x] 6.1 Add a golden expectation for the catalogue command, which has none today, covering the
      three-group listing with no text.
- [x] 6.2 Bring the remaining fixtures and expectations up to the new surface and remove what stood for
      the deleted options.
- [x] 6.3 Run `npm test` and report the output as it is.

## Review checklist

These are properties the finished code must hold. Check them against the code, not against the task
list above.

### The abstraction is gone

- [x] No type in `src/resolve/scope.ts` can hold a record of more than one kind. A ranking across kinds
      is not merely unused but unwritable.
- [x] Each kind has its own ranking. Find the `RankIndex` constructions and confirm no corpus mixes
      kinds.
- [x] Candidates printed on an ambiguity are all of one kind.

### The tables and their reads

- [x] No ceiling bounds the category read. The loop's only exits are an empty page and the total the
      first page reported.
- [x] The category pages after the first are requested together, and the rows concatenated by page
      index, so the table does not depend on which request returned first.
- [x] The five reads of the wave are issued before any is awaited. No `await` sits between two of them.
- [x] The popular read cannot fail the command. Follow the path a rejection takes and confirm it ends in
      no flags rather than a thrown error.
- [x] Path and depth come from walking the hierarchy payload, not from the flat listing's parent. Find
      the walk and confirm `parentId` builds no structure.
- [x] A category the hierarchy counts but the flat listing does not carry keeps its place, its count
      and its subtree, and is printed without a title. The join is not assumed total, and no child of
      such a node is orphaned.

### The pruning rule

- [x] The filter runs while the table is built, so a dropped category is absent from ranking and
      resolution as well as from output.
- [x] Where no category in the table carries a count, nothing is dropped, and that branch is reachable.
- [x] `visible` is read nowhere. The word appears in no code path that decides what is printed.

### Resolution

- [x] An identifier and a code are matched inside the table. No request is built with either in a field
      the server reads as a slug.
- [x] The deepest-category rule fires only between a category and its own ancestor, and is applied over
      the candidates `search` returned. `src/index/rank.ts` is unchanged — diff it to confirm.
- [x] A value matching nothing still fails, and a weak best match still prints candidates and stops.

### Output

- [x] No record carries a kind key. The kind appears once per group.
- [x] No code path prints a category without its count, except on a table marked uncounted.
- [x] A category printed outside the hierarchy carries its path; one inside it does not repeat its
      parent.
- [x] A set's description is printed only where present, with no line held open for it.
- [x] The number printed beside a ranked group is that group's own kept count.
- [x] The listing with no text passes through no slice, no page size and no offset.
- [x] The number of popular rows joined reaches the output, including when it is zero.
- [x] The number of categories dropped for holding nothing reaches the output, including when it is
      zero, and is absent where the table was marked uncounted.

### Removals

- [x] `--tree`, `--popular`, `--offset` and `--in` are absent from the program definition, not merely
      unused.
- [x] Nothing imports a removed cache shape or function, and no SQL statement anywhere names
      `scope_cache` or `scope_cache_fetches`. Grep for both strings across `src/` and `test/` — the
      build does not check SQL, and with no `noUnusedLocals` and no linter it does not check an
      orphaned private helper either.
- [x] `checkSort` still honours a lone promotion and a lone set, not categories alone.
- [x] The intersection is assembled by the CLI. No `getProducts` call carries two of `category`,
      `promotionCode` and `set` together.
- [x] `getCategory` is called from no command, and `src/mcp/tools/get-category.ts` is still present.
- [x] An index database written before this change opens, and `clearProducts` succeeds against a
      database created after it.

### The skill

- [x] Every option the skill names exists, and every option the catalogue and product commands take is
      named.
- [x] No line of the skill carries a number that a change in the branch's catalogue would falsify.
