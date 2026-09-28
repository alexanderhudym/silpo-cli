## Context

See proposal.md — Why. What matters here is the state the code is in.

Value conversions are currently scattered by direction rather than by subject. Reading a
time lives in `src/commands/options.ts`, writing one lives in `src/render/time.ts`, and
the helper that parses an instant is duplicated verbatim in both. `test/time.test.ts`
already imports the two halves from two modules to test one behavior. Aliases are split
the same way: `src/db/aliases.ts` mixes the pure text form of an alias with the storage
that records them, and the two useful directions are assembled by hand at three call
sites.

The rendering engine reaches the opposite way. `src/render/fields.ts` maps a field's name
to a renderer globally, so a field called `latitude` is treated as a coordinate wherever
it appears, and `src/render/scalars.ts` tests every string for being a uuid and every
string for being an instant. Twenty-eight of the thirty modules under
`src/render/commands/` are a single call with no configuration, so no command states what
it prints.

## Goals / Non-Goals

Goals:

- Group each conversion by its subject, both directions in one module, with no dependency
  on commander or on storage.
- Make the four `profile` commands state their output in full.
- Keep the blast radius off the twenty-six commands that have not moved.

Non-Goals:

- Any renderer engine, constraint protocol, or composable renderer set. The four commands
  build strings.
- Moving the other commands. They keep the engine until their own change.
- Reworking how command arguments are read. That is a separate change; no `profile`
  command takes an argument that is converted.

## Decisions

### Utilities report failure; commander words it

A util never builds an `InvalidArgumentError` or picks wording for a user. How it reports a
failure is left to the subject: aliases return nothing, because a caller must be free to
hand over either an alias or a plain value without deciding first which it holds;
coordinates name which of the two axes failed, because one message for three failures is
worse than three; times raise, because every caller has already established that it is
holding a time and an unreadable one is a bug rather than a case to handle. Translating any
of those into wording for the user stays in `src/commands/options.ts`.

Why not one rule for all three: `undefined` is only honest where the caller has a use for
"nothing came back". For a time it has none — `toLocalTime(x) ?? x` is exactly the silent
guessing this change set out to remove, and it is what the old engine did. A caller that
genuinely does not know what it is holding gets `isInstant` to ask with, instead of a
conversion that quietly declines.

Why: it keeps commander out of `src/utils/` in one direction and keeps the CLI's error
wording in one place in the other. The adapters keep their exported names, so
`orders.ts`, `products.ts`, `catalog.ts` and `delivery.ts` need no edit at all.

Alternative considered: let utils throw `InvalidArgumentError` directly. Rejected — it
makes every util a command-line util, and the same conversions are wanted on the output
side where commander is not involved.

Resolved while implementing: `parseAlias` returns nothing on text it cannot read, and its
message moves to `src/commands/aliases.ts`, the only place that reports it to a user. The
alternative — stating the boundary as "utils may throw plain errors, they may not throw
commander's" — was the smaller edit but would have contradicted the requirement that a
conversion never decides how its failure is presented, which covers every conversion and
not only the ones commander calls. A side effect worth naming: a malformed alias such as
`@abc--def` passed to a command used to escape as a plain error carrying the parser's
message, and now fails as `no <entity> alias @abc--def` like any alias nobody recorded.

### One rule decides what a time means

`FamilyMember.profileCreatedAt` is typed as a string and was assumed to be an absolute
instant; the live server sends `2022-10-11T17:12:31`, naming no zone at all. Under the old
engine that value fell through the sniffing and printed unchanged; under a raising
conversion it took the whole command down. The fix is a rule, not a case.

A time carrying a zone or an offset names an absolute instant. A time carrying neither is
local to the machine. Everything follows: reading resolves either shape to an instant in
UTC, and writing resolves either shape to local wall clock time, which leaves a zoneless
value exactly where it stands because it was already local.

Why this and not a command that tells the two apart: the first attempt gave the command an
`isInstant` branch and a second writer, which put the decision in every caller that ever
prints a time and would have to be repeated by the next twenty-six commands. One rule in the
conversion is the same behaviour with nothing to repeat, and `isInstant` survives only for a
caller that does not yet know it is holding a time at all — the old engine's string sniffing,
which must go on refusing to read a plain date as one.

