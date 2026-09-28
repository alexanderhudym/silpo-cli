## Context

See `proposal.md` — Why. What matters here is the shape of the code the change lands in.

`src/resolve/scope.ts` is the abstraction this change removes. `ScopeRow` is `{kind, handle, title}`;
`scopeRows` flattens the three kinds into it; `rankScopes` builds one `RankIndex` over the flattened
list; `resolveScope` settles a name across all three; `scopeCandidatesText` prints candidates of mixed
kind. Everything else follows from that shape: `src/commands/catalog.ts` renders one row type with a
hoisted `common: kind`, and `src/commands/products.ts` turns a `ScopeRow` into whichever of `category`,
`set` or `promotionCode` its kind implies (`scopeRequestFields`).

`src/index/store.ts` holds the scope cache — six readers and writers, four shapes, two SQLite tables,
and two `DELETE` statements inside `clearProducts`.

Two things shape the decisions below. `src/utils/paginate.ts` already exists, written by
`sharpen-store-query-io` for exactly the read shape the categories need. And `src/index/rank.ts` is
shared with the product path and is not changed here — it already drops candidates beneath
`RELEVANCE_FLOOR`, so nothing below asks it to filter differently; what is added sits over the scores
it returns.

## Goals / Non-Goals

**Goals:**

- Three entities with three tables, three rankings and three renderers, in place of one flattened row.
- One wave of reads per invocation, assembled into those tables, with nothing kept between commands.
- A catalogue that contains only what a caller can act on.
- No code that reads or writes a copy on disk, and no table left behind for it.

**Non-Goals:**

- `src/index/rank.ts` is untouched. `RankIndex`, `settle` and the relevance floor are used as they are;
  the deepest-match rule is applied over the candidates `search` returns, not inside scoring.
- The product listing's own ranking, its reason rows and its read ceilings are untouched. Only how its
  population is named changes.
- `drain` in `src/index/corpus.ts` is not migrated. Three unrelated readings depend on it.
- The personal index is not enriched with the category a product sits in. Measured, 0 of its 254
  products carry one; making that true would mean fetching for the index's sake, which the index's own
  capability forbids.

## Decisions

### Three tables, not one flattened list

`src/resolve/scope.ts` is rewritten around three types rather than one:

- `CategoryTable` — one record per stocked category carrying identifier, slug, title, parent, depth,
  count, path and a popular flag; indexed by slug, by identifier and by parent.
- `PromotionTable` — code, title, count.
- `SetTable` — slug, title, description.

Each has its own `RankIndex` and its own resolution. There is no type that can hold a record of any of
the three, and therefore no place where a ranking across kinds could be written.

*Alternative considered:* keeping `ScopeRow` and adding the fields the new rules need — a parent, a
depth, a count, a path — with the promotion and set cases carrying them empty. Rejected: it makes two
of the three kinds mostly-null instances of a shape neither of them has, and it keeps the mixed ranking
expressible, which is the thing the measurements say is wrong. Deleting the abstraction is less code
than extending it.

### Each call supplies what only it has: structure and count from the hierarchy, names from the listing

The hierarchy call names its nodes by slug alone and carries the nesting and the count. The flat
listing carries identifier, title and parent and no count. The table is therefore walked out of the
hierarchy — one record per node, in the hierarchy's own nesting — and the title and identifier are
joined onto each node by slug.

An earlier draft of this design did the opposite: build the structure from the flat listing's `parentId`
and treat the hierarchy as a decoration carrying one field. Measured, the parent relation does
reconstruct the hierarchy exactly — 1014 nodes both ways, no orphan, no disagreement, the same depth
histogram — and that agreement is what makes a join on the slug safe. But it does not make the parent
relation a substitute for the nesting, because the two sources do not fail the same way. A node the
hierarchy carries and the flat listing does not has no `id` and no `parentId` — `CategoryTreeNode` is
slug, children and count — so a structure built from the parent relation cannot place it, and any of
its children that *are* in the flat listing become rows whose parent resolves to nothing.

The existing capability requires such a node to be printed with its slug and its subtree beneath it,
and `test/fixtures/categories.tree.json` already exercises one. Walking the hierarchy places it for
free, and the join then simply finds no title for it. The count decides whether a category is printed;
the title decides only how it is named; keeping those two tests independent is what lets the join be
imperfect without a special case.

`parentId` is consequently not used to build anything. It stays available on the record as the flat
listing gave it, and the tool's own parent filter stays unused.

### All five reads are issued together, and the categories are drained through `paginate`

`getCategories` (page 0), `getCategoriesTree`, `getPromotions`, `getProductSets` and
`getPopularCategories` go out in one wave; the category pages after the first go out in a second, which
`paginate` arranges. Measured, 1014 categories are two pages at the server's maximum of 1000, so the
second wave is one request. None of the five depends on another's answer: the branch, the delivery type
and the slot all come from the cart, read before any of them.

### Emptiness removes a category from the catalogue, at the point the table is built

