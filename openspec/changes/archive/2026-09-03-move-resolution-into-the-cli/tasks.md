## 1. Repair the measurement harness

Nothing below can be shown to have worked until this passes. The harness is broken by three landed
changes, not one: it calls the removed `silpo gain`, and `reset()` additionally calls `silpo cart id`
(no such command), `silpo cart clear <id>` (takes no argument), `silpo cart update <id>` (the command
is `cart setup`, and takes no positional id), and passes `--shipments` with the numeric
`companyId: 1, branchId: 360` that died with local identifiers.

- [x] 1.1 Rewrite the harness's `reset()` against the surface as it
      stands today, and delete the `silpo gain` calls
- [x] 1.2 Remove the "silpo gain after the run" section from `distill()` and from what the analysis script
      reads out of it
- [x] 1.3 Give each run its own CLI home directory, so the product index a run builds cannot rank a
      candidate in the next run of the same cell
- [x] 1.4 Run the harness's reset and one full harness run end to end; both must complete and write
      a run file

## 2. The index store

- [x] 2.1 Add `minisearch` to `package.json` dependencies; confirm it pulls nothing transitively
- [x] 2.2 Create the index store over `node:sqlite` at a path derived from the CLI home directory and
      from nothing else, holding one record per product with identity fields only
- [x] 2.3 Store the set of branches a product has been seen at, and an optional category slug present
      only where the product arrived through a scoped listing. **No brand field** — no product
      payload in this catalogue carries one
- [x] 2.4 Reject writes carrying price, stock, promotion membership or availability at the store
      boundary, so a later caller cannot introduce them by accident
- [x] 2.5 Open the store lazily and tolerate its absence: a missing or unreadable index yields an
      empty corpus, never a thrown error out of a command

## 3. Filling the index

- [x] 3.1 Build the corpus from online orders, in-store receipts and favourites
- [x] 3.2 Skip a receipt line carrying neither product identifier nor slug, and continue
- [x] 3.3 Fold every product listing any command receives into the index after that command has
      printed its answer
- [x] 3.4 Rewrite an existing record's name on a later sighting; leave the purchase history alone

## 4. Normalisation and the dictionary

- [x] 4.1 Parse an item into term, quantity and specification per `list-resolution`: bare number is
      quantity, percentage is always specification, mass or volume unit is a pack size where a
      candidate carries that pack and a quantity otherwise
- [x] 4.2 Seed the ru→uk product-term dictionary as data, separate from the ranker. It now carries
      more weight than planned: it is one of two lexical signals, not one of four
- [x] 4.3 Expand a term to both its written form and its dictionary equivalents before matching
- [x] 4.4 Unit tests for the parser covering `молоко 2,5%`, `молоко 2`, `молоко 950г`, `вода 2л` and
      an item carrying both a quantity and a specification

## 5. Ranking and the decision policy

- [x] 5.1 Build the BM25 index at daemon start over character trigrams of the product **name** — the
      only text field a product payload carries. Single field, no weighting. Do not persist it
- [x] 5.2 Apply the purchase-history boost, the current-branch bonus, and the weak category boost
      where a record happens to carry a slug
- [x] 5.3 Implement the three gates for a silent choice: absolute score, relative margin over the
      second candidate, and every specification the item named
- [x] 5.4 Return one of `auto`, `ask`, `warn`, `miss` per item, with the candidates and the deciding
      rule attached, and with whether the match came from history or from a live search
- [x] 5.5 Raise a `warn` where a resolved product touches a stored dietary restriction, without
      dropping it from the candidates

## 6. Place resolution

Both `cart setup --to` and `stores --near` need this. It lands once, before either.

- [x] 6.1 Resolve free text to coordinates, and to the saved address or store it names
- [x] 6.2 Print candidates and stop where more than one is plausible and no rule separates them;
      never take a listing's first row
- [x] 6.3 Resolve a Nova Poshta settlement and office from text, carrying the office's own identifier
      and coordinates

## 7. `fill`

- [x] 7.1 `silpo fill <item...>`: resolve every item, write the auto-resolved ones to the cart in one
      cart write, and leave asks and misses unwritten
- [x] 7.2 Fall back to the existing batch-search client call for a term the index cannot answer, and
      rank the result through the same policy. This uses the MCP client that exists today, not the
      `search` command of group 9
- [x] 7.3 `--pick <term>=<id>` repeatable. The answering call carries the whole original list plus the
      picks; the list supplies quantity and specification; re-sending an already-written item is a
      no-op and does not accumulate quantity
- [x] 7.4 `--dry-run` resolves without writing; `--ask-all` returns every item as an ask
- [x] 7.5 Print the outcome: a count line, then names and prices for what resolved, then `ask`,
      `warn` and `miss` rows. No identifier on a resolved item; no file written; no path handed out