`Date.parse` was raised twice as the simpler way to implement exactly this rule, and it is
the rule itself that rules it out. `new Date("2026-08-17")` is UTC midnight by specification,
where the rule says a value carrying no zone is local; `new Date("7")` is a date in 2001,
where the rule says text naming no time is not a time. The fixture carries one member of each
shape, because a fixture that only carried the shape the code expected is what let this
through in the first place.

### Coordinates are read one axis at a time

`toLatitude` and `toLongitude` are separate readings, each with its own range check, and
reading a `lat,lng` pair is composition over them.

Why: it is the only arrangement that keeps all three of today's error messages — a
malformed pair, a latitude out of range, a longitude out of range — while utils report
failure by returning nothing. A single pair reader returning nothing collapses the three
into one message.

### `src/db/aliases.ts` keeps storage only

The text form of an alias — its marker, its shape, the checks over them — moves to
`src/utils/alias.ts` next to the two conversion directions. The database module is left
with create, read back, list and remove.

Why: the text form never touched the database, and both directions are already being
assembled by hand out of one piece from each module.

The direction that reads an alias takes anything a user might have typed and tells three
outcomes apart: text that never carried the alias marker comes back exactly as it was,
text whose alias was recorded comes back as the value it stands for, and text that carried
the marker but matches no recorded alias reports that it read nothing. A caller therefore
never has to decide first which form it is holding, and it can still tell "this was a
plain uuid" from "this was an alias I do not know".

The commander adapter `fromAlias` in `src/commands/options.ts` becomes a three-line
wrapper over that: call the conversion, raise `InvalidArgumentError` when it reads
nothing. It survives this change only so the seven command files that import it need no
edit; `commands-own-their-arguments` deletes it and has those commands call the conversion
where they build their tool call. There is no naming collision to settle, because the
conversion is not named after the direction the adapter was named after.

### The alias resolver seam is removed

`AliasResolver` and its three implementations exist so that tests can render without a
database. With the four commands calling the alias conversion directly, the seam moves to
the database itself: a test points `SILPO_HOME` at a temporary directory before importing
anything, and clears the alias table between cases so numbering starts from one again.

Why: the seam was costing an abstraction in the rendering path to serve only the tests.
`verbatimResolver` in particular exists only because the old entry point demanded a
resolver even where nothing was aliased; a command that does not convert an alias needs
no such argument.

Note: only the profile path stops using the resolver in this change. The type and the
implementations stay until the last command has moved.

### Profile commands are covered through the CLI, not through the renderer

The four commands get a test that mocks the tool client and asserts what the command
writes to standard output. The golden test that imported a renderer module directly loses
its profile entries.

Why: with output composed inside the command there is no renderer to call, and asserting
stdout tests the thing that actually ships. It also removes the constraint that the output
function be exported at all.

Revised while implementing: the tool client is not mocked with `mock.module` after all.
`test/commands.test.ts` already stood up a fake daemon on the unix socket the client dials
and ran the built CLI as a child process against it, which asserts the shipped binary's
stdout rather than an in-process import of it. That machinery moves to `test/harness.ts`
and both files use it, so no experimental flag is needed and the `test` script is
unchanged. The cost this decision was weighing — `mock.module` behind
`--experimental-test-module-mocks`, with its `namedExports` option deprecated — does not
arise.

## Risks / Trade-offs

- The compiler stops proving that every field of a payload is accounted for. A field added
  to a tool contract will simply not be printed, and no test fails, because the text a
  command produces does not change when a field it never named appears. → **Accepted, not
  mitigated.** A rest element handed to a parameter typed `Record<string, never>` did
  restore the proof and did catch it, but it cost naming every field a command deliberately
  does not print, which read as noise in review. The proof is gone; watching for it is a
  person reading a payload against its command.

- Free text a user typed can carry newlines, and a record the command states is one line
  then spills over several. A real saved address `comment` does exactly this, blank lines
  and a non-breaking space included. → Every value goes through the one-line conversion on
  its way into a field, and every finished block goes through the width conversion on its
  way out, so neither is decided per field.

- Thirty commands written by hand can drift into thirty styles of separator and
  indentation. → Only four move here, and the review of their output is the point of
  starting small. The shared conversions keep values reading the same across commands even
  when the surrounding text differs.

