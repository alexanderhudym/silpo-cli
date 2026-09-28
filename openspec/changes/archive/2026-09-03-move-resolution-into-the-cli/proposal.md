## Why

The measured advantage of this CLI over the raw MCP is 31% on Sonnet and 44% on Opus, and
the benchmark says where it came from: not from step count, which is close in both arms,
but from volume — and the arm-A-against-arm-A rounds show that every further gain came from
**removing a wrong turn**, not from compressing a payload. On the promotions cell four rounds of
surface and skill work moved the median from 16 steps to 8 and the spread from 8–21 to 6–8. A rule
that deletes a wrong turn does not make a good run faster; it stops a bad run happening.

Payload compression has done its 72.6% and has no more to give. What remains is that the agent still
makes every decision itself: it searches, it reads candidates, it picks, it chains address to
delivery type to branch to slot, and it carries a table of which identifier form each command
accepts. Each of those is a decision the CLI could make and does not, and each is paid for twice —
once in the payload the agent must read, and once in the skill prose that teaches it the rule. The
skill is 497 lines and grows with every change.

This change moves those decisions into the CLI.

## What Changes

- **BREAKING** A personal product index is built from order history and favourites, and enriched
  from every search the caller has already paid for. It holds identity only — never price, stock,
  or promotion — because `cart add` already reports `reduced` and `unfillable` and is the authority
  on state. `productId` is catalogue-global, so the index is single, and `branchId` is a soft
  signal rather than a partition key.
- **BREAKING** `silpo fill <item...>` takes a shopping list as free text and puts it in the cart.
  Each item is normalised into a term, a quantity, and a specification (fat percentage, pack size);
  matched against the index and, on a miss, against a live search; and resolved by a lexical ranker
  under a decision policy of `auto`, `ask`, `warn`, `miss`. It writes the cart itself. Ambiguities
  come back as `ask` rows carrying server-issued identifiers, and all of them are answered in one
  further call through `--pick`.
- **BREAKING** The command surface collapses. `search` covers every product listing and takes `--in`
  for a category, a promotion, or a set, by handle **or by name**. `browse` lists those scopes with a
  `kind` column. `me` bundles the profile, the loyalty balance, and the subscription. A lookup stays
  with its family — `product <handle>`, `browse <slug> --tree`, `stores <uuid|query>`,
  `me coupon <id>` — because a bare uuid names five different kinds of thing and a bare integer names
  two, so no single command can dispatch on the form of a handle.
- **BREAKING** `silpo cart setup --to <text> [--when <time>]` resolves the whole delivery chain —
  address, delivery type, branch, slot — and writes the cart. Where more than one candidate is
  plausible at any step it prints the candidates and stops rather than choosing. `--to` also
  accepts a Nova Poshta office, and supplies its coordinates itself.
- **BREAKING** JSON arrays are removed from every input. `cart remove` and `favorite` take
  positional identifiers; `cart promo`, `cart bonus`, and `cart certificate` become named commands
  instead of flags on `cart setup`; `me orders --offline` fills its required delivery context from
  the cart.
- **BREAKING** `products list`, `products similar`, `products favorites`, `products replacements`,
  `categories` (five leaves), `promotions`, `sets`, `delivery address`, `delivery types`,
  `branches list`, `branches nearest`, `np settlements`, `np offices`, `profile`, `loyalty`
  (seven leaves), `orders online`, `orders offline` are removed as command names. Every capability
  they carried survives under the new surface, `--must-have-promotion`, `--feedback-changes` and
  `--feedback-contacts` included, with one exception: `products replacements` is dropped rather than
  moved, because the endpoint behind it answers with no candidates and the vendor's own web client
  gets the same empty answer from the same call.
- Two things the tools do not do, stated rather than implied: **a query inside a scope** and **a
  store narrowed by name or place** have no server-side parameter — `get_products` takes no query,
  `find_products_batch` takes no scope, and `list_branches` takes neither a name nor a coordinate. In
  each case the CLI pages the listing and filters it itself, and the specs say what bounds the
  paging.
- The surface goes from **50 leaf commands to 40**, of which **43 were agent-facing and 30 remain**,
  counting a leaf the same way on both sides: one invocation form that performs an action of its own,
  each subcommand counted separately from its siblings and from its group, and a group that acts when
  named with no subcommand counted as one further leaf.
