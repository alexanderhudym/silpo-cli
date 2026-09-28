## Context

See proposal.md — Why. Three facts from measuring the repository fixtures with the same tokenizer `gain` uses (`o200k_base`) shape the design:

| fixture | raw JSON | layout only | + aliases | + `common` |
|---|---|---|---|---|
| `cart-details` | 1199 | 1152 | 855 | **806** |
| `orders-offline` | 1622 | 1648 | 1305 | **1305** |
| `products-batch` | 471 | 473 | 337 | **319** |

Layout on its own is worth nothing — JSON's braces and quotes cost about what indentation and newlines cost. Aliasing uuids is worth 20–28%, hoisting shared fields another 0–6%. A fourth lever, dropping fields that carry nothing (`image`, `receiptUrl`), is worth another 30% but is deliberately out of scope here.

**Measured after implementation** (`o200k_base`, every golden fixture, JSON payload → printed text):

| fixture | before | after | |
|---|---:|---:|---:|
| `cart.details` | 1199 | 794 | −34% |
| `orders.offline` | 1622 | 1305 | −20% |
| `products.batch` | 471 | 319 | −32% |
| `branches.branches` | 471 | 255 | −46% |
| `catalog.categories` | 312 | 127 | −59% |
| `delivery.slots` | 368 | 215 | −42% |
| `loyalty.premium` | 422 | 236 | −44% |
| `np.settlements` | 188 | 101 | −46% |
| `profile.family` | 341 | 163 | −52% |
| `profile.profile` | 94 | 55 | −41% |

The three fixtures that existed before the change beat their predictions (806 → 794, 319 unchanged, 1305 as predicted) because the retained value shortening now applies everywhere: timestamps print as local wall clock and coordinates lose their trailing zeros in every payload, not only in the commands that used to declare those mappers.

Constraints in the existing code:

- `aliases` is keyed `UNIQUE (entity_type, entity_field, field_value)` with a globally unique handle, and `encodeAlias` numbers handles from the row id. Nothing about the key needs to change; what changes is that call sites stop inventing the pair themselves.
- Today aliasing is two-phase: the command calls `ensureAliases(...)` and the renderer's `aliasMapper` calls `getAlias(...)`. Forgetting the first phase silently prints a raw uuid.
- `renderPairs`, `renderTable`, `renderRows`, `renderTitle` are used by local commands (`auth`, `config`, `server`, `gain`, `aliases`) as well as by MCP ones. Only the MCP call sites go away.

## Goals / Non-Goals

**Goals:**
- One layout that renders any MCP payload, however nested, with no per-command layout code.
- A uuid maps to one alias, globally, structurally — not by every command remembering to pass matching strings.
- Renderers are pure functions of payload plus an alias resolver, so a fixture and an expected text file are a complete test.

**Non-Goals:**
- Per-command field selection, key renaming, and value shortening. Every field the payload carries is printed. This is the next change.
- Aliasing anything but uuid-shaped values. Slugs are the obvious next candidate (60+ characters, and they are accepted as input) but stay verbatim for now.
- Local commands. `auth`, `config`, `gain`, `server`, `aliases`, `raw` keep their current output and their primitives.
- Choosing a cheaper form for flat homogeneous lists. A table costs about 30% fewer tokens than `key=value` rows for a payload like `branches` (344 vs 508 on an eight-row sample); the uniform rule is taken knowingly and revisited per command later.

## Decisions

### Objects: pairs packed to 90 columns, longest last

A scalar field renders as `key=value`. Pairs join with two spaces and fill lines up to 90 columns **including the indentation**; the next pair starts a new line at the same indent. Pairs sort by rendered length ascending, so the long ones land at the end and the short ones pack densely.

Two spaces rather than one because values contain spaces themselves (`name=Молоко Holland Jersey`) and a single space makes the boundary between pairs unreadable.

A value longer than the line budget takes a line of its own and overflows it; it is never wrapped mid-value and never truncated. Truncation loses data an agent may need, and shortening is the next change's job.

Nested objects and lists render after all the scalars of their node: the key alone on its own line, contents indented two spaces. Alternative considered and rejected: flattening scalar-only nested objects into `timeslot.start=…`. It saves a line but introduces a second syntax for the same relationship.

### Lists: one field order for the whole list

An item renders as `#N` followed by its object body. The marker is padded to the width of the widest marker in that list (`#1 ` next to `#10`), so item bodies start in the same column. Continuation lines align under the body, not under the marker.

