## Context

See proposal.md — Why. Two constraints shape the approach:

`src/utils/` already demonstrates the split this change generalises. `toLatitude` and
`toUtc` are pure conversions living with their subject, while `readLatitude` and
`readTimestamp` in `options.ts` stand in front of them doing two unrelated jobs at once:
turning a failed conversion into a sentence, and absorbing the `undefined` commander hands
over for an option nobody passed. The `value-conversion` spec already requires that both
directions of a subject live together and that converters not choose how a failure is
presented. This change moves the first job into the subject and gives the second back to
the caller.

`tsconfig.json` sets `strict` and `noUncheckedIndexedAccess` but not
`exactOptionalPropertyTypes`. That matters: `{ limit: undefined }` is assignable to
`limit?: number` today, so a call site may write `undefined` for an option nobody passed
and let `JSON.stringify` drop the key.

## Goals / Non-Goals

**Goals:**

- One answer to "is this text a number", reachable from both the command line and the
  resolvers
- Every conversion in the module of the subject it reads, leaving no central parsing module
- No conversion that has to be told whether it was given anything to read
- A vocabulary in which "could not read this" and "there was nothing to read" cannot be
  confused

**Non-Goals:**

- Changing what any tool call sends, beyond the argument forms the specs now refuse
- Merging `branch` and `company` resolution, which is costed separately
- Touching `readAddress`, whose pass-through of unknown fields is deliberate and documented
  in `mcp/entities/cart.ts`
- Introducing a `Result`-style wrapper type

## Decisions

### Each reading is written out, and a test holds them together

`DECIMAL = /^-?\d+(\.\d+)?$/` and `WHOLE = /^-?\d+(\.0+)?$/`. Each conversion reads its own
form and calls `Number` itself; neither is expressed through the other. Predicates remain
the conversion asked as a question — `isInteger` is `toInteger(raw) !== null` — because a
predicate written beside its conversion is the one duplication that has no way to be caught.

Deriving the whole-number reading from the decimal one was the first shape here, and it
made `toInteger` pick the fractional group back out of the match to check it was zero. Two
plain regexes say the same thing in a line each.

*The risk that buys — the forms drifting apart* — is answered by a test asserting that
everything `toInteger` accepts `requireNumber` accepts and reads to the same value. That is
cheaper than the indirection and it fails loudly, where drift would otherwise be silent.

*Alternative — `/^-?\d+$/` for whole numbers.* Rejected: it refuses `12.0`, which the tool
contracts and the spec both accept.

*Alternative — `Number()` with `Number.isFinite`.* What the code does today. Rejected: it
accepts `1e3`, `0x10` and `Infinity`, and reads `""` and `"  "` as `0`.

*Alternative — `Number.parseInt` / `Number.parseFloat`.* Rejected: they are prefix parsers
and are wrong in both directions at once.

| input | `parseInt` | `parseFloat` | `Number` | wanted |
| --- | --- | --- | --- | --- |
| `""` | NaN | NaN | **0** | refuse |
| `"12.0"` | 12 | 12 | 12 | 12 |
| `"1e3"` | **1** | 1000 | 1000 | refuse |
| `"0x10"` | **16** | 0 | 16 | refuse |
| `"12abc"` | **12** | **12** | NaN | refuse |
| `"1_000"` | **1** | **1** | NaN | refuse |

`parseInt("1e3") === 1` is not a permissive read, it is a wrong number returned silently.
The failure mode that decides it: the whole-number predicate is what a resolver uses to
choose between a local number and a slug, and a prefix parser would classify text
beginning with digits as a local number and resolve it to an unrelated record.

### Conversions do not trim

Text is trimmed before it is offered to a conversion, not inside one. Three properties are
wanted and only two can hold at once: that asking whether `" 12 "` is a number answers no,
that converting it yields `12`, and that the question and the conversion are one
implementation. The second is the one worth losing — its only beneficiary is a value that
arrives padded by a shell quoting accident, and the resolvers that ask the question need
the strict answer.

