## Why

The Silpo MCP states requirements on its own tool descriptions, and the skill carries none of them.
The server tells an agent to offer the account's bonuses before finishing a cart, to hold a stated
budget, to keep plastic bags out of the cart, to translate a validation identifier before reading it
to a person, and not to call a product that this branch does not carry "temporarily out of stock".
The CLI already prints every value those rules turn on; nothing in the skill tells the agent to act
on them, so none of them happen.

At the same time the skill costs 264 lines to say less than that. Three command entries —
`products find`, `catalog` and `stores` — take 87 of those lines, most of them explaining why the
CLI behaves as it does. The explanations are not an accident: the `agent-skill` spec requires them,
in `Rules, not walkthroughs` ("A rule SHALL carry the reason it exists") and in four further
requirements that mandate a stated reason or a fixed count of statements per entry. Cutting the
prose without cutting those requirements only defers the regrowth to the next change.

## What Changes

- The skill gains five instructions it does not carry today, each expressible over what the CLI
  already prints: offer the printed bonuses in the report that hands back a finished cart; hand back
  every link the cart printed, both where it printed two; hold a budget the person stated and never
  report a cart as ready above it; never put a plastic bag in the cart; report a term that matched
  nothing as not found at this store rather than as a product that does not exist.
- The command that fills the cart from a list closes on the cart it produced, as every other cart
  write does. It does not today: it prints its outcomes and returns, so the total, the bonus balance
  and the checkout links are unreadable from the one command that most needs to report them. The
  `shopping-cart` capability already requires this — "Every command that changes the cart ... SHALL
  close on the cart that resulted", naming the list among them — so this is a conformance fix, not a
  new capability, and the skill's existing statement that a write prints the cart it produced becomes
  true.
- Two statements the skill makes incompletely are corrected: a `validations` row is a level, a type
  and a stable identifier with its values beneath it where the server sent any, to be said in the
  person's own words rather than read out, and only an `error` blocks checkout while the other rows
  still reach the person; a product listed as `unavailable` at price 0 is not sold at this branch,
  where `stock: 0` beside a real price is out of stock right now — and the same word means something
  else again while a list is being filled, which the skill names rather than conflates.
- Rationale leaves the skill. A rule states what to do, what never to do, or what always holds, and
  carries no account of why the CLI works that way.
- The skill's sections are regrouped around what the agent is doing — the cart-derived context, the
  standing rules, the command index, filling a list, what to offer, what to report, and the writes
  that report success without effect — rather than around the requirement that produced each line.
- The `agent-skill` spec drops the requirements that mandate rationale and the ones that fix a
  count of statements per command entry, and its length requirement is restated against the new
  shape.
- A drift between spec and skill is settled: the spec requires the retailer's own name to be left
  out of a store query, the skill requires it to be sent, and the CLI's behaviour is that sending it
  can resolve to the shop itself. The spec follows the CLI.
- The measurement harness is repaired and its token accounting is split. Its reset calls a command
  the CLI no longer has, so no arm-A run starts at all. And it reports one lumped context figure that
  is 93% cache reads, which counts how many times the conversation was re-sent rather than how much
  the arm had to be told. Output, the input the model paid for in full, and the input served from
  cache are counted apart, and the signal that counts tool searches goes, the harness having disabled
  tool search.
- The harness leaves the account as it found it. A run clears the cart before it starts and leaves
  whatever the flow wrote standing after it, so the account carries the last flow's cart until some
  later run clears it. The reset runs again at the end, after the cart the flow built has been
  captured into the run record. And a run whose file set is incomplete is reported as a run that did
  not pass rather than throwing where it is read, so one aborted run stops being able to halt the
  decomposition of every other.

Out of scope, and named here so the omission is deliberate: the MCP requirements that cannot be
expressed over the CLI's current output — express delivery, weighted quantities in kilograms, an
article code carried from a receipt, a coupon's accumulation progress, a coupon reward's sign and
unit, the premium share links, and naive timestamps rendered as if they carried an offset. Each is
a CLI defect or gap, not a skill omission.

One flow criterion is in scope, and it is named here because the rest of the flows are not. Flow 4
requires that every unavailable item got a concrete replacement that exists at the branch. The run
this change takes shows that requirement is unsatisfiable where the shop carries nothing comparable:
no branch checked returns a tofu, and no category the catalogue holds would carry one, so an agent
that searched exhaustively and reported the absence honestly failed a criterion written as though the
catalogue were fixed. The criterion is restated to test what the agent did rather than what the shop
stocks — a replacement that exists, or an absence the transcript shows was searched for.

Still out of scope: everything else about the flows. Their prompts tell the agent what not to buy,
which is not how a person writes, and whether a flow can put a question back to the agent is a design
question of its own. Both belong to a change about the flows, not to this one.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-skill`: adds the requirement that the skill states what the agent offers the person and how
  it reports a cart; removes the requirement that a rule carries its reason; replaces the
  per-entry statement counts for the catalogue and store entries with what those entries must make
  the agent do; restates the length requirement against the regrouped shape.
- `shopping-cart`: states the order in which the command that fills the cart composes its
  confirmation, so that its outcome rows and the cart snapshot beneath them stop contradicting the
  "and nothing else" of the general rule.

## Impact

- `plugin/skills/silpo/SKILL.md` is rewritten in place. No other page the plugin ships changes.
- `src/commands/fill.ts` closes on the cart it produced, and its golden output changes with it.
- Every other new instruction is stated over values the CLI already prints.
- The benchmark runner loses the reset call to a command that no longer exists,
  loses that command from the list its leak detector matches against, splits its token accounting
  three ways, drops one dead signal, and runs its reset again once a run's snapshot is recorded;
  the analyzer and the harness README follow it, and the decomposition script reports an incomplete
  run rather than throwing on one.
- Benchmark flow 4 restates its third pass criterion. No other flow changes.
- The five benchmark flows are run once on arm A — the arm that installs
  the plugin — after the change lands. No fresh baseline is taken.