The field order is computed **once per list** — by the longest rendered pair per key across all items — and applied to every item. Computing it per item makes the same key land in different positions in neighbouring items, which destroys column scanning and makes diffs between two runs noisy.

One blank line separates items. Measured on a flat list it costs nothing, because after the shared-field hoist and the unified order almost no item is a single line.

### The `common` section

When a list has two or more object items, fields whose rendered value is identical in **every** item move to a `common` section at the head of the list, and disappear from the items:

```
     products
       common
         catalogProduct
           stock=0  companyId=@aba  available=false  branchId=@abama

       #1 unit=0,46л  price=54.99  quantity=2  lagerId=985026
          catalogProduct
            step=1  id=@aal  price=81.99  weighted=false
```

Rules:

- The intersection recurses **through nested objects** and mirrors their structure, so the section reads as a skeleton the reader merges back into each item. It does **not** recurse through nested lists — the intersection of lists of different lengths is not defined, and a nested list gets its own `common` when the renderer reaches it.
- A nested object must be present in **every** item for its fields to be considered. If one item lacks it, nothing hoists from it. The looser rule ("hoist from the items that carry it") was measured at 65 tokens on `orders-offline` and rejected: a `common` entry that only applies to some items is confusing.
- A field missing or null in any single item blocks that field. Null values are not printed at all, so an absent field and a null field are the same case.
- The literal header `common` is required. Without it, a hoisted nested key under a list container is indistinguishable from a nested object belonging to the container itself.
- If every field of every item is common, the items print as bare `#1`, `#2` markers with no trailing whitespace. Honest, and it keeps the rule free of exceptions.

The section is data-dependent by nature: three cart products that all happen to have `quantity=1` hoist it, and a fourth product with `quantity=2` pushes it back into the items.

### Alias registry: one constant per entity

Aliasing keys off a constant that pairs the entity with its canonical field, exported from one module and used by every renderer:

```ts
export const BRANCH  = { entity: "branch",  field: "branchId" } as const;
export const COMPANY = { entity: "company", field: "companyId" } as const;
export const PRODUCT = { entity: "product", field: "id" } as const;
```

The constant identifies **the entity, not the occurrence**. A product uuid arrives as `productId` in `CartProduct` and `ReplacementGroup`, and as `id` in `Product`, `ProductDetails`, `ProductLite`, `OrderProduct`, and `OfflineCatalogProduct`; all of them resolve to `PRODUCT`. A constant per occurrence would reintroduce exactly the duplicate-handle problem this registry exists to prevent.

Resolution needs two tables, both small and without repetition:

1. Key names that are unambiguous across the whole API: `branchId`, `companyId`, `productId`, `parentId`, `profileId`, `orderId`, `subscriptionId`, `polygonId`, `shoppingCartId`.
2. The entity of the node itself, for the bare `id` key — it means a different entity in each of the 23 types that carry it. The per-command renderer declares it when it renders a node, since it already knows the shape it is rendering.

Entities and the keys their uuid arrives under: `branch`/`branchId`; `company`/`companyId`; `product`/`productId`, `id`; `cart`/`id`, `shoppingCartId`; `shipment`/`id`; `address`/`id`; `category`/`id`, `parentId`; `order`/`orderId`; `profile`/`id`, `profileId`; `child`/`id`; `pet`/`id`; `npSettlement`/`id`; `npOffice`/`id`; `premiumFeature`/`id`; `premiumSubscription`/`id`, `subscriptionId`; `promoCode`/`id`; `polygon`/`polygonId`.

Only values matching the uuid shape are aliased. Numeric ids stay verbatim — `filId`, `lagerId`, `memberId`, `externalProductId`, `externalId`, and the numeric `id` of certificates, coupons, and promos are short enough that a handle saves nothing.

Alternative considered: dropping the entity from the key and keying the alias on the uuid alone, since a uuid is globally unique by construction. It makes divergence impossible rather than merely prevented, but it requires a schema change and loses the entity label that makes `aliases` listings and input validation legible. The registry gets the same guarantee as long as it stays the single source of truth.

### Aliasing happens inside the render pass

The renderer walks every value anyway. When it meets a uuid under a known key it asks the resolver for a handle, creating one if needed, and prints it. The `ensureAliases` pre-pass in commands disappears, and with it the failure mode where a forgotten pre-pass leaks a raw uuid.

To keep renderers pure and testable, the resolver is a parameter: `(constant, uuid) => handle`. Production passes the sqlite-backed one; golden tests pass an in-memory map so no database is touched and handles are deterministic.

