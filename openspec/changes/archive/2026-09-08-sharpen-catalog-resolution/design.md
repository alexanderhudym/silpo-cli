## Context

See `proposal.md` — Why. What matters here is the mechanism.

`src/index/rank.ts` scores with MiniSearch BM25 over **character trigrams** of one field, `name`.
`RankIndex.search` drops anything at or below `RELEVANCE_FLOOR = 1` and returns the rest in order.
`settle` then gates on two numbers: `top.baseScore > scoreThreshold`, and a relative margin
`(top - second) / top > 0.3`. `AUTO_SCORE_THRESHOLD = 750` is the default; the catalogue's resolvers
pass `RESOLVE_SCORE_THRESHOLD = 10` instead, because BM25 over a 17-record set table cannot reach 750.

`src/resolve/stores.ts` solves the same problem for a different corpus and solves it differently.
`matchParsedStoresByRelevance` builds a MiniSearch index over **words** — the default tokenizer, no
`tokenize` option — searches with `prefix: term.length >= 4`, `fuzzy: term.length >= 5 ? 0.2 : false`
and `combineWith: "OR"`, then applies two filters: a relative floor at `0.2` of the top score, and
`hasDiscriminatingMatch`, which requires at least one of the terms the record matched on to be carried
by at most `0.5` of the corpus. It carries no absolute score threshold at all.

**Most of that function is store-specific and is not being copied.** `parseQueryAddress` splits a query
into settlement, street and building; the index holds a canonicalized `street` field with street-type
words stripped; `search` carries a settlement `filter`; the score is multiplied by a building-number
comparison before the floor is taken; and an empty street takes a separate branch entirely. What
transfers is the word tokenization and the OR combination. Prefix matching transfers in kind but not in
its constant — the catalogue requires no minimum length of a word, for the reason stated below — while
fuzzy matching and the relative floor do not transfer at all. No normalization is applied to a
catalogue title; it is indexed as the shop wrote it.

`rankCategories`, `rankPromotions` and `rankSets` already probe the exact handle before ranking, and
already call `RankIndex.search([text])` with the bare text — the dictionary has never been applied to a
catalogue query. Its three call sites are `rank.ts:406`, `population.ts:55,64` and `daemon/fill.ts:202`,
all on the product path.

`src/resolve/scope.ts` holds all three catalogue entities. `src/resolve/` otherwise runs one domain
per file.

## Goals / Non-Goals

**Goals:**

- A value that names no record of the catalogue reaches no record of the catalogue.
- A judgement that means the same thing on a 17-record table and a 761-record one, and that does not
  move when a table grows.
- Every constant known and measured before the work starts, not swept during it.
- One threshold left in the codebase, on the one path that measures it.
- `looksLikeHandle` deleted, with the behaviour it protected preserved by the matcher instead.
- One matcher per catalogue kind, used identically by the listing and by that kind's population
  option, and callable on its own against a table of that kind alone.
- One module per catalogue entity, each carrying its own matching and none carrying another's.

**Non-Goals:**

- `src/index/rank.ts`. Not one line of it changes. It keeps its trigrams, its boosts, its promotion
  weight, its margin ratio, its dictionary, `settle`, `SettleOptions` and `AUTO_SCORE_THRESHOLD`, and
  goes on serving the one domain that still uses it. `npm run eval` must report the same numbers
  afterwards, which with an untouched file it will.
- Fetch and matching becoming one function. Each kind's module owns both — that is what makes it
  self-sufficient — but as two functions: a matching test that needs a faked server is a matching test
  nobody writes, and the previous change found half its defects in tests that ranked a table built by
  hand.
- `cart fill`. Measured, `src/commands/fill.ts` resolves no catalogue entity.
- The product listing's own options, ceilings and reason rows.
- Closing the Russian-query gap for the catalogue. It is opened deliberately and answered in the
  skill, not in the CLI.

## Decisions

