## 1. Lift the shared indent

- [x] 1.1 Add `indent` to `src/utils/list.ts`, indenting every non-empty line by two spaces
- [x] 1.2 Delete the private `indent` from `src/commands/cart.ts`, `src/commands/catalog.ts` and `src/commands/orders.ts` and import the shared one
- [x] 1.3 Run the suite: every golden file under `test/expected/` must pass untouched, proving the lift changed no output

## 2. Compose the pair-shaped commands

- [x] 2.1 `src/commands/server.ts`: replace `renderPairs` with `formatRows` and `formatEntryAsRow` across the status, the connection test and the stopped state
- [x] 2.2 `src/commands/server.ts`: rename the `idle stop` key to `idleStop`
- [x] 2.3 `src/commands/config.ts`: compose the settings listing and the echo after `config set`, keeping the file path first and the `(default)` marker
- [x] 2.4 `src/commands/auth.ts`: compose the summaries printed after `login` and after `logout`
- [x] 2.5 Confirm the `--json` branches of `config` and `server` are untouched

## 3. Regroup the alias listing

- [x] 3.1 `src/commands/aliases.ts`: print the listing as groups named `<entity>.<field>`, each holding its handles indented one level as `<handle>: <value>`
- [x] 3.2 Order the groups by first assignment and the handles inside a group by assignment order; do not print the sequence number
- [x] 3.3 Separate neighbouring groups with exactly one empty line
- [x] 3.4 `aliases get`: print the bare value for a handle, and the bare handle for an entity, field and value, with no key and no group name
- [x] 3.5 Keep the existing failure when a handle does not exist and when the triple is incomplete

## 4. Compose the gain report

- [x] 4.1 `src/commands/gain.ts`: drop the `Gain` heading and print the four totals one fact per line
- [x] 4.2 Drop the `Calls` heading and the `- ` record marker from the breakdown
- [x] 4.3 Open each entry with the command path and indent its option list one level
- [x] 4.4 Replace the three-key closing line with one fact: `saved: <total> over <n> calls, <avg> each (<share>)`
- [x] 4.5 Separate neighbouring entries with exactly one empty line
- [x] 4.6 Keep the zero-payload case reporting a zero percent share rather than failing

## 5. Delete the renderer

- [x] 5.1 Delete `src/render/` — `pairs.ts`, `table.ts`, `json.ts`, `text.ts`, `cell.ts`
- [x] 5.2 Delete `test/table.test.ts` and `test/rows.test.ts`
- [x] 5.3 Confirm nothing imports from `src/render/` and the build is clean

## 6. Repoint the tests

- [x] 6.1 `test/commands.test.ts`: rewrite `aliasOf` to find the `<entity>.<field>` group line and read the handle from the line beneath it
- [x] 6.2 Rewrite `entries` and `entry` to split the breakdown on the empty line instead of the `- ` marker
- [x] 6.3 Replace the assertion that the breakdown's first line is `Calls` with one that it is the first entry's command path
- [x] 6.4 Replace the assertion that the breakdown holds no `\n\n` with one that exactly one empty line stands between entries
- [x] 6.5 Rewrite the two lookups that read the cart and branch handles out of the `aliases` listing
- [x] 6.6 Confirm no assertion was weakened to pass: each rewritten check still asserts the same fact about the new shape
- [x] 6.7 Repoint the two positional parsers the plan missed: `aliasedValues` in `test/commands.test.ts` and the `- ` entry check in `test/profile.test.ts`

## 7. Close the specs

- [x] 7.1 Edit the Purpose of `openspec/specs/output-rendering/spec.md` by hand to drop the carve-out for the CLI's own state, since a delta's Purpose is ignored for an existing capability
- [x] 7.2 Run `openspec validate --changes one-output-dialect`
- [x] 7.3 Run the full suite and confirm every golden file under `test/expected/` is still byte-identical