The filter runs while `CategoryTable` is assembled, not while it is rendered. A category with no count
is therefore absent from the ranking, from resolution and from the output alike, and naming one fails
exactly as an unknown name does.

Filtering at render instead would keep such a category nameable, which is the behaviour the current
`product-search` capability describes — an empty listing and a success. That behaviour is being changed
deliberately: it costs a call to discover an empty answer that looks like a stock outage rather than a
category this branch does not carry, and the change exists to raise relevance.

A promotion carries a count and falls under the same rule when the promotion table is built. A set
carries none and is never filtered.

*Guard:* where the hierarchy reports a count for no category at all, nothing is dropped and the table
is marked uncounted. Without it a delivery type publishing no counts would empty the catalogue and the
command would report a stocked branch as holding nothing. The existing capability already names that
state, so it is one the surface has seen.

*Alternative considered:* `visible` from the category call. Rejected on measurement — sampled over 14
categories of the listing, 6 empty leaves and 3 empty parents among them, it returned `true` for all
14, and it costs a call per category besides.

*Alternative considered:* dropping only empty leaves and keeping empty parents as scaffolding. Rejected
as unnecessary — the count is a rollup and all 249 categories lacking one have wholly empty subtrees.

### The popular listing joins the category table and can fail alone

The popular read is issued in the wave and joined by slug. A category that joins sets its flag; a row
that joins nothing is discarded; the number joined is carried on the table so the renderer can print
it. The read is wrapped so that a rejection or an empty answer yields no flags rather than propagating.

Ordering: a flagged category that is a root leads the hierarchy directly. A flagged category deeper
than a root causes the root above it to lead, and that root's row names the descendant that moved it.
Roots that lead are ordered among themselves by the order the popular listing returned them in — the
only signal available, since neither alphabet nor count is a statement about popularity.

*Alternative considered:* printing the popular rows as their own section. Rejected — it is a second
grouping axis beside the kind, and it is not an ordering, which is what a popularity signal is for.

*Alternative considered:* resolving the stale slugs by title. Rejected on measurement — one of the two
stale titles does not match its redirect target's, so the rule would silently mis-join half the cases
it exists for.

### The deepest-match rule sits over the scores, not inside them

`RankIndex.search` returns candidates already above the relevance floor. Over that result, before the
auto/ask settlement, a candidate is dropped where another kept candidate is one of its descendants.
This applies to categories alone, the other two kinds having no hierarchy.

It fires only between a category and its own ancestor, so it narrows within a subtree the caller
already reached and never moves the answer to a different branch of the tree. It does not repair the
`вино` ordering in the proposal — `Безалкогольне вино` and `Виноград` are not ancestors of the wine
categories — and it is not claimed to: that ordering is the scoring function's, which is a Non-Goal.

*Alternative considered:* folding depth into the score. Rejected — it changes a function the product
path shares, to express a rule that applies to one kind, and it trades a statement a reader can check
for a constant nobody can.

### The catalogue population is named by `--category`, `--promotion` and `--set`

Three repeatable options on `products find`, replacing `--in`. Each resolves through its own table.
`scopeRequestFields` collapses: each option reads into its own request field.

The existing composition machinery is kept as it is. `runComposed` reads each population separately
under `READ_CEILING`, intersects on id sets and prints its truncation note; `runLoneScope` stays the
single-population fast path that forwards `limit`, `offset`, `sortBy` and `sortDirection` and folds
`categorySlug` into the personal index. The split changes which option fills a `ScopeRequest` field, not
how populations are composed.

The intersection is therefore **not** delegated to the catalogue tool, although that tool can express
one — `GetProductsArgs` takes `category`, `set` and `promotionCode` together. Delegating would answer
only the case where each kind appears once with no other selector beside it; a union within one kind
intersected with a second kind, or any catalogue population intersected with `--favorites` or
`--similar`, cannot be expressed in one call. Two assembly paths for one rule would differ in call
count, in read ceiling and in the note printed when a ceiling cut them short.

`checkSort`'s acceptance condition maps across unchanged in substance: the server's ordering is honoured
over exactly one catalogue population of any one kind with no query. Its current test is
`kinds.length === 1 && kinds[0] === "in" && inCount === 1`, which today already admits a lone `--in`
naming a promotion or a set; the split must keep all three honoured, not narrow it to categories.

`categorySlugOf` folds a listing's products into the index under the category they were listed from.
After the split it fires only where the single population was a category — a promotion or a set names no
category, and an intersection names no single one — which is what it does today.

`--promotion` sits beside the existing `--must-have-promotion`; verified, commander does no long-option
abbreviation, so the two are distinct. `--set` maps to `opts().set`, a plain object key with no clash,
and `--in-stock` survives the removal of `--in` unaffected.

*Alternative considered:* keeping one `--in` and asking when a handle collides. Rejected — it turns a
value the caller already knows the kind of into a question, on 2 handles out of 1042, and it leaves the
option's help unable to say what it takes.

### `getCategory` leaves the CLI, and its tool definition stays

