## Why

`renderPayload` is one recursive function that bakes in every layout rule at once: pairs are ordered by rendered width, a nested object always follows every scalar of its node, the key is always printed before its value, list items are always numbered `#N`, fields shared across items are always hoisted into a `common` block, and every string is run through the same substitutions. Nothing about a single field can be changed without changing it for every field of every payload.

That was fine while the only consumer was an MCP payload rendered one way. It stops being fine as soon as one field needs different treatment from its neighbours — a product's name and volume read as one value, a recorded command reproduced verbatim, a key printed under a shorter name. Today each of those needs a new branch inside the renderer.

The `gain calls` report in the `verbatim-call-history` change is the immediate consumer; the standing need is that all nine payload renderers get a way to say how one field is rendered without a change to the renderer itself.

## What Changes

- Replace `renderPayload` with three composable renderers over a shared signature `(value, ctx) => string`. `renderObject`, `renderList` and `renderScalar` each take options and return a renderer; a renderer given for a field is used for that field, and a default renderer chosen by the value's type is used otherwise.
- A renderer sees only its own value and knows nothing of where its output lands. The parent decides placement, key, and separator for the slot it puts a child into.
- Give a slot one placement axis with three positions — `atom` (shares a line with its neighbours), `line` (a line to itself), `block` (a key line plus an indented body) — defaulting to the value's type. This replaces the separate notions of "own line" and "inline".
- Let a slot rename its key or drop it entirely.
- Order a node's fields by a comparator supplied by the caller, over the rendered slots. **BREAKING**: the default becomes the order the fields arrived in. Ordering by rendered width remains available as a supplied comparator but is no longer the default.
- **BREAKING**: remove hoisting of shared fields into a `common` section. Deciding that several records share a value is a fact about the data, not about its layout; it belongs to whatever prepares a payload for rendering. The three primitives can render the prepared shape without a rule of their own.
- **BREAKING**: remove the `entity` and `entities` options of `renderPayload`. An alias entity describes one scalar value, so it becomes an argument to the renderer that prints an aliased id and to nothing else, placed where that field actually is.
- Replace the set of value mappers with a leaf renderer per kind of value — text, verbatim text, an aliased id, a coordinate, a set of flags, a list of cost tiers — so that adding a way to read a value is a new function rather than a new option on an existing one.
- **BREAKING**: remove `ValueMapper`. It and `Renderer` express the same idea, a value read as text, differing only in how each says "nothing". `renderTable` and `renderRows` take renderers for their columns and fields instead. Their output does not change, so this is a change of vocabulary rather than of behaviour, and the specs for those forms are untouched.
- Put two modules on the right side of the data/presentation line. `src/render/aliases.ts` renders nothing — it holds the entity vocabulary, the name-to-entity table, the uuid predicate and the resolvers, all of which say what a value is — so it moves to `src/aliases.ts`. `src/mcp/time.ts` describes no protocol: `toLocalTime` decides how an instant reads and moves to `src/render/time.ts`, `toServerTime` digests what a user typed and moves into `src/commands/options.ts` beside the other option parsers, and the module is deleted.
- Keep the layouts separate. `renderPairs` pads a label to the widest label, `renderTable` sizes a column across every row and drops the empty ones — different algorithms from packing to a width, and the only cross-record alignment in the project. They consume the shared renderer; they are not rebuilt on top of the packing pass.
- Replace the three tables that key behaviour off a field name — `KEY_MAPPERS` in `src/render/values.ts`, `KEY_ENTITIES` in `src/render/aliases.ts`, and the `entities` option — with one registry binding a field name to a renderer, consulted for any field a node does not describe itself. `KEY_ENTITIES` itself stays, because `src/commands/options.ts` reads it in the other direction to expand an alias a user typed back into a uuid; the registry's alias entries are derived from it.
- Accept a step backwards in output size. Losing width ordering and `common` costs about five percent of the rendered bytes across the golden files. Nothing in this change tries to win it back; the point is that a field can now be rendered any way a caller needs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `output-rendering`: field order becomes caller-supplied with arrival order as the default rather than width order; a field gains a placement, a key of its own choosing and a renderer of its own; shared-field hoisting is removed from the renderer.

## Impact

- `src/render/layout.ts` — replaced by the three primitives, the slot model and one packing pass. `sharedOf`, `without`, `orderOf` and the `Shared` type go.
- `src/render/scalars.ts` — new: the leaf renderers, one per kind of value.
- `src/render/fields.ts` — new: the registry binding a field name to a renderer, absorbing `KEY_MAPPERS`, `KEY_ENTITIES` and the `entities` option.
- `src/render/values.ts` — removed. `KEY_MAPPERS`, `mapKeyValue` and `plainText` become renderers; `ValueMapper`, `defaultJsonValueMapper` and `singleLineMapper` become renderers or go.
- `src/render/aliases.ts` → `src/aliases.ts` — contents unchanged, imports updated across `src/commands/`, `src/render/` and the tests. `KEY_ENTITIES` and `entityForKey` survive: `src/commands/options.ts` reads them on the input side.
- `src/mcp/time.ts` — deleted. `toLocalTime` to `src/render/time.ts`, `toServerTime` into `src/commands/options.ts`, each keeping its own `parseInstant`. `test/time.test.ts` keeps its cases and updates its two imports.
- `src/render/table.ts`, `src/render/json.ts`, `src/commands/aliases.ts` — columns and fields typed by `Renderer` instead of `ValueMapper`. Output unchanged; `test/table.test.ts` and `test/rows.test.ts` assert that.
- `src/render/pairs.ts`, `src/render/text.ts` — untouched. `renderPairs` has eight call sites across `server.ts`, `config.ts`, `auth.ts` and `gain.ts`.
- `src/render/commands/*.ts` — nine modules, twenty-one `entities` bindings collapsing into one node renderer per entity, declared once and bound where it appears.
- `test/expected/*.txt` — ten golden files move, in one reviewable diff: field order follows the payload, `common` sections disappear, nothing else.
- `test/layout.test.ts` — rewritten against the primitives.
- Unblocks `gain calls` in the `verbatim-call-history` change, and per-field composition for product payloads, which no longer needs a renderer change to become possible.
