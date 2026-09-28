## Why

Retiring the uniform renderer moved all 39 tool-backed outputs onto one composed house style
and left `src/render/` standing as an exception for the five commands that report the CLI's
own state. The exception has not paid for itself. It costs a second dialect — aligned columns,
no colon, a table — that a reader meets the moment they move from `silpo profile` to
`silpo aliases`, and it costs three requirements in `output-rendering` that exist only to
bless 133 lines of code.

The exception is also already inconsistent with the spec that grants it: the composed form
requires that "no width is measured or detected anywhere in the CLI", while `renderPairs` and
`renderTable` measure width and pad to it. One of the two has to go, and the composed form is
the one 39 commands follow.

## What Changes

- `src/render/` is deleted in full: `pairs.ts`, `table.ts`, `json.ts`, `text.ts` and `cell.ts`.
  `renderEmptyRow` has no caller today; `renderRows` and `cellText` lose theirs below.
- The five commands that used it compose their own text in the house style, like every other
  command: `server`, `config`, `auth` (`login` and `logout`), `aliases`, `gain`.
- `silpo aliases` groups its list by entity and field rather than tabulating it. The group is
  named `<entity>.<field>` on its own line and each alias follows indented beneath it as
  `<handle>: <value>`. The table's sequence number is dropped: it is the internal rowid and no
  tool accepts it.
- `silpo aliases get` prints the bare other half of the pair — the value for a handle, the
  handle for an entity, field and value — with no key and no surrounding block, so it can be
  used in a shell substitution the way `silpo config get` already can.
- `silpo gain` and `silpo gain calls` drop their `Gain` and `Calls` headings; the user typed
  the command and the heading repeats it.
- `silpo gain calls` drops the `- ` record marker, since no other command carries one, and
  separates its entries with one empty line instead. Its closing line becomes one fact under
  one key — `saved: 1234 over 2 calls, 617 each (48.6%)` — replacing three keys sharing a line,
  a shape found nowhere else in the dialect.
- `silpo server` renames the `idle stop` key to `idleStop`; every other key in the CLI is an
  identifier without a space.
- The `indent` helper, copied identically into `cart.ts`, `catalog.ts` and `orders.ts` because
  `formatEntryAsSection` does not indent, moves to `src/utils/list.ts` and serves the five
  migrated commands too.
- **BREAKING**: the text `server`, `config`, `auth`, `aliases` and `gain` print changes.

The token cost of these five outputs is not a consideration: they report the CLI's own state,
they are not what `silpo gain` measures, and `gain calls` grows by one line per entry. One
dialect is the whole point of the change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `output-rendering`: the three forms reserved for the CLI's own state — `Label and value
  blocks`, `Tables` and `List form for the CLI's own state` — are removed, along with the
  scenarios inside them that send server payloads elsewhere. `Output a command composes
  itself` widens from commands printing an MCP payload to every command that prints, and the
  purpose stops carving out the CLI's own state.
- `id-aliases`: the alias listing stops being a table of five columns and becomes handles
  grouped under the entity and field they belong to; the sequence number stops being printed.
  A lookup returns a bare value rather than a row.
- `token-accounting`: the call breakdown states its entries in the composed form — no heading,
  no record marker, one empty line between entries, and one closing line under one key. The
  scenario about values long enough to distort a table stops naming a table.
- `mcp-session`: the JSON status is contrasted with composed text rather than with aligned
  text.

`cli-configuration` is unaffected: it requires the file path followed by one line per key with
its effective value and a marker on defaults, which the composed form satisfies. `authorization`
says nothing about the shape of the text it prints.

## Impact

- Code: `src/render/` removed; the output half of `src/commands/server.ts`, `config.ts`,
  `auth.ts`, `aliases.ts` and `gain.ts` rewritten; `indent` lifted into `src/utils/list.ts` and
  its three copies in `src/commands/cart.ts`, `catalog.ts` and `orders.ts` removed.
- Tests: `test/table.test.ts` and `test/rows.test.ts` are removed with their subjects. No
  golden files are added for the five commands — their output carries paths, pids, uptimes and
  token counts, and pinning it is not worth the fixture. `test/commands.test.ts` keeps its
  coverage but rewrites the three helpers that parse output positionally (`entries`, `entry`,
  `aliasOf`) along with the assertions that the breakdown opens with `Calls` and holds no
  empty line.
- Docs: none. What composing saved was recorded for tool payloads; these five commands
  print no tool payload and belong in no such table.
