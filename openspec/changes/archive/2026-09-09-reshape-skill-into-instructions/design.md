## Context

See proposal.md — Why. Three constraints shape the work.

The first is that an instruction the skill adds has to stand on a line some command prints. Where it
does not, the instruction is a CLI change wearing a skill's clothes: the agent would be told to act
on something it cannot see. One instruction failed that test and the CLI is what gives way — the
command that fills the cart closes on the cart it produced, which the `shopping-cart` capability has
required all along.

The second is that the prose being removed does not sit in removable blocks. It sits in the tails of
paragraphs — a sentence opens with what to do and closes with why the CLI does it — so the file is
rewritten rather than edited down.

The third is that the run this change plans cannot be taken as the harness stands, and what it would
report if it could is the wrong number. Both are repaired here.

## Goals / Non-Goals

**Goals:**

- Every new instruction anchored to a printed line, and the anchor recorded here so a reader can
  check it without re-deriving it.
- Rationale gone from the skill, and gone from the spec requirements that were mandating it.
- The file regrouped around the agent's work, and shorter as a consequence rather than as a target.

**Non-Goals:**

- No CLI change beyond the one conformance fix. The seven MCP requirements that would need more are
  named in proposal.md and are not worked around in prose here.
- No change to what a command accepts or resolves.
- No change to the flows. Their prompts and whether they can answer a question back are their own
  change.
- No fresh performance baseline. The five flows are run once after the change to see that each still
  passes its own criteria; the run says nothing about cost against a previous arm.

The flows are run on **arm A**, which is the arm that installs the plugin and forbids the MCP. Arm B
uninstalls the plugin and drives the raw MCP, so it cannot see this change at all.

## Decisions

### Every instruction names a printed line, never a payload field

The skill speaks in what the agent sees. A rule written against `cart.calculation.loyalty` would be
unactionable, because the agent never holds that object.

| Instruction | Stands on | Printed by |
|---|---|---|
| Offer the bonuses | the cart's own `bonus: <available> of <total>` row present, `bonusRequested` row absent | `cart details` and every cart write |
| Spend them | — | `cart bonus <amount>` |
| Hand back both links | the `checkout` and `checkoutMobile` rows | `cart details` and every cart write |
| Hold a stated budget | the cart's own `total` row, at the head of the cart rather than inside a line | `cart details` and every cart write; the printed prices of `products find` where nothing is written |
| Never add a plastic bag | — a rule about what the agent passes | `cart fill` |
| Say what a validation means | `validations` rows, each `<level> <type>: <identifier>`, values indented beneath where the server sent any | `cart details` and every cart write |
| Only `error` blocks checkout | the `error` prefix on such a row | same |
| Not sold here, versus out of stock now | `unavailable` beside a price of 0, against `stock: 0` beside a real price | `products find` and `products card` |
| Report a miss as not found here | the `miss` outcome | `cart fill` |

"Every cart write" is true of eight of the nine cart writes today and false of the ninth. `cart fill`
prints its settled lines, its reductions, its ask, warn and miss rows and its validations, and
returns — it never reaches the cart's own rendering, so the total, the bonus balance and the links
are unreadable from the one command whose whole job is to report a filled cart. Three of the rows
above would have had to name `cart details` instead, and the skill would have had to send the agent
back for a second read after every fill. Making the fill close on its cart is the smaller change and
the one the specification already asks for.

The `total` key is not unique in that output: it is printed once for the cart and again for each
line, and again inside a validation's own values. The instruction names the cart's own.

Validation values are not always there. The indented rows come from the row's context, and the server
sends an empty context for some identifiers — `timeslot.not_found` among them. The instruction has to
hold when there is nothing beneath the row.

`unavailable` is not one word in this CLI. In a product listing it marks a record the branch does not
carry; in `cart fill` it names the product an auto-pick could not be filled with at all. The listing
reading is the one the new instruction is about, and the skill names the other separately rather than
letting one meaning travel to the other.

Alternative rejected: teaching the agent the server's field names so the rules read like the MCP's own
descriptions. It would tie the skill to a payload the CLI exists to hide, and every rendering change
would silently invalidate a rule.

### The fill closes on its cart, and the snapshot goes last