### Aliases on the way in

The rendered output no longer contains a single uuid, so every path that accepts a uuid must accept a handle, or the read-then-write cycle breaks:

```
silpo cart add @aal --products '[{"productId":"@abb","companyId":"@aba","branchId":"@abama","quantity":1}]'
```

- Scalar options that carry a uuid (`--branch-id`, `--company-id`, `--product-id`, `--parent-id`, and the cart id arguments) get the registry constant through `fromAlias`, which loses its `field` parameter.
- JSON arguments are walked recursively after parsing: any string that is an alias is replaced by the uuid it stands for, keyed by the constant its key name maps to. Keys that map to no constant are left alone.
- An alias that resolves to nothing fails the command before the call goes out, naming the entity it was looked up under.

### Renderer modules

One file per MCP command file under `src/render/commands/`, exporting one function per subcommand: `search`, `batch`, `details`, … Each is `(payload, resolver) => string`, and the command file imports the module as a namespace (`import * as render from "../render/commands/products.js"`), so the module itself is the record and no name collides with the commander object the command file already calls `products`.

That shape makes the test a loop: for every `test/fixtures/<command>.<sub>.json` render with a fixed in-memory resolver and compare with `test/expected/<command>.<sub>.txt`. Adding a command means capturing a fixture with `silpo raw` and snapshotting the expected text.

A renderer passes the layout the entity of each node that carries a bare `id`, keyed by the field the node arrives under — `{ cart: CART, shipments: SHIPMENT, products: PRODUCT }` — plus `entity` for the root node when the root itself carries one. An undeclared node has no entity, so its bare `id` prints unchanged; entities are never inherited from a parent node, which would silently alias one entity's uuid as another's.

`summary` and `meta` stop being special. They are ordinary fields of the payload object and print as `summary=…` and a nested `meta` block, which is why `summary.ts` and `pagination.ts` go away.

### Value shortening stays, keyed by field name

The output-rendering spec keeps its coordinate, timestamp, flag-object and cost-tier requirements, so the layout carries them rather than each command declaring them. `values.ts` holds a table from field name to mapper — `latitude`/`longitude` round to six decimals, `constraints` lists only the raised flags, `deliveryCostMap` spells out its tiers — and every string value passes through whitespace collapsing plus the timestamp conversion, which leaves anything that is not an absolute instant untouched. That is why the numbers above beat the estimates: shortening now reaches payloads that never had a mapper declared.

One field selection survives too: `user-account` requires the profile id to be held back unless `--with-id` is passed, so `profile` takes that flag and drops the key before rendering. It is the single exception to printing every field the payload carries.

## Risks / Trade-offs

- **Flat homogeneous lists get more expensive.** `branches` costs about 30% more than the current table. → Accepted for now; the follow-up change picks a cheaper form per command, and `gain` will show exactly where it hurts.
- **Output shape depends on the data.** Whether a field is hoisted into `common` changes with the values in the payload. → Fixtures must cover both a list that hoists and one that does not; the golden tests are the guard.
- **Deep nesting eats the line budget.** At four levels the content column is down to about 78 characters and long values overflow. → Accepted; the field-selection change removes most of the offenders (`image` URLs are the worst).
- **A handle of the wrong entity.** Passing a product handle to `--branch-id` looks up the handle under `BRANCH` and fails there, which is the right outcome, but the message must say which entity it looked under or it will read as "alias does not exist".
- **Existing handles are invalidated.** Company ids move from `(branch, companyId)` to `(company, companyId)`, so the same uuid would get a second handle. → One `silpo aliases clear` before the first run; no migration code, and the table is a local cache.
- **Alias expansion inside JSON is key-name based.** A uuid under a key the registry does not know stays a uuid, and a handle under such a key fails to resolve. → The registry covers every uuid key in `src/mcp/entities`; a new tool's new key name needs a registry entry, and the golden test for that command will show a raw uuid if it is missing.

## Migration Plan

1. `layout.ts` and `aliases.ts` with unit tests, no command touched yet.
2. Alias expansion on input, so writes keep working once uuids vanish from the output.
3. Convert commands one file at a time — `branches` first (it exercises the alias registry and had a summary and pagination block), then `cart` and `orders` (deepest nesting), then the rest.
4. Delete `summary.ts`, `pagination.ts`, and their tests once no MCP command imports them.
5. `silpo aliases clear` is documented in the README as a one-time step.

Rollback is per command: a renderer file can go back to `JSON.stringify(payload)` without touching the layout or the registry.
