## Context

See proposal.md — Why. What matters here is what the payloads actually look like, because
every decision below rests on measurement rather than on the shape of the code.

All 39 tool responses were captured live on 2026-08-20 against `silpo-mcp-service`, 23 of
them non-empty by themselves, two more after deliberately filling the account's favorites and
cart. Each record in each payload was reduced to its key set and the key sets compared across
tools. The result is the single most important fact for this change: **almost nothing
repeats**.

```
Product, 15 fields   get_products, find_products_batch, get_similar_products,
                     get_my_favorites          ← identical, live-confirmed
envelope             get_products, get_similar_products, get_my_favorites
{success,summary,    ← identical top level
 products,meta}
meta {limit,offset,  6 tools
 total}
─────────────────────────────────────────────────────────────────────────
everything else      one tool each
```

The categories are the instructive case. Four catalog tools return five different category
shapes — `{id,parentId,slug,title}`, `{id,slug,title,url}`, `{id,slug,title,url,path,
priceRange,children}`, `{id,slug,title}` and `{slug,children,total}` — and the current engine
renders all of them through one registered `category` renderer keyed on the field name. That
is not reuse; it is four different records made to look alike by the accident of sharing a
field name.

## Goals / Non-Goals

Goals:

- Delete the engine and every module that exists only to call it.
- Give the composed form one written style so thirty-five hand-written outputs stay one
  dialect.
- Extract exactly the sharing that measurement supports, and no more.

Non-Goals:

- Capping, paging or truncating what a command prints. Three payloads are unbounded — 454
  branches with `limit` ignored by the server, 2708 Nova Poshta offices with no `limit`
  parameter at all, a 1009-node category tree — and the engine printed all of them too.
  Whether the CLI should cap belongs to a change about arguments, not about rendering.
- Changing what any command sends. Only the output half of each command module moves.
- Re-litigating the profile output. It is the reference, not a subject.

## Decisions

### Sharing is proved, never predicted

One shared piece of text-building is introduced: the product record returned by
`get_products`, `find_products_batch`, `get_similar_products` and `get_my_favorites`, whose
envelope is shared by three of the four as well. It is written once when the `products` group
moves, and the fourth caller uses it because its payload was checked, not because its type
declaration says `Product`.

Everything else is written where it is printed, including records that look similar. The
product inside an online order carries `quantity`, `subtotal` and `removed`; the product
inside a cart carries `productId` rather than `id`, `ratio` rather than `displayRatio`, and
`addToBasketStep` rather than `step`; the product card from `get_product_details` carries
`images`, `url` and `attributes` and no `image`. Three near-misses, no shared code.

Two shapes are declared identical by the tool contract but could not be confirmed live,
because both lists are empty on this account: the lite product in `get_replacements` and the
`catalogProduct` nested in an offline order's line. They are written separately when their
groups move; if the two are ever seen to agree on live data, that is the moment to join them.

Why not extract by declared type instead of by measured shape: the declarations are
themselves derived, and one of them is already wrong — `get_category` declares
`path[]` as `{slug,title}` with `additionalProperties: false`, and the server returns
`{id,slug,title}`. A shared formatter built on a declaration that reality contradicts is a
bug with extra steps.

### Nesting is written where it nests

Four payloads nest, and they nest differently: the cart is cart → shipments → products with a
parallel calculation → validations → context; an offline order is order → products →
catalogProduct with a sibling list of rewards; an online order is order → products with
delivery and address beside them; the category tree is one shape recursing four levels deep
over 1009 nodes.

No shared indentation helper is introduced. The agreement that holds these four together is
in the spec — two spaces per level, spaces only — not in a function they all call. A function
that walks a nested structure and indents what it finds is the engine again, and it would
arrive with the same appetite for deciding things the command should have stated.

### The engine has dependents that are not commands

`gain` and `aliases` reach into `renderList`, `renderObject` and `renderPayload` directly, and
`table.ts` and `json.ts` take the engine's `Renderer` type and its `CELL` context. None of
these print a server payload; they report the CLI's own state, and their forms — aligned
pairs, tables, dash-marked records — stay.

They are decoupled first, before the last command group moves, so that deleting the engine is
a deletion and not a rewrite. `CELL` is nothing but infinite width plus a pass-through
resolver, so a cell mapper becomes a plain `(value: unknown) => string`.

### Failure that arrives inside a success

`add_or_update_certificates` answers `success: false` with the failure nested in
`added[].validations[]`, and its `summary` instructs the caller to re-read the cart. The cart
snapshot does the same in the other direction: `calculation.validations[]` carries `error`
entries inside a perfectly successful response, and `context` arrives as an empty array in one
entry and as an object in the next.

