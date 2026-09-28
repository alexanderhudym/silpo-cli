## Context

See proposal.md — Why.

Two facts about the current code shape the approach.

`commandInput` builds the record from two different sources: positional arguments come from `command.args`, which commander leaves raw, while option values come from `command.opts()`, which holds whatever the option's parser produced. That asymmetry is the root of every fidelity defect — the alias is already a uuid, the JSON is already an object, the short form is already the long form.

Commander does keep the untouched argv, but only on the root command: a subcommand's `rawArgs` is empty, while the root's holds the full `process.argv`. Climbing the `parent` chain and slicing off `node` and the script name yields exactly what the user typed after `silpo`.

The project defines no short options anywhere — every option is declared in its `--long` form only. That removes combined short flags from the argv walk.

The report's list form is not built here. It comes from the configurable layout renderer delivered by a separate change; this change only supplies the configuration for it. See "gain calls configures the shared layout renderer" below for what that renderer has to support.

## Goals / Non-Goals

**Goals:**

- One source for the recorded invocation: the raw argv.
- A grouping key that normalises option order and nothing else.
- A report that never has to shorten what it prints.

**Non-Goals:**

- Migrating the existing recorded history. It is dropped.
- A per-call timestamped log. The report stays an aggregate over invocations.
- Making the recorded string executable as a shell command. It is read, not run, so values are not re-quoted.
- Building the layout renderer's configurability. That is a separate change; this one is a consumer of it.

## Decisions

### Build the record by walking the root command's raw argv

`commandInput` climbs to the root command, takes `rawArgs.slice(2)`, and walks it, using the command's own option table to decide whether a `--flag` consumes the next token. Options declared on ancestor commands are found by walking up the `parent` chain. A `--` terminator ends option parsing; everything after it is positional.

The walk produces the command path plus positional arguments as one string, and the options as an ordered list of flag and value pairs.

*Alternative considered:* keep reading flags from `getOptionValueSource(...) === "cli"` — which does correctly report which options were passed — and read only the values from argv. Rejected: pairing those two sources back up needs the same walk, so it is the walk plus extra bookkeeping.

*Alternative considered:* record the whole argv as a single shell-quoted string. Rejected once the report moved to a list form: options are rendered one per line, so they must be stored as separate pairs, and the line break already delimits a value that contains spaces. Quoting would be noise.

### Store options as a JSON array of pairs

`options` holds `[["--limit","3"],["--type","SelfPickup"]]`. An array, not an object, because the order is part of the record and because an option may repeat — the `command-input` spec requires repeatable options.

### One table, first invocation selected by `MIN(id)`

```sql
CREATE TABLE IF NOT EXISTS calls (
  id          INTEGER PRIMARY KEY,
  key         TEXT NOT NULL,
  command     TEXT NOT NULL,
  options     TEXT NOT NULL,
  tool        TEXT NOT NULL,
  tool_tokens INTEGER NOT NULL,
  text_tokens INTEGER NOT NULL
);
```

`key` is the command string, the tool, and the option pairs sorted by flag then value — the canonical form that ignores the order the options were typed in. It is stored rather than derived on read so grouping is a plain `GROUP BY key`.

Reading uses SQLite's documented rule that bare columns in a query with `MIN()` or `MAX()` come from the row that produced the extreme value:

```sql
SELECT key, MIN(id) AS first, command, options, tool,
       COUNT(*) AS calls, SUM(tool_tokens) AS toolTokens,
       SUM(text_tokens) AS textTokens,
       SUM(tool_tokens - text_tokens) AS totalSaved
FROM calls GROUP BY key ORDER BY totalSaved DESC, command
```

So "the wording of the first invocation" is expressed by `MIN(id)` and needs no extra code.

*Alternative considered:* a separate `invocations` table keyed by `key`, with `calls` referencing it. It makes first-wins fall out of `INSERT OR IGNORE` and removes the duplicated text, but costs two writes per call and a join on every read. The duplication is a few hundred bytes at the scale this table ever reaches.

### `gain` prints totals, `gain calls` prints the breakdown

Splitting them is what removes the pressure to truncate: nothing on the totals screen is variable-width, and the breakdown is free to be as wide as it needs. `gain clear` is unchanged.

Rendering shape:

```
Gain
calls          86
tool output    432441
command output 187949
totalSaved     244492 (56.5%)
```

