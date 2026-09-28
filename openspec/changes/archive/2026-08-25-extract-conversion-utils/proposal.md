## Why

`src/commands/options.ts` grew into a grab bag of fifteen readers that each fuse three
unrelated jobs: converting text, deciding what a failure says, and absorbing the
`undefined` commander hands over for an option nobody passed. Because the converting half
is buried there, the same question — is this text a number? — is answered six different
ways across the codebase, and two of those answers are wrong: `readInteger("")` returns
`0` rather than failing, and `products similar` parses `--limit` as a decimal while every
other paginated command parses it as a whole number.

Alongside it, seven files under `src/commands/` are not commands at all but identifier
resolvers, sitting under names one letter away from the commands beside them
(`cart.ts`/`carts.ts`, `product.ts`/`products.ts`, `branch.ts`/`branches.ts`), each
carrying its own copy of the same "is this a local number" regex.

## What Changes

**Conversion moves next to its subject.** Reading whole numbers and decimals gets one
shape and one module; every other reader joins the module of the subject it converts.
`src/commands/options.ts` dissolves to nothing.

- One decimal shape governs both readings, and the whole-number reading derives from the
  decimal one rather than standing beside it. A whole number is additionally bounded to
  what stays exact.
- **BREAKING** `1e3`, `0x10`, `12abc` and `1_000` no longer read as numbers. `12.0` still
  reads as the whole number `12`.
- **BREAKING** An empty or blank value no longer reads as `0`; it fails like any other
  unreadable value. Surrounding blanks are no longer absorbed — text is trimmed before it
  reaches a conversion, not inside one.
- **BREAKING** `products similar` reads `--limit` and `--offset` as whole numbers, as
  every other paginated command already did. A page size of `2.5` now fails.
- A conversion that cannot read its input reports nothing distinctly from an argument that
  was never supplied, so the two cannot collapse into one another. Only the second reaches
  a tool call.
- Reading a field out of a user-supplied JSON entry becomes a conversion of the value,
  taking the entry and the field name only so that the failure can name the field.

**Assembled shapes are written out, not walked.** The generic key-walker behind the
`--timeslot` argument goes; the object is built from its two fields where the tool call is
built, which also removes the double cast that admitted the walker returned the wrong type.

- **BREAKING** Fields of `--timeslot` other than `start` and `end` are no longer forwarded.
- The three states of a clearable option — absent, explicitly cleared, set — are branched
  at the one place that has them, rather than inside a reader whose signature admits all
  three at once.

**Resolvers leave `commands/`.** The seven identifier resolvers move to `src/resolve/`,
sharing one whole-number test with the uuid test they already share. `input.ts` goes into
`db/calls.ts`, whose `recordCall` is its only consumer and which already declared the type
`input.ts` defined. `exit.ts` goes; its one line is written where it is needed, still
setting an exit code rather than raising, so a command's own output is not cut off.

## Capabilities

### New Capabilities

None. Both affected areas already have specs.

### Modified Capabilities

- `command-input`: what a whole-number and a decimal option accept, which arguments are
  whole numbers, how a `--timeslot` object is assembled, and that a number written in JSON
  is accepted wherever text naming an identifier is.
- `value-conversion`: adds whole numbers and decimals as a converted subject, and states
  that unreadable input is reported distinctly from an argument that was not supplied.

## Impact

- `src/commands/options.ts` — removed
- `src/commands/exit.ts` — removed
- `src/utils/` — `number.ts`, `boolean.ts`, `json.ts`, `optional.ts` added;
  `text.ts`, `datetime.ts`, `coordinate.ts`, `slug.ts` gain the readers of their subjects
- `src/resolve/` — added, receiving `branch`, `cart`, `category`, `company`, `np-office`,
  `np-settlement` and `product`
- `src/commands/input.ts` — removed, folded into `src/db/calls.ts`, which now takes the
  command itself
- `src/commands/*.ts` — imports follow; `carts.ts` and `products.ts` also change where
  they branch
- `test/options.test.ts` — splits along the modules it now covers; `test/fixtures.test.ts`
  follows `toExternalId` onto the shared whole-number reading
- No dependency changes