- Tests now touch a real SQLite database where they used an in-memory resolver. → The
  database module is a per-process singleton and `node --test` gives each file its own
  process, so isolation is per file; cases inside a file clear the table between runs.

- The alias split touches `src/commands/aliases.ts`, which is unrelated to profile output.
  → Its edit is mechanical: the same functions, imported from two modules instead of one.

## Migration Plan

The utilities land first and are proven against the existing tests before any command
changes, because they only move code. The four commands then move one at a time, each with
its output reviewed as text. The rendering engine is untouched throughout and is deleted
only when the last of the thirty commands has moved, in a later change.

Rollback is per command: a command that has not moved still has its renderer module.

### What the review of the output settled

The four outputs were read as text before being fixed, and that reading changed five things
the plan had assumed.

An id is printed only where a tool accepts it. Nothing accepts a profile, child or pet id,
so those are gone along with the `--with-id` flag, and with them the `PROFILE`, `CHILD` and
`PET` pairs — `ADDRESS` is the only one left, because tools do take a saved address id.

`gender` and `status` stop being fields. The gender becomes the title in front of the name,
which costs nothing and reads as a person rather than a record; the status of an account
the user is authorized against says nothing.

A name reads surname first, as names are written where this CLI is used.

Records that hold free text put each field on its own line under its own key, separated by
`: `, and keep to ninety columns. Packing several fields onto a line is cheaper in tokens
but stops being readable once a value can be an arbitrary comment. The parts of a place are
the exception and are joined into one address, because `буд.`, `пов.` and `кв.` name them
more compactly than keys would.

`success` is never printed. A call that did not succeed throws before anything is printed,
so the field only ever carried `true`.

Every listing reads the same way, food restrictions included. There is no payload to judge
that one against yet, so it follows the shape the other three were reviewed into rather
than inventing a fourth.

What is shared moved out by subject — `src/utils/record.ts` for one key and its value,
`src/utils/list.ts` for listings — and what did nothing but filter, join or cast was inlined
where it was used: `?? ""` says at the call site what a cast helper hides, and a helper
wrapping `Array.prototype.join` hides where the separator is chosen. A field a command does
not print is not named at all, rather than named and discarded.

A util takes a value that exists. `formatEntryAsRow` accepts a string, a number or a
boolean, and a caller holding nothing does not call it — `tag && formatEntryAsRow("tag", tag)`
rather than a conversion that answers with an empty string for a value that was never there.
`false` and `0` are values and are printed; that is why the guard is at the call site and not
inside.

One key and its value have two layouts, and `src/utils/record.ts` holds both under names that
say which: `formatEntryAsRow` puts the value beside the key, `formatEntryAsSection` puts it
underneath. The household's groups were a local `section` helper for a while, which was two
unrelated things wearing one name — a check that a group has members, and the layout of a
label above a block. The check went to the call site with every other guard, and the layout
turned out to be the entry rendering the command already had, in its other form.

### There is no width

The output is read by an agent through a pipe, not looked at in a window, so a line may run
as long as its value needs. Nothing in the composed output wraps, and `src/utils/text.ts` is
left holding `toOneLine` alone.

This was arrived at the long way. Four layouts were built and thrown away — a continuation
hung under the value by finding the `": "` of a row, the same thing with the indent passed
in as a parameter, the same thing again with the width threaded from the command through
`formatEntry` and back, and finally a continuation stepping in two columns from wherever its
row started. Each one was a smaller machine than the last, and the last of them was still
machinery for a reader that does not exist.

The measurement that settled it: wrapping the live saved address listing costs two tokens
out of seven hundred and fifteen, against the forty to sixty-nine per cent these four
commands save by not printing what carries no information. Terminal width detection was
considered in the same breath and dropped for the same reason, with one more against it —
`process.stdout.columns` is undefined behind a pipe, which is every call the agent makes, and
is `0` rather than undefined on a terminal with no window size, so the obvious
`Math.min(columns, 90)` reduces the width to nothing.

What stays is `toOneLine`. A value that carries its own line breaks would still split a
record the command states is one line, and that is a fact about the value rather than about
who is reading.

### Profile commands are covered through the CLI, not through the renderer

The four commands get a test that mocks the tool client and asserts what the command
writes to standard output. The golden test that imported a renderer module directly loses
its profile entries.

