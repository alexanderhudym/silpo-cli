## Why

The call history behind `silpo gain` does not record what the user typed. It reads option values from the parsed command state, so a JSON argument lands in the database as `[object Object]`, an alias is stored already resolved into a 36-character uuid, and the option list is joined with commas into a form that no longer resembles a command line. On top of that, the report renders as a table whose `command` column stretches to the width of its longest row, pushing every other column off the screen.

## What Changes

- Record the invocation from the raw argv the user typed, instead of reconstructing it from parsed option values. JSON arguments keep their text, aliases stay unresolved, and short-lived parser coercions no longer leak into the history.
- Store each recorded option as a flag and value pair in the order it was typed, so the report can lay options out one per line.
- Group recorded calls by an order-insensitive key over the command path, the positional arguments, and the options with their values. Two invocations that differ only in the order their options were written collapse into one entry, and the entry keeps the wording of the first invocation. Invocations that differ in any option value stay separate, because their payload sizes are not comparable.
- Move the per-invocation breakdown out of `gain` into a new `gain calls` subcommand and render it as a list rather than a table, so nothing has to be truncated. `gain` itself now prints totals only. The list is produced by the shared layout renderer, whose configurability is delivered by a separate change.
- **BREAKING** Replace the `calls` table. The recorded history is dropped; `~/.silpo/silpo.db` is removed so the schema is recreated from scratch.
- Remove the `DROP TABLE IF EXISTS entity_fields` and `DROP TABLE IF EXISTS entities` statements that still run on every database open.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `token-accounting`: how a call is identified and recorded, how recorded calls are grouped, and the split of the report into `gain` totals and a `gain calls` breakdown.
- `output-rendering`: tables stop being the only form for the CLI's own state; a list form is added for it.

## Impact

- `src/commands/input.ts` — `commandInput` returns the command path with positional arguments plus a list of typed option pairs, built by walking the root command's raw argv.
- `src/db/database.ts` — new `calls` schema, stale `DROP TABLE` statements removed.
- `src/db/calls.ts` — record and read against the new schema; grouping key and first-invocation selection.
- `src/commands/gain.ts` — `gain` prints totals only, new `gain calls` subcommand that shapes each invocation into a record and configures the shared layout renderer to print it.
- Depends on the separate change that makes `src/render/layout.ts` configurable. Only the `gain calls` rendering waits on it.
- Every command module that calls `recordCall` — the call site changes shape.
- `test/input.test.ts`, `test/calls.test.ts` — rewritten against the new contract.
- Users lose their recorded call history and their stored aliases when the database file is removed. Aliases are re-registered as payloads are rendered again.
