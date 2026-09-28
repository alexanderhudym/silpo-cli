## Context

See proposal.md — Why.

`renderPayload` takes `{ resolver, entity, entities }` and threads a `Context` down through `renderNode`, `renderList`, `viewOf`, `sharedOf` and `pack`. Every rule lives inside those functions as a constant or a fixed step: `orderOf` and `shortestFirst` sort by rendered pair width, `pairText` hardcodes `${key}=${text}`, `renderNode` emits every scalar before any nested block, `renderList` builds `#${index + 1}` and always calls `sharedOf`, and `scalarText` resolves aliases while `plainText` converts every string that parses as an instant.

Three tables already key behaviour off a field name, written three different ways: `KEY_MAPPERS` in `values.ts`, `KEY_ENTITIES` in `aliases.ts`, and the `entities` option threaded through `Context`. Each is a per-field renderer in disguise.

Measured on the ten golden files: the two rules being dropped — width ordering and `common` hoisting — are worth roughly five percent of 10741 bytes. Four `common` sections exist in total, across three files.

## Goals / Non-Goals

**Goals:**

- Any field of any payload can be rendered by a renderer the caller supplies, without a change to the renderer that holds it.
- A renderer is a function of its own value alone. It cannot see its key, its siblings, or its position.
- Layout rules that survive are defaults of a primitive, expressible as options, not branches in a recursive walk.

- One vocabulary for "a value read as text" across every rendering form the CLI has.

**Non-Goals:**

- Dropping or truncating fields to cut tokens. `image`, `slug` and `receiptUrl` are about a third of the rendered bytes and the registry makes removing them a one-line change, but doing it here would mix a deliberate content decision into a structural one. Follow-up change.
- Winning back the five percent lost with `common` and width ordering.
- A serialisable configuration format. Renderers are values composed in code.
- Any change to what `renderTable`, `renderPairs` or `renderRows` produce. Their columns and fields are retyped onto `Renderer`; their output, their algorithms and their specs stand.

## Decisions

### A renderer is `(value, ctx) => string`, and the parent places it

```ts
type Ctx = { width: number; resolver: AliasResolver };
type Renderer = (value: unknown, ctx: Ctx) => string;
```

An empty result means the field is not rendered at all. A result may hold newlines; its lines are returned without leading indentation and the parent adds it.

`width` is the budget remaining at this depth, not an absolute indent. A child packs to the room it was given and never learns how far in it sits, which is what lets the same renderer be used at any depth and under any marker. It also removes the `body[0].slice(bodyIndent)` re-slicing in today's `renderList`: a marker is now prefixed to the child's first line rather than punched into a pre-indented one.

*Alternative considered:* a structured intermediate — atoms and blocks rather than text — so that the parent could pack, align and diff a child's output. It buys width-aware packing across a child boundary and a cleaner hoist, and costs a second pass and a type every renderer has to construct. Rejected because hoisting leaves the renderer entirely (below) and packing across a child boundary is not something any consumer asks for.

### Placement is one axis with three positions, and it belongs to the slot

A renderer knows nothing about where its output lands, so every question of position is answered by the parent, in the slot:

```ts
type FieldSpec = {
  render?: Renderer;
  key?: string | false;
  sep?: string;
  placement?: "atom" | "line" | "block";
};
```

```
atom                  line                  block
shares a line         owns a line           owns a key line
with its neighbours   by itself             plus an indented body

total=178.78          - branches            timeslot
                                              end=…  start=…
```

The default follows the value's type, exactly as `viewOf` decides today: a scalar and an array of scalars are atoms, an object and an array of objects are blocks.

*Alternative considered:* two booleans, `inline` to force a block down to an atom and `ownLine` to force an atom up to a line. Rejected: they are two ends of one axis, they leave the middle position unnameable, and their four combinations include one that contradicts itself.

`key` and `placement` are independent, and all six combinations are meaningful — a bare atom packs its value with its neighbours, a bare line is the `command` row of `gain calls`, and a bare block is a list body sitting at its parent's indent, which is how a prepared `{ common, items }` renders without a rule for it.