### `null` for unreadable, `undefined` for absent

A conversion answers `T | null` where it answers at all. Its raising companion turns the
`null` into a failure, so `null` never leaves `utils/`. `undefined` is what a call site
writes for an option nobody passed, and it is written there rather than produced by any
conversion.

The research does not settle this: the [Google TypeScript Style
Guide](https://google.github.io/styleguide/tsguide.html) declines to prefer either and says
context decides; the TypeScript team leans to `undefined`
([microsoft/TypeScript#9653](https://github.com/microsoft/TypeScript/issues/9653)); the
classic semantic split — `null` as intentional absence — leans the other way; and the
built-ins are themselves divided, with `Map.get` answering `undefined` and `RegExp.exec`
answering `null`. So the codebase decides, and here the two words already mean different
things: `undefined` is what commander gives for an option nobody passed and what
`node:sqlite` gives for a row that is not there, while a failed conversion is an answer to
a question. Keeping them apart also keeps the wire honest, since `JSON.stringify` drops an
`undefined` argument and sends a `null` one.

*Alternative — `undefined` everywhere.* Rejected: it collapses "not a number" into "not
passed" at exactly the boundary where the difference decides whether a tool call carries
the argument.

*Alternative — `{ ok, value }` discriminated union.* Rejected: no caller needs a reason for
the failure; the raising companion supplies the wording.

### Absence is branched where the call is built

The caller holds the option and already knows whether it was passed. It writes the branch:
`limit: options.limit === undefined ? undefined : requireInteger(options.limit)`. No
subject offers a reader that takes text which may be absent, so no signature in `utils/`
admits `string | undefined`.

Of the forty-seven sites, fifteen read an argument or a `requiredOption` and therefore
carry no branch at all — they simply call the conversion. The branch is written at the
remaining thirty-two.

*Alternative — a shared `optional(read)` factory* producing overloaded readers. Rejected:
it exists only to spare the caller a check it is best placed to make, it hides that check
behind a cast the overload set cannot express structurally, and pairing it with a
non-raising conversion (`optional(toInteger)`) type-checks while silently turning
unreadable input into an omitted argument.

*Alternative — `options.limit && requireInteger(options.limit)`.* Rejected on evidence:
`&&` short-circuits on every falsy value, so `--limit ""` would yield `""` rather than
failing — reinstating the exact bug this change removes — and the expression's type
becomes `"" | number | undefined`. The
[TypeScript 3.7 notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html)
draw the same distinction when contrasting `&&` with `?.`, and
[typescript-eslint](https://typescript-eslint.io/rules/prefer-nullish-coalescing/) carries
the same rationale for `??` over `||`.

*Alternative — optional chaining.* Does not apply: `?.` short-circuits property access,
element access and calls; it does not lift a function over an absent argument, and
`f(a?.b)` still calls `f`. TypeScript offers no native map over an optional value, so the
explicit ternary is the idiom.

### A conversion that already raises carries its own wording

`toUtc` raises for text that names no time — the `value-conversion` spec already requires
that. Its message is Temporal's, so a wrapper existed to replace it with one naming both
accepted forms. That wrapper earned nothing but a sentence, so the sentence moves into
`toUtc`, whose only callers are these readings, and the wrapper goes.

A raising companion survives only where the conversion answers nothing and someone must
turn that nothing into a failure: `requireInteger` beside `toInteger`, `requireLatitude`
beside `toLatitude`, `requireString` beside `readString`.

### Shapes with more than two states are branched where they are built

`readTimeslot` walks every key of a JSON object to convert two of them, returns
`Record<string, unknown>`, and reaches its single call site through
`as unknown as CartTimeslot` — a double cast that admits the type is wrong for a target of
exactly two required fields. It goes, and the object is written out.

`readNullableString` and `readNullableNumber` have two call sites between them, adjacent in
one object literal. The capability is real — the tool schema documents `null` on
`bonusRequested` as the way to remove bonus payment — but a signature admitting
`number | null | undefined` is not. The three states are branched at the call site, and the
conversion underneath takes `string` and returns `number`.

### `exit.ts` goes; `process.exitCode` stays

`exitOnFailure` sets `process.exitCode = 1` after the command has already written its
output. Raising instead would route through the handler in `cli.ts`, which writes a line to
stderr and calls `process.exit(1)`. That is wrong twice: the payload has already explained
the failure so any message duplicates it, and `process.exit` does not wait for a piped
stdout to drain, so the output just written could be truncated. The one line is inlined at
its seven call sites; the mechanism does not change.

### Resolvers move to `src/resolve/`

Seven files that read the database and call the daemon are not commands. `src/db/` is not
their home either — four of them make network calls. The move also ends the one-letter
distinction between `cart.ts` and `carts.ts`.

### `recordCall` takes the command, and `input.ts` goes

`commandInput` turned a commander `Command` into the path and options an invocation is
recorded under. Its only consumer was `recordCall`'s argument list, reached through a
spread — `recordCall(...commandInput(command), tool, payload, text)` — at thirty-nine
sites. It moves into `db/calls.ts` and `recordCall` takes the `Command` itself.

That also rights a backwards dependency: `CallOption` was declared in `input.ts` and
imported by `db/calls.ts`, so the storage module already depended on the parser plumbing.
The type now lives with the table that stores it.

*The objection — `src/db/` should not know about commander.* It does not hold: `recordCall`
already imports a tokenizer, counts the tokens of a payload and builds a grouping key. It
is not a storage function but an accounting one, and the invocation is what it accounts for.

*The cost.* `test/calls.test.ts` drove `recordCall` with hand-written data, which was a
guess at what `commandInput` produces. Those cases now parse real argv, so a failure in the
translation shows up in the accounting tests too — and in exchange the requirement that two
orderings of the same options collapse is tested against orderings on an actual command
line rather than against two arrays.

## Risks / Trade-offs

- **A script relying on `--limit ""` meaning "no limit"** → It meant `0`, not "no limit",
  which is a bug rather than a contract. Nothing in the repo does it.
- **Argument forms that worked now fail** (`1e3`, `0x10`, `12abc`) → Implausible as typed
  input; pinned by tests so the refusal is deliberate rather than incidental.
- **`--timeslot` no longer forwards unknown fields** → The tool's timeslot has exactly two
  fields; forwarding more was an artefact of the walker, not a capability anyone asked for.
- **Thirty-two call sites each carry a written-out branch** rather than one shared reader
  → The branch is three words at the place that already holds the option, and it keeps
  every conversion signature narrow; the type checker finds any site that forgets it.
- **Enabling `exactOptionalPropertyTypes` later would reject `key: undefined`** at those
  sites → Recorded here; the fix would be to spread instead, which is already the shape
  used for the clearable options.
- **Wide import churn across `src/commands/`** → Mechanical, and the type checker finds
  every site.

## Migration Plan

1. Add `utils/number.ts`, `utils/boolean.ts`, `utils/json.ts`; move `toExternalId` onto
   the shared whole-number reading.
2. Move the remaining raising conversions onto the modules of their subjects, and fold the
   time wording into `toUtc`.
3. Rewrite the two clearable options and the timeslot argument at their call sites; delete
   `readTimeslot`, `readNullableString`, `readNullableNumber`, `collect`.
4. Delete `options.ts` and `exit.ts`, inlining the exit code.
5. Point `products similar` at the whole-number reading.
6. Move the resolvers and `input.ts` to `src/resolve/`, collapsing seven copies of the
   local-number regex onto the shared predicate.
7. Split `test/options.test.ts` along the modules it now covers.

Steps 1–5 and step 6 touch disjoint files; either order works, but step 6 depends on the
predicate from step 1.

## Open Questions

- After the move, `resolve/branch.ts` and `resolve/company.ts` are near-identical
  neighbours — same `listBranches` pagination, same page size, differing in one field and
  one table. Whether they merge is a separate question already costed elsewhere, and
  answering it does not change this change's specs or tasks.
