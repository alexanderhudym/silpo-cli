## Context

See proposal.md — Why. What follows is the state the design has to work against, and the live
measurements it rests on.

The CLI already owns a ranker: BM25 over character trigrams via `minisearch`, single-field over the
product name, multiplied by a purchase-history boost, a current-branch bonus and a scope bonus, with
an `auto`/`ask`/`warn`/`miss` policy on asymmetric thresholds. It is put to work only by writing to
the cart. The CLI does expose it read-only, through the command that explains a resolution, and the
skill names that command where it describes the automatic choice — but as an account of a decision
already taken, not as a way to ask the catalogue anything. The product listing sends the caller's
text to the server and prints the answer in the server's order.

The MCP shapes what can and cannot be combined. Six measurements taken live against branch
`1edb7345` (Дніпро, `SelfPickup`) on 2026-09-03/04 settle the questions the design turns on.

**`silpo_get_products` intersects its three scope fields.** `category`, `set` and `promotionCode` are
three independent optional fields, and passing more than one narrows rather than widens:

| request | `meta.total` |
| --- | ---: |
| `category=yaitsia-528` | 20 |
| `set=klatsniznyzhky` | 1297 |
| `promotionCode=only_online` | 931 |
| `set=pitsa-sushi-ta-burhery` | 57 |
| `category` + `set` | 0 |
| `category` + `promotionCode` | 0 |
| `set=pitsa` + `promotionCode=only_online` | 0 |
| `category=yaitsia-528` + `mustHavePromotion=true` | 0 |
| `set=pitsa` + `inStock=true` | 26 |

The zeros are genuine empty intersections, not rejected requests: all 20 products of
`yaitsia-528` carry `oldPrice: null` and `specialPrices: null`, so the fourth-from-last row is the
correct answer rather than a broken filter. The one row that could have read as an override —
`set=klatsniznyzhky` + `promotionCode=only_online` returning exactly 931, the promotion's own total —
is explained by the two naming the same thing, «Тільки онлайн», with the promotion a subset of the
set. `set=pitsa` + `promotionCode=only_online` returning 0 rather than 931 or 57 rules the override
reading out.

So the server offers narrowing and no widening. A union of scopes has to be assembled by the CLI.

**A product record carries no promotion identity.** The raw payload of a product drawn from
`promotionCode=cinotyzhyky` holds exactly fifteen keys — `available`, `branchId`, `companyId`,
`displayRatio`, `externalProductId`, `id`, `image`, `name`, `oldPrice`, `price`, `slug`,
`specialPrices`, `step`, `stock`, `weighted`. The CLI's own `Product` type drops nothing. A product
knows it is discounted; it does not know which campaign discounted it.

**The set of live campaigns is stable; their membership is not measurable from what we hold.**
Between the snapshot captured 2026-08-31 and a live read on 2026-09-04, ten of eleven promotion codes
were identical — `monstr-rozihrash` left, `tefal-sale` arrived — and that held across two *different*
branches. Membership could not be compared: the archived runs used branch `1ee15e2a` while the live
reads used `1edb7345`, and `productCount` is per-branch.

**Resolving a scope costs four catalogue calls.** The branch carries 1014 categories, read a thousand
to a page, plus one call for promotions and one for sets. Those four are paid on every `--in`, before
the search itself, even when the caller passed an exact handle. The same four are paid by every
scope listing. A bare scope listing then prints all 1014 + 11 + 17 = 1042 records, because it filters
titles by substring and every title contains the empty string.

## Goals / Non-Goals

**Goals:**

- One ranker, one corpus loader and one product record shared by the listing and the cart write, so
  that a change to how products are matched changes both.
- A listing whose length is decided by relevance rather than by a page size, without paying a call
  for the privilege.
- A scope resolved without a network call in the steady state.
- A visible reason for every raised record, so that a ranking that is deliberately biased is legible
  rather than silent.

**Non-Goals:**

- Semantic retrieval. The embeddings investigation settles this, and its reopening condition —
  an eval number on the semantic fixture class — is untouched by this change.
