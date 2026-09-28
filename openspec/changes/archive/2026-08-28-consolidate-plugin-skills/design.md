## Context

See proposal.md — Why. Three facts about the current tree shape everything below.

The CLI has fifty-one runnable commands under fifteen top-level ones, and all 39 MCP tools already
have one, so the skill never has to fall back to `silpo raw`. Fourteen of them require `--branch-id`,
nine of the fourteen also require `--delivery-type`, seven a `--timeslot-start`, and six the whole
quadruple — five different combinations, because `products favorites` wants a start but no end,
`products replacements` wants a company and no timeslot at all, and `catalog categories` wants only
the branch. A tenth command, `cart update`, requires a delivery type without requiring a branch.
The combinations are the MCP's, not ours, and nothing derives them; the values exist only on the
active cart.

Anthropic's skill guidance puts the comfortable ceiling for a `SKILL.md` body at about 500 lines and
says to go longer where needed. Everything the CLI has, with the notes that make each entry usable on
its own, lands well under that — 323 lines when this was written, and the structural counts above are
the argument, not the line count, which will drift with the next edit.

## Goals / Non-Goals

**Goals:**

- One file an agent can read once and then drive the CLI correctly on the first attempt.
- Entries that survive being copied out of context — no cross-references inside a command.
- A structure that makes the next drift visible instead of silent.

**Non-Goals:**

- Changing what the CLI can do. Only `silpo delivery slots` changes shape, and only in how it names
  its branch.
- Teaching the MCP. The skill teaches the CLI, not the wire contract, and borrows from that
  contract only where a divergence is something an agent will hit.
- Reducing the number of options a command takes. That is the cached-context question, deferred
  below.

## Decisions

**One skill, no router, no reference files.**
The alternative was to keep the four category skills behind the router, or to keep one skill with a
`references/` directory. Both were rejected on the same measurement: of the four documented Silpo
workflows, one touches a single category, two touch two, and one touches four. Routing therefore
costs a second load almost every time and defers content the reader needs anyway. Reference files
fail for a different reason — the material that would go in them is the failure-mode list, and a
failure mode is a situation, which is exactly what the index is made of. Splitting it out would put
the answer one hop away from the question it answers. The size argument that would justify either
split does not hold: 323 lines against a 500-line guideline.

**Indexed by situation, not by command group.**
Grouping by command mirrors the MCP's own seven groups, which is how the current skills were built
and why they cut across the context dependency — `orders offline` files under orders but cannot run
without the cart, `products favorites` files under products but is what a reader looking for "my
favourites" wants. Indexing by need also creates room for entries no command grouping has: the
symptoms of a write that reported success and did nothing.

**Every option spelled out inline; no legend, no abbreviation.**
An earlier draft put the four context options in a separate column as single letters with a legend
at the top of the file. It was rejected. The letters only paid for themselves as compression, and
compression is not needed at this size; what they cost is that no row can be copied and filled in on
its own, which is the one thing the skill exists to make possible. Spelling the options out adds
roughly 240 tokens across the file. The visual signal the letters gave — which commands need the
cart — is kept by writing the context options in the same position in every entry, immediately after
the subcommand, so the shape still reads at a glance.

**Placeholders only, never worked examples.**
A concrete value invites copying it. A placeholder cannot be pasted as-is without the CLI rejecting
it loudly, so the failure is visible rather than a call against the wrong branch.

**Workflow scenarios carry no command names and no arguments.**
Written as bare algorithms, they say what each step achieves and leave the reader to find the
command in the index. This avoids maintaining the same command in two places — the drift that put
the current skills where they are — and means an option change never touches the workflow section.

**`silpo delivery slots` loses its positional branch, with no alias.**
The CLI has a consistent rule that a positional argument is the entity the command acts on and a
flag is the scope it acts within: `cart details <cartId>`, `catalog category <category>`,
`products details <product>` against `catalog categories --branch-id`, `products search --branch-id`.
`delivery slots <branchId>` is the only place a branch — a scope — is positional. Keeping the
positional form as an alias was considered and dropped: an alias would have to be documented, which
puts the inconsistency back in the skill, which is what the change is for. The CLI has one user.

**The cart-derived context is not cached in the CLI in this change.**
Caching branch, delivery type and timeslot in `silpo.db`, resolved lazily from the cart, would let
the fourteen branch-scoped commands drop between one and four options each, and would cut the
longest entries roughly in half. It is the right
end state and README already describes it as though it exists. It is deferred because the skill is
needed now and is worth having as an accurate map of what exists, and because folding a new stateful
concept into this change would make it two changes wearing one name. The cost of deferring is that
those fourteen entries get rewritten when the cached context lands; the entries are one line each.

## Risks / Trade-offs

- **The skill drifts from the CLI again, silently.** This is the failure that produced the current
  state, and nothing in the change prevents a repeat by itself. → A test walks the commander tree
  and asserts that every command and every option name it finds appears in `SKILL.md`, and that
  every command written in `SKILL.md` exists. Drift then fails the suite instead of surfacing in
  front of a user.
- **An agent pastes a placeholder literally.** → Commander rejects an unknown option and an
  unparseable id, so it fails on the first call rather than acting on a wrong branch. Accepted.
- **The whole surface loads whenever the skill triggers,** where the router loaded a quarter of it.
  → Measured at 4 478 tokens on trigger, against the 11 490 the MCP's schemas cost every session
  whether or not anything Silpo comes up — the number the project exists to beat. What is always in
  context is the 202-token frontmatter. Accepted.
- **Removing four skills is breaking for an installed plugin.** → Prototype, one user, no consumers
  outside this repository.
- **Fifty-six index entries is a long table to keep ordered.** → Sections follow the CLI's own groups
  even though entries within them are phrased as situations, so an entry has one obvious home.

## Migration Plan

1. Change `silpo delivery slots` to take `--branch-id`, and update its spec and tests.
2. Write the new `plugin/skills/silpo/SKILL.md` against the changed surface.
3. Delete `silpo-cart`, `silpo-catalog`, `silpo-geo`, `silpo-user`.
4. Add the drift test.
5. Correct `README.md`, which claims five skills, a router, and a cart context that is resolved once
   and cached.

Rollback is `git revert`; nothing persists outside the repository.

## Resolved Questions

- **Whether the failure-mode section should carry the shape divergences between MCP tools** —
  that `Product` differs between the list tools and
  `get_product_details`, that `Category` has four shapes, that the loyalty balance is `balance.total`
  in one tool and `bonusTotal` in the cart. **No.** With the index written it is clear the CLI hides
  all of them: every command renders its own payload, so a reader of CLI output never sees a shape at
  all. The one reader they still bite is a reader of `silpo raw`, so the warning lives in the `raw`
  entry — one sentence saying that nothing is normalised and that a name shared across tools is not a
  shape shared across tools. No pointer into the repository: the skill ships inside `plugin/`,
  and a plugin user has no reason to hold the repository.
