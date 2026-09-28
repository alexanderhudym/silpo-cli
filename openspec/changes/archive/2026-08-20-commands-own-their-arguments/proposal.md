## Why

Every option that needs conversion is converted by a parser handed to commander:
`fromAlias(BRANCH)`, `toTimestamp`, `toCoordinates`, `toJsonArray`. Commander replaces the
value with the parser's result, so by the time the action runs, `options.branchId` holds a
uuid and the `@aal` the user typed is gone.

Token accounting has to record the invocation as it was typed, so it cannot read what
commander parsed. Instead `src/commands/input.ts` reads `process.argv` a second time and
re-implements commander's own tokenizer to recover it: splitting `--flag=value`, honouring
`--`, walking the command's parents to find an option, and consulting `option.required`
and `option.optional` to decide whether a flag consumes the next token. Seventy-eight
lines exist to undo a loss the parsers caused.

The parsers also sit against how the rest of the CLI is going: preparing the data a tool
call needs is the command's own job, stated in the command, not something applied to an
argument before the command sees it.

## What Changes

- Options that convert a value stop being converted during parsing. A command receives
  what the user typed and converts it in its own body, next to the tool call it is
  preparing.
- Recording a call reads what commander already parsed instead of re-reading
  `process.argv`. Most of `src/commands/input.ts` goes with it.
- An option's flag is recorded in its long form, whichever form was typed. Today `-b` and
  `--branch-id` produce two different grouping keys in `gain` for the same invocation;
  after this they are one. Rows recorded before the change group by the old rule; the
  database is wiped rather than migrated.
- `collectAliases` is removed. A repeatable option that carries aliases collects the
  values as typed, and the command converts each of them where it builds the tool call.
- The key-to-entity table is removed. Aliases inside a JSON argument are resolved against
  a mapping the command supplies, because the command knows the shape of the JSON it
  accepts; nothing guesses an entity from a field's name any more.
- Conversion failures still fail the command naming what was expected. Since the failure
  now happens inside the action rather than during parsing, the command raises it rather
  than commander catching it.

### Non-goals

- Collecting a repeatable option keeps its commander parser. Gathering `--product a
  --product b` into a list is about how many times a flag may appear, not about converting
  a value, and without it commander keeps only the last one. Only the plain collector
  survives; every conversion leaves it.
- Nothing about output rendering. That is `rewrite-profile-output` and the changes after
  it.
- No change to which conversions exist. They are the same functions, called from a
  different place.

## Capabilities

### Modified Capabilities

- `command-input`: reading an argument and converting it stop being the same step. What
  the CLI accepts and what it rejects holds as it is; what changes is that an argument
  reaches the command as it was typed, the conversion belongs to the command, and the
  entity an alias is resolved under is named by the command rather than looked up from a
  field's name.
- `token-accounting`: recording the invocation "exactly as the user typed it" relaxes to
  recording it as commander parsed it, which is the same text now that nothing overwrites
  it, except that a short flag is recorded under its long name.

## Impact

- `src/commands/options.ts` — the converting parsers stop being commander parsers.
  `collect` stays as it is; `collectAliases` goes. Resolving aliases inside a JSON
  argument takes a mapping from its caller instead of consulting a global.
- `src/aliases.ts` — the key-to-entity table and its lookup go. The entity constants stay
  and keep moving to the commands that use them, as `rewrite-profile-output` began.
- `src/commands/input.ts` — most of it is removed: the argv tokenizer, the option lookup
  by flag, the arity check, and the `--` handling. What remains is reading the command
  path and the parsed options.
- Every command file with a converted option — `products.ts`, `cart.ts`, `catalog.ts`,
  `delivery.ts`, `orders.ts`, `np.ts`, `branches.ts` — converts in the action body.
- `src/db/calls.ts` — unchanged in shape; the grouping key changes value for invocations
  that used short flags. The CLI runs on one machine and has never been installed
  elsewhere, so the database is wiped rather than reconciled.
- `test/input.test.ts`, `test/options.test.ts`, `test/calls.test.ts` — the first loses the
  cases that exercise the hand-rolled tokenizer.
- Depends on `rewrite-profile-output` only for the utilities it moves; the two do not
  overlap in the files they touch, because no `profile` command takes a converted
  argument.