- A catalogue mirror. The index stays personal — what the account bought, saved, or has been shown —
  and is never filled by walking the catalogue. It is now ranked as one corpus beside the catalogue's
  answer, which changes what it is read for, not what goes into it.
- Server-side ranking. `--sort-by` remains the server's, and is refused wherever the CLI ranks.
- A promotion-membership index. See Decisions.

## Decisions

### The listing and the fill draw one population: the catalogue's answer united with the index

A query with no selector draws the batch search's answer **and** everything the personal index matches
for the same words, unions them by product identity, and ranks the union. Both `products find` and
`cart fill` draw it the same way; the only difference between the two is that the listing prints the
ranking and the fill acts on it.

*Why this and not the alternative.* The alternative is what the change first specified: the fill
consults the index and reaches the catalogue only where the index cannot answer, while the listing
ranks whatever the catalogue returned. It is cheaper — a repeat errand on a warm index costs no search
at all — but it makes the two commands answer from different records, and that is observable. The
batch search returns `totalFound: 0` for `Яйця курячі С1 Квочка` while the index scores
`Яйця курячі С1 «Квочка»` at 3765 and holds it as a saved product. Under the split corpora the fill
buys it and the listing prints nothing, for the same words on the same branch. A CLI that can name a
product confidently in one command and fails to find it in another is telling the caller the branch
does not carry it, which is false.

*The cost, stated plainly.* The fill now always calls the catalogue, even where the index answered
confidently. The zero-call warm errand is gone. The owner accepted this on the grounds that removing
the page offset and dropping the default page size to ten or twenty — a later change — cuts the reading
enough that the extra call stops mattering.

*Live state for an index-only record.* The index holds identity and nothing else, so a record that
reaches the printed page from the index alone has no price and no stock. It is fetched **by
identifier**, not searched for again by text: text is what already failed to return it. The fetch runs
only over records that reached the printed page, under a bound of its own, and the listing says when
the bound stopped it short. Fetching for every ranked record rather than every printed one was
rejected — a ranked reading runs to the ceiling by construction, so it would price hundreds of records
to print thirty.

### One ranker over two corpora, one decision policy

The ranker becomes corpus-generic: it indexes records carrying an id and a name, and returns them
scored. Products are one corpus; the branch's categories, promotions and sets are another. The
`auto` / `ask` / `miss` policy that resolves a list item resolves a scope name too — its three
outcomes already map onto the scope resolver's `resolved` / `ambiguous` / `none`.

*Alternative considered:* keep exact matching for scopes. Rejected because the scope table has to be
in memory either way once it is cached, so ranking it is free, and exact matching is why `--in` needs
the title spelled precisely today.

*Consequence to guard:* a ranker always returns something. Exact matching fails cleanly on a name
that does not exist; ranking returns the least bad row. The margin and floor rules of the existing
policy are what prevent that, and they are the reason the policy is shared rather than reimplemented.

### How many results the ranker returns belongs to the caller

The ranker caps its output at eight candidates today. That number is not a retrieval limit but a
presentation one — how many options a question puts to the caller — and it sits inside the ranker only
because the cart write was until now its one caller. A listing asking for thirty would silently be
given eight, and a ranked catalogue listing eight rows out of a thousand categories.

Raising it is not the fix, because the two numbers are genuinely different: thirty options in a
question are unreadable, and eight records in a listing that asked for thirty are wrong. The cap moves
out to the callers — the listing takes its page size and offset, the catalogue listing its page size,
the question keeps its eight under a name that says so.

Returning everything scored costs nothing in the sort, which already runs over the whole set before
the cap is applied. What it does need is a relevance floor, since trigrams combined by OR give almost
every record a non-zero score; without one a large page size would print a tail of noise.

That floor is **not** the fraction the promotion boost is confined to. They are two mechanisms with
two jobs: the floor decides what is worth returning at all and sits far down the distribution, while
the fraction decides which of the returned candidates are close enough to the best that a discount may
reorder them, and sits just below the top. Collapsing them would make the confinement vacuous — every
returned candidate would be inside it — and would starve the listing of the records a large page asked
for.

