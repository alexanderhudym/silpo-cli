## Context

See proposal.md — Why.

The approach rests on five facts measured against the live server on branch
`1ee15e2a-7c41-6b83-9d52-4b7d0e93c468`, slot 2026-08-25 09:00–09:30. They are recorded here
because none of them is visible in the tool schemas and three of them contradict what the
schemas imply.

1. **The tree and the flat listing describe the same 1009 categories.** Same node count,
   same 28 roots, and all 1009 parent→child edges identical to those reconstructed from
   `parentId` in the flat listing. Neither side holds a category the other lacks.
2. **The tree's only unique contribution is `total`.** Structure, id and title all come from
   the flat listing; the tree carries neither id nor title at any depth.
3. **`total` is a deduplicated count over the subtree, not a sum.** `frukty-ovochi` reports
   448 against 476 summed over its children; `frukty-4791` reports 51 against 54. A product
   filed under two subcategories is counted once.
4. **`deliveryType` and the timeslot change only `total`, never the structure.** SelfPickup
   and DeliveryHome return the same 1009 nodes and the same 247 nodes without a count,
   differing in 38 numbers. DeliveryExpress on the same slot returned all 1009 nodes with no
   count at all, reporting `success: true`.
5. **`silpo_get_category` requires `deliveryType` but ignores it.** Omitting it is rejected
   by MCP validation before the request reaches the API, yet `Unknown`, `SelfPickup`,
   `DeliveryExpress` and `NovaPoshta` return byte-identical payloads. `branchId` by contrast
   is honoured — two real branches gave different `priceRange`.

Two further observations shape smaller decisions: `get_category` returns `children: null`
even for a category with thirteen children, and its `path[]` entries carry an `id` that the
output schema does not declare.

## Goals / Non-Goals

**Goals:**

- One identifier a user can paste into any category-taking option.
- Resolution that never guesses: an unresolvable value fails the command rather than
  reaching the server as-is.
- No extra round trip on the common path.

**Non-Goals:**

- Caching titles. The tree fetches them fresh each render.
- Trimming the tree. It prints in full, however many nodes it holds.
- Migrating or cleaning the dead `category` rows in the alias table.
- Reconciling a `--branch-id` that disagrees with the branch of the current cart.

## Decisions

### The table stores identity only

`id INTEGER PRIMARY KEY AUTOINCREMENT`, `remote_id TEXT NOT NULL UNIQUE`, `slug TEXT`.

`remote_id` is the natural key and the upsert target; `slug` follows it. Title is left out —
storing it would let the tree render from the database alone, but every render would then
serve names that silently drift from the server. Fetching titles costs two calls that fact 2
already requires.

A row without `remote_id` cannot exist, which is what forces the join described below: the
tree alone can never create rows, because it carries no ids. `slug` is the other way round:
the flat listing names a category's parent by id alone, so a row may be created from an
identifier with no slug yet and completed when a later payload carries one. A payload that
names an identifier without a slug never clears a slug already recorded. On the measured
branch this creates no rows at all — every parent is itself listed — but the listing does not
promise that.

A conflicting insert still spends a number from the autoincrement sequence, so a category
already recorded is looked up rather than inserted over. Every tree render touches a thousand
rows; burning a thousand numbers per render would grow the ids the user has to type.

Local ids are assigned in insertion order and are not renumbered. They are stable for the
life of the database and mean nothing across a wipe, so no output may cite one as a
long-lived reference.

### Resolution is two-sided

The input form and the required output form are independent. The resolver decides what it
was given, then the call site decides what it needs.

```
input                                          target slot
  /^\d+$/       → local id  ─┐              ┌→ remote_id : --parent-id
  isUuid(x)     → remote_id ─┼→ SELECT ─────┤
  otherwise     → slug      ─┘              └→ slug      : catalog category, --category
                                 │
                    miss + slug  → get_category → upsert self + path[] → retry
                    miss         → fail
```

`isUuid` is a shared utility testing the canonical dashed form. The 32-character undashed
hex strings that appear as tree slugs are deliberately **not** treated as uuids: they are
real slugs that resolve through the flat listing like any other.

Numeric slugs would collide with local ids. None exist in the 1009 categories observed, and
the collision is one-directional and loud — a numeric input that matches no local id fails
rather than silently querying the wrong thing.

### The gap-filling lookup passes `Unknown`

Fact 5 makes the delivery type ceremony. Passing `Unknown` keeps the fallback free of
preconditions: it works from `catalog categories --parent-id`, which has no delivery type
and, since `silpo_get_categories` takes none, will never gain one for its own sake. The
alternative — reading the current cart to borrow its delivery type — costs a call, and picks
a branch that may not be the one the command was given.

`branchId` is honoured by the server, so the command's own `--branch-id` is passed.

One lookup records the category and, through `path[]`, its whole ancestor chain. This
requires adding `id` to `CategoryPathEntry`, which the server sends and the schema omits.
`children` is not a source: it is null in practice.

Given fact 1, this fallback is not expected to fire during a tree render at all. It exists so
that a slug typed by hand, or one that outlives its listing, resolves rather than failing.

Failing the lookup means two different things depending on who asked. For an argument the
user typed, the command fails: that is the "never guesses" rule. For a node of the tree, the
node is left out along with its subtree, and the rest is printed — one stale promo slug
should not take a thousand-node tree down with it, and a line carrying neither a local number
nor a title is not a line a caller can use.

### The tree is a join, not a walk

`silpo_get_categories_tree` and the two pages of `silpo_get_categories` are issued in
parallel. Structure, local id and title come from the flat listing; the count comes from the
tree, matched by slug.

Structure could equally be rebuilt from `parentId` alone, making the tree call droppable
(fact 2) — it is kept because the count is part of the required output.

Nodes whose `total` is absent print no count. There are 247 of them, and per fact 4 a
mismatched delivery type and slot makes that 1009. This is deliberately not treated as an
error: the server reports success, and the CLI reports what it received.

### `catalog categories` narrows

`parent` leaves the output; the printed record becomes id, slug and title. `--parent-id`
stays as an input and now accepts all three identifier forms. The listing stops being the
way to see the hierarchy — the tree is — and becomes a pointed lookup under the filters
given.

## Risks / Trade-offs

- **`Unknown` stops being ignored.** → The fallback would start returning a delivery-type
  view or an error. Failure is loud, and the affected commands already carry `--branch-id`;
  adding a real delivery type is a one-line change at that point.
- **Facts 1–4 were measured on one branch and one slot.** → The three delivery types probed
  agreed on structure; a branch whose tree is genuinely a subset would only make the
  fallback fire more often, which it already handles.
- **A numeric slug appears in the catalog.** → It becomes unreachable by slug, since the
  numeric branch wins. It stays reachable by local id and by uuid.
- **Local ids look arbitrary in the tree**, because insertion follows the flat listing rather
  than tree order. → Accepted: renumbering on every catalog addition is worse than
  unordered ids.
- **The tree render costs about 12k tokens** for 1009 rows, marginally less than the current
  slug-based render. → Accepted; the tree prints in full by requirement.
- **Dead `category` rows remain in the alias table** and `silpo aliases` will list them. →
  Accepted; the database is disposable.
