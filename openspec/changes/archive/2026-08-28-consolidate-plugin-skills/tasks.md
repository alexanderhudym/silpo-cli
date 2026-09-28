## 1. Branch option on the slot listing

- [x] 1.1 Replace the positional `<branchId>` of `silpo delivery slots` with a required
      `--branch-id <id>` option in `src/commands/delivery.ts`, resolving it through the same
      `readBranch` path the other branch-scoped commands use
- [x] 1.2 Update the invocations in `test/delivery.test.ts`, `test/store.test.ts`,
      `test/commands.test.ts` and `test/golden.test.ts` to pass the branch through the option
- [x] 1.3 Update `test/input.test.ts`, which uses the slot listing as its sample command for
      argument parsing, keeping the synthetic command it builds in step with the real one
- [x] 1.4 Add a test that the command fails when the branch is written as a bare argument, and one
      that it fails when the option is absent
- [x] 1.5 Confirm `delivery.slots` renders byte-for-byte as before against the existing fixture

## 2. The skill body

- [x] 2.1 Write the frontmatter: one `silpo` skill, with a description carrying the vocabulary a
      request would actually use in Ukrainian, Russian and English
- [x] 2.2 Write the context preamble — the cart is the only source of branch, delivery type and
      timeslot, the order of commands that reads them, and the revalidation of the cart's timeslot
      against the branch's slots
- [x] 2.3 Write the product entries, with every option of `products search`, `batch`, `details`,
      `similar`, `replacements`, `favorites` and `favorites-update` inline as placeholders
- [x] 2.4 Write the catalog entries for `categories`, `tree`, `category`, `popular`, `promotions`
      and `sets`, keeping each one's distinct context requirement visible
- [x] 2.5 Write the cart entries, splitting `cart update` across the situations it serves — delivery
      type, timeslot, address, branch, promo code, bonuses, adult confirmation
- [x] 2.6 Write the place and delivery entries for `delivery address`, `delivery types`,
      `delivery slots`, `branches` and the two Nova Poshta lookups
- [x] 2.7 Write the account entries for `profile` and its three subcommands, `loyalty` and its six,
      and both order histories
- [x] 2.8 Write the housekeeping entries for `login`, `logout`, `server test`, `server stop`,
      `config`, `gain` and `raw`
- [x] 2.9 Write the failure-mode section from the recorded MCP divergences, one entry per
      observable symptom
- [x] 2.10 Write the three published workflows as numbered steps carrying no command names and no
      arguments
- [x] 2.11 Read the finished file once as an agent would and check that no entry needs another part
      of the file to be usable

## 3. Drift test

- [x] 3.1 Add a test that walks the commander tree and collects every command path and option name
- [x] 3.2 Assert that every collected command path and option name appears in
      `plugin/skills/silpo/SKILL.md`
- [x] 3.3 Assert the reverse: every `silpo …` invocation written in the skill resolves to a command
      that exists, with options the command accepts
- [x] 3.4 Confirm the test fails when a command is renamed and when an option is added without
      touching the skill

## 4. Retire the old skills

- [x] 4.1 Delete `plugin/skills/silpo-cart/`, `plugin/skills/silpo-catalog/`,
      `plugin/skills/silpo-geo/` and `plugin/skills/silpo-user/`
- [x] 4.2 Check `.claude-plugin/marketplace.json` for anything that counts or names the removed
      skills
- [x] 4.3 Correct `README.md`, which claims five skills behind a router and a cart context that is
      "resolved once and cached"; state what the CLI actually does
- [x] 4.4 Run the full suite and install the plugin locally to confirm the one skill loads and its
      commands run

## 5. Review follow-ups

- [x] 5.1 Correct the `catalog tree` entry, which told the reader to name the nodes with a second
      call the CLI already makes internally — the one claim in the skill that cost tokens instead of
      saving them
- [x] 5.2 Correct the count of commands requiring a delivery type in the skill, proposal and design:
      nine of the fourteen branch-scoped commands, not ten
- [x] 5.3 Widen the drift test to every markdown page under `plugin/`, and to commands written in
      fenced blocks, so neither a command page nor a fence escapes it
- [x] 5.4 Check positional arity as well as option names, so the positional form of a command that
      lost it cannot be written back into a page unnoticed
- [x] 5.5 Correct `plugin/commands/login.md`: it named `silpo status`, described the browser
      behaviour backwards, and quoted a message the CLI does not print
- [x] 5.6 Correct the `plugin.json` description, which called the output TSV where the sibling
      manifest had already been corrected
- [x] 5.7 Tighten the two new slot-listing failure assertions, which matched text the help output
      carries anyway
- [x] 5.8 Qualify the `catalog tree` claim: the count appears only where the MCP reports one, and a
      node the name join cannot resolve is dropped rather than printed nameless
- [x] 5.9 Let the drift test see a fence indented under a list item, and a `~~~` fence — the first
      draft anchored both patterns at column zero, which left the natural place to write an example
      inside the skill unguarded while the spec claimed otherwise
- [x] 5.10 Scope the "names a command" check to the pages that exist to instruct, so a descriptive
      page added under `plugin/` later does not fail the suite for having nothing to run
- [x] 5.11 Recount and re-measure design.md against the finished skill: top-level commands, the
      commands the cached context would shorten, the index entries, the line count and the tokens
- [x] 5.12 Stop the drift test reading a trailing `#` comment as arguments — the CLI's own README
      writes its examples that way, so the trap would have fired on the first example anyone added
- [x] 5.13 Say in design.md that the line count is a measurement taken when it was written and the
      structural counts are the argument, since the figure went stale twice while the change was
      being applied

- [x] 5.14 Give authorization its own section, and stop offering `silpo server` as the check for it —
      it reports the background process and prints `state: stopped` whether or not a token is stored,
      so it answers the question wrongly in both directions; `plugin/commands/login.md` carried the
      same claim

## 6. Rewrite the skill against how skills are actually written

- [x] 6.1 Replace the `What to do if…` heading and its sentence-completing subheadings with plain
      noun-phrase sections — the question form appears in none of the ~900 skill headings surveyed
- [x] 6.2 Drop the Ukrainian and Russian keywords from the description; triggering is semantic, and
      the frontmatter is paid on every query of every session
- [x] 6.3 Drop the counts of how many commands take which option, and let each entry carry its own
      requirement — a graded count cannot be replaced by a blanket claim, which is how the first
      draft came to assert something that breaks the CLI
- [x] 6.4 Replace the three published walkthroughs with rules, keeping only what the walkthroughs
      encoded that an agent does not do unprompted
- [x] 6.5 Promote the local-numbers section out of its wrong nesting under the cart preamble
- [x] 6.6 Cut the reasoning and justification the body does not need, while keeping every fact the
      agent cannot derive
- [x] 6.7 Fix the frontmatter, which held an unquoted colon and did not parse under a strict YAML
      reader, and add a test for it — neither `claude plugin validate` nor the drift test caught it
- [x] 6.8 Bring the spec back into line with what the skill now is: entries answer a need, headings
      name their subject, the preamble makes no blanket claim about a group's options, rules replace
      walkthroughs, and the frontmatter is machine-readable
