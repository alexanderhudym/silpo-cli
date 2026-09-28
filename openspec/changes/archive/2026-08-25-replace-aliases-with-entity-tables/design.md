## Context

See proposal.md — Why.

Two facts about the Silpo MCP shape this design, both established by probing the live server
rather than by reading its declared schemas, which are permissive where the prose is strict.

A Nova Poshta cart address needs four fields and no more: `addressType`, `latitude`,
`longitude`, `officeId`. Omitting the coordinates fails the call with 400. Omitting `city`,
`region` and `street` succeeds with no complaint and the server does not fill them in, so they
are cosmetic. A bogus `officeId` is accepted by the call — `success: true` — and surfaces later
as a `delivery.nova_poshta.office.not_found` warning inside the cart's `calculation.validations`,
which the update response does not carry at all. The server also returns `officeId` in the cart
address, a field the recorded `CartAddress` type is missing.

`get_product_details` accepts a slug, a uuid or a numeric external id in its `slug` parameter,
despite prose insisting the value must be a slug. It answers for products that are absent from
the requested branch, returning the identity with `branchId` zeroed and `available: false`.

## Goals / Non-Goals

**Goals:**

- One way to name an entity across the whole CLI: a local number from that entity's own table.
- Identifier resolution readable at the point of use, so that adding a field to a command means
  writing the resolution next to it rather than registering it with machinery elsewhere.
- Every table column earns its place by being needed later, not by being printed now.

**Non-Goals:**

- A replacement for `silpo aliases` that lists local numbers. Wanted, deferred.
- Resolving a product by a bare external id. The local table is authoritative for numbers;
  a number it never issued is not silently reinterpreted.
- Naming a saved address or an order as an argument. No tool accepts either, so both are
  recorded and printed but never resolved.
- Surfacing cart validations after an update. Real gap, unrelated to naming.
- Any migration of an existing `silpo.db`.

## Decisions

### Try to resolve, do not classify

Only a uuid is identifiable by its shape. Everything else is settled by looking, in order, and
moving on when the answer is empty rather than by deciding in advance what the input must be.

The local table is authoritative for local numbers: a number it issued is that entity, and a
number it never issued is not a local number at all, so the input passes to whatever lookup the
entity has. This is why the ambiguity between a local number and a numeric natural key — an
order's receipt number, an office's `Відділення №`, a product's external id — needs no
tie-breaking rule. Numbers we issued win because they exist; the rest never enter the contest.

Alternative considered: classify the input by shape first, then dispatch. That is what
`readProduct` does today, and it is why a numeric input that misses the table gives up without
trying the server. Rejected — the classification is guesswork about a namespace we do not own.

### Resolution lives in the command

The recursive `expandIds` walk, the `IdField` union and the field-to-entity maps are removed.
A command parses its JSON argument and resolves the fields it knows about directly.

The machinery exists to serve four call sites — `cart add --products`, `cart remove --products`,
`cart update --shipments`, `products favorites --actions` — plus `officeId` inside
`cart update --address`. Every one is a flat array of flat objects, or a single field on one
object. No command passes a nested structure; the only nesting the walker handles is exercised
by a test.

The walk also costs type safety: it returns `unknown` and every call site casts. Building the
payload field by field lets the tool's argument type check the result instead.

`branchWithin`, which scans an object's sibling fields to give a product lookup its branch
context and threads that context down the tree, disappears with it — the branch is a local
variable one line above the product it belongs to.

Alternative considered: keep the walker and register the new entities with it. Rejected — it
would grow a case per entity to serve structures that stay flat.

Within one JSON argument, distinct branch and company ids are resolved first and the products
after them, concurrently. Resolving the branches first means a cold branch table is filled once
rather than once per concurrent miss, without holding any memoized state.

### Resolvers throw

A resolver takes no `Command` and does not decide how its failure is presented; it throws.
`main` in `cli.ts` already wraps `parseAsync` in a handler that writes the message and exits 1,
and `parseAsync` propagates a rejected async action, so no command needs a `try`/`catch` of its
own. The handler gains the `error: ` prefix that `fail` used to add.

What is lost is the `--help` hint that `showHelpAfterError` appends to a `command.error` call.
An unresolvable entity is not a syntax mistake, so the hint was noise there.

### A table per entity, a module per table

`carts`, `orders`, `addresses`, `np_settlements`, `np_offices` are added; `stores.ts` splits
into `branches.ts` and `companies.ts`. A company is its own entity even though it is only ever
discovered through a branch listing, so it gets its own table and its own module rather than
sharing one with branches.

Each module owns its own way of filling itself, including the branch listing sweep that both
branches and companies use. The duplication is accepted; the sweep is not memoized.

Columns are decided by what a later command needs, not by what the printing command shows.
A printer already holds the payload, so copying it into the database serves nothing.

- `carts`, `orders`, `addresses`, `np_settlements`, `branches`, `companies`: `id`, `remote_id`.
- `np_offices` additionally keeps `latitude`, `longitude`, `title`, `address`, `type`, `number`,
  because a cart address is built from them after the office listing is long gone. `status` is
  not kept: it is printed from the payload and never needed again.

An office's `number` and an order's receipt `number` are stored and printed but never resolved,
by the rule above.

### Naming: plural commands, singular resolvers

Where a CLI command and a resolver exist for the same entity, the command file is plural and
the resolver file is singular — as `products.ts` and `product.ts` already are. `commands/cart.ts`
is renamed to `commands/carts.ts` so `cart.ts` is free for the cart resolver, and
`commands/store.ts` becomes `branch.ts` and `company.ts`. No new directory is introduced;
resolvers stay in `src/commands/` where `product.ts` and `category.ts` already live.

### Ordering

The tree must build at every step, so aliases are removed last: tables and resolvers first, then
the four JSON call sites rewritten onto them, then `aliases.ts`, `wordlist.ts`, `utils/alias.ts`
and `commands/aliases.ts` deleted once nothing imports them.

## Risks / Trade-offs

**A local number no longer fails loudly when it names the wrong entity.** `@aal` was unique
across every entity, so passing a cart handle where an order was wanted said so. `12` is a
valid cart and a valid order, and the wrong one resolves to a real uuid. → The same has been
true for branches, companies, products and categories since they moved to local numbers, and a
caller reads the number from the line that names its entity. Not mitigated further.

**Resolution coverage becomes a per-command discipline.** The walker could not forget a declared
field; a command can. → Building the tool's argument object field by field makes a missing field
a type error rather than a silent passthrough, which is stricter than the cast it replaces.

**A bogus office survives the update call.** The server answers `success: true` and reports the
problem only in a later cart snapshot. → Out of scope, and unchanged by this work: resolving
`officeId` from a local number makes a bogus value less likely to be typed in the first place.

**Duplicate branch sweeps.** Five commands each carry their own copy, and nothing remembers that
a sweep already ran. → Resolving distinct branches before products keeps one command run to one
sweep; across runs the CLI is a fresh process anyway.

## Migration Plan

None. The database is disposable and nothing else reads it. An existing `silpo.db` keeps an
`aliases` table that no code opens; removing the file is the only cleanup and is never required.