Why: with output composed inside the command there is no renderer to call, and asserting
stdout tests the thing that actually ships. It also removes the constraint that the output
function be exported at all.

Revised while implementing: the tool client is not mocked with `mock.module` after all.
`test/commands.test.ts` already stood up a fake daemon on the unix socket the client dials
and ran the built CLI as a child process against it, which asserts the shipped binary's
stdout rather than an in-process import of it. That machinery moves to `test/harness.ts`
and both files use it, so no experimental flag is needed and the `test` script is
unchanged. The cost this decision was weighing — `mock.module` behind
`--experimental-test-module-mocks`, with its `namedExports` option deprecated — does not
arise.

## Risks / Trade-offs

- The compiler stops proving that every field of a payload is accounted for. A field added
  to a tool contract will simply not be printed, and no test fails, because the text a
  command produces does not change when a field it never named appears. → **Accepted, not
  mitigated.** A rest element handed to a parameter typed `Record<string, never>` did
  restore the proof and did catch it, but it cost naming every field a command deliberately
  does not print, which read as noise in review. The proof is gone; watching for it is a
  person reading a payload against its command.

- Free text a user typed can carry newlines, and a record the command states is one line
  then spills over several. A real saved address `comment` does exactly this, blank lines
  and a non-breaking space included. → Every value goes through the one-line conversion on
  its way into a field, and every finished block goes through the width conversion on its
  way out, so neither is decided per field.

- Thirty commands written by hand can drift into thirty styles of separator and
  indentation. → Only four move here, and the review of their output is the point of
  starting small. The shared conversions keep values reading the same across commands even
  when the surrounding text differs.

- Tests now touch a real SQLite database where they used an in-memory resolver. → The
  database module is a per-process singleton and `node --test` gives each file its own
  process, so isolation is per file; cases inside a file clear the table between runs.

- The alias split touches `src/commands/aliases.ts`, which is unrelated to profile output.
  → Its edit is mechanical: the same functions, imported from two modules instead of one.

## Migration Plan

The utilities land first and are proven against the existing tests before any command
changes, because they only move code. The four commands then move one at a time, each with
its output reviewed as text. The rendering engine is untouched throughout and is deleted
only when the last of the thirty commands has moved, in a later change.

Rollback is per command: a command that has not moved still has its renderer module.

### What the review of the output settled

The four outputs were read as text before being fixed, and that reading changed five things
the plan had assumed.

An id is printed only where a tool accepts it. Nothing accepts a profile, child or pet id,
so those are gone along with the `--with-id` flag, and with them the `PROFILE`, `CHILD` and
`PET` pairs — `ADDRESS` is the only one left, because tools do take a saved address id.

`gender` and `status` stop being fields. The gender becomes the title in front of the name,
which costs nothing and reads as a person rather than a record; the status of an account
the user is authorized against says nothing.

A name reads surname first, as names are written where this CLI is used.

Records that hold free text put each field on its own line under its own key, separated by
`: `, and keep to ninety columns. Packing several fields onto a line is cheaper in tokens
but stops being readable once a value can be an arbitrary comment. The parts of a place are
the exception and are joined into one address, because `буд.`, `пов.` and `кв.` name them
more compactly than keys would.

`success` is never printed. A call that did not succeed throws before anything is printed,
so the field only ever carried `true`.

Every listing reads the same way, food restrictions included. There is no payload to judge
that one against yet, so it follows the shape the other three were reviewed into rather
than inventing a fourth.

What is shared moved out by subject — `src/utils/record.ts` for one key and its value,
`src/utils/list.ts` for listings — and what did nothing but filter, join or cast was inlined
where it was used: `?? ""` says at the call site what a cast helper hides, and a helper
wrapping `Array.prototype.join` hides where the separator is chosen. A field a command does
not print is not named at all, rather than named and discarded.

A util takes a value that exists. `formatEntryAsRow` accepts a string, a number or a
boolean, and a caller holding nothing does not call it — `tag && formatEntryAsRow("tag", tag)`
rather than a conversion that answers with an empty string for a value that was never there.
`false` and `0` are values and are printed; that is why the guard is at the call site and not
inside.

