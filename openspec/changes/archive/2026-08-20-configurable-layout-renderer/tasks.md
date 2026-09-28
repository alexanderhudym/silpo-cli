## 1. Put the data modules on the data side

Pure moves, done first so everything after imports from the settled locations.

- [x] 1.1 Move `src/render/aliases.ts` to `src/aliases.ts` with its contents unchanged — the `AliasEntity` type, the seventeen entity constants, `KEY_ENTITIES`, `entityForKey`, `isUuid` and the two resolvers — and update the imports in `src/commands/*.ts`, `src/render/**` and the tests
- [x] 1.2 Move `toLocalTime` to a new `src/render/time.ts` and `toServerTime` into `src/commands/options.ts` beside `fromAlias`, `toInteger` and `toNumber`, giving each its own `parseInstant`, and delete `src/mcp/time.ts`
- [x] 1.3 Point `test/time.test.ts` at the two new locations, keeping every case it has including the DST ones
- [x] 1.4 Run `npm test` and confirm the moves compile and change nothing — no golden file moves in this section

## 2. The primitives

- [x] 2.1 Define `Ctx` (`width`, `resolver`), `Renderer` as `(value, ctx) => string`, `Slot` (`key`, `text`, `kind`) and `FieldSpec` (`render`, `key`, `sep`, `placement`) in `src/render/layout.ts`, with an empty result meaning the field is not rendered
- [x] 2.2 Write the packing pass: group consecutive `atom` slots into runs, pack each run to the width it was given joined by two spaces, emit a `line` slot alone, emit a `block` slot as a key line plus its body indented two spaces, and return lines without leading indentation so the parent indents them
- [x] 2.3 Write the leaf renderers in a new `src/render/scalars.ts` — `renderText` (collapse whitespace, an instant as local time), `renderVerbatim`, `renderAlias(entity)` (a uuid becomes its alias, anything else passes through), `renderCoordinate`, `renderFlags(prefix)`, `renderCostTiers` — each a `Renderer`, each returning an empty string where its mapper returned null
- [x] 2.4 Write `renderObject({ fields, compare, sep })` — render every field to a slot, sort by the comparator, then pack; default a field's placement from its value's type; consult the field registry for any field `fields` does not name
- [x] 2.5 Write `renderList({ item, marker, join })` — `#N` markers padded to the widest, `dash` as the alternative, one empty line between items, the marker prefixed to the item's first line, and an array of scalars joined into one atom
- [x] 2.6 Export `byWidth` and `byKeys(order)` as comparators, leaving the default sort stable so fields keep arrival order

## 3. The field registry

- [x] 3.1 Add `src/render/fields.ts` holding the registry that binds a field name to a `FieldSpec`, and retire `KEY_MAPPERS`, `mapKeyValue` and `plainText` from `src/render/values.ts` into it
- [x] 3.2 Derive the registry's alias entries from `KEY_ENTITIES` rather than writing them out again — that table stays in `src/aliases.ts` because `src/commands/options.ts` reads it in the other direction, expanding an alias a user typed back into a uuid
- [x] 3.3 Turn `defaultJsonValueMapper` and `singleLineMapper` into renderers alongside the rest, remove `ValueMapper`, and delete `src/render/values.ts`
- [x] 3.4 Declare one node renderer per alias entity — `product`, `category`, `order`, `address` and the rest of the fourteen the `entities` bindings name — each a `renderObject` whose `id` field renders through `renderAlias`
- [x] 3.5 Register the field names that mean one thing everywhere; leave `id`, `children` and any other name whose entity depends on its parent to the nodes that hold them
- [x] 3.6 Check the payload types for a field holding an array of ids: today every element of a scalar array is aliased individually, whereas a leaf renderer bound to that field would receive the array. Where one exists, bind it to a list of aliases rather than to a single alias

## 4. Remove what the primitives replace

- [x] 4.1 Delete `sharedOf`, `without`, the `Shared` type, `renderShared` and the `common` header
- [x] 4.2 Delete `orderOf`, `shortestFirst` and `inOrder`, their roles now filled by the comparators
- [x] 4.3 Delete the `entity` and `entities` options and the `Context` fields that carried them, along with `childEntity` and the `ID_KEY` special case in `scalarText`

## 5. Retype the forms for the CLI's own state

- [x] 5.1 Retype `Column.mapper` in `src/render/table.ts` and `RenderRowsOptions.mappers` in `src/render/json.ts` onto `Renderer`, passing an unbounded width in the `Ctx` a cell is rendered with, and treating an empty result where a `null` was treated before
- [x] 5.2 Retype `aliasValueMapper` in `src/commands/aliases.ts` as a renderer — the last consumer once `values.ts` is gone
- [x] 5.3 Leave `src/render/pairs.ts` and `src/render/text.ts` alone, and leave every algorithm inside `table.ts` and `json.ts` alone: this section changes types, not output
- [x] 5.4 Run `test/table.test.ts` and `test/rows.test.ts` with no change beyond how a renderer is written, and confirm every assertion still holds

## 6. Migrate the payload commands

- [x] 6.1 Rewrite the twenty-one `entities` bindings across `src/render/commands/*.ts` as the node renderers from 3.4, bound at the node that actually holds each field
- [x] 6.2 Confirm each command module still exports the same function names with the same signatures, since `test/golden.test.ts` resolves renderers by name

## 7. Verify

- [x] 7.1 Rewrite `test/layout.test.ts` against the primitives, covering: a supplied renderer for one field, a renderer producing nothing, `byWidth` and `byKeys`, each of the three placements, a renamed key, a dropped key, a node overriding a registered default, and a per-node separator
- [x] 7.2 Rewrite `test/values.test.ts` against `renderCoordinate`, `renderFlags`, `renderCostTiers` and `renderText`
- [x] 7.3 Add a test rendering the prepared `{ common, items }` shape through `renderObject` with the records field's key dropped, asserting it reproduces the layout the removed hoisting produced
- [x] 7.4 Add the `gain calls` case — dash markers, `": "` separator, the command row bare and on its own line — and confirm it renders as design.md's acceptance output
- [x] 7.5 Run `npm test`, then regenerate the goldens with `UPDATE_GOLDEN=1` and review the diff against one stated expectation: field order follows the payload, the four `common` sections are gone, nothing else moved
- [x] 7.6 Record the size change across `test/expected/*.txt` in the change's notes, as the measured cost of dropping width ordering and hoisting
- [x] 7.7 Edit the Purpose of `openspec/specs/output-rendering/spec.md` to drop its mention of the `common` section, which a delta cannot change
