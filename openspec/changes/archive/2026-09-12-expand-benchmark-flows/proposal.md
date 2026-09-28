## Why

The benchmark measured the CLI against the raw MCP on five errands. Five is enough to see a 2×
gap and not enough to say where it comes from, and the five were all of one shape: a request
arrives as text, the agent resolves it against the catalogue. Nothing measured what happens when
the errand starts somewhere else — a photographed list, a dish in a picture — which is how a lot of
real grocery requests actually arrive.

The suite could not grow as it stood. The analyzer carried its pass criteria as a chain of
`if (run.flow === "1")` whose final `else` passed a run only when its cart came back empty, so
every write flow added after flow 2 would have been recorded as a failure the day it was written.
The harness had no way to hand a flow an input file at all. Two further faults only appear at
scale and both destroy runs rather than record them.

Then the wider suite did what a wider suite is for: it found defects in the CLI it was measuring.
Seven of them, each caught by a run rather than by a test, and each fixed here — because a benchmark
argued from an arm with known defects in it is measuring the defects.

## What Changes

### The suite

- **Ten new errands, taking the suite from five to fifteen.** Three begin outside Silpo: a
  photographed handwritten list, a saved Pinterest page, a recipe page with schema.org data. Seven
  are Silpo-only and cover surfaces nothing touched — in-store receipts, product cards, nutrition
  attributes, a budget trim loop, promotions behind a write.
- **Pass criteria move into the flow files.** Each flow carries a `## Checks` block that
  `verdictFor` parses, the way `readFlow` already parses `## Prompt`. Adding a flow no longer
  means editing the checker.
- **Flows can ship an input file.** `assets/flow-<N>/` is copied into the run's working directory
  and `{{asset:name}}` in the prompt is replaced with the absolute path of the copy. Files one
  level down in `source/` are not copied, so an asset's own source cannot leak into the run.
- **A run that never reaches Silpo is recorded, not fatal.** It used to halt the matrix, which
  threw away every remaining cell over one floundering agent. A leak still halts; repeated
  unreached runs on one arm still halt.
- **The reset waits out the server's rate limit.** Cart writes are rate-limited and the reset is
  four of them per run.
- **The payment-navigation check is scoped to Silpo's own hosts**, and the external fetch route
  each run took is counted and reported.
- **Flow 7 stops measuring the model and starts measuring the arm.** It handed the agent a
  Pinterest URL, which `WebFetch` cannot read, and let each run invent its own way in — a coin toss
  the flow's own notes admitted had to be grouped for before runs could be compared. The page is now
  captured once and shipped, and the prompt asks for the dish from memory, so every run starts from
  the same input and what differs between arms is the Silpo work.
- **A check can require that a figure was received rather than recalled.** A `cites:` line names a
  phrase that has to appear in what the tools handed back. Two flows turn on the catalogue's own
  attributes — nutrition, allergen declarations — and a run that never received them can still print
  a table of them. Run against the sweep, it fails exactly the two runs that did.
- **Three metrics stop flattering.** `asked` fired on every read flow, an empty cart being what such
  a flow requires, so two finished answers that closed with an offer were recorded as abandonment.
  `repeats` keyed on the whole tool input, and a shell step carries a model-written `description`, so
  a repeated command was unrecognisable as one and the arm that runs shell commands scored an
  unearned zero. `anomalies` compares a run against its own cell's median, which at one run to a cell
  is the run itself: the rule cannot fire, and its zero is arithmetic rather than evidence.

### The CLI, as the suite found it

- **A named delivery type decides what kind of place a destination is**, rather than the text being
  resolved first and the type checked against wherever it landed. A store the containment test
  misses is found by its geocoded parts. All six resolution errors in the smoke came from here.
- **One option names a destination.** `cart setup --branch` is removed: its own semantics produced a
  self-pickup cart naming one shop while another fulfilled it, reported as success.
- **The client's wait on the daemon is split** into a short one for the connection and a long one
  for the answer. One bound served both, and at ten seconds it was cutting real work — two runs lost
  roughly seventy steps to it.
- **`cart set` corrects several lines in one call**, so a caller fixing three weighed lines does not
  loop the command in a shell.
- **A rate-limited call is retried inside the CLI.** The server refuses the third cart write in
  quick succession with a tool error rather than a 429, so nothing below the tool layer sees it.
- **A failed slot repair says why it failed.** Both catches were bare, so a repair the limiter
  refused was reported as a branch with no slots left while the slot listing answered that it had
  sixteen.
- **A delivery change carries its slot rather than repairing ahead of itself**, which removes a cart
  write spent on the branch the call is leaving.
- **A limit above what a tool accepts is read in pages.** The caps are read from the tools' own
  schemas, so `me orders --offline --limit 15` reads fifteen receipts instead of being refused.
- **A tie-break can no longer trade the term for a discount.** Candidates sharing the top's
  coordination counted as tied, and a one-word term expands to one probe, so the whole pool was tied
  and the promotion rule reached anything discounted in it. Measured live, `морква` settled on a baby
  purée, `банани` on a milk drink and `рис` on noodles, while the carrot, the banana and the rice sat
  first in the same list. A tied candidate must now also answer the term at least as well as the
  first one does. On the four errands that assemble a basket from an unconstrained list, the defect
  was worth between 48% and 72% of the bill: the rule written to save money was inflating it.
