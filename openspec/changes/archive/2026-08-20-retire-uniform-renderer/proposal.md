## Why

The uniform renderer decides what to print by inspecting a payload's runtime shape and by
matching field names, so no command states its own output: 35 of the 39 tool-backed outputs
are a three-line call with no configuration. The four `profile` commands moved to composed
output and cut 40–69% of their tokens, almost entirely by dropping fields that carried no
information — a judgement the engine cannot make because it never knows what it is looking
at. The engine was left standing for the commands that had not moved, and this change moves
the last of them.

## What Changes

- The 35 remaining tool-backed outputs compose their own text, in eight groups: `products`,
  `np`, `branches`, `delivery`, `orders`, `cart`, `catalog`, `loyalty`.
- The composed form gets a written house style — `key: value`, one fact per line, an empty
  line between records, no width — so that 35 hand-written outputs do not become 35
  dialects. Today the style exists only as the shape of `src/commands/profile.ts`.
- Exactly one record is shared: `Product`, 15 fields, confirmed live in
  `silpo_get_products`, `silpo_find_products_batch`, `silpo_get_similar_products` and
  `silpo_get_my_favorites`, whose top-level envelopes are identical as well. Nothing else is
  extracted until a second tool is shown to return the same shape. Notably the five category
  shapes across four catalog tools are not one shape, and the engine's shared `category`
  renderer treats them as if they were.
- Nesting is solved per command. Four payloads nest — cart, both order histories, and the
  category tree — and they nest differently; no shared indentation helper is introduced.
- **BREAKING**: the text every command outside `profile` prints changes.
- `src/render/layout.ts`, `src/render/fields.ts` and `src/render/commands/` are deleted.
  `src/render/table.ts` and `src/render/json.ts` are decoupled from the engine's `CELL` and
  `Renderer`, and `gain` and `aliases` compose their own output, since both reach into the
  engine directly today.
- The alias resolver seam goes with the engine: commands call the shared alias converter at
  the site where they name the entity, so `AliasResolver`, `verbatimResolver`,
  `createMemoryResolver` and the uuid test lose their only callers.
- Tests move off the renderer modules: golden files are produced by driving the built CLI
  through the existing harness, as the `profile` tests already do.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `output-rendering`: the uniform object/list/per-field layout requirements are removed; the
  composed form gains a stated house style; the label-and-value, table and record-list forms
  for the CLI's own state stay and stop depending on the engine.
- `product-search`: the four product listings state their output, and the one shared product
  record is stated once.
- `catalog-browsing`: category listings, the category page and the category tree state their
  own output, each from its own shape.
- `shopping-cart`: the cart snapshot and the four confirmation payloads state their output,
  including validations that arrive inside a successful response.
- `stores-and-delivery`: the store listing, address resolution, delivery types, delivery
  slots and both Nova Poshta lookups state their output, replacing the requirement that they
  print nothing.
- `user-account`: the order histories and the loyalty commands state their output, and the
  account-output requirement stops splitting commands into composed and uniform.
- `value-conversion`: boolean flag groups and delivery cost tiers become shared converters
  by subject, since they exist today only inside the engine's scalar renderers.

## Impact

- Code: `src/render/` reduced to the forms for the CLI's own state; all eight command
  modules under `src/commands/` rewritten in their output half; `src/aliases.ts` reduced;
  `src/commands/gain.ts` and `src/commands/aliases.ts` rewritten in their output half.
- Tests: `test/golden.test.ts` re-pointed at the CLI harness; `test/layout.test.ts` and the
  resolver tests removed with their subjects; fixtures added for 23 tools captured live,
  and for five tools whose lists are empty on this account, generated from the server's own
  `outputSchema`.
- Docs: the measured savings per group are worth recording as they land.
