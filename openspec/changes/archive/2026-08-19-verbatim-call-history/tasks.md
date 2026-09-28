## 1. Capture the invocation as typed

- [x] 1.1 Change `commandInput` in `src/commands/input.ts` to climb the `parent` chain to the root command and read `rawArgs.slice(2)` instead of `command.args` and `command.opts()`
- [x] 1.2 Walk those tokens, resolving each `--flag` against the command's own `Option` list and its ancestors' to decide whether the flag consumes the next token; handle `--flag`, `--flag value`, `--flag=value`, repeated flags, and the `--` terminator
- [x] 1.3 Return the command path with its positional arguments as one string, plus the options as an ordered list of flag and value pairs
- [x] 1.4 Rewrite `test/input.test.ts` against the new return shape, covering: an alias stays unresolved, a JSON option value keeps its text, a repeated option yields two pairs, a valueless flag yields a pair with no value, `--flag=value` and `--flag value` both parse, and a positional written after an option is not eaten as that option's value

## 2. Rebuild the storage

- [x] 2.1 Drop `DROP TABLE IF EXISTS entity_fields` and `DROP TABLE IF EXISTS entities` from the schema in `src/db/database.ts`
- [x] 2.2 Replace the `calls` table with the shape in design.md — `key`, `command`, `options`, `tool`, `tool_tokens`, `text_tokens`
- [x] 2.3 Add the canonical key derivation in `src/db/calls.ts`: the command string, the tool, and the option pairs sorted by flag then value
- [x] 2.4 Change `recordCall` to take the new `commandInput` result, serialise the option pairs as JSON, and store the derived key
- [x] 2.5 Change `listCalls` to `GROUP BY key` with `MIN(id)` so the first invocation's wording is returned, ordered by total saved descending, and parse the options JSON back into pairs
- [x] 2.6 Rewrite `test/db/../calls.test.ts` (`test/calls.test.ts`) to cover: two calls differing only in option order collapse into one entry, the first wording wins, two calls differing in an option value stay apart, and totals still sum across every call

## 3. Split and re-render the report

Group 3 is the only part of this change that waits on the configurable layout renderer. Groups 1, 2 and 4.2 stand alone.

- [x] 3.1 Reduce `gain` in `src/commands/gain.ts` to the totals block only, dropping the table and the `renderTable` import
- [x] 3.2 Add a `gain calls` subcommand
- [x] 3.3 Shape each invocation into a record — `command`, `options` as a nested object, `calls`, `saved`, `avg`, `percent` — and render it through the configurable layout renderer (blocked on that change) with: key order `command`, `options`, metrics; `command` on its own line; `:` for the metrics and `=` inside `options`; the `- ` marker form; values passed through untouched; shared-value extraction off; `percent` merged into `avg` as `31987 (63.4%)`
- [x] 3.4 Make `gain calls` say no calls have been recorded yet when the history is empty, and report a zero saved share instead of dividing by zero
- [x] 3.5 Update every `recordCall` call site for the new argument shape — `src/commands/` for branches, cart, catalog, delivery, loyalty, np, orders, products, profile

## 4. Verify

- [x] 4.1 Add an end-to-end case to `test/commands.test.ts` that records a call through the spawned CLI and asserts the `gain calls` output verbatim, including an invocation with a JSON option value and one with an alias
- [x] 4.2 Run `npm test` and confirm the whole suite passes
- [x] 4.3 Remove `~/.silpo/silpo.db`, run a real command, and confirm `gain calls` shows the invocation as typed — alias unresolved, JSON value intact, options in the typed order
