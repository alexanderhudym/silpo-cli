## Context

See proposal.md — Why. The state this design starts from: `src/render/` holds five modules and
about 133 lines behind five exports, consumed by `server`, `config`, `auth`, `aliases` and
`gain`. Everything else in the CLI composes text from `src/utils/` — `formatRows`, `formatList`,
`formatEntryAsRow`, `formatEntryAsSection`, `toOneLine`.

Two facts about the current code shape the plan:

- `formatEntryAsSection(key, value)` emits `key\n<value>` and does not indent. The three
  commands that nest — `cart`, `catalog`, `orders` — each carry an identical private
  `indent()`, five lines apiece.
- `indent()` is called both with and without a surrounding section: the category tree indents
  its own recursion, and a cart validation indents its context block, neither under a name.

## Goals / Non-Goals

**Goals**

- One dialect: after this change no command has a form reserved for it.
- `src/render/` gone, with no successor module taking its place.
- The three copies of `indent()` become one.

**Non-Goals**

- Token count of these five outputs. They report the CLI's own state, `silpo gain` does not
  measure them, and `gain calls` grows by one line per entry. Not a consideration.
- Renaming `src/utils/`. After this change `list.ts` and `record.ts` are the CLI's text layer
  sitting among `coordinate.ts` and `datetime.ts`, which is a name worth revisiting — but not
  under this change.
- The `--json` output of `config` and `server`. Untouched.

## Decisions

### The alias listing groups rather than repeating

`silpo aliases` is the only table in the CLI, and translating it field-by-field into the
composed form costs six lines per handle where the table spent one:

```
id: 1                              product.productId
alias: @aal                          @aal: 1ed07606-0894-6584-ac01-dd63763181f9
entity: product          vs          @abc: 1ed07609-566a-6c24-829d-dd63763181f9
field: productId
value: 1ed07606-…                  branch.branchId
                                     @aba: 1ee15e2a-7c41-6b83-9d52-4b7d0e93c468
id: 2
…
```

Grouping under `<entity>.<field>` uses the composed form's own group-and-indent shape — the one
`profile family` already prints — and stops repeating the entity and field on every line. The
dot matches how `config` already spells a compound key (`daemon.idleTimeout`).

*Alternatives considered.* Field-by-field composition: correct but six lines per handle for no
gain in what is conveyed. A positional one-liner (`@aal product productId 1ed07606-…`): as
cheap as the table, but a bare three-tuple is a shape found nowhere else in the dialect, which
is the thing this change exists to stop.

The sequence number is dropped rather than printed as a key: it is the SQLite rowid, no command
accepts it, and the handle already identifies the record.

Group order follows first assignment rather than the alphabet, so a listing stays stable as
handles are added and reads in the same order the old `ORDER BY id` produced.

### A lookup answers with a bare value

`silpo aliases get` resolves in both directions, and the useful answer is the half the caller
does not already have:

```
silpo aliases get @aal                          → 1ed07606-0894-6584-ac01-dd63763181f9
silpo aliases get product productId 1ed07606-…  → @aal
```

Printing a block here would be printing back what was typed plus one new value. A bare line
matches `silpo config get`, which the spec already calls out as suitable for a shell
substitution. This is what removes the last caller of `renderRows` and `cellText`.

### The breakdown's closing line is one fact, not three

`calls: 2  saved: 1234  avg: 617 (48.6%)` puts three keys on one line separated by double
spaces — a shape no other command uses. The naive fix is three lines. Instead the four numbers
become one fact under the key that names what the report is about:

```
saved: 1234 over 2 calls, 617 each (48.6%)
```

The composed form already permits several fields joined into a single piece of text, and this
keeps the cost of dropping the `- ` marker at one added line per entry rather than three.

### `indent` is exported, not folded into `formatEntryAsSection`

Folding the two spaces into `formatEntryAsSection` would also collapse the three copies, and
would be less code. It does not work: `catalog.ts` indents its own recursion and `cart.ts`
indents a validation's context, both without a name above them. `indent` moves to
`src/utils/list.ts` as its own export and `formatEntryAsSection` keeps its current meaning, so
the three command-local copies are deleted rather than reimplemented.

### No golden files for the five commands

Their output carries a home path, a pid, an uptime, an idle-stop clock and live token counts.
Pinning that needs a scrubbing layer worth more than the coverage it buys. `test/table.test.ts`
and `test/rows.test.ts` are deleted with their subjects and nothing replaces them directly.

What remains is real coverage even so: `test/commands.test.ts` consumes the output of `aliases`
and `gain calls` to drive its assertions, so a format regression in either fails the suite. The
risk is the tests being bent to fit — see below.

## Risks / Trade-offs

- **Three helpers in `test/commands.test.ts` parse output positionally** — `entries` and `entry`
  key on a leading `- `, `aliasOf` reads `split(/ +/)` offsets, and two assertions require the
  first line to be `Calls` and the text to hold no `\n\n`. All four are wrong by design after
  this change, which makes it easy to relax them into passing rather than rewriting them.
  → Rewrite `aliasOf` to find the `<entity>.<field>` group line and read the handle from the
  line below it, and `entries` to split on the empty line. Keep every assertion that survives
  the reshaping; do not weaken one to make it pass.
- **Deleting three requirements is easy to over-apply.** The composed form's scenarios about
  width and markers now bind commands that were previously exempt.
  → The delta states the widened scope explicitly in `Output a command composes itself`; check
  each of the five commands against it rather than against the old exemption.
- **The `output-rendering` Purpose still carves out the CLI's own state**, and a delta spec's
  Purpose is ignored for an existing capability.
  → Edit `openspec/specs/output-rendering/spec.md` by hand; it is a task of its own below so it
  is not lost at archive time.
- **`idle stop` → `idleStop` is a silent break** for anyone grepping `silpo server` output.
  → Accepted. Nothing in the repo greps it, and every other key the CLI prints is an
  identifier. This stays a decision about one command rather than a rule in the composed form:
  the cart's validations already build their key as `<level> <type>` and print `error product:`,
  so a spec requiring one-word keys would either be false on landing or drag the validations
  into this change.

## Migration Plan

1. `indent` into `src/utils/list.ts`; delete the three copies in `cart.ts`, `catalog.ts`,
   `orders.ts`. No output changes — the golden files must pass untouched, which is the proof
   the lift was faithful.
2. Rewrite the output half of `server`, `config`, `auth`, `aliases`, `gain` against `src/utils/`.
3. Delete `src/render/`, `test/table.test.ts`, `test/rows.test.ts`.
4. Rewrite the three helpers and four assertions in `test/commands.test.ts`.
5. Edit the `output-rendering` Purpose in the main spec by hand.

Step 1 is separable and reversible on its own. From step 2 the output is broken by intent and
there is no rollback short of reverting the change; the CLI is unpublished and single-user, so
no compatibility window is owed to anyone.
