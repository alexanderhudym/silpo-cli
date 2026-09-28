## Why

Every server payload is rendered by one generic engine that decides what to do with a
value by sniffing it: a global name registry maps `latitude` or `products` to a renderer
wherever they appear, every string is tested for being a uuid, and every string is tested
for being an ISO instant. No command states what its output looks like — 28 of the 30
renderer modules are literally `return renderPayload(payload, resolver)`.

Two things the engine cannot express are exactly where the token savings are: merging
several fields into one piece of text, and dropping a key whose name carries no
information (`name=Молоко ...` costs a prefix an agent does not need, while `@aal` alone
is unreadable without one). Both are trivial in a hand-written loop and require
black-box escape hatches in a field-to-renderer mapping.

This change reworks the four `profile` commands as the first, deliberately small
instance of hand-written output, and builds only the shared converters those four
commands actually need.

## What Changes

- The four commands under `profile` — the profile summary, saved addresses, household,
  and food restrictions — build their output text themselves instead of handing the
  payload to the generic engine.
- New `src/utils/datetime.ts` holding both directions of one subject: `toUtc`, reading a
  local wall clock time into an absolute instant for a tool argument, and `toLocalTime`,
  writing an absolute instant back as local wall clock time to the minute. Both raise on
  input that names no time, because every caller has already established it is holding
  one; `isInstant` is there for the one caller that has not, the old engine's string
  sniffing. Plain dates such as `birthday` and `dateOfBirth` need no conversion and get
  none. This merges `toLocalTime` from `src/render/time.ts` with `toServerTime` from
  `src/commands/options.ts`, which loses its name — the conversion produces UTC, and that
  is a fact about the value rather than about who wanted it — and removes the
  `parseInstant` helper that is currently duplicated verbatim in both.
- New `src/utils/coordinate.ts`, likewise both directions, and built one axis at a time:
  reading a latitude, reading a longitude, and writing either rounded to six decimal
  places. Reading a `lat,lng` pair is composition — it splits the argument and calls the
  two axis readers. The writer accepts the number and the string form, because the tool
  contracts disagree about which they return.
- New `src/utils/alias.ts` with the two directions of an alias: turning a value into the
  alias that stands for it, and turning an alias back into its value. Both already exist
  as pairs assembled by hand at three call sites — `formatAlias(ensureAlias(...))` in
  `src/aliases.ts` and in the option tests, `resolveAlias(..., parseAlias(...))` in
  `src/commands/options.ts`. The pure string form of an alias — its prefix, its shape,
  and the checks over them — moves here too; it never touched the database.
  `src/db/aliases.ts` is left holding storage alone: create, read back, list, remove.
- Commander stays out of `src/utils/`. A util reports a bad input in the way its own
  subject makes clearest — returning nothing, naming which part failed, or raising;
  turning any of those into an `InvalidArgumentError` with wording for the CLI remains the
  job of the adapters in `src/commands/options.ts`. Because the coordinate util reports each
  axis separately, the three distinct messages behind `toCoordinates` survive the move.
  `toTimestamp` and `toCoordinates` keep their names and their module, so the commands
  that already import them are untouched.
- Commands still decide for themselves whether a given value becomes an alias. Nothing
  infers it.
- The entity/field pairs the profile commands alias against move next to those commands
  so later commands can reuse them from there. Which entity a value belongs to is known
  where the value is used; nothing looks it up. Reviewing the output left only one pair
  standing: a saved address id is worth an alias because tools accept it, while a profile,
  child or pet id is accepted by nothing and is no longer printed at all.
- `src/render/commands/profile.ts` is deleted. Its four functions carried no
  information.
- The profile commands are covered by running the built CLI against a fake daemon on the
  socket the tool client dials, and asserting its stdout, replacing the golden test that
  reached into the renderer module. The fixtures move from feeding a renderer to feeding
  the fake.
- **BREAKING** for anything parsing the profile commands' stdout: the rendered text
  changes shape.

### Non-goals

- No generic renderer engine, no constraint protocol, no composable renderer set.
- No `pack`, `indent`, or wrapping helper, and no width at all in the composed output —
  it is read through a pipe by an agent, not looked at in a window. `src/utils/text.ts`
  holds `toOneLine` alone. Both were forced by real data —
  `SavedAddress.comment` holds free text a user typed, and a real saved address carries
  blank lines and a non-breaking space inside it, which splits a record the command states
  is one line and runs it past the width. `renderText` in the old engine was already doing
  the first by hand and now calls the util.
- The remaining 26 commands keep using `src/render/layout.ts` and `src/render/fields.ts`
  untouched. Those modules are deleted only when the last command has moved.

## Capabilities

### New Capabilities

- `value-conversion`: the shared converters for a value's two directions — reading it
  from a command argument and writing it for display — kept together per subject, today
  absolute instants against local wall clock time, coordinates, and aliases. Stated
  independently of any renderer, of commander, and of how aliases are stored.

### Modified Capabilities

- `output-rendering`: today it requires every server payload to go through the uniform
  object and list layout. That becomes true of the commands that still use the engine
  rather than of all of them, and a command is allowed to compose its own text.
- `user-account`: two requirements are stale against the code. "Account output" says
  account commands print the payload as one JSON line, which they have not done since
  the engine landed, and "Commands pending output rendering" says the profile summary
  and saved addresses print nothing and record nothing, which is false — both render and
  record today. Both are restated against what the profile commands will actually do.

## Impact

- `src/commands/profile.ts` — gains the output functions and the entity/field pairs the
  four commands alias against.
- `src/render/commands/profile.ts` — deleted. `src/render/time.ts` — deleted, its one
  function moves to the datetime util.
- `src/utils/datetime.ts`, `src/utils/coordinate.ts`, `src/utils/alias.ts`, `src/utils/text.ts`, `src/utils/address.ts`, `src/utils/record.ts`, `src/utils/list.ts` — new.
- `src/commands/options.ts` — `toServerTime` and the two instant parsers move to the
  datetime util and become `toUtc`; the range checks behind `toCoordinates` move to the coordinate util;
  `expand` becomes a call into the alias util. The exported adapters keep their names,
  so `orders.ts`, `products.ts`, `catalog.ts` and `delivery.ts` need no edit. `fromAlias`
  survives in `options.ts` as a thin wrapper over the util conversion of the same name, so
  the seven commands importing it are untouched; `commands-own-their-arguments` deletes the
  wrapper.
- `src/db/aliases.ts` — the pure string functions leave; the storage functions stay.
- `src/commands/aliases.ts` — reads the string form from the util and the rows from the
  database instead of both from one module.
- `src/aliases.ts` — the profile-side entity constants move out; only the address pair survives the review.
- `test/time.test.ts` — stops importing one subject from two modules.
  `test/values.test.ts` — the coordinate case moves off the renderer.
  `test/aliases.test.ts` — splits along the same seam as the code.
- `test/golden.test.ts` — the profile entries leave it; the four commands get a test that
  runs them end to end and asserts stdout. The fake daemon already in
  `test/commands.test.ts` moves to `test/harness.ts` and serves both, so no test flag and
  no `package.json` change is needed.
- No new runtime dependency. `Temporal` and `node:sqlite` are already in use.

Out of scope, noted because it belongs to the same direction: `KEY_ENTITIES` and
`entityForKey` in `src/aliases.ts` exist only so `expandAliases` can guess an entity from
a key inside a free-form JSON option. Every declared option already names its entity at
the call site through `fromAlias(BRANCH)` or `collectAliases(PRODUCT)`. Removing that
lookup is input-side work on `command-input`, and no profile command takes a JSON option,
so it is not touched here.
