## Why

The CLI mints a local number for every remote identity it sees, keeps the mapping in a sqlite file,
and translates back on the way out. It was bought to save tokens, and it does — around a third of a
listing's output. What it costs is a translation layer between the caller and the server that has to
be right in six entity families at once, and it keeps being wrong in a new place: a category uuid the
table happens to hold resolves while one it does not silently fails, a branch number sends the CLI
for a 455-row listing mid-command, and two resolvers invent a delivery context out of nothing —
`Unknown` for a category, `SelfPickup` for a product — because a lookup needs one and has none.

The saving is also smaller than it looks. Against the raw payloads the CLI replaces, printing every
identifier as the server gave it costs about 8 500 tokens across the whole expected-output corpus,
where one uncompressed `get_categories` call is 75 000. The two mechanisms that carry the real
saving — `key: value` instead of JSON, and hoisting a field every row shares into `common` — are
untouched by this change.

With the identifiers gone, sqlite has no second reader but the token ledger behind `silpo gain`, and
that ledger has been overstating its own result: `recordCall` counts only the tools a command hands
it, never the two cart reads every command makes, never the paged branch listing a resolver triggers,
never the per-slug category lookups. Both go, and the CLI keeps no state on disk but its tokens and
its configuration.

## What Changes

- **BREAKING** Every identifier is printed as the server gave it. A product carries its uuid, its
  slug and its `externalProductId` where the payload has one; a branch, a company, a cart, a Nova
  Poshta settlement or office carries its uuid; an order, a certificate and a coupon carry whatever
  the payload names them by.
- **BREAKING** A category is printed and taken by its slug alone. It is the only form
  `silpo_get_category` and the `category` filter accept, and a uuid there returns `success: true`
  with an empty list rather than an error.
- **BREAKING** `silpo categories list --parent-id` is removed. The underlying parameter takes a
  category uuid, which nothing else about a category accepts, and `silpo categories tree` already
  gives the whole hierarchy in one call.
- **BREAKING** `silpo gain`, `silpo gain calls` and `silpo gain clear` are removed, with the call
  ledger behind them.
- **BREAKING** A Nova Poshta office no longer fills its own coordinates into a cart address. The
  caller passes `latitude` and `longitude`, which `silpo np offices` prints.
- The sqlite database is removed outright — ten tables, the file at `~/.silpo/silpo.db`, and the
  `node:sqlite` dependency.
- The resolvers are removed, and with them the two invented delivery contexts and the branch listing
  a resolver could trigger.
- A category listing that comes back empty is printed as empty. The extra `silpo_get_category` call
  that turned an empty listing into an error goes with the resolver it depended on.
- The skill loses its `Ids` section and gains the corrections listed under Impact: six statements
  that contradict the code or each other, and nine facts stated twice.
- `test/skill.test.ts` is removed. It checks that the skill names every command and every option,
  which is worth having, but it has never caught a wrong statement and the six contradictions it sat
  beside prove the check does not reach the thing that goes wrong.

## Capabilities

### New Capabilities

None.

### Removed Capabilities

- `product-identifiers`, `category-identifiers`, `store-identifiers`, `order-identifiers`,
  `address-identifiers`, `nova-poshta-identifiers`: the local numbering these describe stops
  existing. Nothing replaces them; a remote identity is printed and taken as it stands.
- `token-accounting`: the ledger and the three commands over it.

### Modified Capabilities

- `output-rendering`: an identifier is printed in the form the server gave it, and a record may carry
  more than one form.
- `command-input`: an argument that names an entity is the entity's own identifier, never a number
  the CLI issued.
- `catalog-browsing`: a category is named by slug; the parent filter is gone; an empty category
  listing is an empty listing.
- `product-search`: a product record prints every identifier its payload carries.
- `shopping-cart`: the products of a cart write are named by uuid, and the cart's own lines print
  their uuid and slug.
- `stores-and-delivery`: an office does not supply the coordinates of a cart address.
- `user-account`: an order, a receipt line, a certificate and a coupon print the identifiers their
  payloads carry, including a receipt line that carries no catalogue handle at all.
- `agent-skill`: the skill stops describing a numbering that no longer exists, and stops
  contradicting the CLI in six places.

## Impact

- `src/db/` — removed, ten files.
- `src/resolve/` — removed, six files.
- `src/commands/gain.ts` — removed; `recordCall` removed from 53 call sites across eleven command
  files.
- `src/config/paths.ts` — the database path.
- `src/commands/carts.ts` — cart writes take uuids; the office coordinate fill goes.
- `src/commands/categories.ts` — `--parent-id` goes, the hidden-category refusal goes, the tree keeps
  its slug-to-title join against the flat listing.
- `src/commands/products.ts`, `branches.ts`, `np.ts`, `orders.ts`, `profile.ts`, `loyalty.ts`,
  `delivery.ts`, `promotions.ts`, `sets.ts` — identifiers printed as received.
- `plugin/skills/silpo/SKILL.md` — the `Ids` section, the `gain` entries, the nil-uuid gotcha, the
  office-coordinate promise, and these six corrections: the stale-cart gotcha that contradicts both
  the header and the code; `cart details` described as never changing the cart when the slot repair
  writes; "does not invent a cart" against the mid-session reopen; "the server picks house" for an
  address type the CLI picks, and only when opening; the error list that omits `no branch` and
  `no company`; and "no command takes them" against `orders offline`.
- `README.md` — the measured token table, the command counts, the `gain` example and the claim about
  the skill test are removed, so that the file stops needing an edit for every change.
- `test/` — `calls`, `identifiers`, `records`, `products-db`, `store` and `skill` removed;
  `category` and `product` reduced to what survives; 30 of 43 expected outputs regenerated.
- No change to the MCP tools called, to the daemon protocol, or to how the cart is read.