### The catalogue matches words, not fragments

The catalogue's three entities stop calling `RankIndex` and gain a matcher of their own, built on the
store path's configuration: a MiniSearch index over the record's title with the default word
tokenizer, searched with a prefix rule and OR-combined.

The reason is not that the floor was set wrong. It is that trigrams make the wrong answers and the
right ones the same kind of event. `granat-4794` reaches «Пет-Нат (Pet-Nat)» because `nat` is a real
trigram of both, and a threshold that refuses it refuses every genuine short approximation with it.
Under word tokens the junk does not score low — **it does not match**, `granat` being a prefix of
nothing the title holds. Measured 2026-09-07 against branch `1edb7345-2b99-62cc-9e83-6fea04bfe766`
(Дніпро, SelfPickup), applying the store path's constants unchanged to the live tables:

| value | categories (761) | sets (17) |
| --- | --- | --- |
| `granat-4794` | 0 | 0 |
| `shpynat-4843` | 0 | — |
| `ruchky-olivtsi-markery-4654` | 0 | — |
| `balzamy-kondytsionery-shampuni-5330` | 0 | — |
| `foo-bar-baz` | 0 | 0 |
| `pet-nat` | 1 — «Пет-Нат (Pet-Nat)», score 30.07 | — |
| `Перш` | 1 — «Перші страви», score 3.45 | — |
| `Чайн` | 1 — «Чайні набори та асорті», score 2.86 | — |
| `zewa-turbota` | — | 1 — «Zewa - відчуття турботи», score 3.89 |
| `Риба` | 11, margin 0.12 | — |
| `знижки` | — | 7, margin 0.07 |
| `заморожена риба` | 10, margin 0.48 → «Заморожена риба» | — |
| `риба свіжа` | 6, margin 0.77 → «Свіжа риба» | — |

`pet-nat` is the one case the guard was measured to cost, and it comes back as the single match of its
table. `Риба` and `знижки` return many candidates with a margin below 0.3, so they settle to ask,
which is the right answer for a word many records carry.

*Alternative considered:* a scale-free floor on the existing trigram ranker — the fraction of the
query's own trigrams found in the candidate's name. Measured against the repo's own eval
(120 ground-truthed fixtures) it replaces one incomparable constant with
another: the catalogue needs a threshold in `(0.21, 0.43]` — `granat-4794` covers 0.21 of itself
against «Пет-Нат», `zewa-turbota` covers 0.43 against «Zewa - відчуття турботи» — while the product
path at a threshold in that window rises to 20.8% wrong-auto against the 5.8% `npm run eval` reports
today. Coverage also fails to separate right from wrong at the top of the product corpus: three of
today's wrong autos sit at coverage exactly 1.00. Rejected on the measurement.

*Alternative considered:* three per-table thresholds. Rejected — on tables of 10 and 17 records that
is a fit to one branch's snapshot on one day, it multiplies the constants nobody can check from three
to six, and it leaves the next corpus needing a fourth.

### A sentence is not a query, and the CLI does not make it one

Word tokenization stops a value naming nothing that is written as one token — every junk slug the
change measures. It does not stop one written as a sentence. Measured against the live category table,
`хочу купити подарунок` reaches «Солодкі подарунки для дітей» as a lone candidate on one word of three,
and `здорове харчування для всієї родини` reaches «Здорове харчування» on two of five.

**This is left open, deliberately.** Telling a sentence from a name is a judgement about meaning, and
the search is lexical: it matches words that appear in the catalogue's titles and nothing else. Closing
it inside the CLI would mean either a semantic model — deferred, on the embeddings investigation's
measurement — or a hand-made rule about which words count, which is the same
kind of guess as `looksLikeHandle` and would fail the same way.

