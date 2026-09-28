## Context

See proposal.md — Why. This section records only what the schema survey found, because every decision below rests on it.

The `tools/list` snapshot was taken 2026-08-19 from `silpo-mcp-service 1.108.0`:

| Property | Value |
|---|---|
| Tools | 39 |
| Tools carrying an `outputSchema` | 39 |
| Output properties, all tools | 529 |
| Input properties, all tools | 126 |
| `$ref`, `oneOf`, `allOf` | 0 |
| `anyOf` | 148, every one of them `[T, null]` |
| `enum` | 12, all on inputs |
| Max nesting depth | 7 |

Structural deduplication across all 39 output schemas found only five repeated shapes:

| Shape | Properties | Tools |
|---|---|---|
| Product | 18 | `get_products`, `find_products_batch`, `get_similar_products`, `get_my_favorites` |
| SpecialPrice | 3 | same four, nested inside Product |
| `meta` as `{limit, offset, total}` | 3 | branches, categories, products, favorites, online orders, offline orders |
| `meta` as `{total}` | 1 | np_offices, promo_codes, similar_products, time_slots |
| The whole `get_products` envelope | 25 | `get_my_favorites` returns an identical envelope |

Everything else is used by exactly one tool. Two further `meta` shapes exist and are one-offs: `{totalProducts, totalQueries}` on `find_products_batch` and `{maxSelect, minSelect, total}` on `get_my_promos`.

Three schema gaps, all on payloads the schema declares as an object with no properties:

- `silpo_get_shopping_cart_by_id` → `cart`, described only as "Full shopping cart object from API"
- `silpo_update_shopping_cart` → `address`, described only as "Full address object"
- `silpo_get_categories_tree` → `tree[]`, recursive and therefore inexpressible in the declared schema

A fourth candidate is not a gap: `silpo_get_product_details` → `product.attributes` is a legitimate `Record<string, string | …>` map.

The divergences recorded in the hand-written contract were checked against the schema and are **behavioural, not structural**. `limit`/`offset` declared but not honoured, `meta.total` reporting the truncated page rather than the true total, `deliveryType: "B2B"` appearing in output but absent from the input enum, an invalid id producing a raw error string instead of a `{success: false}` body — none of these change a field's presence or type. For `silpo_list_branches` and `silpo_get_my_delivery_addresses` the schema's field names and order match the hand-written contract exactly; only nullability differs, and the schema is the more permissive of the two.

`tsconfig.json` sets `strict` and `noUncheckedIndexedAccess` but not `exactOptionalPropertyTypes`. Existing call sites build argument objects like `{ category: options.category }` where the value is `string | undefined`; without `exactOptionalPropertyTypes` those assign cleanly to `category?: string`, so migrating a call site is a one-line change rather than a rewrite. `verbatimModuleSyntax` is on, so type-only imports must be written as `import type`.

## Goals / Non-Goals

**Goals:**

- A typed surface whose shape a reader can predict from a tool name without opening a registry.
- Types traceable to a committed declaration, so "why is this nullable" always has an answer.
- A migration that can stop cleanly after any step and leave the CLI working.

**Non-Goals:**

- Completeness in one pass. The 39 tools are migrated in slices; untouched commands keep using `runTool` until their slice lands.
- Modelling the divergences in the type system. `limit` being ignored by the server is documentation, not a type.
- Validating tool arguments that arrive as shell input. Enum-valued flags are cast at the command boundary, not checked; the server is the authority on what it accepts, and it returns `deliveryType` values absent from every declared input enum.

## Decisions

### Hand-written types, no generator

The schema is generator-friendly — flat draft-07, no `$ref`, `anyOf` that collapses mechanically to `T | null`. A generator was considered and rejected.

Rationale: the tool set is closed and small, and the three schema gaps plus the Product/ProductLite nullability split need human judgement that a generator would have to be taught. A generator would also have to live in the repository and be run by hand anyway, since adding Python to `npm run build` is a worse trade than writing 529 properties once. The committed snapshot preserves the benefit a generator would have given — a diffable declaration to check drift against.