- [x] 7.6 Say when a resolution came from a live search rather than from history, so a cold index
      reads as a cold index and not as a malfunction
- [x] 7.7 Carry `reduced` and `unfillable` from the cart write through to the outcome unchanged

## 8. The delivery chain

- [x] 8.1 `cart setup --to <text>` over the place resolution of group 6: select a delivery type
      serving the point, select a branch, take a slot, and write all four to the cart
- [x] 8.2 `--when` accepting `today`, `tomorrow`, a date, or a date and a wall clock; earliest
      available slot on the named day; fail naming the day and branch where none is available
- [x] 8.3 `--branch` and `--when` alone each change one setting and carry the rest forward, and
      `--branch` rewrites the shipments itself — the caller no longer has a way to
- [x] 8.4 `--feedback-changes` and `--feedback-contacts` restored
- [x] 8.5 Keep the lapsed-slot repair where it is: it fires on every call whose answer depends on
      stock or price, read or write alike. A read must not write the store, the type or the address

## 9. Surface: `search` and `browse`

- [x] 9.1 `search` with `--in`, `--favorites`, `--similar` as mutually exclusive selectors
      over one output shape, and the filters, sort and paging applying to any of them
- [x] 9.2 Restore `--must-have-promotion`
- [x] 9.3 Refuse two selectors before any tool call, naming both
- [x] 9.4 `--in` resolving a handle or a title across categories, promotions and sets; print both and
      stop where a title matches two kinds
- [x] 9.5 A query combined with `--in` is the CLI paging the scope and filtering the text itself —
      no tool takes a query and a scope together. Bound the paging and say what the bound is
- [x] 9.6 `browse` as one listing of categories, promotions and sets with a `kind` column, an optional
      name filter, `--tree` and `--popular`; `browse <slug> --tree` is one category with its subtree
- [x] 9.7 Retire `products list/search/similar/favorites/replacements`, `categories` (five leaves),
      `promotions`, `sets`
- [x] 9.8 Leave the at-risk replacements out of the surface: no `--risky`, no `--company-id`, no
      `silpo_get_replacements` wiring, and no `ProductLite` record, renderer or fold helpers, which
      nothing else produced. The endpoint answers but is dormant — over roughly 2000 calls across 40
      branches, both delivery types and some 3400 products, `replacements[]` came back empty every
      time, and the Silpo web client gets the same empty answer from the same call on the same cart

## 10. Surface: `product`, `favorite`, `me`

- [x] 10.1 `product <handle>` taking uuid, slug or externalId — all three reach one tool, so there is
      no dispatch and no `--kind`
- [x] 10.2 `favorite add|remove <product>...` taking positional identifiers, with `externalId`
      supplied from the index where the record the caller holds lacks one
- [x] 10.3 `me` answering profile, loyalty balance and premium together
- [x] 10.4 `me addresses|family|restrictions|coupons|promos|certificates`, with personal offers and
      promo codes together under `me promos`, and `me coupon <id>` for one coupon
- [x] 10.5 `me orders [--offline]`, filling the in-store listing's required delivery context from the
      cart
- [x] 10.6 Retire `products details`, `products favorites-update`, `loyalty` (seven leaves), `profile`
      (four leaves), `orders` (two leaves). `categories details` was already gone with group 9;
      `branches details` is left standing for group 11, which owns `branches`/`stores`

## 11. Surface: stores, slots, and the cart intents

- [x] 11.1 `stores [<query>] [--near <text>]` over the place resolution of group 6. `list_branches`
      takes neither a name nor a coordinate, so every filter is the CLI's own over the full listing —
      bound the paging and say what the bound is
- [x] 11.2 `stores <uuid>` for one store, answered out of the same listing
- [x] 11.3 `slots` with `--branch` optional, defaulting to the cart's branch
- [x] 11.4 `np [<settlement>] [--office <text>]` as one read-only listing
- [x] 11.5 `cart remove <product>...` positional; `cart promo`, `cart bonus`, `cart adult`,
      `cart certificate add|remove` as named intents
- [x] 11.6 `cart set <product> <quantity> [--comment <text>]` — changing how much of one line is in
      the cart, or its comment, or both. A weighed product is in kilograms in multiples of the cart's
      step
- [x] 11.7 Retire `cart add`, the JSON options on `cart setup`, `cart certificates`,
      `delivery address`, `delivery types`, `delivery slots`, `branches` (three leaves), `np` (two
      leaves)
- [x] 11.8 Confirm no command anywhere takes a JSON document as an argument

## 12. Index inspection