The two requirements that govern the fill's output disagree today. `shopping-cart`'s confirmation
rule says a write prints the summary, then what the CLI changed, then the cart snapshot, "and nothing
else"; `output-rendering` says the fill prints a count, the settled names and prices, then one row per
item that still needs the caller. Read together, the outcome rows are the "nothing else" the first
rule forbids.

The order is settled here rather than left to the implementer: count and settled names, then the
CLI's own changes, then the rows, then the validations, then the cart snapshot. The rows come before
the snapshot because they are what the caller has to answer; the snapshot closes because it is what
the caller reports.

The fix costs no call. The command already holds the cart it produced — the resulting lines it prices
its settled items from, and the validations it prints, both come from that read. Only the rendering
stops short of it.

Alternative rejected: leaving the fill as it is and having the skill infer the total by summing the
fill's own printed prices. It misses the delivery cost, the certificates, the promo code and the
bonuses already applied, which is the whole of what the budget rule is about.

### The bonus offer is conditioned on an absent line, not on a flag

The server gates bonus payment on four values. Three are visible: the available amount, the total,
and whether an amount was already requested — the last by the `bonusRequested` row, which the CLI
prints only when it is set. The fourth, whether bonus payment is enabled for the cart at all, is
declared on the cart type and used nowhere: the CLI parses it and drops it.

The skill therefore conditions the offer on the three it can see. Where the fourth is false the agent
offers bonuses that cannot be spent and `cart bonus` reports the refusal, which is a cheap wrong turn
and not worth a rule of its own.

The offer rides with the report of the finished cart rather than blocking it. Two of the five flows
pass only where the agent "reported the finished cart back rather than stopping to ask a question",
and an offer that waits for an answer before reporting would turn a passing flow into a failing one
for a reason that has nothing to do with the flow.

Alternative rejected: printing the flag. It is a rendering change the skill does not need — the three
visible values already carry the decision.

### The budget is held by the agent, because no command takes one

No command accepts a budget, so the rule is a loop the agent runs: fill, read the cart, reduce with
`cart set` or `cart remove`, read the cart again. Where nothing is written, the same rule runs over
the prices `products find` printed.

Alternative rejected: a `--budget` option on `cart fill`. It is the better home for the rule and it is
a CLI change; naming it here keeps the option open without this change reaching for it.

### Validation rows are translated, not looked up

The server calls its validation messages stable identifiers. The skill does not carry a table mapping
them to sentences: the set is open and a table would go stale silently. The instruction is to say what
the row means in the person's own words — from the values printed beneath it where the row carries
any, and from what the identifier names where it carries none — and never to read the identifier out.

### The offers are not scripted in Ukrainian

The MCP supplies literal strings for the bonus offer and for the link labels. The skill does not carry
them. What matters is that the offer is made and that both links reach the person; the wording follows
the language the person is using.

### The harness counts three token figures, not one

The harness records `input`, `cache_creation`, `cache_read` and `output`, then reports their sum as
one `context` figure and compares arms on it. Across the twenty recorded runs of the last iteration
`cache_read` is 93% of that sum and `input` is between 6 and 48 tokens, so the headline number is
almost entirely a count of how many times the same conversation was re-sent — a function of turn
count, not of how much the arm had to be told.

Three figures are reported instead, each of which means something on its own: **output**; **input the
model paid for in full**, which is `input + cache_creation` and is the volume of material the arm
actually put in front of the model; and **input served from cache**, which is `cache_read` and is
what re-sending costs. On the recorded runs the arm gap widens under the middle figure — 34.7k
against 47.6k rather than 473k against 589k — because the lump was diluting it.

`toolSearches` is dropped. The harness deletes `ENABLE_TOOL_SEARCH` from the session environment, so
the signal is zero in every run it has ever recorded.

Alternative rejected: keeping the lump beside the three as a summary. A number nobody should compare
on is a number somebody will compare on.

### The reset runs again at the end, after the snapshot is taken

A run clears the cart before it starts and leaves what the flow wrote standing after it. The account
therefore carries the last flow's cart until some later run clears it, and the last run of a sitting
leaves its cart there for good.

