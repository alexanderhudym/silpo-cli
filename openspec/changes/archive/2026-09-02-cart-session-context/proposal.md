## Why

Nine catalogue tools need a branch, a delivery type and a time slot, and the only place those
values exist is the active cart. The CLI makes the caller fetch them and retype them: measured over
the 101 recorded benchmark runs, `--timeslot-start` is retyped between three
and eleven times per run, each occurrence carrying three sibling options, and every run that touches
the catalogue opens with `cart id` followed by `cart details`. That is the largest repeated cost in
the surface, and none of it is a decision the caller makes — it is bookkeeping.

The server has since made the same point itself. The MCP documentation now marks those nine tools as
requiring cart context, prescribes `silpo_get_my_shopping_cart` → `silpo_get_shopping_cart_by_id` →
`silpo_get_time_slots` as the session start, and adds `silpo_create_shopping_cart` for the case where
no cart exists. The reference web client works the same way: it reads the cart once per page load and
freezes the three values into every catalogue request, eight of them off a single read.

## What Changes

- **BREAKING** `cart id` is removed. The active cart is resolved without a command.
- **BREAKING** `cart details`, `cart add`, `cart remove`, `cart clear`, `cart update` and
  `cart certificates` lose their `<cartId>` argument.
- **BREAKING** Catalogue and product commands lose `--branch-id`, `--delivery-type`,
  `--timeslot-start` and `--timeslot-end`. The CLI supplies them from the cart.
- The background server resolves and reads the active cart before it accepts anything, holds it, and
  offers it through operations named for what they do to a cart rather than for the tools underneath.
  Every read confirms the held cart is still the active one and that its slot can be booked; the cart
  itself is re-read only when it was replaced or written. There is no second structure beside it: the
  branch, delivery type and time slot are read off the cart. Nothing is written to disk.
- A cart whose time slot has lapsed is repaired before use: the first slot the branch reports as
  available is written back, carrying the stored address through field for field.
- Where no cart exists, one is created from a saved delivery address without asking the caller.
- Adding more of a product than the branch holds is reduced to what it holds, and the reduction is
  reported. A line that cannot be reduced, because nothing is left or the branch does not carry the
  product, stays in the cart and is named.
- **BREAKING** Every command that changes the cart prints the cart that resulted: the server's
  summary first, the snapshot beneath it. The verification the server demands after a write stops
  being a second command, and the misleading echo of the requested quantity is dropped.
- `cart update` takes only what is being changed. The delivery type, the time slot, the address and
  the shipments become optional and are sent from the cart where the caller does not name them, so
  changing one setting stops meaning copying four others out of the cart by hand.
- The background idle timeout default rises from `5m` to `10m`, because it now bounds how long the
  cart the server holds is trusted.
- Calls the CLI makes on its own behalf are deliberately left out of token accounting; a command that
  renders more than one payload is recorded once, against their sum.
- The skill drops the context preamble that no longer applies, keeps the rule that products go into
  the cart in one call, and corrects two entries the server has since rewritten.

## Capabilities

### New Capabilities

- `cart-session`: the cart the background server holds for its lifetime — when it is read, how a
  command consumes it, how every write goes through the server, how a lapsed time slot is repaired,
  and how a missing cart is created.

### Modified Capabilities

- `shopping-cart`: cart commands no longer take a cart argument; every write closes on the cart it
  produced instead of a bare summary; adding products reduces a quantity the branch cannot fill and
  reports it; a line that cannot be reduced is named rather than removed; the address is carried
  through unchanged whenever the CLI writes the cart itself; a delivery settings update takes only
  the settings being changed.
- `product-search`: the requirement that delivery context be explicit is replaced by the requirement
  that it be supplied from the cart; the replacements entry is restated as picking risk rather than
  zero stock.
- `catalog-browsing`: category, tree, promotion and set listings take their context from the cart; a
  category the server marks as not visible is not browsed.
- `cart-identifiers`: removed in full. No command takes a cart, so no cart is named by a number and
  none is printed.
- `mcp-session`: the background server holds the cart alongside the tool session, and reads it before
  it serves anything.
- `cli-configuration`: the idle timeout default becomes `10m`.
- `token-accounting`: only payloads a command renders are recorded, a command that renders several is
  one record against their sum, and the calls the CLI issues for itself are stated as excluded.
- `agent-skill`: the cart-derived context preamble is replaced by a statement that the context is
  implicit, and the corrected replacements and category entries follow the server's current wording.

`typed-tool-client` is deliberately absent: its requirement already binds the CLI to one typed call
per tool in the recorded snapshot, so adding `silpo_create_shopping_cart` refreshes the snapshot
without changing the contract.

## Impact

- `src/commands/carts.ts`, `src/commands/products.ts`, `src/commands/categories.ts`,
  `src/commands/promotions.ts`, `src/commands/sets.ts` — arguments and options removed.
- `src/daemon/cart.ts`, `src/daemon/main.ts`, `src/daemon/protocol.ts`, `src/daemon/client.ts` — the
  cart lives here, and every read and write of it happens here.
- `src/mcp/tools/`, `src/mcp/silpo.ts`, `src/mcp/surface.ts` — one tool added.
- `src/config/settings.ts` — one default changed.
- `src/resolve/cart.ts`, `src/db/carts.ts` — cart aliasing loses its only consumer.
- `plugin/skills/silpo/SKILL.md` — the preamble and two entries.
- The recorded MCP contract — the server's current shapes differ from the recorded ones in ways this
  change depends on.
- No new dependencies.