Cost accepted: roughly 1300–1600 lines written by hand, and a manual step whenever the server changes.

### One file per tool, one file per entity

`src/mcp/entities/` holds domain types; `src/mcp/tools/` holds one file per tool containing that tool's argument type, result type, and call function.

Alternatives considered:

- *Argument and result types inside the entity file.* Rejected: `product.ts` would then own four tools' envelopes, and the file becomes a mixed bag of domain type and call surface.
- *A single `tools.ts` with all 39 pairs.* Rejected: one 700-line file that every command imports from.

The objection to a file per tool was duplication: `get_my_favorites` and `get_products` return byte-identical 25-property envelopes, which would appear twice. Once `Product` and `PageMeta` are entities, each envelope is three lines, so the duplication is trivial and the two files stay independently readable.

A tool file holds that tool's name, argument type, and result type, and nothing that knows how a call travels — see the transport decision below. `src/mcp/silpo.ts` re-exports them, so one file still describes one tool. Command code calls `silpo.getProducts(args)` against the mapped surface, which yields the requested shape without an object literal listing 39 members.

Sub-shapes used by exactly one entity live in that entity's file. Entities that always travel together are grouped: `nova-poshta.ts` holds settlement and office, `family.ts` holds the family and its members, children, and pets.

### Nullability from the schema, not from observation

Where the two sources disagree the schema wins. `profile.firstName` is `string | null` in the schema and `string` in the recorded contract, because live sampling only ever saw a value.

Rationale: the MCP session already validates every result against the server's declared output schema. A type narrower than what that validator accepts is a type the runtime can violate without anything noticing — precisely the failure mode this change exists to remove. The recorded contract's narrower shapes describe one account on one day.

Consequence: roughly 148 fields become nullable and command code has to handle it. That is the honest cost of the guarantee.

### `ProductLite` is duplicated, not unified

`silpo_get_replacements` → `items[].replacements[]` and `silpo_get_my_offline_orders` → `orders[].products[].catalogProduct` carry the same eleven field names, but the first declares `companyId` and `branchId` nullable and the second declares them required.

Unifying them would force the nullable form on both and throw away a guarantee the offline-order path actually has. They are written as two types.

Similarly, the three category projections — `{id, slug, title, parentId}`, `{id, slug, title, url}`, and the detail shape with `path`, `priceRange`, and `children` — stay three types in `category.ts`. They are projections of one domain entity, so they share a file, but they are not each other's subsets.

### `deliveryType` is two enums

Seven input schemas declare a 14-value `deliveryType`. `silpo_get_time_slots` declares a 12-value one, missing `Unknown` and `DeliveryExpressByPromise`. These become `DeliveryType` and `TimeSlotDeliveryType` rather than one union, because the server genuinely rejects different sets.

Output fields carrying a delivery type stay plain `string`: the schema declares no enum on outputs, and the recorded contract observed `"B2B"` coming back from `silpo_get_available_delivery_types` — a value absent from every declared input enum.

### Definitions live with the session; transports implement them

A tool's definition is its name, its argument type, and its result type. Those live under `src/mcp/` and pull in nothing else. A mapped type over the 39 definitions declares one surface, and two things implement it: `McpSession`, which reaches the server directly, and the background-process client, which reaches it over the socket.

This replaces an earlier arrangement where each tool file called a helper that wrapped `runTool`. That helper made `src/mcp/` import from `src/daemon/`, while `src/daemon/` already imported `src/mcp/` for the session — a cycle at package level, with the definitions on the wrong side of it. Dependencies now run from the transports to the definitions, never back.

Consequence: command code imports its call surface from the background-process layer, because that is where the socket is. The flow a reader follows is unchanged — command, background process, session — and it is now the flow the imports describe.

Alternatives considered:

- *A single generic `callTool(name, args)` keyed by tool name.* Rejected: it collapses to one method, so every existing call site changes and the surface stops reading as one function per tool.
- *Hand-writing the 39 methods twice, once per transport.* Rejected: two lists to keep in step is exactly the drift the mapped type removes.

### Results carry the whole response, and `success: false` is data

The session returns what the server said: the structured payload with its `success` marker intact, plus the flattened text content. It makes no policy decision about what the payload means.

`ToolFailureError` is removed. A payload marked unsuccessful is returned, not thrown, because only a handful of write tools can report one — the read tools that make up most of the surface never do. Throwing made every caller pay for a case almost none of them meet, and it hid the marker from the few that care. Protocol-level errors still fail, because there is no payload to hand back.

Cost accepted: the marker is now visible in the output of commands that print their payload as JSON, where it previously was stripped.

The unstructured content is carried even though it is redundant on success. Sampling five tools found it to be a byte-identical JSON serialization of the structured payload, always exactly one block, so on a successful call it adds nothing but bytes on the socket. It is carried anyway so the session is a lossless view of the response rather than a filtered one; on an error response it is the only content there is.

The field is named `content`, after the field the MCP response itself uses, so a reader tracing a value from the wire to a command meets one name rather than two.

Hazard accepted: MCP's `content` is an array of typed blocks, while ours is the single string those blocks flatten to. The same name denotes a different shape one layer down. The alternative — keeping a distinct name for the flattened form — was rejected because it made the wire field and the field carrying it look unrelated, which is the worse of the two confusions.

### `Record<string, unknown>` in place of a JSON type module

`src/json/` is removed. `JsonObject` becomes `Record<string, unknown>`, `JsonValue` becomes `unknown`, and `JsonArray` becomes `unknown[]`.

Most of the module was already dead by the end of the migration: `getters.ts` and `checkers.ts` had no callers at all, five of the seven casters had none, and `JsonNode` had none. What remained was two casters and four type aliases used as "some JSON-ish value" — a vocabulary the standard library already has. `src/commands/options.ts` had been using `Record<string, unknown>` and `unknown[]` all along, so this makes one convention out of two rather than introducing a new one.

Two costs, both accepted:

- Entities are no longer *provably* JSON-serializable. The `extends JsonObject` constraint on results and table rows meant a `Date` or a `Map` inside an entity failed to compile; `Record<string, unknown>` only requires an object with string keys. The constraint earned its keep once, forcing the free-form cart fields to be declared as JSON rather than `unknown`. It is given up because every entity is transcribed from a JSON schema, and a non-serializable value would fail crossing the socket regardless.
- `undefined` is no longer excluded from what a mapper can receive. `JsonValue` could not hold it; `unknown` can, and `String(undefined)` renders the word. Three entry points reach a mapper: `renderTable` guards with `?? null`, `renderRows` skips an undefined value outright, and `renderSummary` has no guard — so it keeps a parameter narrow enough not to need one, `string | null`, which is all any caller passes and all its tests exercise. A fourth mapper, the alias mapper in the aliases command, is reached only through `renderTable`.

### The structured payload is cast, and only its absence is checked

The MCP SDK types `structuredContent` as `unknown`, not as a record. That is why the original `structuredOutput` typo compiled: reading any name off `unknown`'s parent object typechecked and evaluated to nothing.

The session casts it to a record and keeps failing when it is absent. It does not check that a present payload is really an object.

Rationale: every one of the 39 tools declares an object at the top of its `outputSchema`, and the SDK validates `structuredContent` against that schema on every call, so a non-object cannot reach the session without the SDK rejecting it first. Absence is the case that actually occurred — and it is the one the check still covers.

Cost accepted: if the server ever returned a present-but-not-an-object payload and the SDK stopped validating, the cast would let it through and command code would read undefined off it. That is the same class of failure this change was written to remove, narrowed to a case two other layers have to fail simultaneously to reach.

### No runtime validation is added

The MCP SDK validates structured output against the server's `outputSchema` on every call, and `OpenWorldValidator` deliberately relaxes `additionalProperties: false` because live responses carry fields the schema omits. A second validation layer against hand-written types would fail on exactly the divergences that motivated writing them by hand, and would need a schema library the project does not have.