One key and its value have two layouts, and `src/utils/record.ts` holds both under names that
say which: `formatEntryAsRow` puts the value beside the key, `formatEntryAsSection` puts it
underneath. The household's groups were a local `section` helper for a while, which was two
unrelated things wearing one name — a check that a group has members, and the layout of a
label above a block. The check went to the call site with every other guard, and the layout
turned out to be the entry rendering the command already had, in its other form.

### A broken line steps in, and nothing knows why

`wrapLines(value, width)` breaks a block into lines no wider than a width, continuing a
broken line one step in from the indentation that line already carried. It reads nothing
else out of the value, and the caller passes nothing but the width.

Two richer versions were built and thrown away. One found the `": "` of a `key: value` row
and hung the continuation under the value; that put a layout rule inside a string utility
where every caller would inherit it. The other took the indent as a parameter, which only
moved the leak into the signature and forced the width to be threaded from the command
through `formatEntry` and back out — `formatItem` then had to indent every line of a row
rather than the first, and a command that nested an entry inside an item had to subtract the
two columns the item would add. All of that machinery bought one thing: a continuation that
lines up under the value instead of two columns in from its row.

Then the question dissolved. An item is marked by the blank line before it, so the `- ` in
front of its first row and the two columns indenting the rest were paying for a second
signal nobody needed. With them gone every row starts at the first column, a continuation
steps in two, and there is no offset to line anything up with. `formatEntry` composes a key,
a separator and a one-line value; a command joins rows one to a line, joins items a blank
line apart, and breaks the finished block once.

What went with the marker: `formatItem`, because an item stopped being anything but its rows
joined one to a line. What is left in `src/utils/list.ts` is two joins that name what they
join — `formatRows` puts rows one to a line, `formatList` puts a blank line between items —
and neither takes a separator. There were only ever two, one of them was being declared in
the utility as a default and the other in the command as a constant, and passing the second
one in was how a caller said which of the two it meant. Saying it in the name is shorter and
leaves the pair defined in one place.

### Profile commands are covered through the CLI, not through the renderer

The four commands get a test that mocks the tool client and asserts what the command
writes to standard output. The golden test that imported a renderer module directly loses
its profile entries.

Why: with output composed inside the command there is no renderer to call, and asserting
stdout tests the thing that actually ships. It also removes the constraint that the output
function be exported at all.

Revised while implementing: the tool client is not mocked with `mock.module` after all.
`test/commands.test.ts` already stood up a fake daemon on the unix socket the client dials
and ran the built CLI as a child process against it, which asserts the shipped binary's
stdout rather than an in-process import of it. That machinery moves to `test/harness.ts`
and both files use it, so no experimental flag is needed and the `test` script is
unchanged. The cost this decision was weighing — `mock.module` behind
`--experimental-test-module-mocks`, with its `namedExports` option deprecated — does not
arise.

## Risks / Trade-offs

- The compiler stops proving that every field of a payload is accounted for. A field added
  to a tool contract will simply not be printed, and no test fails, because the text a
  command produces does not change when a field it never named appears. → **Accepted, not
  mitigated.** A rest element handed to a parameter typed `Record<string, never>` did
  restore the proof and did catch it, but it cost naming every field a command deliberately
  does not print, which read as noise in review. The proof is gone; watching for it is a
  person reading a payload against its command.

- Free text a user typed can carry newlines, and a record the command states is one line
  then spills over several. A real saved address `comment` does exactly this, blank lines
  and a non-breaking space included. → Every value goes through the one-line conversion on
  its way into a field, and every finished block goes through the width conversion on its
  way out, so neither is decided per field.

- Thirty commands written by hand can drift into thirty styles of separator and
  indentation. → Only four move here, and the review of their output is the point of
  starting small. The shared conversions keep values reading the same across commands even
  when the surrounding text differs.

- Tests now touch a real SQLite database where they used an in-memory resolver. → The
  database module is a per-process singleton and `node --test` gives each file its own
  process, so isolation is per file; cases inside a file clear the table between runs.

- The alias split touches `src/commands/aliases.ts`, which is unrelated to profile output.
  → Its edit is mechanical: the same functions, imported from two modules instead of one.

## Migration Plan

The utilities land first and are proven against the existing tests before any command
changes, because they only move code. The four commands then move one at a time, each with
its output reviewed as text. The rendering engine is untouched throughout and is deleted
only when the last of the thirty commands has moved, in a later change.