### Selectors compose: union within a kind, intersection across kinds

A repeated selector of one kind unions. Selectors of different kinds intersect. A free-text query is
not a population but the filter and the ordering over whatever the selectors chose; with no selector,
the query chooses the population itself.

*Alternative considered:* an expression grammar on `--in`, with `&` and `|`. Rejected on two grounds.
`&` and `|` are shell metacharacters, so `--in молочні & акція` backgrounds the command and runs the
rest as another — a failure that reports nothing and costs a step to discover, in a CLI that already
carries a rule about quoting the caller's text. And the intersecting half buys almost nothing: only
three pairs of kinds can intersect at all, and the narrowings callers actually reach for are already
their own flags.

*Alternative considered:* splitting `--in` into `--category`, `--set` and `--promotion`. Rejected:
the kind is known from the resolved row, so the split solved nothing semantic. It was a way to skip
the four-call resolution, and the cache is a better answer to that.

*Alternative considered:* a `--narrow` option for scope intersection. Dropped by the owner; the
common narrowings are `--must-have-promotion`, `--in-stock` and the price bounds, which already work.

### A promotion orders candidates; it never decides one

The promotion boost is weighted above purchase history, and it is applied to the *ordering* of
candidates only. The thresholds that separate `auto` from `ask` — the score floor and the margin
between the top two — are computed on the relevance score before any promotion boost enters.

This is what lets the listing and the cart write score identically while a discount stays unable to
turn a question into a silent cart write. Without the split, a promotion could lift one candidate
past the margin and cause the cart to be written where the caller would previously have been asked —
the cart would hold a product because it was discounted, not because it was meant.

The boost is further confined by a relevance floor: it applies only to candidates within a stated
fraction of the top relevance score, so a discounted product of a different kind cannot displace a
plainly better match.

*Alternative considered:* applying the boost only in the listing and not in the cart write. Rejected
by the owner, and rightly: it reintroduces the divergence of mechanisms that motivates this change.
Ordering-not-confidence achieves the same protection with one formula.

*Source of the signal:* `oldPrice` and `specialPrices`, already carried by every listing payload and
already computed by the existing promotion filter. The boost therefore costs no call. Where a
resolution is answered from the index alone, with no live listing, no promotion is known and none is
applied — the index holds no price by its own requirement, and that is correct.

### No promotion-membership index

Naming the campaign a discount comes from would require inverting the catalogue: reading each
campaign's product list and storing the reverse mapping, roughly twenty calls against about six
thousand records.

It is not built. The measurement that would justify it — that membership is stable enough between
refreshes to be worth caching — could not be taken, because the only historical snapshot is from
another branch. What the campaign name buys is a label; what it risks is a *wrong* label on a product
that left the campaign. The discount itself is free and always correct, being computed from the same
payload's `oldPrice` and `price`.

Where a campaign is the question, it is already the query: a listing scoped to a promotion answers
"what is in this campaign" in one call, and naming the campaign on every record of it says nothing.

*Reopening condition:* a membership snapshot of one campaign at one branch, re-read after a week's
rotation, showing the churn small enough that a stale label is rare.

### No personal-coupon signal

Boosting a product the caller holds a coupon for was considered and dropped: neither `Coupon` nor
`Promo` carries a product id, a category, or any other join key — only free-text `description`,
`limitText` and `rewardText`. Matching a product name against coupon prose is a guess, and a wrong
"you have a coupon for this" is worse than none.

### The scope cache is reference data, not the index

The branch's categories, promotions and sets are cached on disk with a refresh rhythm per kind:
categories change over weeks, the campaign list over days, sets between the two. It is a separate
capability from the personal index even though it shares a file.

This matters because `product-index` requires that nothing be fetched for the index's sake and that a
record hold identity rather than state. The scope table is neither the caller's history nor a product
identity; folding it into that capability would blur a requirement worth keeping sharp.

*Failure mode:* a cached handle for a scope that has ended resolves to an empty listing. Cheap, and
self-correcting at the next refresh.

### A product card is two halves, and only one is cacheable

