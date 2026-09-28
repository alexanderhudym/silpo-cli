## Why

An end-to-end benchmark of 100 agent sessions — five errands, two arms, Sonnet and Opus —
measured the CLI plus its skill against the raw Silpo MCP. The CLI arm finished the same
errands for 31% less on Sonnet and 44% less on Opus, and never lost on cost in any of the ten
cells. But the transcripts show the losses are concentrated and avoidable, and almost all of
them come from the surface being named after its implementation rather than after the job:

- `products search` is documented as a name search and has no query option at all; the command
  that searches by name is called `batch`. 19 of 50 arm-A runs stumbled here, and five of the
  six `--help` fetches in the whole arm were this one command.
- There is no way to find a category by name, so agents paged all 1015 categories into a file
  and grepped it — 9 of 50 runs.
- There is no way to find a store by distance or by id, so 10 runs grepped the full listing and
  4 hand-wrote a haversine in Python. One run pulled 37 101 characters of store listing into
  context to do it.
- `catalog promotions` returns campaigns, not products, but reads as though it returns products.
  All 10 promotion runs abandoned it; `--promotion-code` was never once used successfully,
  though the codes it takes had just been printed.
- `delivery slots --start/--end` has a dead zone at local midnight: `00:00–23:59` on a day
  returns nothing while `23:00` the evening before returns the same day's ten slots. 11 runs
  hit it, because "all of tomorrow" is the natural window to write.
- `catalog tree` is the command that answers "where is meat?", and the skill tells the agent to
  avoid it as costly. The four runs that ignored that advice include the cheapest promotion run
  in the whole arm, at 8 steps against 21, 16 and 16 for the runs that obeyed.

The skill is the most expensive artefact to get wrong: it is re-sent on every turn and it steers
every decision. Since it must be rewritten to match any renaming, the surface and the skill are
one change, not two.

## What Changes

**BREAKING** — the product and catalogue command surface is renamed. Nothing outside this repo
runs the CLI, so the cost is the rewrite itself.

- **Products.** `products batch` becomes `products search` and additionally accepts its queries
  as positional arguments; `products search` becomes `products list` and requires an anchor
  (`--category`, `--set` or `--promotion-code`), which the server already demands. `products`
  with no subcommand runs `products list`.
- **Categories become their own group**, shaped like products: `categories list` (the default),
  `categories search <query...>`, `categories tree`, `categories details <category>`,
  `categories popular`. `categories search` pages the full listing internally and reports the
  count it actually matched.
- **The `catalog` group is dissolved.** Two thirds of it was categories; the remainder becomes
  `silpo promotions` and `silpo sets`.
- **Stores.** `branches nearest <lat>,<lon>` sorts the whole listing by great-circle distance and
  pages over its own result; `branches details <id>` prints one store. The store listing stops
  printing the external `number`, which nothing accepts as input and which agents mistook for
  the local id when naming a store to the user.
- **Delivery slots.** Within the server's horizon the window is applied locally rather than sent,
  and slot availability is printed as a field instead of being implied by the absence of a word.
- **Summaries state what was found**, not what was asked for. `products replacements` currently
  heads three empty results with "Found replacements for 3 products".
- **Online orders print the branch** the order was placed at, which the MCP payload carries and
  the CLI drops.
- **The skill is rewritten** against the new surface: the cart-context rule is split into what a
  read needs and what a write needs; chaining independent commands into one shell call is
  documented; product lookup by id versus by name is stated; the `addressType` vocabulary is
  given along with the warning that a contradicting value is stored without complaint; the cart's
  validation codes are glossed; naming an internal number to the user is forbidden; and advice
  about which commands are expensive is removed, having been measured to backfire.

## Capabilities

### New Capabilities

None. Every command already exists in some form; this change renames, regroups and corrects them.

### Modified Capabilities

- `product-search`: command names and argument shapes change; the batch summary and the
  replacements summary must report what was found.
- `catalog-browsing`: categories become their own group with a search command that filters the
  whole listing; promotions and sets move out; the tree stops being described as costly.
- `stores-and-delivery`: distance-ordered and single-store lookups are added; the external store
  number leaves the listing; the slot window is applied locally and availability is printed.
- `user-account`: an online order's products name the branch they were bought at.
- `output-rendering`: a summary line describes the result the command printed.
- `command-input`: a search query may arrive positionally as well as through a repeatable option.
- `agent-skill`: the skill is rewritten against the new surface, with rules split by read versus
  write and the failure modes the benchmark exposed named.

## Impact

- `src/commands/products.ts`, `src/commands/catalog.ts`, `src/commands/branches.ts`,
  `src/commands/delivery.ts`, `src/commands/orders.ts`, `src/program.ts`.
- `plugin/skills/silpo/SKILL.md` in full.
- `README.md`, whose stated per-session schema cost no longer holds: current Claude Code defers
  MCP schemas, so the server costs 130 tokens at session start rather than 11 490.
- No dependency changes. Distance is computed locally; nothing new is fetched.
- The existing benchmark harness can re-measure the two cells where the CLI
  lost — reorder on Opus and promotions on Sonnet — in about 20 runs.
