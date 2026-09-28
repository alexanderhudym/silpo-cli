## Context

See `proposal.md` — Why for the measurement this change answers.

Three constraints shape the approach:

- **Nobody outside this repo runs the CLI.** Renaming is cheap; the expensive part is that every
  rename forces a skill rewrite, and the skill is the artefact the benchmark showed to be the most
  costly to get wrong.
- **The skill is re-sent on every turn.** Its body arrives as a ~15 000-character message when the
  skill fires and is carried for the rest of the session. At derived rates that is 11–12% of an
  arm's cost, so text added to it has to earn its place, but a rule that removes a step earns it
  many times over.
- **The server cannot be fixed.** Two of the defects — the slot window's dead zone at local
  midnight, and `addressType` being stored without validation — are on the far side of the MCP.
  The CLI can only work around them or name them.

## Goals / Non-Goals

**Goals:**

- One vocabulary across products and categories, so that a caller who has met one branch of the
  surface can guess the other without reading.
- Every command that answers a question is reachable without the caller assembling it from a
  listing, a file and a shell pipeline.
- Summaries that a caller can act on without reading the body.

**Non-Goals:**

- Reducing the skill's size. It grows slightly here, deliberately.
- Changing what the CLI fetches from the MCP. The new commands compose calls that already exist;
  no tool is added and no payload is requested that was not requested before.
- Re-running the whole benchmark. Two cells are enough to test whether the procedural rules moved
  the numbers.

## Decisions

### The default subcommand carries the listing

`silpo products` and `silpo categories` run their `list` subcommand. Commander supports this
through `isDefault`, so the bare form costs nothing to add.

Alternative considered: making the group itself take the listing's options, with subcommands
beside it. Rejected — a group that accepts a positional argument cannot tell `categories tree`
from a search for the word "tree". Keeping the positional forms inside named subcommands removes
the ambiguity by construction, which is why `search` takes its queries positionally and `list`
takes none.

`branches` had to follow the same shape whether or not it wanted to: commander lets a parent
consume an option before dispatching to a subcommand, so with `--limit` declared on the group,
`branches nearest --limit 2` never reached `nearest`. Moving the listing into `branches list` and
leaving the group optionless fixes it, and the caller sees no difference.

### Split by operation, merge by filter

Products get two commands because `get_products` and `find_products_batch` are different calls
returning different records. Categories get a search alongside the listing because it is the same
listing filtered — but it is still its own command, so that its query can be required rather than
optional. The rule is: a different upstream call earns a different command; a filter earns a
different command only when its argument would otherwise have to be optional.

### Distance is computed here, and narrowed in kilometres

`branches nearest` retrieves the listing in full, filters, and sorts by great-circle distance. It
takes the point as `--latitude` and `--longitude`, the pair `delivery types` already takes, rather
than as one comma-joined argument: a second spelling of coordinates in one CLI is a thing to
remember for nothing.

It is narrowed by `--from-distance` and `--to-distance` and capped by `--limit`. An offset was
considered and rejected: a caller who wants to look past the nearest few is asking in kilometres,
and `--offset 10` answers a question about position in a list that nobody has when the list is
ordered by distance.

Alternative considered: `--near` as an option on the listing. Rejected — it silently changes what
`--offset` means, and the two paging models would sit on one command.

Alternative considered: accepting an address string and resolving it internally. Rejected — it
hides a second call inside a command that otherwise makes one, and `delivery address` already
turns an address into the coordinates this takes.

### The slot window is applied locally

The server answers a window spanning a whole local day with nothing, while answering a window an
hour shorter with that day's ten slots. The boundary is exactly local midnight; five probes failed
to produce a model that explains every case.

So the CLI stops depending on the semantics: within the horizon the server returns unasked —
measured at roughly three days and thirty slots per branch — no bounds are sent, and `--start` and
`--end` are compared against the slots in hand as local wall clock. Bounds are forwarded only for a
window that reaches past that horizon, where there is nothing to return anyway.

Alternative considered: snapping `--start` back to a safe instant before sending it. Rejected — it
depends on a rule we could not pin down, and would break again the moment the server's own rule
changed.

### The external store number leaves the listing

The current spec requires printing it, reasoning that it is how a store identifies itself to a
person standing in front of it. The measurement contradicts that reasoning in practice: twelve
arm-A runs quoted a number to the user and every one of them quoted the local id, which sits on the
line above under the more inviting key `id`. Nothing the CLI accepts takes the external number, and
no other entity refers to it.

Trade-off accepted: a user who names their usual store by its Silpo number can no longer be matched
against the listing. The address is the better handle for that, and the benchmark shows no run that
needed the number.

### The skill grows where a rule removes a step

Four additions — the read/write split on slot validation, chaining commands into one shell
invocation, choosing a lookup by the handle in hand, and the `addressType` vocabulary — cost a few
hundred tokens and each removes at least one step from most runs. Two removals — the cost warning
on the category tree and the "find products by name" heading on the listing — cost nothing and each
was measured to cause harm.

## Risks / Trade-offs

- **A rename touching most of the product and catalogue surface** → the skill is rewritten in the
  same change, and the spec suite already covers every command's behaviour, so a command that loses
  its entry fails validation rather than disappearing quietly.
- **`branches nearest` retrieves the whole listing** → this is what agents already did by hand, in
  four to five steps and a scratch file, so the cost moves rather than appears. It is not described
  as expensive in the skill, by the rule this change adopts.
- **`categories search` pages the whole listing** → same reasoning; the alternative is the agent
  paging it manually, which nine runs did.
- **Local slot filtering hides a server-side window that may start working** → acceptable: the
  local result is correct either way, and the bounds are the caller's own wall clock.
- **Removing the cost advice may make agents reach for the tree more often** → that is the intent,
  and the two cells being re-measured will show it. If the tree turns out to be genuinely too
  expensive, the answer is to make it cheaper, not to warn readers away from the only command that
  answers the question.

## Migration Plan

No data migrates and no consumer breaks; the local database, the stored token and the MCP
registration are untouched. Order of work: rename and regroup the commands first so that the skill
is written once against a settled surface, then the behavioural fixes, then the skill, then the
README correction.

Rollback is a revert: nothing here writes state that a previous version could not read.

## Open Questions

- Whether `promotions` and `sets` read better as top-level commands or want a group of their own
  once `catalog` is dissolved. Two commands do not need a group, but a third would change that. It
  does not affect the specs or the task breakdown.