Rollback is per command: a command that has not moved still has its renderer module.

### What the review of the output settled

The four outputs were read as text before being fixed, and that reading changed five things
the plan had assumed.

An id is printed only where a tool accepts it. Nothing accepts a profile, child or pet id,
so those are gone along with the `--with-id` flag, and with them the `PROFILE`, `CHILD` and
`PET` pairs — `ADDRESS` is the only one left, because tools do take a saved address id.

`gender` and `status` stop being fields. The gender becomes the title in front of the name,
which costs nothing and reads as a person rather than a record; the status of an account
the user is authorized against says nothing.

A name reads surname first, as names are written where this CLI is used.

Records that hold free text put each field on its own line under its own key, separated by
`: `, and keep to ninety columns. Packing several fields onto a line is cheaper in tokens
but stops being readable once a value can be an arbitrary comment. The parts of a place are
the exception and are joined into one address, because `буд.`, `пов.` and `кв.` name them
more compactly than keys would.

`success` is never printed. A call that did not succeed throws before anything is printed,
so the field only ever carried `true`.

Every listing reads the same way, food restrictions included. There is no payload to judge
that one against yet, so it follows the shape the other three were reviewed into rather
than inventing a fourth.

What is shared moved out by subject — `src/utils/record.ts` for one key and its value,
`src/utils/list.ts` for listings — and what did nothing but filter, join or cast was inlined
where it was used: `?? ""` says at the call site what a cast helper hides, and a helper
wrapping `Array.prototype.join` hides where the separator is chosen. A field a command does
not print is not named at all, rather than named and discarded.

A util takes a value that exists. `formatEntryAsRow` accepts a string, a number or a
boolean, and a caller holding nothing does not call it — `tag && formatEntryAsRow("tag", tag)`
rather than a conversion that answers with an empty string for a value that was never there.
`false` and `0` are values and are printed; that is why the guard is at the call site and not
inside.

One key and its value have two layouts, and `src/utils/record.ts` holds both under names that
say which: `formatEntryAsRow` puts the value beside the key, `formatEntryAsSection` puts it
underneath. The household's groups were a local `section` helper for a while, which was two
unrelated things wearing one name — a check that a group has members, and the layout of a
label above a block. The check went to the call site with every other guard, and the layout
turned out to be the entry rendering the command already had, in its other form.

### Each utility knows only its own subject, and the width travels down

`wrapLines(value, width)` breaks a string into lines no wider than a width. That is all it
does: it reads nothing out of the value and adds nothing to it. Two earlier versions leaked
layout into it — one found the `": "` of a `key: value` row and hung the continuation under
the value, the other took an indent to put on continuations. Both put a decision that
belongs to whoever is rendering inside a string utility that every other caller would
inherit.

The hanging indent belongs to `formatEntry`, which is the only thing that knows the key and
the separator. It subtracts their width from the width it was given, breaks the value to
what is left, and lays the resulting lines out under the value. `formatItem` indents every
line of a row rather than only the first, so an entry that wrapped stays inside its item.

The cost is that the width has to travel from the top down: `WIDTH` is one constant in
`src/utils/text.ts`, and a command that nests entries inside items passes `WIDTH - 2`,
because those two columns are what the item will add in front. That is a real parameter
threaded through real calls instead of a rule hidden in a utility, which is the trade this
change keeps making.

It is not a config key. `getEntry` in `src/config/settings.ts` reads and parses the config
file on every call, and the width is wanted once per field printed. A user-settable width
would need the setting read once and handed down, which is the same threading with a file
read in front of it — worth doing only when someone asks for the setting.

Everything shared sits under `src/utils/` keyed by its subject, and a subject is whatever a
second command would want unchanged: one dictionary of entity and field pairs, so nothing
declares a pair of its own; one place that composes a Ukrainian address out of its parts,
every part optional, each of the building, entrance, floor and apartment behind its
abbreviation; and two operations on a string, named for what they make — one line, and
lines set to a width — rather than for the whitespace they touch.

## Open Questions

- Whether money is worth a conversion of its own. Prices arrive as `125.4` and print as
  `125.4` today. No `profile` payload carries one, so the question can be answered by
  whichever command first shows a price.
