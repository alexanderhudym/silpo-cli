## 1. The fill closes on its cart

- [x] 1.1 Print the cart snapshot beneath the fill's own output in `src/commands/fill.ts`, in the order design.md settles: the count and the settled names and prices, what the CLI changed on the caller's behalf, the rows that still need the caller, the validations, then the snapshot.
- [x] 1.2 Take the snapshot from the cart the command already holds, without a further read, and print the validations once rather than once from the fill and once from the snapshot.
- [x] 1.3 Update every assertion in `test/fill.test.ts` that pins the command's whole output, including the case where nothing settled and the case where every item needs the caller.
- [x] 1.4 Run the build and the full suite, and report failures with their output.

## 2. The harness runs and counts what matters

- [x] 2.1 Remove the `silpo index rebuild` call from the benchmark runner's reset step; the command no longer exists and the reset throws on it before any arm-A session starts.
- [x] 2.2 Record and report three token figures per run in place of the lumped context: output, the input paid for in full (`input` plus `cache_creation`), and the input served from cache (`cache_read`). Keep the raw four on the run record; change what the summary compares.
- [x] 2.3 Drop the `toolSearches` signal, the harness having disabled tool search in the session environment.
- [x] 2.4 Follow the change through the analyzer and the harness README, so the code and the page agree on what is compared.
- [x] 2.5 Prove the repair by resetting arm A once and seeing the reset return a slot rather than throw.

## 3. Rewrite the skill

- [x] 3.1 Regroup `plugin/skills/silpo/SKILL.md` into the blocks the delta spec names — the context every command runs within, the standing rules, the command index, filling a list, what is offered, what is reported, and the writes that report success without effect — keeping the index's existing division by area.
- [x] 3.2 Add the bonus offer, riding with the report of the finished cart rather than blocking it, and the rule that every link the cart printed is handed back whole.
- [x] 3.3 Add the budget rule and the plastic-bag prohibition to the blocks they belong to, each written against the printed line design.md anchors it to and never against a server field.
- [x] 3.4 Replace the single sentence about `validations` with what a row is, that its identifier is never read out, that its meaning is said from the values printed beneath it where the row carries any and from what the identifier names where it does not, and that only an `error` row blocks checkout while the others still reach the person.
- [x] 3.5 State how a product with no stock is described in a product listing — `unavailable` beside a price of zero is not sold at this branch, `stock: 0` beside a real price is out of stock now — name separately what the same word means while a list is being filled, and state that a `miss` is reported as a term not found at this branch.
- [x] 3.6 Keep the rule that no machine handle is read to a person, and keep the two entries that name the identifier their argument takes, since those commands fail on a name.
- [x] 3.7 Rewrite the `products find`, `catalog` and `stores` entries as instructions, keeping every instruction the delta spec's scenarios require — including the per-category product count, the sort options' single-population limit, and the alternatives printed under a decisive out-of-stock match — and dropping every account of why the CLI behaves as it does.
- [x] 3.8 Strip the remaining rationale from the preamble, the rules and the other entries, including the tails of sentences that open with an instruction and close with a justification.
- [x] 3.9 Check the rewritten file against the CLI: run `--help` for every command it names and confirm each command, option and enum value exists as written.
- [x] 3.10 Count the entries and confirm there are thirty, one per leaf command the agent drives, and that none names a command outside that set.

## 4. Run the flows

- [x] 4.1 Build, then run each of the five benchmark flows once on arm A on one model, naming the model in the record.
- [x] 4.2 Record each flow as passing or failing its own criteria, and record the three token figures rather than the lump.
- [x] 4.3 Record the budget write loop as uncovered: flow 3 names a budget and writes nothing, flows 1 and 2 write and name no budget, so no flow exercises fill, read, reduce, read.
- [x] 4.4 Report the runs as a check that nothing broke, not as a measurement, since no fresh baseline was taken beside them.

## 5. The harness leaves nothing behind, and one flow criterion is made satisfiable

- [x] 5.1 Remove `index` from the subcommand list the benchmark runner matches invocations against; the CLI has no such command, and task 2.1 left it behind.
- [x] 5.2 Run the benchmark runner's reset again at the end of a run, after the cart the flow built has been read into the run record, so the account is left empty and parked at the base store rather than holding the last flow's cart.
- [x] 5.3 Report a run whose file set is incomplete as a run that did not pass in the decomposition script — named, marked incomplete, carrying no figures and counted in no aggregate — rather than throwing on the missing file and stopping every other run's decomposition with it.
- [x] 5.4 Restate the third pass criterion of benchmark flow 4 so that a replacement that exists at the branch and an absence the transcript shows was searched for both satisfy it, while guessing, dropping the line silently and naming a product the branch does not carry still fail.
- [x] 5.5 Prove 5.2 and 5.3 without launching a session: read the cart after a run's record is written and see it empty at the base store, and run the decomposition over a tree carrying an incomplete run and see it complete.

## Review checklist

- [x] The command that fills the cart prints the cart it produced, in the order the delta spec states, and prints the validations once.
- [x] The fill makes no cart read it did not make before.
- [x] Every command, option and enum value the skill names is one the CLI accepts, checked against its own help rather than against the old skill.
- [x] The skill carries exactly thirty command entries, one per leaf command the agent drives, and none for the seven it does not.
- [x] No sentence in the skill answers why the CLI behaves as it does. A sentence that opens with an instruction ends at the instruction.
- [x] Each instruction in design.md's anchor table that names a printed line names that same line in the skill, and the line is one the CLI prints after this change.
- [x] No rule in the skill turns on a value the CLI does not print, and no server field name appears anywhere in the file.
- [x] Nothing in the skill carves the fill out of the rule that a write prints the cart it produced.
- [x] Every scenario in `specs/agent-skill/spec.md` and `specs/shopping-cart/spec.md` holds against the code and the file.
- [x] The bonus offer, the link rule, the budget rule, the bag prohibition and the miss wording each appear once, in the block for that work, and no other block restates them.
- [x] The bonus offer is written to accompany the report of a finished cart, not to precede it.
- [x] Section headings name the work the agent is doing; none names a requirement of the spec.
- [x] Nothing that had a scenario behind it was removed with the prose around it, and the three instructions with no scenario before this change — the product count, the sort limit and the printed alternatives — are still in the file.
- [x] The skill is shorter than the one it replaces, and the reduction is accounted for by rationale rather than by instruction.
- [x] The harness reset runs to completion on arm A, and no summary it prints compares arms on a figure that is mostly cache reads.
- [x] A run leaves the cart empty at the base store, and the run's own record still carries the cart the flow built. The clear cannot have run before the snapshot.
- [x] The decomposition completes over a runs tree holding an incomplete run, names that run as one that did not pass, and lets no figure of it reach an aggregate.
- [x] Flow 4's third criterion is met by an agent that searched and reported an honest absence, and is still failed by one that guessed, dropped the item silently, or named a product the branch does not carry.
- [x] No command the CLI does not have is named anywhere in the harness.
