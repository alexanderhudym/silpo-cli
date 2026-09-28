## Why

The CLI names entities two different ways at once. Branches, companies, products and categories
carry a local number drawn from a table of their own; carts, orders, addresses and Nova Poshta
places carry a word handle drawn from one shared polymorphic table. The alias half costs a
14 375-word list, a recursive rewriter that walks every JSON argument, and a whole command tree,
and it buys nothing the local number does not: a number is shorter to print, restarts small
because each entity counts its own, and is resolved by the table that issued it.

The alias half is also mostly dead. Of eleven declared alias entities, five are never used,
one is a phantom whose handle is never assigned, and the live database holds exactly one alias
row. Meanwhile an office handle is printed but cannot be typed back, because the field map that
resolves a cart address never listed it.

## What Changes

- **BREAKING** Every remaining aliased entity is named by a local number from a table of its
  own: cart, online order, saved address, Nova Poshta settlement, Nova Poshta office. Handles
  such as `@aal` stop being printed and stop being accepted.
- **BREAKING** `silpo aliases` and its `get`, `remove` and `clear` subcommands are removed.
  Nothing replaces them in this change.
- The Nova Poshta office table records what a later command needs to build a delivery address —
  its coordinates, title, address, type and number — so an office can be named by one number
  instead of copying six fields.
- A cart address accepts an office by its local number under `officeId`, closing a gap where the
  printed handle could not be typed back.
- Identifier resolution moves out of the shared option reader and into the command that needs
  it. The recursive walk over JSON arguments, the field-to-entity maps and the branch context
  threaded through them are removed; a command resolves the fields it knows about directly
  before it calls the tool.
- Resolvers stop taking a `Command` and stop deciding how a failure is presented: they throw,
  and the single handler already wrapping `parseAsync` reports it.
- The branch and company tables get a module each, matching how every other entity is stored.

## Capabilities

### New Capabilities

- `cart-identifiers`: how a cart is recorded and how a local number or a uuid names one
- `order-identifiers`: how an online order is recorded and named
- `address-identifiers`: how a saved delivery address is recorded and named
- `nova-poshta-identifiers`: how a settlement and an office are recorded, what an office record
  keeps for building a delivery address, and how each is named

### Modified Capabilities

- `id-aliases`: every requirement is removed; the capability ceases to exist
- `command-input`: short ids in arguments are local numbers and uuids only; the marker `@`
  carries no meaning; a JSON argument is resolved by the command rather than by a field map
  walked over the whole structure
- `value-conversion`: the alias conversion is removed; converters that resolve an identifier
  report failure by throwing rather than by naming a presentation
- `output-rendering`: an entity is printed under its local number, never under a handle
- `shopping-cart`: the cart is printed and accepted by local number, and a cart address accepts
  a Nova Poshta office by local number
- `user-account`: an online order and a saved address are printed by local number
- `stores-and-delivery`: settlements and offices are printed by local number

## Impact

Removed: `src/db/aliases.ts`, `src/db/wordlist.ts`, `src/utils/alias.ts`,
`src/commands/aliases.ts`, the `aliases` table, `test/alias.test.ts`, `test/aliases.test.ts`.

Reworked: `src/commands/options.ts` loses `readAlias`, `readAliases`, `IdField`, `IdFields`,
`expandIds`, `branchWithin` and the `fields` parameter of every JSON reader; `src/db/stores.ts`
splits; `src/commands/store.ts` splits; `src/commands/cart.ts` is renamed so the singular name
is free for its resolver; `src/mcp/entities/cart.ts` gains the `officeId` the server returns.

Touched for resolution or printing: `carts`, `orders`, `np`, `profile`, `products`, `branches`,
`catalog`, `delivery`, `raw`.

The stored database is disposable, so no migration path is provided: an existing `silpo.db`
keeps its unused `aliases` table until the file is removed.