### Field order is a comparator, defaulting to arrival order

A field's rendered text does not depend on its position, so the node renders every field first, then sorts, then packs:

```
node ──▶ render each field ──▶ Slot[] ──▶ compare ──▶ group runs of atoms ──▶ pack
                                Slot = { key, text, kind }
```

```ts
type Compare = (a: Slot, b: Slot) => number;

export const byWidth: Compare;              // today's shortestFirst
export const byKeys: (order: readonly string[]) => Compare;
```

With no comparator the sort is stable and the fields keep the order the payload gave them. Today's rule stops being a rule and becomes one exported comparator among others.

This also retires `orderOf`. It existed to keep width ordering consistent across the items of a list, computing one order from the widest rendered pair per field. Items of a list come from one API shape and therefore arrive in one order, so arrival order is consistent for free.

*Alternative considered:* an explicit `order: string[]` on the node, as the earlier design had. It is a special case of a comparator and is kept as `byKeys`.

Sorting the items of a list is deliberately not offered. Which order records come in is a fact about the data.

### Hoisting shared fields leaves the renderer

`sharedOf`, `without`, the `Shared` type and the `common` header are removed. Whether several records repeat a value is a property of the data, and the decision to say it once belongs to whatever prepares a payload.

Nothing about the primitives prevents the prepared shape from rendering the way it does today. A preparation that returns `{ common, items }` renders through

```ts
renderObject({ fields: { items: { key: false } } })
```

— the hidden key drops the header, and the list body sits at the same indent as `common`. That the current output is reachable from the general primitives, with no rule of its own, is the argument that the rule was never a layout rule.

No preparation ships in this change and no consumer asks for one, so the four `common` sections disappear from the golden files.

### A leaf renderer per kind of value, not one scalar renderer with options

There is no `renderScalar` taking a bag of mutually exclusive flags. Each way a value can read is its own renderer, named after the kind of value it renders:

```ts
renderText():        Renderer   // collapse whitespace, show an instant as local time — the default
renderVerbatim():    Renderer   // exactly the characters given
renderAlias(entity): Renderer   // a uuid becomes its alias; anything else passes through
renderCoordinate():  Renderer   // six decimal places, trailing zeros dropped
renderFlags(prefix): Renderer   // the names of the raised flags, prefix stripped
renderCostTiers():   Renderer   // each tier as its cost and the order total it starts from
```

The four mappers `KEY_MAPPERS` held become the last four. Adding a way to read a value is then a new function rather than a new option on an existing one, and `raw` stops being a flag that switches off three unrelated behaviours at once — `renderVerbatim` simply does none of them.

*Alternative considered:* `renderScalar({ alias, map, raw })`. Rejected: `raw` contradicts both of its neighbours, so two of the eight combinations are nonsense, and every future kind of value widens the same signature.

### One vocabulary for values, several layouts that consume it

`ValueMapper` is removed. Once `KEY_MAPPERS` is gone it and `Renderer` say the same thing — a value read as text — and differ only in how each spells "nothing", `null` against `""`. Keeping both would rebuild at the level of types the same duplication the three name-keyed tables were.

```
                   Renderer = (value, ctx) => string
                               │
        ┌──────────────────────┼──────────────────────┐
   renderObject           renderPairs             renderTable
   renderList             label padded to         column sized across
   packed to a width      the widest label        rows, empty ones dropped
```

`renderTable`'s columns and `renderRows`'s fields are typed by `Renderer`. Their output does not change, which `test/table.test.ts` and `test/rows.test.ts` assert.

The layouts stay four separate algorithms. Padding a label to a shared width and sizing a column across every row are not settings of packing-to-a-width; they are the only cross-record alignment in the project, and folding them into the packing pass would grow it a second algorithm to serve one call site in `src/commands/aliases.ts`.

`renderPairs` and `renderTitle` are untouched. `renderPairs` has eight call sites across `server.ts`, `config.ts`, `auth.ts` and `gain.ts`, so `src/render/pairs.ts` stays where it is, and moving `table.ts` and `json.ts` next to their single consumer while their dependency stays behind would split the family without a seam.

