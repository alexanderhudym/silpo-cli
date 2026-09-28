## Why

Every MCP tool call goes through one untyped funnel: `runTool(name: string, args: Record<string, unknown>)` returns a `JsonObject`, and each of the 39 command handlers digs fields out of it by string key. Nothing checks that the tool name exists, that the arguments match its input schema, or that the field being read is on the response. Two live defects show what that costs: `src/mcp/session.ts` reads `result.structuredOutput` where the MCP SDK returns `structuredContent` — the SDK's result type carries an `[x: string]: unknown` index signature, so the wrong property name typechecks and silently yields `undefined`; and `src/commands/branches.ts` guards `summary === undefined` where `getStringFromJsonObject` can only return `string | null`, so the guard never fires.

The server publishes what is needed to fix this class of bug at compile time. A `tools/list` snapshot taken 2026-08-19 against `silpo-mcp-service 1.108.0` carries an `outputSchema` for all 39 tools — 529 output properties, 126 input properties, no `$ref`, no `oneOf`/`allOf`, and 148 `anyOf` nodes that are all `[T, null]`. Alongside it, a hand-written contract documents the same 39 tools against live responses and records where the server's behaviour departs from its declared schema.

## What Changes

- Add a typed client layer under `src/mcp/`: one hand-written TypeScript type file per domain entity, one file per MCP tool holding that tool's name, argument type, and result type.
- Declare one surface as a mapped type over those definitions, and have both transports implement it: `McpSession`, which calls the server directly, and the background-process client, which calls it over the socket. A definition is written once and neither transport can drift from it.
- Keep dependencies running from the transports to the definitions. `src/mcp/` pulls in nothing from `src/daemon/`, so the flow a reader follows — command, background process, session — is the flow the imports describe.
- Expose a typed method per tool, so command handlers call `silpo.getProducts(args)` instead of `runTool("silpo_get_products", args)`.
- Return the whole response: the structured payload with its `success` marker intact, plus the response's unstructured `content`, named after the field MCP itself uses. `ToolFailureError` goes away and `success: false` becomes data a command inspects when it matters, because only a handful of write tools can report one.
- Drop `src/json/` and say `Record<string, unknown>` and `unknown` instead of `JsonObject` and `JsonValue`. Most of the module is dead by the end of the migration, and the standard library already has the vocabulary; the one runtime guard worth keeping moves into the session, where the untyped response actually arrives.
- Migrate all 39 command handlers off string-keyed `JsonObject` access onto the typed results, which removes most `src/json/getters.ts` use from command code.
- Constrain table column keys to `keyof` the row entity, so a mistyped column name fails to compile instead of rendering an empty column.
- Keep `callTool` and `runTool` as the untyped escape hatch behind `silpo raw`; `runTool` stops stripping `success`, so it now returns the payload literally unchanged.
- Commit the `tools/list` snapshot as the provenance record for the hand-written types, so a later `tools/list` dump can be diffed against it to detect server drift.
- Fix `structuredOutput` → `structuredContent` in `src/mcp/session.ts` first; until that is corrected every tool call fails and the typed layer would sit on top of a dead path.

Types are written by hand from the schema snapshot. No code generator is introduced, and no runtime validation is added — the MCP SDK already validates structured output against the server's own `outputSchema`, and a second validation against hand-written types would fail on exactly the divergences documented in the hand-written contract.

## Capabilities

### New Capabilities

- `typed-tool-client`: a typed call surface over the MCP tool set — one method per tool, argument and result types sourced from a committed schema snapshot, nullability taken from the server's declared schema, and a documented escape hatch for tools and fields the schema does not describe.

### Modified Capabilities

- `mcp-session`: its tool-call outcome contract changes. A payload whose success marker is false stops being a failure of the call and becomes data the command receives, with a non-zero exit status carrying the signal for writes. Its duplicated account of the untyped raw call moves to `typed-tool-client`, which is where the untyped path is now specified.

The command surface — every command, argument, and flag — is unchanged. Observable output changes in two places, both deliberate:

- Commands that print their payload as JSON now include `"success": true`, which `runTool` previously stripped.
- `profile`, `profile addresses`, `delivery types`, and `delivery slots` had their rendering commented out and printed nothing at all. They now render tables, because the typed results made the intended rendering expressible.

## Impact

- **New**: `src/mcp/entities/` (21 files), `src/mcp/tools/` (39 definition files), `src/mcp/silpo.ts`, and the mapped surface type both transports implement.
- **Modified**: all 15 files under `src/commands/`, which import their call surface from the background-process layer rather than from `src/mcp/`; `src/render/` for `keyof`-constrained columns and for the standard-library types; `src/mcp/session.ts` for the `structuredContent` fix, for returning the whole response, and for the guard that narrows it; `src/daemon/protocol.ts` to carry the unstructured `content`; `src/daemon/client.ts` to implement the surface and to drop `ToolFailureError`; `src/db/calls.ts` for the payload type.
- **Removed**: the helper that wrapped `runTool` for the tool files, which is what put `src/mcp/` on the wrong side of the dependency. And `src/json/` in full — `getters.ts` and `checkers.ts` end with no callers at all, five of the seven casters and `JsonNode` likewise, and the four type aliases are replaced by `Record<string, unknown>`, `unknown`, and `unknown[]`.
- **Unchanged**: `src/commands/options.ts` — its `toJsonObject` and `toJsonArray` are argument parsers unrelated to `src/json/`, and already speak in standard-library types.
- **Blocked on documentation, not schema**: `silpo_get_shopping_cart_by_id.cart`, `silpo_update_shopping_cart.address`, and `silpo_get_categories_tree.tree[]` are declared as empty objects by the server, so their types come from the hand-written contract for the cart, the cart address argument, and the catalog.
- **No dependency changes.** No generator in the build, no runtime schema library.