Everything a category's record prints comes from the tables. The call's `children` is empty in every
case sampled, including a category with five children in the tree, so it could not supply them anyway;
`priceRange` is the only field it alone carries and is dropped.

`src/mcp/tools/get-category.ts` and the entity types stay where they are, unused by any command, on the
same terms as every other tool the typed client covers but no command calls. Nothing is deleted from
`src/mcp/`.

### The cache goes out of the schema, and `clearProducts` goes with it

Removing the two scope tables is not only removing the exported readers and writers: `clearProducts`
(`src/index/store.ts:458`) issues `DELETE FROM scope_cache_fetches` and `DELETE FROM scope_cache`
inside the index rebuild. Left in place against a database created after this change, they throw "no
such table", which `markIndexUnavailable` turns into a schema fault for the whole personal index. Those
two statements go with the tables.

Nor is it only the exported surface. The SQL lives in the private `readScopeCache` and
`writeScopeCache`, and around them sit `scopeCacheDeliveryType`, `ScopeCacheRow`,
`SCOPE_CACHE_LIFETIME_MS`, `NO_DELIVERY_TYPE`, the module-level `scopeCacheUnavailable` flag and its
assignment inside `open()`. `tsconfig.json` sets no `noUnusedLocals` and the repository has no linter,
so every one of those compiles clean if it is left behind. The build is not the check here; a grep for
the two table names is.

An existing database keeps its two orphan tables. Nothing reads them and nothing writes them. There is
no schema version to bump: the file's only migration mechanism is `migrate()` → `hasSavedColumn()`,
which adds a column to `products`, and `indexVersion()` returns a file mtime rather than a version. The
tables simply stop being created, because `CREATE TABLE IF NOT EXISTS` stops being issued for them, and
no migration is written to drop them from a database that already has them — dropping a table is a risk
taken for disk space nobody is short of.

## Risks / Trade-offs

- **A category the branch stocks nothing under stops being nameable, and the failure is a hard one.** A
  caller naming it gets "no such category" where they used to get an empty listing. → That is the
  intended change and the relevance argument for it is in the proposal. The failure names the value, so
  a caller who believes the category exists can see that this branch does not carry it.

- **The unbounded listing is large.** Measured, 793 rows and 49.0 KB. → It is bounded by the catalogue
  rather than by a page, it is reached only when the caller names nothing, and the skill says so. The
  absolute size can be re-measured after the change; the comparison against the old `--tree` rendering
  cannot, because that rendering is gone.

- **The popular mark rests on an endpoint its own vendor no longer calls.** → It contributes a flag and
  a position, it cannot fail the command, and the listing prints how many rows it joined, so the bet is
  settled from the output rather than by re-running a measurement.

- **The pruning is the change's largest filter and would otherwise be invisible.** The listing prints
  what survived and, without a count, says nothing about what it removed. → The hierarchy's summary
  states how many categories were dropped, on precisely the argument the popular join already won. A
  reader can then tell a catalogue being sharpened from one being gutted without leaving the CLI.

- **Splitting `--in` breaks every existing invocation.** → Loud: the option is gone, so a stale
  invocation fails at parse time naming it rather than silently listing the wrong population.

- **Rewriting `src/resolve/scope.ts` changes both its callers at once.** `src/commands/catalog.ts` and
  `src/commands/products.ts` are the only two, and both are rewritten in this change. → The build fails
  on every site rather than any drifting silently.

- **The deepest-match rule changes which category a bare title resolves to.** It reaches only the two
  call sites of catalogue resolution, both of which this change rewrites; `cart fill` resolves products
  through `rank.decide` and is not affected. → Stated here because an earlier draft of this design
  claimed otherwise.

### The measurements stay re-takeable through `silpo raw`

Every figure this change is justified by came from an MCP payload rather than from a rendering, and
`silpo raw <tool> <json>` calls any tool on the typed surface and prints what it returns. This change
does not touch it, and `cart setup --branch` still moves the session between branches, so the category
and node counts, the uncounted nodes, the `parentId` reconstruction, the four popular rows, the
promotion and set comparisons across branches, `visible` over a sample, and the parent-against-children
totals can all be re-taken exactly as they were taken. Saying so here is the point: without it the
change reads as though deleting `--tree` and `--popular` deleted the evidence, and a later reader would
have no reason to look for `raw`.

What cannot be re-taken is named in the risks: the comparison against the old `--tree` rendering, which
ceases to exist. The counts that vary by time slot cannot be reproduced identically at a later date
either, that being a property of the data rather than of this change.

## Migration Plan

None. The scope cache is the only stored state and nothing has to be read out of it before it stops
being written: a database written before this change still opens, its two scope tables ignored. The
removals a caller can see are `--tree`, `--popular` and `--offset` on the catalogue command and `--in`
on the product listing, all of which fail at parse time naming the option.

## Open Questions

- **What the default page size should be for a ranked group.** The store path settled on 10 and this
  change follows it, but a category record that prints a matched parent's children is taller than a
  store's, and three groups are printed rather than one. Nothing else depends on the number.