The caller is where the judgement belongs, and `agent-skill` is how it gets there: the entry states
that the search matches the words the catalogue itself uses, so a query is a name assembled from such
words rather than a description of a need. An agent that knows this writes «подарунки» and gets the
right group; one that does not writes a sentence and gets a near miss it should not act on. That is a
statement the reader can act on, which a rule inside the CLI would not be.

What this change does close is the class it can: a value that shares no word with any title matches
nothing at all, where a trigram index answered it with the least bad fragment overlap 136 times out of
249.

### The configuration, measured

Swept against the branch's own tables, with the full pruned set recovered — the 1010 categories the
flat listing returns, less the 761 the tree keeps, is exactly the 249 the pruning drops, and their
titles come with them. Three sets: the 249 pruned slugs, whose right answer is miss; the 249 pruned
titles; and the 761 kept titles, each of which must find its own record.

**Matching is by prefix, not by substring.** A query word matches a title's word that *begins* with it:
`Чайн` reaches «Чайні», and `айн` reaches nothing. This is a narrowing against today's trigrams, which
match a fragment anywhere in the name — measured, `олоко` reaches «Молоко» under substring matching and
nothing under prefix, and `морож` reaches «Заморожене м'ясо» under substring and nothing under prefix.
Ukrainian builds words by prefixing, so a caller writing the stem of a prefixed word is the case that
is lost.

*Alternative considered:* substring matching, built by indexing every suffix of every word so that a
prefix hit is a substring hit. Measured over the same three sets, it is worse: five of the 761 kept
titles stop finding their own record (619 → 614) and two more pruned titles resolve where they did not
(64 → 66). Expanding the index by suffix also skews the term statistics, so the top candidate moves for
the worse on ordinary queries — `консерв` reaches «Бакалія і консерви» instead of «Консервація».
Rejected on the measurement; the cost is that a query beginning in the middle of a word finds nothing,
and the skill's line about writing the catalogue's own words is what answers it.

**No prefix minimum.** A word matches by prefix whatever its length. The store path requires four
characters, and this change first copied that: swept against the branch's tables, 5 lost `Перш` and
`Чайн` entirely, 3 and 4 both kept them, and 4 was taken as the tightest value that did. That sweep is
the objection to the constant rather than the case for it. It fits a number to the tables of one branch
on one day, and those tables change without notice; a caller who wrote two characters of a word has
written the beginning of that word, and a rule refusing them is tuned to a snapshot rather than to the
corpus.

What dropping the minimum widens is how many records a short word reaches, and that is bounded away
from the harm rather than at the match: auto requires every word of the value to be accounted for, so a
word many records carry settles to ask, and the page size trims the printed page. Widening the match
costs questions, not wrong answers, which is the direction `list-resolution` asks for. The same
argument applies to the store path's own minimum — removing it there is its own change, over its own
corpus and its own measurement, and is not carried here.

**Fuzzy: off.** It is strictly worse on both axes: it costs two of the kept titles their own record
(619 → 617) and adds five pruned titles that resolve where they did not (64 → 69). A typo in the middle
of a word is not repaired for free, and here it is not repaired at all.

**Relative floor: not copied.** Swept at 0.1, 0.2, 0.3 and 0.5, every number in every row is identical
— the outcomes and the candidate counts alike (`Риба` 11, `молоко` 9, `для` 68, `чай` 6, `напої` 18 at
all four). The floor never bites on this corpus: MiniSearch's OR returns only records that matched a
term, and those scores sit close enough together that no fraction of the top cuts any of them. It is a
constant that would sit in the source doing nothing, and it is left behind for the same reason the
discriminating-term condition is.

So the matcher carries **no constant of its own**, and the decision carries the margin ratio the
codebase already has. Nothing is swept at implementation time, because there is nothing left to sweep —
which is the strongest form of the rule that every constant be known before the work starts.

