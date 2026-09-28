## Context

See proposal.md — Why.

The mechanism worth stating precisely is the loop the current code is caught in. A
commander option parser replaces the value it was given, so `options.branchId` holds a
uuid where `@aal` was typed. Token accounting needs what was typed, cannot get it from the
parser, and so reads `process.argv` again in `src/commands/input.ts`, re-implementing
commander's tokenizer to do it: splitting `--flag=value`, honouring `--`, walking a
command's parents to find an option by flag, and consulting `option.required` and
`option.optional` to decide whether a flag consumes the next token.

Remove the overwriting and the loop opens: the parser's own state is again a faithful
record, and the second tokenizer has nothing left to do.

## Goals / Non-Goals

Goals:

- An argument reaches the command as typed.
- Recording a call reads the parser instead of the command line.
- The entity an alias resolves under is named by the command.

Non-Goals:

- Which conversions exist. They are the same functions from `src/utils/`, called from a
  different place.
- Output rendering. Commands still print however their own change left them printing.
- Preserving recorded history across the change.

## Decisions

### Conversion moves into the action, gathering stays a parser

A commander parser does two unrelated jobs: it converts a value, and it decides what
happens when a flag appears more than once. Only the first moves.

Why: without a gathering parser commander keeps the last occurrence of a repeated flag and
silently drops the rest, which is a parsing concern rather than a conversion. So `collect`
stays exactly as it is and `collectAliases` disappears — the command converts each element
of the gathered list where it builds the call.

### A failed conversion is raised by the command

Commander catches `InvalidArgumentError` only while parsing options. Thrown from inside an
action — all of which are async — it would surface as an unhandled rejection instead of a
usage error. Each command therefore fails explicitly through commander's own error path.

Why: the observable behavior in `command-input` must not change. Only where the failure
originates does.

Alternative considered: convert eagerly at the top of every action inside one wrapper that
catches and re-raises. Worth doing if the explicit form proves repetitive across the seven
command files, but not designed in up front.

### The recorded invocation is rebuilt from the parser

The command path comes from the command, positional arguments from its arguments, and
options from its parsed values, with each name turned back into its long flag. An option
carrying a gathered list becomes one entry per element.

Why: it is the parser's own account of the invocation, and now that nothing overwrites the
values it is also the user's. It removes the argv tokenizer entirely.

Known divergence: options are recorded in the order the parser assigned them, which is the
order of each option's first appearance. An option repeated after other options is grouped
where it first appeared rather than spread through the sequence. This is recorded in the
spec rather than worked around.

### The key-to-entity table goes

Resolving aliases inside a JSON argument takes a mapping from the command that declared
the option, because that command knows the shape of the JSON it accepts.

Why: every declared option already names its entity at the call site. The table existed
only for free-form JSON, and inferring an entity from a field's name is the same invisible
dispatch this project has been removing elsewhere.

### The alias adapter is deleted rather than moved

`fromAlias` in `src/commands/options.ts` exists to sit between an argument and the action.
The conversion it wraps already passes through anything that is not an alias, so once the
action calls that conversion itself there is nothing left for a wrapper to add beyond
raising the failure, which the action does anyway.

Why: it is one fewer indirection, and it is the concrete instance of this change's whole
point — nothing rewrites an argument before the command sees it.

### What is left of `input.ts` stays where it is

Settled once the tokenizer was gone: the remaining thirty lines turn a parsed command into
what a call record holds, and they stay in `src/commands/input.ts` rather than moving into
`src/db/calls.ts`.

Why: reading commander's own state is a command-layer job, and folding it into the storage
module would give the sqlite layer a dependency on the argument parser. `db/calls.ts` and
`gain.ts` already take only the shape of a recorded call from this file, which is what it
is for.

### The database is wiped, not migrated

Recording a short flag under its long name changes the grouping key, so rows written
before the change group by the old rule.

Why: the CLI runs on one machine and has never been installed anywhere else. There is
nothing in the database worth a migration.

## Risks / Trade-offs

- Seven command files change at once, and a conversion forgotten in an action sends typed
  text to the server instead of a uuid or an instant. → The tool client is typed, so a
  string where a converted value is expected is caught at build time for every argument
  whose contract is not itself a string. Aliases are the exception, since both forms are
  strings; those are covered by asserting the tool call arguments in a test.

- Usage errors now come from two places, the parser for shape and the command for
  conversion. → The spec pins what the user sees, and the existing input tests assert the
  messages.

- `src/commands/input.ts` shrinks to the point where its remaining content may belong
  wherever the call is recorded. → Decide once the removal is done rather than up front.

## Migration Plan

The recording path changes first, while the parsers are still in place, so the two
descriptions of an invocation can be compared against each other on real commands. Then
the conversions move out of the parsers one command file at a time, and the argv tokenizer
is deleted once nothing reads it. The database is wiped at the end.

## Open Questions

None. Both questions this change opened — whether gathering stays a parser, and whether
recorded history is worth preserving — were settled before it was written.