```
Calls
- branches
  options
    limit=3
  calls: 6  saved: 191922  avg: 31987 (63.4%)
- orders online
  calls: 1  saved: 6356  avg: 6356 (39.2%)
- delivery slots 1ee15e2a-7c41-6b83-9d52-4b7d0e93c468
  options
    type=SelfPickup
    limit=2
  calls: 1  saved: 130  avg: 130 (56.3%)
```

The `- ` marker is two characters wide, so the body of an entry indented by two aligns under the command text. Metric groups are separated by exactly two spaces and are not padded to a shared width. The `options` block is omitted entirely when an invocation carries none. Flags are printed without their leading dashes, matching the `key=value` form the rest of the CLI uses.

### `gain calls` configures the shared layout renderer

`renderPayload` in `src/render/layout.ts` already produces exactly the structure this report needs — a marker per record, an indented body, nested blocks for grouped values, and pairs packed two spaces apart. What it does not have is the ability to be told how. A separate change makes it configurable; this change feeds it a record per invocation and the configuration below.

The record:

```js
{ command: "branches", options: { limit: "3" }, calls: 6, saved: 191922, avg: 31987, percent: "63.4%" }
```

The configuration it needs:

| Need | Why |
|---|---|
| Explicit key order, spanning scalars and nested objects alike | `command`, then the `options` block, then the metrics. The renderer's own order is by pair width, and it prints every scalar before any nested object — so `options` would land third, not second |
| `command` forced onto its own line | Otherwise it packs together with the metrics |
| Separator per key, not per render | `calls: 6` and `limit=3` occur in the same record |
| Marker form `- ` instead of `#N` | |
| Values passed through untouched | `plainText` rewrites anything that parses as a time into local time, which would corrupt an option value such as `--timeslot-start=2026-08-19T10:00:00+00:00` |
| Shared-value extraction off | `renderList` hoists scalars common to every record into a `common` block; here that would fire whenever, say, every invocation has `calls: 1` |
| `percent` merged into `avg`, then hidden | Produces `avg: 31987 (63.4%)` |

*Alternative considered:* a list renderer local to `src/commands/gain.ts`. Rejected after the fact — the same configurability is wanted for the payload renderers anyway (hiding keys, composing a product name from several fields), so a second renderer would be a parallel implementation of something the project is about to grow regardless.

### Wipe the database file

The new `calls` table shares its name with the old one, so `CREATE TABLE IF NOT EXISTS` would silently keep the old shape. The alternative — shipping a `DROP TABLE IF EXISTS calls` in the schema — is exactly the pattern this change removes for `entities` and `entity_fields`, which still run on every open.

## Risks / Trade-offs

- **Removing `~/.silpo/silpo.db` destroys recorded aliases as well as the call history** → Aliases are re-registered as payloads are rendered, so the cost is a handful of commands showing bare uuids. The call history is measurement data with no downstream consumer.
- **The argv walk duplicates knowledge commander already has** → It reads arity from commander's own `Option` objects rather than hardcoding it, so a new option needs no change here. The absence of short options in the project keeps the walk small; if one is ever added, the walk must learn `-x value`, `-xvalue`, and `-abc`.
- **Grouping on exact values fragments the report** → Accepted deliberately. Merging `--limit 3` with `--limit 100` would make `avg` meaningless, and `avg` is the number the report exists to show. On the current 86 recorded calls the new key produces the same 47 entries as today: the normalisation is a guarantee for the future, not a visible improvement.
- **The list form costs several times the vertical space of the table** → `gain` is a service command read by a person, so its own token cost does not matter.
- **This change cannot finish until the layout renderer is configurable** → Everything except the report rendering is independent and can land first: the argv walk, the schema, the grouping, and the totals block. Only the `gain calls` output waits. If the renderer change stalls, the fallback is the local renderer this design rejected, at the cost of writing it twice.
- **`MIN(id)` selecting bare columns is a SQLite-specific guarantee** → It is documented and stable, and the project already commits to `node:sqlite`. If it ever needs to move, the fallback is the two-table shape described above.

## Migration Plan

1. Remove `~/.silpo/silpo.db`.
2. First run recreates the schema without the stale drops and with the new `calls` table.

No rollback path is needed: the data is measurement history and is already being discarded.