*Alternative considered:* rebuilding `renderTable` and `renderRows` on the packing pass so there is one layout engine. Rejected: their output is deliberately different, and the shared thing was never the layout — it was how a value reads.

### The alias entity is an argument to a renderer, and only a leaf renderer takes one

`entity` and `entities` disappear from the renderer's options. An alias entity names an entity and the field it is recorded under, which is information about one scalar value; an object or a list never needs it. So it is an argument to `renderAlias` and to nothing else.

That splits into two things that were previously tangled. A library of leaf renderers, indexed by kind of value, and a binding of field names to renderers:

```ts
const FIELDS: Readonly<Record<string, FieldSpec>> = {
  latitude: { render: renderCoordinate() },              // was KEY_MAPPERS
  constraints: { render: renderFlags("isLimited") },     // was KEY_MAPPERS
  productId: { render: renderAlias(PRODUCT) },           // was KEY_ENTITIES
  products: { render: renderList({ item: product }) },   // was the entities option
};
```

Every entry now holds a value of one type, `Renderer`, where the three tables it replaces held a `ValueMapper`, an `AliasEntity` and an `AliasEntity` reaching an arbitrary depth.

`KEY_ENTITIES` and `entityForKey` are not deleted, though. They run in the other direction as well: `src/commands/options.ts` uses them to expand an alias a user typed back into the uuid the server expects. A renderer is opaque and cannot be asked which entity it prints, so the name-to-entity binding has to stay a table. The registry's alias entries are derived from it rather than written beside it:

```ts
const FIELDS = {
  ...Object.fromEntries(
    Object.entries(KEY_ENTITIES).map(([key, entity]) => [key, { render: renderAlias(entity) }]),
  ),
  latitude: { render: renderCoordinate() },
};
```

So the count is not three tables into one. It is one table that both directions read, plus a registry derived from it, in place of three tables written independently.

### What a value is, and how a value reads, are different layers — and two modules sit on the wrong side

The same cut runs through two modules this change touches, and both are on the wrong side of it today.

`src/render/aliases.ts` renders nothing. It holds the `AliasEntity` type and seventeen entity constants, `KEY_ENTITIES` and `entityForKey`, the `isUuid` predicate and the two resolvers. Every one of those answers "what is this value" — which entities exist, which field carries which, whether a string is a uuid, what handle stands for it. It is read by `src/commands/options.ts` on the input side and will be read by the field registry on the output side. Leaving it under `src/render/` after a change whose whole subject is that `render/` holds presentation would be actively misleading, so it moves to `src/aliases.ts`.

`src/mcp/time.ts` holds two functions pointing opposite ways, and neither describes the MCP protocol. `toLocalTime` turns an instant into `2026-08-15 09:00` — how a value reads, the only reason `plainText` exists and what `renderText` inherits — so it moves to `src/render/time.ts`. `toServerTime` turns what a user typed into the UTC a call carries, which is a command digesting its own input; it moves into `src/commands/options.ts`, beside `fromAlias`, `toInteger` and `toNumber`, which are the same kind of thing and its only caller. `src/mcp/time.ts` then has nothing left and is deleted.

That the module existed at all is the illustration: it grouped two functions because both concern time, which is a topic rather than a layer. The two keep a six-line `parseInstant` each rather than sharing one through a third module that would rebuild exactly that.

That there is no entity-shaped machinery anywhere in the result is the point. `renderAlias` is an ordinary leaf renderer, `product` is an ordinary `renderObject`, and the registry binds names to renderers without caring that some of them concern entities. Rendering an entity is a special case of rendering, not a mechanism of its own.

*Alternative considered:* leaving both modules where they are, since the moves change no behaviour. Rejected: a name-to-entity table under `render/` is exactly the confusion that produced three parallel field tables, and this change is the moment the layer boundary becomes legible.

`renderObject` consults its own `fields` first and the registry second, so a node always wins over the global default. That covers the names that genuinely differ by context: `id`, whose entity depends on what holds it, and `children`, which is `CHILD` under a family and `CATEGORY` under a catalog.