Attributes, composition, nutrition and the unit a product is counted in do not change; price, stock,
availability and step do. The listing already returns the whole live half. `--details` therefore
joins the live half it already has to the static half held on disk, and fetches a card only for
products whose static half is unknown — under a stated ceiling, reported when reached, in the same
manner as the existing bound on records read from a scope.

Ranking is a prerequisite, not a companion: `--details` over an unranked thirty-record page on a cold
index is thirty calls. Ordering the work so ranking lands first is what makes the option affordable.

*The card stays its own command.* `products card` takes one handle and reaches the tool that answers
all three handle forms. Folding it into the listing would require guessing whether an argument is a
query or a handle — which `product-search` already forbids by requirement — and the batch search
matches only a numeric external id exactly, so a uuid or a slug given as a query would not resolve.

### One flat deduplicated listing, ordered by query

A multi-query search prints one listing. A product matched by more than one query appears once,
naming the queries that matched it. Order follows the queries as given.

*Alternative considered:* one globally re-ranked list. Rejected: BM25 scores are not comparable
across queries — different document frequencies, different term counts — so sorting three unrelated
searches into one order by raw score sorts by a meaningless number. A comparable ordering would need
rank fusion, which is machinery this change does not need.

The flat form is also cheaper than the grouped one: the shared `common` section is hoisted once for
the whole listing rather than once per group.

### An intersection is two readings, and it is bounded like everything else the CLI narrows

Only the catalogue tool intersects, and only among its own three scope fields. The saved products and
a product's alternatives take no scope argument, and a product record names no scope it came from, so
`--favorites --in`, `--similar --in` and `--favorites --similar` have no server-side form at all.

Each side is therefore read separately, up to the same ceiling that bounds every other reading the
CLI narrows itself, and intersected by product identity. Where either side was cut short, the answer
is a subset of the true intersection rather than the whole of it, and the listing says so — an
intersection of two truncated readings can miss a product both populations hold and neither reading
reached, and reporting that as complete would be the one failure mode of this design that looks like
a correct empty answer.

*Alternative considered:* drawing the smaller population first and filtering it against the larger by
membership, which avoids reading both to the ceiling. Worth doing where the sizes are known in
advance — the saved products are usually the smaller side — but it does not remove the bound, since
the smaller side can itself exceed it. Left to the implementation as an optimisation, not a different
contract.

### Alternatives are fetched for a decisive match the branch cannot supply

Where the ranking singles out one product and that product is out of stock, the CLI fetches its
alternatives without being asked. This is the question the caller is about to ask, and the CLI
already holds the handle that answers it.

The trigger reuses the policy rather than inventing one: it is a decisive outcome — a top score above
the floor with a margin over the second — plus an unavailable chosen product. Decisive covers the
warned outcome as well as the automatic one, a resolution that trips a dietary restriction being no
less decisive about which product was meant. Where the outcome would
already have been a question, no lookup happens: there is no single product to find alternatives to,
and the caller is being asked regardless.

In the listing the alternatives are printed below the match and marked as alternatives to it. In the
cart fill they become the candidates of a question, and nothing is written until the caller names one:
a term that resolved to something the branch has none of is a decision owed, not a substitution to
make silently.

*The explicit selector stays.* "What else is like this" is a question about products that are in
stock too, the tool is already wired, and removing it would leave that question with no command while
saving one line of help.

### The measurement compares against the raw MCP, not against the old CLI

The recorded arm-A runs measured a surface this change removes. Enough
changes at once — the command names, the ranking, the length of a listing, where the fill lives — that
a number from the old arm and a number from the new one differ for reasons no run can separate.
That baseline is therefore retired as a comparand rather than re-run.

What survives is arm B, the agent driving the MCP server directly. It does not change, it is the
control the harness was built around, and it is what the CLI's existence has to be justified against.
The claim the measurement can carry after this change is "the new CLI against the raw MCP", and the
old arm-A figures stay on disk as history rather than as a target.