### The `structuredContent` fix goes first

`src/mcp/session.ts` reads `result.structuredOutput`; the SDK returns `structuredContent`. The SDK's result type has an `[x: string]: unknown` index signature, so the wrong name compiles and evaluates to `undefined`, and every call then throws "returned no structured output". This is fixed before any typing work, so that each migrated slice can be exercised against the live server rather than typed blind.

## Risks / Trade-offs

- **1300+ lines of hand-written types drift from the server.** → The snapshot is committed; a fresh `tools/list` dump diffed against it shows what moved. Drift is detected on demand rather than continuously, which is accepted.
- **Hand transcription introduces typos the compiler cannot catch** — a field named right but typed `string` where the schema says `number` looks fine to TypeScript. → Each slice is exercised against the live server before the next one starts, and the snapshot is the reference during review.
- **Nullability from the schema makes command code noisier** than the shapes the CLI actually meets. → Accepted deliberately; see the decision above. If a field proves unconditionally present across sustained use, narrowing it is a later, separately justified change.
- **Three types come from prose, not schema**, and nothing checks them. → They are marked in place as documentation-sourced, and the cart slice is scheduled last so the schema-backed majority lands first.
- **A long migration leaves two calling conventions in the tree at once.** → Slices are vertical: an entity, its tools, and the commands that render it land together, so no command is ever half-migrated.
- **`silpo raw` keeps a fully untyped path**, so nothing forces new work onto the typed surface. → That is the intent: it is the escape hatch for debugging and for tools the snapshot predates.

## Migration Plan

A slice is one command file plus every entity and tool it needs, so a command file is never left half-migrated. Slices are ordered so the first exercises every structural decision on the smallest possible surface.

0. Fix `structuredContent` in `src/mcp/session.ts`.
1. `branches` — `meta.ts`, `branch.ts`, one tool, and typed table columns. This is the shape test: if a file-per-tool layout, a re-export facade, `Omit` of the success marker, or `keyof`-constrained columns proves awkward, it surfaces on 16 properties rather than 529.
2. `products` — `product.ts` and `replacement.ts`, seven tools. The largest single win, and the only place a shared entity spans four tools.
3. `profile` — `profile.ts`, `address.ts`, `family.ts`, `food-restriction.ts`, four tools.
4. `orders` — `order.ts`, two tools. The heaviest single entity file, 42 properties in the offline-order shape.
5. `catalog` — `category.ts`, `promotion.ts`, `product-set.ts`, six tools, including the recursive tree taken from documentation.
6. `delivery` and `np` — `delivery.ts`, `time-slot.ts`, `nova-poshta.ts`, and the `FoundAddress` half of `address.ts`, five tools.
7. `loyalty` — `loyalty.ts`, `coupon.ts`, `promo.ts`, `certificate.ts`, `premium.ts`, seven tools.
8. `cart` — `cart.ts`, seven tools. Scheduled last because it is the only slice sourced from documentation rather than schema.

`address.ts` is opened in slice 3 for `SavedAddress` and extended in slice 6 for `FoundAddress`; the two shapes belong to one entity but reach the CLI through different commands.

Rollback at any point is to leave the remaining commands on `runTool`, which keeps working throughout.

## Open Questions

- ~~Whether `src/json/getters.ts` still has callers once every command is migrated, or whether it narrows to `silpo raw` alone.~~ **Answered at close-out: it has no callers at all.** `silpo raw` does not use it either — `runTool` hands back a `JsonObject` that `raw` stringifies whole, without reaching into fields. `src/json/casters.ts` is still used by `src/mcp/session.ts`, and `src/json/types.ts` by the render layer, the daemon protocol, and the surface; `src/json/checkers.ts` is reached only through `casters.ts`. **Resolved: the whole module is removed** — see the `Record<string, unknown>` decision above, which also records where the one guard worth keeping went.