- The skill is rewritten rather than edited: roughly 497 lines to **around 150**, under a third.
  Three sections die outright (identifier forms, times, opening a cart), the command section drops
  from 43 entries to 30, and
  design rationale moves to `design.md` on the rule that a line earns its place in the skill only
  if removing it would change what the agent does.
- `silpo index status | rebuild | why <term>` makes the new hidden state inspectable, because a
  wrong `auto` is otherwise undebuggable.
- Embeddings are **out of scope**. Resolution is lexical: BM25 with character trigrams over the
  product **name**, which is the only text field any product payload carries — there is no brand and
  no category on a product in this catalogue — plus a ru→uk product-term dictionary. The brand is
  still matched because it sits inside the name. The semantic fallback already exists and is already
  loaded: it is the agent, reached through `ask`.
- `cart set <product> <quantity> [--comment <text>]` changes how much of one line is in the cart.
  Without it, "make it three instead of two" has no command at all.

## Capabilities

### New Capabilities

- `product-index`: the personal catalogue the CLI keeps on disk — what a record holds, what it
  never holds, how it is filled from history and enriched lazily, how it is keyed, and how it is
  inspected and reset.
- `list-resolution`: turning a free-text shopping list into cart writes — normalisation into term,
  quantity and specification; the ru→uk dictionary; lexical ranking; the `auto`/`ask`/`warn`/`miss`
  policy and its asymmetric thresholds; the `--pick` round trip.
- `delivery-resolution`: the address-to-slot chain behind `cart setup --to` and `--when`, including
  the rule that ambiguity stops and prints rather than choosing, and the Nova Poshta path.

### Modified Capabilities

- `command-input`: the collapsed surface; identifiers passed positionally; JSON arrays removed as
  an input format; `--in` accepting a human name as well as a handle; relative times.
- `product-search`: `search` as the single product listing, with `--in`, `--favorites` and
  `--similar` as selectors over one output shape.
- `catalog-browsing`: categories, promotions and sets become one `browse` listing discriminated by
  `kind`, and a category is reachable by name.
- `shopping-cart`: `fill` as the write path; `cart setup` split into named intents; removal and
  favourite writes by positional identifier; the cart write remains the authority on stock.
- `stores-and-delivery`: `stores` and `slots` replace five commands; coordinates are resolved
  internally rather than passed; the delivery context is no longer the caller's to assemble.
- `user-account`: `me` bundles profile, loyalty and premium; `me orders --offline` supplies its own
  delivery context.
- `output-rendering`: the `fill` exception format, the `browse` kind column, and the rule that
  resolved items print names for the user and identifiers only where a decision is owed.
- `agent-skill`: rewritten against the new surface, with rationale removed to `design.md`.
- `cli-configuration`: the index location and the commands over it.

## Impact

- `src/commands/` — every file. `products.ts`, `categories.ts`, `promotions.ts`, `sets.ts` collapse
  into `search.ts` and `browse.ts`; `profile.ts`, `loyalty.ts`, `orders.ts` into `me.ts`;
  `branches.ts`, `np.ts`, `delivery.ts` into `stores.ts` and `slots.ts`; `carts.ts` splits.
  New: `fill.ts`, `get.ts`, `favorite.ts`, `index.ts`.
- `src/index/` — new: the store, the corpus builder, the ranker, the normaliser, the ru→uk
  dictionary.
- `src/daemon/` — the index is loaded and served by the daemon, not by each CLI invocation.
- `node:sqlite` returns as the index store. It is built into Node 22 and adds no dependency.
  `minisearch` is added for BM25: 826 KB, zero transitive dependencies.
- `plugin/skills/silpo/SKILL.md` — rewritten from scratch.
- `test/` — all 43 expected outputs regenerate; fixtures for removed commands are retired; new
  fixtures for `fill`, `browse`, `search` and the index.
- The benchmark harness — **currently broken**: `reset()` calls
  `silpo gain clear` and `run()` calls `silpo gain`, both removed in `drop-local-identifiers`. It
  must be repaired first; without the harness this change cannot be measured.
- `README.md` — the command list and the output description.
- `openspec/config.yaml` — `operations.apply.guidance` for the implement/review cycle, and a
  `rules.tasks` entry requiring a review checklist.
- `.claude/agents/` — new: `silpo-implementer`, `silpo-reviewer`.