**The surviving comparison carries server drift, and that is named rather than hidden.** The recorded
runs show that arm B moved between the baseline and the re-measure without its code changing —
its context grew 55% and 38% — which makes arm A against arm A the comparison to trust.
Retiring arm A therefore keeps the arm the repository itself calls the drifting one. That is accepted
deliberately: the alternative comparand is a surface that no longer exists, and a ratio against a
removed surface answers nothing. The benchmark write-up SHALL state that the new figures carry drift, so that a
reader takes them as an order of magnitude rather than as a percentage.

**The index must be seeded for the measurement to see the ranking properly.** The harness wipes the
CLI's home before every run, so each starts with an empty index. Purchase history does reach it
without a rebuild — reading the order history folds it in, and that command is a skill entry a flow
does reach — but only for the orders that reading returned: the one flow that calls it opens with a
single order. So the recorded runs carry a history of roughly one purchase rather than none, and the
saved signal is empty throughout.

That is thin enough to measure nothing useful about ranking that leans on history. A run that rebuilds
the index first exercises the account's real history; a run that does not measures the ranking of a
live payload and the flat listing, which is a part of the change but not the part it leads with.

The arm-A runs SHALL therefore rebuild the index before the flow begins, and the benchmark write-up SHALL
say so. Arm B cannot be given the same, because it has nowhere to put it — and that asymmetry is the
thing being measured rather than a flaw in the setup: an account's history is what the CLI can bring
to an errand and the raw MCP cannot.

## Risks / Trade-offs

- **A ranker always answers, where exact matching failed cleanly.** → The shared floor and margin
  rules turn a weak or ambiguous best match into printed candidates and a stop, which is the outcome
  the scope resolver already has for an ambiguous title.
- **Ranking personalises the catalogue.** A caller who buys one brand weekly sees it first, which is
  right for a shopping list and misleading for "what is there". → The `why` row states the reason on
  every raised record, so the bias is visible to the agent reading it rather than silent. Signals
  that would only add noise — the branch, the scope — stay out of `why`.
- **A promotion boost above purchase history is a deliberate bias toward the store.** → Confined to
  ordering, floored by relevance, and labelled. It cannot decide an `auto`, and it cannot lift a
  product that is not already a plausible match.
- **`--details` can still cost calls on a cold index.** → A stated ceiling, reported when reached,
  and the ordering of the work that keeps result sets small.
- **Seven capabilities in one change, three requirements broken.** The owner has chosen a single
  change for an overnight run. → The task groups are ordered so that no group depends on a later one,
  and the independent reader that `openspec/config.yaml` requires for a change of this breadth runs
  at the end of the night rather than being skipped.
- **The harness's isolation gate stops matching the CLI.** The flows name no command and survive
  untouched; the harness holds a list of command names, and the regex built from it is what
  proves a run stayed inside the surface it was confined to. After the rename `products` and
  `catalog` match nothing, so a read-only flow halts claiming the CLI was never called, and a leak
  through the new commands goes unseen — the same silent class of failure already recorded
  as having twice produced plausible-looking data. → The list is updated with the surface, in the
  same task group as the skill.

## Migration Plan

The CLI installs from a clone and keeps nothing worth preserving on disk: the index is derivable from
the account and `index rebuild` repopulates it. The scope cache and the attribute table are added to
the same store, created on demand.

No compatibility layer and no aliases for the removed command names. The skill is the only consumer,
it ships in the same repository, and a stale alias is a second surface to describe. A caller reaching
for `silpo search` gets the CLI's own unknown-command error, which names the tree it does have.

## Open Questions

- The numeric values of the relevance floor and the promotion weight. They change no requirement, no
  spec and no task boundary — only the constants in the ranker — and are settled by trying the demo's
  own queries against a warm index.
- Whether the score floor that separates a decisive resolution from a question carries over to the
  scope corpus unchanged. It is an absolute BM25 score tuned against product names; a corpus of about
  a thousand scope titles has different document statistics, and the same number may sit in a
  different place on that distribution. This changes a constant rather than a requirement — the
  policy and its outcomes are the same either way — and is settled by running the scope corpus against
  names known to match and names known not to.