**The rates below were taken with a prefix minimum of 4 and are the rejected configuration's.** They
are kept because they establish what the move from trigrams to words is worth, which is not in
question. What they do not establish is what the matcher does without the minimum: dropping it widens
the candidate sets, so the ask count rises and the auto counts fall, by an amount nobody has measured.
The implementation SHALL measure the shipped configuration against the branch's own tables and record
it, and the numbers in that record — not these — are the ones the change stands on.

Measured at a prefix minimum of 4:

| set | before | after |
| --- | --- | --- |
| 249 pruned slugs, right answer miss | 136 auto onto an unrelated category | **0** |
| 761 kept titles, each naming its own record | — | **619 auto to themselves, 0 to another, 142 ask, 0 miss** |

The 142 are titles that share a word with a sibling — «Кава», «Пиво», «Риба» — and asking is the right
answer for them.

**The discriminating-term condition is not copied either.** The store path needs it because a query
naming a street that does not exist matched a third of the estate on the word `вулиця` alone. The
catalogue does not have that failure: running every value above with the condition and without it
returns identical results, because the junk is killed by tokenization and not by the filter. Where the
condition does fire is on tables too small for a share to mean anything — on a one-record table a term
is carried by 100% of the table and the record is dropped, which is how the suite's fixtures are built.
No condition of this matcher is a count divided by the table's size, for that reason.

**Where the numbers are recorded.** `src/` carries no explanatory comments, so "stated beside the
constant" cannot mean a comment. It means a separate measurement record, as the store path already
has, carrying the branch, the delivery type and the slot. The existing
`AUTO_SCORE_THRESHOLD = 750` has no such record, which is why `list-resolution`'s standing requirement
has been unmet for it; this change gives the catalogue's numbers one and says plainly that the product
path's is still owed.

### A record carries three spellings, and all three are matched

Word matching over Ukrainian titles answers a Ukrainian query. It answers a Latin one with nothing:
measured, `ryba`, `moloko`, `kolgotky`, `zamorozhena ryba` and `kuriachi iaitsia` all return no
candidate against the title alone, while the exact-handle probe answers only a handle written in full.
Half a handle is a dead end, and a handle is what the CLI itself printed.

So a record is indexed under three spellings of the same name:

1. **its title**, as the shop wrote it;
2. **its own handle, split on its hyphens** — `kuriachi-iaitsia-528` contributes `kuriachi iaitsia`.
   This is authoritative: it is the spelling the shop publishes, and it needs no transliteration to
   obtain;
3. **its title transliterated**, which is the spelling a standard produces rather than the one the shop
   chose.

**The second and third are not redundant.** Measured over the branch's own tables:

| query | handle channel | transliterated channel |
| --- | --- | --- |
| `kuriachi iaitsia` | **auto** → «Курячі яйця» | ask |
| `organichna izha` | **auto** → «Органічна їжа» | ask |
| `gigiiena` | «Гігієна та краса» | «Б'юті та гігієна» |
| `m-iasni` | «М'ясні страви» | «М'які іграшки» |
| `hihiiena` | **miss** | reaches it |
| `miasni` | **miss** | reaches it |
| `kuriachi yaitsia` | ask | **auto** |
| `organichna yizha` | ask | **auto** |

The shop writes `г` as `g`, `я` at the start of a word as `ia`, and an apostrophe as a hyphen. The
standard writes `h`, `ya`, and drops the apostrophe. A caller cannot be expected to know which
convention they are reproducing, so **both spellings of each are indexed** — both `g` and `h`, both
the dropped apostrophe and the split one. That is a variant list per record, not a rule about the
query, and it costs an index field.

### Auto requires every word of the query to be accounted for

The extra spellings widen what matches, and the widening lands where it hurts: a pruned handle is
itself a Latin phrase, so it meets a kept record's Latin spellings on their own ground. Measured, the
249 pruned handles go from 0 silent wrong answers to **60**.

Requiring that every word of the query be matched by the chosen candidate brings that to **15**, and
costs nothing measurable elsewhere: the 761 kept titles still find themselves 619 times with none
finding another. The rule is about a spelling being fully accounted for, not about what a phrase means
— a caller writing `dytiachi shkarpetky` has written two words, and a record matching one of them has
not answered them.

