## Why

Eight of the fifteen command groups still print `JSON.stringify(payload)` — every command whose payload nests (`cart`, `orders`, `products`, `catalog`, `loyalty`, `np`, `profile family`, `profile restrictions`) — because the table renderer cannot express nesting. Measured on the repository fixtures, the current pretty-printing of those payloads is token-neutral against raw JSON; the savings live in aliasing uuids and in hoisting fields that repeat across list items. One uniform format for objects and lists, with a shared alias registry, cuts those payloads by 20–33% and gives every command a rendered form for the first time.

## What Changes

- One format for every MCP payload: an object prints as `key=value` pairs packed to 90 columns, a list prints as `#N` items indented under their container. Nested objects and lists nest with two-space indentation; no dotted paths, no tabs.
- Field order inside a list is computed once for the whole list, so items line up as columns; the longest `key=value` pairs sort to the end.
- **New**: a `common` section at the head of a list carries fields whose value is identical in every item, including fields nested inside objects that every item carries, with the nesting structure preserved.
- **New**: one central registry of alias constants (entity plus field) shared by every renderer, so the same uuid gets the same alias no matter which command or which JSON key it arrived under. Only uuid-shaped values are aliased.
- Aliases are assigned during rendering rather than in a separate pass in the command, so a printed uuid cannot escape unaliased.
- **BREAKING**: aliases recorded before this change must be dropped once (`silpo aliases clear`) — company ids move from the `branch` entity to `company`.
- **BREAKING**: every option that accepts a uuid accepts an alias, including uuids inside JSON arguments (`--products`, `--actions`, `--address`, `--shipments`, `--add`, `--remove`). Without this the rendered output cannot be fed back into a write command, since uuids no longer appear in it.
- Summary and pagination stop being separate titled blocks; they are ordinary fields of the payload object.
- Local commands (`auth`, `config`, `gain`, `server`, `aliases`, `raw`) keep their current rendering untouched.

## Capabilities

### New Capabilities
- none

### Modified Capabilities
- `output-rendering`: replaces the table, summary, and pagination requirements for MCP payloads with the uniform object and list format, the 90-column packing rule, the field ordering rule, and the `common` section. Table and label-value rendering survive only for local commands.
- `id-aliases`: aliasing keys off a shared entity-plus-field constant instead of per-command strings, applies to uuid-shaped values only, and happens as part of rendering.
- `command-input`: alias resolution reaches every uuid-bearing option, including uuids nested inside JSON arguments.

## Impact

- New: `src/render/layout.ts` (object and list layout), `src/render/aliases.ts` (constant registry and resolver), `src/render/commands/*.ts` — one file per MCP command file (`branches`, `cart`, `catalog`, `delivery`, `loyalty`, `np`, `orders`, `products`, `profile`).
- Removed: `src/render/summary.ts`, `src/render/pagination.ts` and their tests.
- Kept for local commands: `src/render/pairs.ts`, `table.ts`, `json.ts`, `text.ts`; value mappers move to `src/render/values.ts`.
- Touched: all nine MCP command files, `src/commands/options.ts` (alias expansion, `fromAlias` signature), `src/db/aliases.ts` (assignment through the registry).
- Fixture-driven golden tests replace the per-primitive render tests; fixtures are captured with `silpo raw`.
- `gain` numbers for list commands change, since the alias and `common` savings land in `text_tokens`.