The order is the whole of this decision. The harness reads `cart details` after the flow and writes it
into the run record, and that snapshot is the evidence a reader judges the flow's own criteria from —
what was bought, at which branch, under which delivery type. A clear that ran before it would leave
every record saying the cart was empty and nothing to judge from. The reset runs after.

It is the same `reset` the run already begins with, not a bare clear: it leaves the cart empty and
parked at the base store, which is the state the next run's own reset would produce anyway. A cart
with no branch is not a cheaper resting state — most commands fail against one.

Alternative rejected: clearing only at the start and accepting the leftovers, on the grounds that the
next run cleans up. It leaves the account dirty for anything that is not the next run, the owner's own
use of it included, and it makes the final cart of a sitting a permanent artefact of a measurement.

### An incomplete run is an outcome, not an exception

The decomposition script reads every `.jsonl` under the runs tree and opens the `.json` beside it.
A run that was interrupted leaves the first without the second, and the read throws — so one aborted
run stops the decomposition of every complete run in the tree, including the ones in other flows and
other models.

Such a run is reported as a run that did not pass: named in the table, marked incomplete, carrying no
figures, and counted in no aggregate beside it. A missing file is a fact about the run, and a script
that reads runs should be able to say it.

Alternative rejected: skipping the run silently. The difference between "this flow was not run" and
"this flow was run and did not finish" is exactly what a reader of the table needs, and a skip erases
it.

### Flow 4's third criterion tests the agent, not the catalogue

The criterion requires that every unavailable item got a concrete replacement that exists at the
branch. It is written as though the shop always carries something comparable, and the run this change
takes found the case where it does not: asked to replace tofu, the agent searched the term in
Ukrainian and in Latin, read cards, found nothing, and said so. It failed a criterion it had answered
as well as the catalogue allows.

The absence is the shop's, not the CLI's. The CLI's answer for the term is the same as the server's
own — both return a confectionery whose name shares the term's first letters, and at a second, much
larger branch the only further match is a noodle carrying tofu in its ingredients. No category in the
tree would hold a tofu. What is not established: every branch, the whole tree — the category listing
returns 1000 of 1010, and two branches were checked, not all of them. The evidence is enough to say
the criterion is unsatisfiable here, and not enough to say the shop has never carried one.

The criterion becomes: replaced with a concrete product that exists at the branch, or reported as
having nothing comparable at the branch on the strength of a search the transcript shows. Guessing,
dropping the line silently, and naming a product the branch does not carry all still fail.

Alternative rejected: pinning the flow to an order whose items are reliably stocked. It would make the
flow pass reliably by testing less — the interesting half of this flow is what the agent does when the
shop cannot supply something.

### The file is rewritten, and each surviving instruction keeps a scenario

Rewriting rather than editing risks dropping an instruction along with the paragraph that explained
it. The guard is in the delta spec: every scenario the current spec carries for the catalogue query,
the catalogue listing, the store query and the CLI's own decisions survives into the modified
requirement, restated in imperative terms. An instruction with a scenario cannot quietly vanish; a
sentence with no scenario behind it is the water this change is removing.

## Risks / Trade-offs

- **A rule without its reason reads as arbitrary and gets overridden.** → The rules that were carrying
  a reason are the ones whose reason was a fact about the CLI, not about the person's order. Where a
  rule genuinely needs a fact to be actionable — that only `error` blocks checkout, that a passed slot
  reports every line out of stock — the fact is the instruction, not a justification appended to one.
- **The budget loop is not exercised by any flow.** → Flow 3 names a budget and writes nothing; flows
  1 and 2 write the cart and name no budget. The loop ships unmeasured, and the run is recorded as
  not covering it rather than as clearing it. A sixth flow is what would cover it, and the flows are
  a change of their own.
- **Every assertion on the fill's output changes.** → `test/fill.test.ts` pins the whole output as a
  literal in fourteen places, and there is no golden file for it as there is for the other cart
  commands. Each literal grows the snapshot the fake's cart already implies. A test not updated fails
  loudly, which is what is wanted.
- **Shrinking three entries drops something load-bearing.** → Every scenario survives; the reviewer
  checks the skill against the scenarios rather than against the old prose.
- **One run of five flows is a weak signal.** → It is a check that nothing broke, not a measurement.
  Stated plainly rather than reported as a result.