**The remaining 15 are stated rather than chased.** They are pruned records reaching a kept relative —
«Дитячі шкарпетки», which the branch does not stock, reaching «Шкарпетки», which it does. That is a
useful answer more often than a wrong one, and separating the two cases is a judgement about meaning
the CLI does not make.

*Alternative considered:* the handle channel alone, which needs no library at all. Measured, it reaches
seven of nine Latin queries against the transliterated channel's eight, and it misses exactly the
standard spellings. Rejected as a sole channel and kept as one of two.

*Alternative considered:* writing the transliteration table by hand instead of taking a dependency.
`cyrillic-to-translit-js` reproduces the shop's handle for 553 of 761 categories as it ships and 703 of
761 once `г` is pre-mapped; the rest is the apostrophe and the word-initial `я`/`ї`, which we already
wrap it to handle. A hand-written table would encode what the measurement above already knows and
would remove the dependency. It is a real option; the dependency is taken because the positional rules
of the standard are what the library exists to get right, and both spellings are indexed anyway.

### The exact-handle probe runs first, and it is now load-bearing

Measured, `ryba-4430` and `kava-chai-4700` — real slugs of the live table — match **nothing** under
word tokens. A slug is a transliteration with a numeric tail; it shares no word with «Риба» or «Кава,
чай». Today the exact `bySlug` / `byCode` lookup answers them before ranking is reached, and after
this change nothing else can.

So the probe stops being an optimisation and becomes the only path for a handle. It is stated in
`catalog-browsing` for that reason, and the review checklist tests it directly rather than assuming
it survived the refactor.

### The catalogue does not gain the dictionary

`expandTerm` turns a Russian term into its Ukrainian equivalents from a hand-written table. It has
never been applied to a catalogue query and this change does not add it.

That is worth deciding rather than assuming, because the move from trigrams to words makes the gap
visible. Today a Russian value reaches its category through accidental fragment overlap; afterwards it
reaches nothing, and adding the dictionary is the obvious repair. Measured, it would half-work:
`рыба`, `хлеб`, `сыр`, `сгущенка` and `творог` each return 0 matches on words alone and each returns
its right category once expanded, while `овощи` and `детское питание` return nothing either way, and
so will every word the table has not been taught. A caller cannot tell which of their words the table
covers, so a partial translation is worse than none — it answers `рыба` and is silent for `овощи` with
nothing from outside to tell the two cases apart.

The rule the reader *can* follow is "write the text in Ukrainian", and `agent-skill` states it. The
product path keeps the dictionary: its corpus is the caller's own purchase history and the branch's
products, `list-resolution` requires a Russian term to reach it, and that requirement is not in
question here.

### The catalogue decides its own outcome, as the store path does

`src/resolve/stores.ts` does not call `settle`. It matches, bounds what it kept, and hands back its
own result. The catalogue does the same.

So `src/index/rank.ts` is not touched. `settle`, `SettleOptions`, `AUTO_SCORE_THRESHOLD`,
`RELEVANCE_FLOOR`, the trigram tokenizer and the boosts stay exactly as they are, serving the one
domain that still uses them. `RESOLVE_SCORE_THRESHOLD` disappears with the catalogue's departure, and
`AUTO_SCORE_THRESHOLD` is left as the only threshold in the codebase, on the product path, where the
eval measures it. The defect the proposal opens with — one absolute constant asked to compare two
corpora, answered by a second constant — is removed by the departure, not by a new option.

`resolution.ts` decides the catalogue's outcome, in order:

1. the exact handle, which either finds a record or does not;
2. the match;
3. nothing matched → **miss**;
4. the top does not lead the runner-up by the margin → **ask**;
5. otherwise → **auto**.