- **A weight beside an item is how much to buy.** It was read as a pack specification, and a product
  sold by weight carries no pack, so the comparison failed and the term asked instead of settling —
  there was no way to ask for half a kilogram of anything, and a separate quantity write was the only
  channel there was. Grams convert by division, a reciprocal landing 950 g on 0.9500000000000001.
- **`шт` is read with the count it follows** instead of reaching the term, where it narrowed nothing
  and widened the probe expansion by a word every product can carry.
- **Each settled line names the term it answers and the amount written.** Twenty items in, seventeen
  lines out, in an order of their own and with no mapping between them: three matches absurd on their
  face were caught and a smoked deli fillet at 679 UAH/kg was not. The term is what the override flag
  keys on, so without it an automatic match could not be overridden at all.
- **`--ask-all` has a list to offer.** A settled line kept only what it settled on, so the flag that
  puts every item back to the caller re-asked with a single candidate where eight existed.
- **`--limit` bounds each query rather than the merged listing.** Ten queries under a limit of four
  were answered for four and not at all for the other six, while the summary above went on reporting
  a found count for every one.
- **The skill gains the rules the runs showed were missing**: where composition, allergens and
  nutrition are written down; that a failed call says nothing about the shape of what was sent; that
  a rate limit is already waited out, so sleeping in the shell will not clear it; that an item may
  carry the weight to buy; what a settled line now states; and what the page size bounds.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `delivery-resolution`: a named delivery type now decides which listings a destination text is
  resolved against, instead of the text being resolved first and the type checked against whatever
  it landed on. A store the containment test misses is found by its geocoded parts. One option
  names a destination in every form, including a branch uuid. Changing the destination resolves the
  delivery type, branch, address and slot together, because they are a chain rather than four
  independent settings.
- `mcp-session`: the client's wait on the daemon is bounded separately for the connection and the
  answer; a call the rate limiter turns away is repeated; a limit above a tool's published cap is
  read in pages.
- `cart-session`: a repair that could not be made keeps why, and the refusal it causes speaks it; a
  delivery change carries the slot it needs instead of writing a repair ahead of itself.
- `shopping-cart`: the line-quantity command takes further product and quantity pairs, all reaching
  the server in one write.
- `list-resolution`: a tie-break reaches only candidates that answer the term at least as well as the
  first one does, so it can choose between right answers and never between kinds of product; a mass
  beside a term resolving to a weighted product is the quantity to buy rather than a pack to match;
  `шт` is the unit a count is written in and never part of the term; a settled line names the term it
  answers and the amount written; and a settled line keeps the candidates it chose among.
- `product-search`: the page size bounds what each query is answered with rather than the merged
  listing, and a selector's residue fills only what the queries left.
- `agent-skill`: the skill states where a food's composition is written down, that a failed call
  says nothing about what was sent, that a rate limit is already waited out, that an item may carry
  the weight to buy, what a settled line states and what the page size bounds.

## Impact

- The benchmark flows — ten new files, `## Checks` added to the five existing ones, flow
  7 rebuilt around a shipped page, and an `assets/` tree carrying two images and the HTML one of
  them was rendered from.
- The benchmark runner — asset placement and substitution, rate-limit
  patience, the unreached/leak split, the scoped payment check, fetch-route counters, a `prompt`
  subcommand that resolves a flow without launching an agent, and updated matrix defaults.
- The analyzer — criteria read from the flow files, `total` added
  to the facts a check can test, the failing check named in the report, external payload reported
  apart from the rest, the `cites:` check and the tool text it reads, and abandonment asked only of
  flows that write.
- The benchmark README — the reproduce command.
- `plugin/skills/silpo/SKILL.md` — five rule changes, the rewritten `cart setup` and `cart set`
  entries, and four corrections the fixes below made necessary: the weight an item may carry, what a
  settled line states, what the tie-break can reach, and what the page size bounds.
- `src/resolve/products.ts` — the score a candidate is kept at, the tie-break gated on it, and a mass
  read as a quantity where the product is sold by weight.
- `src/resolve/normalize.ts` — `шт` read with the count it follows.
- `src/daemon/fill.ts` and `src/commands/fill.ts` — the effective quantity threaded through the
  write and the shortfall, the candidates a settled line keeps, and the term and amount it prints.
- `src/commands/products.ts` — the page size applied per query, with a selector's residue as filler.
- `src/resolve/delivery.ts` and `src/resolve/stores.ts` — the destination cascade, the store
  fallback, and the uuid guard. Every failing step in the smoke came from here: the most expensive
  arm-A run spent fourteen of its thirty steps on `cart setup`, six of them errors, all of them one
  defect.
- `src/commands/carts.ts` — `--branch` removed from `cart setup`, `cart set` made variadic.
- `src/daemon/client.ts` — the connection and answer bounds split apart.
- `src/daemon/cart.ts` — the repair's reason kept and spoken, and folded into the write that
  follows it.
- `src/mcp/session.ts` and `src/mcp/pages.ts` — the rate-limit retry, the caps read from the served
  schemas, and paging at the session's own call, which is the one place every path goes through.

The reset the whole benchmark stands on is `cart setup --to` with no delivery type, and it matches
by containment today. Both properties are preserved deliberately: the cascade is unchanged when no
type is named, and the containment test keeps its place as the first thing tried.