Validations are printed, never summarised away, and `exitOnFailure` keeps deciding the exit
code from `success`. A command that drops a validation because it is nested is worse than the
engine, which at least printed everything it found.

### Golden files, produced through the CLI

`test/golden.test.ts` imports renderer modules and calls them with an in-memory alias
resolver. Both disappear: with output composed inside the command there is no module to
import, and the resolver seam goes with the engine.

Each tool keeps a golden file, produced by feeding its captured payload to the fake daemon in
`test/harness.ts`, running the built CLI, and comparing standard output — the same machinery
`test/profile.test.ts` already uses, with `UPDATE_GOLDEN=1` retained. Aliases stay
deterministic because the table is cleared per file and `node --test` gives each file its own
process.

Hand-written assertions are reserved for what a golden file cannot say: that a field was
dropped on purpose. `profile.test.ts` spends 265 lines on four commands, which does not scale
to thirty-five; a golden plus two or three assertions per command does.

### Fixtures are captured when a group moves, not in advance

A payload is captured at the moment its group is worked on, through `silpo raw`, and turned
into a fixture then. Capturing all of them up front was tried and is not worth repeating: the
comparison of record shapes needed it once and is recorded above, and everything else it
produced was a payload that will be staler by the time its command is written than one taken
that day.

What is worth carrying forward from that capture is the set of arguments each tool actually
needs, since these cost most of the attempts:

- `get_products` answers 400 without a `category` or a `set`.
- `get_available_delivery_types` takes a latitude and a longitude, not a branch.
- `get_time_slots` reports every slot unavailable unless `start` is in the future, and a
  cart on a stale slot reports every product's stock as zero.
- `get_my_offline_orders` needs a branch, a delivery type and both slot bounds.
- `find_nova_poshta_settlements` takes `title`, and `find_address` takes `address`.
- Changing favorites needs `externalProductId` beside the product id.
- `update_shopping_cart` needs the address and the shipments copied out of the cart itself.

A fixture SHALL carry synthetic personal data. The account's real name, phone, email,
addresses, loyalty card and purchase history are replaced before a payload becomes a fixture,
as the profile fixtures already do.

Five lists are empty on this account and cannot be filled from here — coupons, coupon
details, personal promos, promo codes, certificates and replacements. Their fixtures come from
the `outputSchema` the server publishes in its `tools/list` answer, and they prove
that the command prints what it says it prints, nothing about the server. The `path[]` case
above is the reason to say so out loud.

## Risks / Trade-offs

- Thirty-five hand-written outputs drift into thirty-five dialects. → The style is written
  into the spec before the first group moves, and every command gets a golden file, so a
  drifting separator shows up as a diff.

- The compiler stops proving that every field of a payload is accounted for; a field added to
  a contract is simply not printed and no test fails. → Accepted, as it already was for the
  profile commands. The guard is a person reading a captured payload against its command's
  output, which is exactly the editorial pass each group is scheduled for.

- The editorial pass is the bulk of the work and cannot be hurried: thirty-five payloads read
  as text, each deciding what carries no information. → It is scheduled per group, and the
  saving is measured per group so a group that saves nothing is visible.

- Five fixtures are generated from a declaration that reality is known to contradict. → They
  are marked as such, and the commands they cover move last, so that a live payload replaces
  a generated one if the account ever grows one.

- Deleting the engine also deletes the only reader of `renderFlags` and `renderCostTiers`. →
  They move to value-conversion as converters by subject before the deletion, since the
  delivery slot output needs both.

## Migration Plan

One group at a time, each ending in a working CLI:

1. `products` — the shared product record and its envelope, four commands.
2. `np`, `branches`, `delivery` — flat payloads; `delivery` brings flags and cost tiers into
   value-conversion.
3. `orders` — first nesting, and the second sighting of the lite product record.
4. `cart` — deepest nesting, validations, and four confirmation payloads that carry almost
   nothing.
5. `catalog` — five category shapes and the 1009-node tree.
6. `loyalty` — seven unlike payloads, five of them on generated fixtures.
7. Decouple `table.ts` and `json.ts`, move `gain` and `aliases` off the engine, then delete
   `layout.ts`, `fields.ts`, `render/commands/`, the engine-side scalars and the alias
   resolver seam.

Rollback is per group: a group that has not moved still has its renderer module and the
engine still stands. After step 7 there is nothing to roll back to, which is why it is last.

## Open Questions

- Whether the cart and the category tree end up marking their nested items. The style permits
  a marker as long as one form covers the whole list, and which way those two read better is
  a question for the text in front of a reviewer, not one that changes the specs or the
  tasks.