`list-resolution` requires the same *policy* for a catalogue name as for a product — the same four
outcomes, the same asymmetry, the same refusal to use a least bad match. It does not require the same
function. Read as requiring the same function it forces a contortion: `settle`'s option widened to
carry a state it has no reason to carry, so that a corpus with no absolute score can be fed through a
gate built for one that has.

### One module per entity, and only the policy stays one

`src/resolve/scope.ts` becomes, in the flat layout the directory already uses:

- `categories.ts` — **self-sufficient**: it reads what a category needs (the flat listing, the tree,
  the popular join), builds the table, walks the hierarchy, applies the count filter, holds its own
  indexed fields and its own exact-handle probe, and answers with **the categories most relevant to a
  value, most relevant first**.
- `promotions.ts`, `sets.ts` — the same for kinds that have no hierarchy, each reading its own one
  call, each with its own fields, its own probe and its own most-relevant function.
- `matching.ts` — the mechanism only: build an index over the fields it is handed, search it by word
  and prefix, drop what did not match, order what did by relevance. It knows no kind, decides no
  outcome and prints nothing.

**Named in the plural**, because each answers with records rather than standing for one.

**There is no `catalog.ts`, and nothing sits above the three kinds fetching on their behalf.** A read
wave that pulls all three and hands each kind its rows inverts the dependency: it makes the catalogue
the thing that has entities, when the entities are what a catalogue is assembled from. Its cost is
concrete — `products find --category X` issues five calls today, of which the promotions, the sets and
their assembly are never looked at — and its structural cost is worse: a kind's matching cannot be
used without a reader that fetches its siblings too.

Instead the **command** assembles. `silpo catalog` asks the three kinds at once and prints what comes
back; `products find` asks the one kind its option named, and issues no call for the other two.

There is no shared module for the outcome or the output. **The decision between auto, ask and miss
lives in `src/commands/products.ts`**, which is the only command that decides — the listing prints a
page of the ranking and has nothing to settle — and the rendering lives in whichever command prints
it. A resolver that had already settled an outcome could not serve the listing, and one that had
already rendered a candidate list could not serve a command printing a different shape; each would be
reusable in exactly one place, which is the opposite of the point.

**Each kind matches for itself; only the search machinery is shared.** A category's title, a
promotion's name and a set's name are not the same kind of text. A category is published under a handle
that transliterates its title and a promotion under a code that does not, so the fields worth indexing
differ by kind, and so may the configuration over them. One matching across the three fixes a single
field set and a single configuration for three corpora, which is the same defect as one ranker serving
the products and the catalogue alike, at a smaller scale. Separating them also makes each kind's
resolver usable on its own, against a table of that kind alone, wherever a caller holds one.

The three matchings will look alike on the day this lands, and that is not an argument for folding them
into one. They are three configurations that currently agree, not three copies of one rule, and the
reason to keep them apart is that a later measurement may move one without moving the others — which a
shared matcher would make a breaking change to all three.

What stays one is the search machinery in `matching.ts`, which knows no corpus and therefore has no
reason to divide. The outcome policy is not duplicated by moving it into the command: only one command
decides, so there is one copy of it, in the place that uses it. Three copies of the policy — what the
previous change's final review round removed — would need three deciders, and there is one.

`matching.ts` imports nothing from `src/resolve/`, so no cycle can form through it: the three kinds
import `matching.ts` and nothing else of `src/resolve/`, no kind imports another, and the commands
import the kinds. Nothing under `src/resolve/` imports a command.

### A matched category prints its whole subtree

`hierarchyNodeText` already recurses without a depth limit, which is why the listing with no text
prints all 761 categories of the session's branch at their full depth. The search result does not:
`rankedCategoryText` (`src/commands/catalog.ts:102`) reads `table.byParent` once and prints direct
children only.

