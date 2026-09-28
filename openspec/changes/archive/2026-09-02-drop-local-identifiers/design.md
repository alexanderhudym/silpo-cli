## Context

See proposal.md — Why. Three facts about the codebase shape the approach.

`getDatabase()` is called from nowhere outside `src/db/`. The ten tables have exactly two readers
between them: the six resolvers, and the call ledger behind `silpo gain`. Removing both leaves sqlite
with no reader at all, so this is not a change that shrinks the database — it deletes it.

Nine of the ten tables hold identity and nothing else: a remote id, and for a product or a category
a slug. The tenth, `np_offices`, also holds coordinates, a title, an address and a number. That is
the only place where deleting a table deletes information rather than a mapping, and it is the only
capability this change costs.

`recordCall` is invoked from 53 sites across eleven command files, always as the last statement of an
action. It takes the tool names the command chose to name, so removing it is a deletion at each site
rather than a refactor.

## Goals / Non-Goals

**Goals:**

- After this change the CLI writes nothing to disk but its tokens and its configuration.
- Every identifier a command prints is a value the payload carried, and every identifier a command
  sends is the value the caller typed.
- No command gains a call, and several lose the hidden ones a resolver could trigger.

**Non-Goals:**

- No change to which MCP tools are called, to the daemon protocol, or to how the cart is read.
- No change to the two mechanisms that carry the real token saving: `key: value` instead of JSON, and
  hoisting a shared field into `common`.
- No attempt to make the identifier surface consistent. Where the server takes different forms for
  the same entity, the CLI reports that and does not paper over it.

## Decisions

**Deletion, not deprecation.** The resolvers and the tables go in one commit rather than being left
behind unused. A resolver that still compiles is a resolver a future command will call, and the
delivery contexts they invent — `Unknown` for a category lookup, `SelfPickup` for a product lookup —
are exactly the sort of thing that gets copied. `~/.silpo/silpo.db` is left on disk to be deleted by
hand; the CLI simply stops opening it. Alternative considered and rejected: keeping the tables behind
a flag while the printing changes, which doubles the fixture work and leaves both behaviours to test.

**A product prints every form, a category prints one.** A product is printed with its uuid, its slug
and its external product id, because the tools take those three in three different combinations and
the CLI can no longer convert between them. A category is printed with its slug alone, because the
category uuid is taken by nothing a caller reaches — and the one tool that would take it,
`silpo_get_products`, answers a uuid with `success: true` and an empty list, which a caller cannot
tell from a category that is simply empty here. Printing a handle whose failure is silent is worse
than not printing it. Alternative considered and rejected: printing the category uuid alongside the
slug for symmetry with products, which would put the silent failure back within reach.

**`categories list --parent-id` is removed rather than translated.** The tool's parent filter takes a
category uuid, and the CLI no longer prints one. The three ways out were: print the uuid after all
(reintroduces the silent failure), translate a slug to a uuid with an extra `silpo_get_category`
call (a resolver under another name), or drop the option. Dropping it costs least: the filter
selects one category's children, and `silpo categories tree` already returns the whole hierarchy in
one call, which is how the skill tells a reader to read it anyway.

**The category tree keeps its join.** The hierarchy the server returns carries slugs and nothing
else — no title, no id. Titles come from the branch's flat category listing, joined on the slug.
Measured against a live branch, the tree and the listing name the same 1018 categories, so the
per-slug `silpo_get_category` fallback never fires and goes with the resolvers. A node the listing
somehow fails to cover is printed with its slug alone rather than dropped, because the slug is the
handle every category command takes. Alternative considered and rejected: printing the tree as bare
slugs and dropping the join, which halves the calls and produces a hierarchy no person can read.

**The hidden-category refusal goes with the resolver it needed.** Turning an empty listing into an
error required a second `silpo_get_category` call to tell "hidden here" from "empty here". The
failure it was built for — a caller passing a category uuid — is unreachable once the uuid is not
printed. What remains is an empty listing, and an empty listing is what gets printed.

**A Nova Poshta address carries its own coordinates.** The office table was the only store of data
rather than identity, and the coordinates it held were filled into a cart address behind the
caller's back. Recovering them without the table means calling `silpo_find_nova_poshta_offices`,
which needs a settlement uuid the caller may not still hold, so the fill would work sometimes and
silently not others. The caller passes them instead; `silpo np offices` prints them on every record,
so they are on screen at the moment the office is chosen. Alternative considered and rejected:
keeping one small table just for offices, which keeps sqlite, the schema, the migration surface and
the question of when it is stale, to save the caller copying two numbers it was just shown.

**The skill is rewritten in the same change, not after it.** Twenty-nine lines of it describe a
numbering that stops existing, and the six contradictions catalogued in the proposal sit in the same
sections. Writing new statements onto a page that already contradicts itself is how the last round of
contradictions got there — the stale-cart gotcha was added in the same commit as the sentence it
contradicts.

**`test/skill.test.ts` is removed.** It walks the commander tree and asserts that the skill names
every command and every option, and writes no option that does not exist. That is a real check, and
it passed on every one of the six contradictions, because none of them is about a name. Keeping it
would mean keeping the impression that the skill is under automated watch, which is what let the
contradictions accumulate. The README sentence claiming the test "fails if the skill and the CLI
disagree" goes with it.

## Risks / Trade-offs

- **Output grows by roughly half** → measured across the 30 expected-output files that carry
  identifiers: 6 700 tokens today, about 15 200 with every identifier printed. Accepted, and small
  against what the CLI replaces: one uncompressed `get_categories` payload is 75 000 tokens. The two
  mechanisms that produce that saving are untouched, and `common` hoisting now matters more than it
  did, since a repeated uuid costs what a repeated number did not.
- **A caller passes the wrong form and gets a worse error than before** → accepted, and mostly
  better. The tool's own errors are specific: `-32602 invalid_format` names the field, `400 Bad
  Request` and `Resource not found` name the call. The one bad case, a category uuid answering with
  an empty list, is closed by not printing that uuid.
- **A Nova Poshta cart address is set without coordinates** → the requirement states that the CLI
  supplies none and the server decides. The skill states that the caller passes them, next to the
  command that takes them, and the office listing prints them.
- **Deleting five test files removes coverage of behaviour that survives** → `category.test.ts` and
  `product.test.ts` cover both the resolution that goes and the rendering that stays. They are
  reduced rather than deleted, and the fixture regeneration is what proves the rendering still holds.
- **A future command reintroduces a lookup** → nothing structural prevents it. What this change
  leaves behind is the absence of any module to put it in: no `src/resolve/`, no `src/db/`, and no
  precedent of a command inventing a delivery context to make a lookup possible.

## Migration Plan

No migration for a caller's stored invocations, because none can survive: every local number a script
holds is already meaningless off the machine that issued it, and the numbers are not stable across a
database wipe. `~/.silpo/silpo.db` becomes an orphan file that nothing opens; it can be deleted at
leisure.

The one externally visible loss is the Nova Poshta coordinate fill, stated above and in the specs.