- [x] 12.1 `index status` reporting record count, last build and path
- [x] 12.2 `index rebuild` discarding and repopulating, and reaching the process that serves
      queries — a rebuild in a separate process must not leave the daemon serving the old index
- [x] 12.3 `index why <term>` printing the candidates, their scores and the deciding rule

## 13. Evaluation

- [x] 13.1 Build fixtures by holding out the most recent orders: index from the rest, queries from
      the held-out ones, phrasings written the way a person writes them
- [x] 13.2 Label each fixture by query type, lexical or semantic, so an average cannot hide one
      channel failing
- [x] 13.3 Offline eval runner reporting `resolve@1`, auto-rate, wrong-auto-rate and miss-rate,
      running with no network and against a pinned index
- [x] 13.4 Tune the three gates against wrong-auto-rate; record the chosen values and the numbers that
      justified them. The ranker is single-field, so expect these to sit tighter than a multi-field
      design would have allowed, and report the auto-rate that results rather than tuning until it
      looks good

## 14. Tests and fixtures

- [x] 14.1 Regenerate the expected outputs for every surviving command with `UPDATE_GOLDEN=1 npm test`,
      justifying each changed file against a requirement
- [x] 14.2 Retire fixtures for commands that no longer exist
- [x] 14.3 New fixtures and tests for `fill`, `browse`, `search`, `product` and the index, every one
      running against a pinned index rather than the machine's

## 15. The skill, rewritten

- [x] 15.1 Write `plugin/skills/silpo/SKILL.md` from scratch against the new surface; do not edit the
      old one
- [x] 15.2 One entry per agent-facing command; no entry for `index`, `config`, `server` or `raw`
- [x] 15.3 State what `fill` decides silently, what it asks about, how an ask is answered in one call,
      and that a cold index means more asks rather than a fault
- [x] 15.4 Move every line that explains why a decision was made into `design.md` and delete it from
      the skill
- [x] 15.5 Update `README.md` for the new command list

## 16. Measurement

- [x] 16.1 Measurement moves out of this change. The harness is repaired and exercised — runs across
      both arms and both models completed during the work, and the flows were driven to a state where
      each one finishes — but further changes are queued behind this one, and a matrix taken now would
      be superseded by the next. The A/B matrix and its write-up
      belong to the change that closes that queue.

## Review checklist

Properties the finished code must hold. Each is a check against the code, not a step to have taken.

**Identity and state**
- No path writes price, stock, promotion membership or availability into the index, including
  indirectly through a spread of a listing record.
- No index record carries a brand, and no code reads one off a product payload — no product type in
  this codebase has the field.
- A category slug on a record is optional everywhere it is read; nothing branches on its presence in
  a way that changes whether a record can be a candidate.
- Every price and every stock figure printed anywhere comes from the response of the call that
  printed it.
- The CLI mints no identifier, and holds no table mapping one identifier form to another it invented.
- The index path is derived from the CLI home directory and from nothing else, so two homes give two
  indexes with no shared state.

**Deciding versus asking**
- Every place that selects one candidate from several either clears the three gates or prints the
  candidates and stops. There is no third path, and no `[0]` on a listing.
- A quantity never rejects a candidate. Only a specification does.
- No dietary restriction filters a candidate out of a result or out of the cart.
- No command dispatches on the form of a handle across entity families.

**Reads and writes**
- No read-only path writes the store, the delivery type or the address.
- The lapsed-slot repair fires on every call whose answer depends on stock or price, reads included.
- A cart write is followed by exactly one read-back, and the printed snapshot is that read-back.

**Failure and degradation**
- Every command completes with an empty index, an unreadable index and no index.
- `fill` against an empty index resolves through the live search and says the match was a first
  sighting.
- No `catch` discards an error without either rethrowing or turning it into a message the caller
  sees.

**Surface**
- No command accepts a JSON document as an argument value.
- No command takes a latitude or longitude.
- Two mutually exclusive selectors fail before any network call, naming both.
- What the help documents may be narrower than what the parser accepts; the parser is never narrower
  than what worked before.
- Every filter the underlying tool cannot perform is performed by the CLI over a bounded listing, and
  the bound is in the code rather than implied.

**Repository invariants**
- No comment in any source file, except the documentation-sourced marker `typed-tool-client` requires.
- No runtime dependency beyond `commander`, the MCP SDK and `minisearch`.
- A conversion returns `null` where it cannot convert and raises where every caller has already
  established the value is good; a conversion signature never admits a value, `null` and `undefined`
  at once, though a tool-call argument type may and must.

**Tests**
- Every regenerated expected output is justified against a requirement, not against what the code
  emitted.
- No test's result depends on the machine's accumulated index.
- A test exists that fails if a gate is loosened, if a JSON argument is reintroduced, or if a read
  path writes the delivery context.