**The two renderers print different shapes, and the nested rows follow the search result's, not the
hierarchy's.** `hierarchyNodeText` emits indented `slug title (count)` lines; `rankedCategoryText`
emits a `children` section of `slug:` / `title:` / `count:` rows, which `test/catalog.test.ts:226` and
`:248` pin. A descendant printed at any depth SHALL carry the same three rows its parent's children
carry today, indented under the child it belongs to, and SHALL NOT carry a path — the path belongs to
the matched record, which states where *it* sits, and repeating it on every descendant restates what
the nesting already shows. So the recursion is shared in shape and not in code: a second, small
recursion over `byParent` in the search renderer, not a call into `hierarchyNodeText`.

A matched parent and a matched descendant cannot both reach the renderer and duplicate a subtree:
`pruneCategoryAncestors` (`src/resolve/scope.ts:279`) already drops a matched record that is an
ancestor of another match, which is the same rule that makes the deepest match win.

That one level is the defect. A reader shown a category's children cannot tell whether those children
are leaves or parents, and the safe reading — "this is the bottom" — is wrong for most of them:
measured, 110 of 192 second-level categories carry children, up to 15 each. The fix is to render the
matched category's subtree with the same recursion the hierarchy already uses.

The cost was raised and accepted. Measured at the session's branch, the largest root subtree holds 69
records and the median root holds 25, so a page of ten matched roots can print several hundred lines
where it prints tens today. The page size stays a bound on **how many records matched**, not on how
deep each is shown — cutting a subtree at a page size would put back the ambiguity the change is
removing, and a reader could no longer trust the deepest printed row.

### The promotions lead

A group order in one renderer. It is in this change because it touches the same file and the same
golden, not because it is related to the matcher.

## Risks / Trade-offs

- **A Russian catalogue query regresses.** Today `рыба` partly reaches «Риба» through accidental
  trigram overlap; afterwards it reaches nothing. → Accepted. The catalogue's titles are the shop's
  Ukrainian, the dictionary cannot be completed, and the skill states the language instead.

- **A typo in the middle of a word is not repaired.** Fuzzy matching is off, on the measurement above.
  → A caller who mistypes gets nothing rather than a wrong record, which is the direction
  `list-resolution` asks for.

- **Nothing bounds a wide word but the page size, and dropping the prefix minimum widens it further.**
  `для` keeps 68 of 761 at a minimum of four, and a two-character word will keep more. → Measured, no
  relative floor in the store path's range cuts any of them, so a floor would be a constant doing
  nothing. The page size trims the printed page, the margin refuses to choose among them, and the
  every-word-accounted rule refuses to choose silently. The cost of a wide word is a longer question,
  which is the failure this project prefers.

- **Deleting the guard is BREAKING for a value that fails fast today.** → It fails afterwards too, by
  the matcher rather than by its spelling, which is the point.

- **A sentence still reaches a record it shares a word with.** → Left open deliberately; the skill
  carries it. See the decision above.

- **The two changes are independent and land together.** The group order could have been its own
  change. → It is one renderer and one golden; separating it would cost more than it buys.

- **Five files where there was one.** → Four of them are what the previous change's reviewer priced at
  15 sites for a fourth kind, and the fifth is what stops the split from re-triplicating the policy.

## Migration Plan

None. Nothing is stored, and no option is added or removed. What a caller can observe is the group
order, which fails nothing; a handle-shaped value that named nothing failing with a different message
than before; and a Russian catalogue text that reached something by accident reaching nothing.

## Open Questions

None that block the work. The matcher carries no constant to settle; what remains open is whether
`promotion` and `product-set` want a configuration different from `category`'s. On the tables measured
they do not, and the three will ship agreeing with one another. That is a fact about today's corpora
rather than a reason to write the configuration once: each kind carries its own, so answering the
question later moves one kind and leaves the other two where they are.

What the shipped configuration produces is likewise open until it is measured — the numbers above were
taken with a prefix minimum this change removes, and the implementation owes the branch's own figures
for the configuration that actually ships.