The twenty-one `entities` bindings collapse into one node renderer per entity, declared once:

```ts
const product = renderObject({ fields: { id: { render: renderAlias(PRODUCT) } } });
```

Today `entities: { products: PRODUCT }` is written six times in `products.ts` alone. After this, `product` is written once and bound wherever it appears.

*Alternative considered:* keeping `entities` as a flat map applied at every depth. Rejected: it is a fourth mechanism keyed by field name, it attaches alias knowledge to object and list keys where it does not belong, and its reach-any-depth behaviour is what makes `children` ambiguous in the first place.

### `Ctx` carries the resolver as transport, and only `renderAlias` reads it

A resolver arrives per call — production always passes the singleton `databaseResolver`, and the tests pass a fresh in-memory one so aliases are deterministic. Renderer trees are module constants built once, so they cannot capture it; it has to travel with the value.

It therefore stays on `Ctx`, but nothing except `renderAlias` reads it. `renderObject` and `renderList` pass it through without a way to act on it, which is the whole content of "an alias concerns one scalar value".

*Alternatives considered:* renderer trees as factories taking a resolver, rebuilt per call — ceremony and rebuild cost for a value that changes only in tests; or a module-level resolver with a test seam — global mutable state shared by parallel tests.

### Width, resolver and nothing else are inherited

`Ctx` carries only what cannot be known locally. `sep`, `placement`, the comparator and the choice of leaf renderer are not inherited — each `renderObject` states its own. The earlier design inherited them because a configuration tree had no other way to avoid repetition; with builders the parent constructs the child by hand and repetition is explicit where it exists.

## Risks / Trade-offs

- **The golden files move in the same commit as the rewrite, so the diff is not attributable** → The instruction was to do it in one pass. Mitigated by reviewing the golden diff against a stated expectation — field order follows the payload, four `common` sections gone, nothing else — rather than against the previous bytes. Anything else appearing in that diff is a bug.
- **Arrival order packs less densely than width order** → About five percent, measured, and it buys output that is stable against the data rather than reordering itself when a value grows. `byWidth` remains one argument away.
- **A registry keyed by field name collides across payloads** → It already does today in `KEY_MAPPERS`. A node's own `fields` wins, so a collision is fixed where it appears rather than by renaming.
- **Nine command modules are rewritten with no behavioural test beyond the goldens** → The goldens cover all ten renderer outputs and every `entities` binding is visible in one of them.
- **`(value, ctx) => string` cannot pack across a child boundary** → Accepted. No output needs it: a block always begins a line.
- **A table cell has no width budget, yet a `Renderer` is handed a `Ctx` that carries one** → Only `renderObject` and `renderList` read `width`; every leaf renderer ignores it, and a table cell is always a leaf. `renderTable` passes an unbounded width, which is the truth about a cell: its column is sized after it is rendered, not before.

## Measured Outcome

The golden files grew from 10741 to 11004 bytes, **+263 bytes or +2.4%** — half the five percent the estimate allowed for. The four `common` sections and width ordering cost what was predicted; a third rule, unaccounted for in the estimate, paid part of it back. A field whose renderer produces no text is now left out entirely, and an empty string is no text, so `city=`, `address=`, `house=` and `region=` disappear where the old renderer printed a bare key.

Per file, against `test/expected/` before the change:

| file | before | after | change |
|---|---:|---:|---:|
| branches.branches | 779 | 766 | −13 |
| cart.details | 2456 | 2628 | +172 |
| catalog.categories | 360 | 360 | 0 |
| delivery.slots | 589 | 589 | 0 |
| loyalty.premium | 772 | 775 | +3 |
| np.settlements | 361 | 352 | −9 |
| orders.offline | 3799 | 3832 | +33 |
| products.batch | 1007 | 1084 | +77 |
| profile.family | 442 | 442 | 0 |
| profile.profile | 176 | 176 | 0 |
| **total** | **10741** | **11004** | **+263** |

The cost concentrates where hoisting was doing real work — `cart.details` and `products.batch` held three of the four `common` sections between them. Five of the ten files pay nothing.

## Open Questions

None outstanding.
