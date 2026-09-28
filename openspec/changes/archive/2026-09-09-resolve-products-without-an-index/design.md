## Context

See proposal.md — Why. This document is the record of the measurements that justify the change. They
are held nowhere else, so a claim not written here is a claim nobody can check later.

Everything below was measured against the live Silpo API at two branches: a large Kyiv `DeliveryHome`
branch and a small Dnipro `SelfPickup` branch. Where a number is quoted, the section
"How far to trust each number" at the end says what kind of evidence it is.

**No number here is a target, and none is an acceptance criterion.** Every one of them was taken
against an assortment that has since moved: search results rotate over hours, the same `totalFound`
returning about half different ids, and a branch's stock turns over faster than that. A number
recorded as a level — this configuration scores such-and-such — is therefore unreproducible by
construction, and aiming at it would be aiming at a day that has passed. What is recorded here is
narrower and does survive: **comparisons between two arms run against the same data on the same day**.
That the veto emptied answers more often than it saved them, that word combinations returned nothing
acceptable, that the trigram sweep's best value was none — those hold as findings whatever the stock
is today. Nothing in this change is verified by re-running a number; it is verified by the properties
in the review checklist, which are structural.

**The ground truth these numbers rest on, and its limit.** The receipt-derived set holds 533 cases.
On several families of variant it returned **bit-identical** results, which is why several decisions
below are recorded as ties rather than as wins. What the set cannot discriminate is the class where
someone typed the plain form of a word that appears only inside a compound; separating those needs
real user queries, which nobody has collected. Any future re-measurement should start there rather
than by re-running this set.

## Goals / Non-Goals

**Goals**

- One resolver for products, holding no state between commands, sitting beside the resolvers for
  categories, promotions, sets and stores.
- Zero fitted constants in the matching and ordering of products. A constant fitted to an assortment
  or a branch listing is the defect this change exists to remove; introducing a new one anywhere is a
  failure of the change, not a detail of it.
- The server's answer is never emptied by the CLI's own ignorance.

**Non-Goals**

- Improving what the server returns. Recall on products actually in stock was measured high enough
  that the ceiling on any answer is the branch's assortment rather than the search, so effort spent
  on finding more of what the branch has is effort spent on the wrong end.
- Ranking a broad query well. For `молоко` at a large branch, **47 products contain every query
  word**, so there is no lexical signal at all. This design orders such a query by history and then
  server rank and says how many matched; it does not claim to know which milk was meant.
- Reopening embeddings. The embeddings investigation settles that, and it is reopened by an
  eval number, not by this change.
- Reducing the agent skill. Its size is known and is separate work.

## Decisions

### The server composes, the CLI reorders, and the CLI never deletes

A product the local scorer failed to match keeps the position the server gave it.

The alternative — letting the local scorer veto — is what ships today, and it was measured. The local
layer **emptied a non-empty server answer in 37 of 63 false misses**, and turned **30 of 50 valid
Russian words** into a reported miss. The server resolves Ukrainian morphology, Russian to Ukrainian
(`хлеб` finds Хліб), transliteration (`лактель` finds Lactel) and typos (`молококо` finds молоко). A
local lexical layer with no dictionary does none of these, so its veto fires exactly where it is least
entitled to.

Run head to head against the shipped ranker, on the same set on the same day, the never-delete rule
together with the probe fan-out won by roughly ten points of top-1. The margin is recorded because it
distinguishes this from the changes below that measured as ties; the levels either arm reached are
not, being a property of that day's assortment.

### Probes: the full query, its words, and a transliteration — all in one call

The server matches **AND over tokens**: `кава` returns 66 products, `кава мелена` 54, `кава мелена
арабіка` 0. Adding a word can only narrow, never widen, so a full natural-language query returns
nothing whenever the branch carries no product answering every word of it — measured, that was over a
third of multi-word queries. The full query alone therefore cannot be the population.

Each word longer than two characters that is not purely numeric becomes its own probe, and it does so
**unconditionally**, travelling in the same call as the query. Sending the query first and its words
only if that returned too little would make two round trips of one, and the server bills a probe not
a call: thirty probes cost the same one call whether they came from one query or from ten. Where the
query carries Latin characters, the query transliterated into Cyrillic is added — transliteration
works as a probe sent to the server and has no effect as an indexed field, where it is beaten
head-to-head by the shop's own slug.

**Word pairs, triples and leave-one-out variants are not built.** Over 46 multi-word cases they
contributed 133 products and **zero** acceptable ones. This is a measured negative, not an omission.

`find_products_batch` accepts at most 30 probe strings per call and a `limit` of at most 100. The
typed client exposes no `offset` for it, and the endpoint ignores one where it is sent, so there is
no paging through a probe's answer — the limit is the whole of it. `totalFound` is the count after
the server's own relevance cut and does not change with `limit`.

**The limit sent is 100, the tool's own cap, and not the measured working range.** A `limit` between
**20 and 50** was measured as the range where the pool is neither too thin to reorder nor padded with
rows past the server's relevance cut. That measurement is real and is why nothing is lost by the
lower values; it is nonetheless not what the CLI sends. The requirement is that a population whose
tool takes no offset be bounded by that tool's own cap, and a number chosen inside the cap is a
fitted constant of exactly the kind this change removes — one nobody could set correctly for an
assortment that has since moved. Where a probe's answer is cut by the cap, the listing says so.

The product payload carries **no brand, no category and no popularity**. Brand and fat percentage sit
inside `name`; pack volume lives only in `displayRatio`, **which the server cannot search** — it can
be read and used to order, never to find.

The query has `’` and `&` normalised out before it is sent: the server hard-zeroes on a typographic
apostrophe and on an ampersand. Any `get_products` call passes `inStock: true`, without which the
server returns unbuyable rows.

### Coordination first, server rank second, no IDF

Ordering is: how many probes returned the product, then the server's own position within that
coordination level, with the pack size stated by `displayRatio` scaling the order within compatible
units and never filtering anything out of it.

**"The server's own position" needs defining, because a product returned by three probes has three
positions.** It is the best — the lowest — of them. A product the server put first for any one probe
is a product the server ranked highly for some reading of the query, and no other reading of "the"
position is available without privileging one probe over the others, which would reintroduce the
full-query anchor that was measured inert.

**IDF is dropped rather than fixed.** The index is built per query over the merged probe results,
where every product already matched some part of the query, so `df` for the query's own tokens
approaches `N`. IDF collapses for exactly the terms that matter and rises for incidental ones such as
`230г` or a brand name — the ranking is driven by the least query-relevant words in the name. This is
not fixable by choosing fields or thresholds.

The alternative is a stable background corpus of term frequencies. It was rejected because it has no
form this change can take: a runtime corpus is the local state being removed, and a corpus shipped as
a repository file is fitted to the assortment on the day it was built, which is the same defect one
layer down. Live-only forces this branch; it is an argument, not a coincidence.

**BM25 does not survive at all, and an earlier draft of this document said it did.** Within a
coordination level the tie is broken by the server's own position, never by a score the matcher
computed. The matcher is kept for one thing — establishing which of a term's words a candidate
accounts for — and its score is read nowhere. A score computed over the candidates of one query is
the measure this section has just rejected as collapsing, so ordering by it inside a level would
reintroduce at the second key what was refused at the first.

The matcher searches two fields, `name` and `slugWords` (the slug split on hyphens with the numeric
tail dropped). **The `name` boost is not tuned:** values 1, 2, 3, 5 and 10 produce bit-identical
rankings, because only **4 of 16,196 scored hits** ever matched another field without also matching
`name`. That the boost cannot be observed to matter is now a property of a value nothing reads.

**Pack size is read from the payload, never parsed out of a name.** `displayRatio` carries it, and
`weighted` says whether the product is sold by weight, in which case the price is per kilogram and
there is no package to compare. **`weighted` is itself a statement, and the name SHALL NOT be
consulted behind it.** A weighted record has told the CLI that this product has no package; falling
through to a size read out of its name answers a question the payload has already closed, and answers
it wrongly — `Яловичина охолоджена 950г` sold by the kilogram would match an item asking for a 950 g
pack and settle automatically, writing a per-kilogram line for a package that does not exist. The name
is the fallback only where the payload is silent, which means where the product is not weighted and
`displayRatio` states no size. A size recovered from a product's name is a guess about a string
where the record already states the fact, and it is a guess that decides something: the same value
gates whether a term settles automatically. Sizes SHALL be compared only within compatible units —
grams against kilograms, millilitres against litres — and a count of pieces is not a mass. The card's
`ratio` is a different field on a different payload that no listing carries.

### Confidence is structure, not a number

Today `settle()` asks whether the top raw BM25 score exceeds `750` and whether it leads the second by
more than 30%. Both go. `AUTO_MARGIN_RATIO` has an **AUC of about 0.5**, so it measures noise. `750`
is a raw BM25 score, meaningless on its own: the same number means different things to corpora of
different sizes, which this project has already recorded at 160.01 for a wrong answer against 157.93
for a right one in two corpora. `settle()` takes a `scoreThreshold` option so that a second corpus
could pass a different value; **nothing in the tree passes it**, and the catalogue settles with a
margin of its own instead. A threshold nobody can set correctly, plus an escape hatch nobody uses, is
not a mechanism.

The replacement asks two questions, neither of which has a scale:

1. **Coverage.** Is every word of the query accounted for in the chosen product's name, after
   stemming? `молоко` does not cover `молочний шоколад`, because the stems differ.
2. **Uniqueness.** Is any other candidate covered as fully *and* returned by as many probes?
   Coordination is an integer, so a tie in it is a real ambiguity rather than two close numbers.

```
coverage partial            → ask          risk is CATEGORY SUBSTITUTION
coverage full, no tie       → take
coverage full, tie          → history, then saved products, then server rank
```

This makes the information in the query decide. A specific query raises coordination and resolves
itself; a vague one ties and is either settled by what the caller actually buys or handed to the only
popularity signal that exists.

**Why history is admissible here when it was rejected as a boost.** Measured as a multiplicative boost
over the whole candidate pool, purchase history scored **one match in 221 candidates** at the caller's
own branch, and that match was wrong; favourites held **three entries, two of them unresolvable** at
the branch. That measurement is of a different mechanism. A boost lifts candidates that do not cover
the query, which is how it produced a wrong answer; a tie-break applies only among candidates that
already cover the query in full, where substituting one category for another is structurally
impossible. The worst outcome available to it is the wrong brand of the right thing.

**A promotion breaks the tie below the caller's own history.** The order is history, then saved
products, then a promotion, then the catalogue's own rank. The measurement that rejected promotions
is a measurement of a **multiplier over the whole pool** — that is how it replaced a still water at 35
UAH with an imported one at 179, and plain butter with garlic butter: a multiplier reaches candidates
that do not answer the query at all. A tie-break cannot, every candidate it chooses among having
already accounted for the term in full, so the substitution the measurement caught is structurally out
of reach. This is the same argument that admits the caller's history one step above, and it is the
only argument that admits either; a promotion is refused everywhere else, including the listing, which
settles nothing.

It sits below saved products because a promotion is the shop's preference and the other two are the
caller's own. It costs nothing: `oldPrice` and `specialPrices` are already on the record the search
returned, so unlike the history reads it needs no call and survives a history read that failed.

**What else was tried for the tie, and failed.** These are measured rejections; a future reader
reaching for one of them should know it has been reached for already.

- **Stock level and price typicality as tie-breaks.** Both missed.
- **Category popularity.** It wins on quality for broad queries — the case where nothing else has a
  signal — but well under half of free-text queries resolve to a category at all, and it costs
  roughly four round-trips per item against one per thirty items for search. It is the only rejected
  alternative that was measured better on quality, and it was rejected on cost and coverage.
- **The promotion multiplier**, covered above.

Two limits on the caller's own history, to be recorded rather than discovered later:

- **In-store receipts carry a catalogue product on about half their lines.** The other half join to
  nothing, so offline history covers roughly half of what the caller bought in a shop. Online orders
  carry a product id on every line.
- Offline receipts cap at **20 orders per date window**, and widening `dateStart` does not help.

### History is read eagerly, in parallel, at five pages

Online orders, in-store receipts and saved products are fetched concurrently with the search rather
than after a tie is detected. Lazy reading was considered and rejected: it saves calls only on queries
that resolve without a tie, and it costs a whole round-trip stage on the queries that do tie, where
latency is already worst.

Only the settling path reads them. The listing does not settle a term, so it never reaches a
tie-break and never makes these calls: `products find` costs exactly its search, and the reads belong
to the fill.

Each read stops at **five pages**, and what a page holds differs by read: online orders 50, in-store
receipts 10, saved products 500. So the bound binds only on online orders, at 250. For receipts it
cannot bind — the server returns at most 20 orders for a date window however the window is widened —
and for saved products 2,500 is past any plausible account. It is one number for three reads because
a caller should not have to learn three, not because three were needed. The same bound is applied to the
receipt read behind the store ranking, so that one rule governs how deep the CLI reads a history
anywhere. That read was deliberately made exhaustive once; this change reverses that deliberately, and
because the server's own cap sits below the bound, nothing observable changes.

### The stemmer is written here, and no package supplies it

Stemming replaces prefix matching, character n-grams, a suffix field and Unicode folding, each of
which was measured:

- **Character trigrams.** The boost sweep decreases monotonically; the best value is always "none".
  Stemming first removes the pathology — trigrams put all their discriminating weight on the query's
  own inflectional ending and so matched products sharing that ending while missing the nominative
  target — but it removes the entire signal with it.
- **Substring matching and a suffix field.** It fixes compound words, which nothing else reaches,
  taking that class from 1 of 24 to 6 of 24. Overall it scores **260 against 261**, and it introduces
  negation inversion: Ukrainian's productive inner prefixes `не-`, `без-`, `напів-`, `слабо-` and
  `мало-` make sub-word matching return the opposite of the query.
- **Unicode folding** of и/і/ї, е/є and г/ґ. Zero or negative on every set, including one built
  specifically to favour it.

The stemmer is **Porter's suffix-stripping algorithm, adapted to Ukrainian**. The algorithm supplies
the structure; the language's own endings supply the rest.

The implementation takes:

- **Structure, from Porter.** Find the region following the first vowel, so that stripping cannot eat
  the root; then strip, in a fixed order, a perfective gerund, else a reflexive followed by an
  adjective or participle, else a verb, else a noun; then the trailing `и`; then the derivational
  `-ість` where the word has the shape that licenses it; then a soft sign, a superlative and a
  doubled `нн`. The order is the part that is not obvious and is why the algorithm is used by name
  rather than reinvented.
- **Ending lists, from a grammar reference.** The endings of Ukrainian adjectives, participles, verbs,
  nouns and reflexives are facts about the language, taken from a description of Ukrainian grammar —
  the Wikipedia articles on прикметник, дієприкметник, дієслово, іменник and рефлексивне дієслово are
  adequate and are what a reader should be pointed at.

The behaviour is pinned by scenario rather than by reference to any implementation; see
`specs/list-resolution/spec.md`.

**Where each ending list came from, and how the four-group order was read.** `src/utils/stem.ts`
implements the algorithm above. Each ending list is read from the Wikipedia article naming the same
part of speech:

- **Perfective gerund** (`вшись`, `вши`, `шись`, `ши`) — from дієприслівник, specifically its account
  of the doконаний-aspect forms, which are built with `-(в)ши(сь)` rather than the imperfective
  `-учи/-ючи/-ачи/-ячи` forms (those never get to this group; the algorithm strips a perfective
  gerund or nothing here, by design).
- **Reflexive** (`ся`, `сь`) — from рефлексивне дієслово, whose postfix is `-ся`; `-сь` is kept
  alongside it as the vowel-final variant the same article records.
- **Adjective and participle** — from прикметник (the full declension of a hard- and a soft-stem
  adjective across both numbers, three genders and the oblique cases: `ий/ій`, `а/я`, `е/є`, `і`,
  `у/ю`, `ого/його`, `ому/ьому`, `ої/ьої`, `ій`, `их/іх`, `им/ім`, `ими/іми`, `ою/ьою`, `ею/єю`) and
  from дієприкметник for the participle formants that precede those same case endings: `-уч-/-юч-`
  and `-ач-/-яч-` (active present), `-ен-/-єн-` and `-ан-/-ян-` and `-ован-` (passive), and `-т-` for
  и-stem passives (`закритий`, `вимитий`). Дієприкметник's own account of the active *past*
  participle was not carried over — it describes that form as marginal in the modern standard rather
  than productive, and a formant not attested as productive is not a fact about the language this
  change can lean on.
- **Verb** — from дієслово: the six present/future personal endings of both conjugations
  (`у/ю`, `еш/єш`/`иш/їш`, `е/є`/`ить/їть`, `емо/ємо`/`имо/їмо`, `ете/єте`/`ите/їте`,
  `уть/ють`/`ать/ять`), the thematic-vowel infinitive forms `ати/яти/ити/іти/ути`, the past-tense
  endings `ла/ло/ли` and the imperative `й/йте`. Two endings that belong to this grammar were tried
  and dropped. Russian's own infinitive marker `-ть` is not in this list: Ukrainian's is `-ти` in
  every case, bare or thematic, and `-ть` is not a Ukrainian ending at all — an early draft carried it
  over from the Porter algorithm's Russian source by mistake, and it is why `можливість` is in the
  test file: with `-ть` in the list it would have been read as an infinitive and the licensed `-ість`
  step below would never have been reached. The bare Ukrainian infinitive marker `-ти` itself was also
  dropped, once it was tried against real product nouns rather than against verbs alone: a masculine
  noun ending in `т` spells its own plural with the same two trailing letters — `йогурт`/`йогурти`,
  `торт`/`торти`, `документ`/`документи` — and losing that collision for the small, largely irregular
  class of consonant-stem infinitives it exists to catch (`нести`, `вести`, `плести`) costs less than
  keeping it, given how often a т-final product name is plural on the shelf. The thematic-vowel
  infinitive endings above still catch every infinitive whose stem is not itself т-final.
- **Noun** — from іменник: the singular and plural case endings across the four declensions
  (`а/я`, `и/і`, `у/ю`, `е/є`, `о`, `ом/ем/єм`, `ові/еві`, `ою/ею/єю`, `ах/ях`, `ам/ям`, `ів`, `ей`,
  `ами/ями`).
- **Superlative** (`іш`) — from прикметник's account of the comparative/superlative, which is built on
  `-ш-`/`-іш-` plus the `най-` prefix, not on Russian's `-ейш-`; only the suffix is struck here, since
  this stemmer strips no prefix.

The four-group order in task 1.2 is Porter's own structure for Slavic suffix-stripping, read as: try
the perfective gerund first and stop if it matched; otherwise strip a reflexive ending where present
(committed whether or not anything follows it, since a bare reflexive with no further ending is still
a real word, e.g. `сміється`) and then try, as three mutually exclusive alternatives in this order, an
adjective-or-participle ending, else a verb ending, else a noun ending — each read from the word as it
stands after the reflexive step. This is the reading Porter's Russian stemmer itself uses; it is
recorded here because the task's prose can also be read as making the verb step conditional on the
adjectival step having matched, which would make the verb step unreachable, and that reading was
rejected as unworkable.

**The alternative that was measured.** Truncating every term to five characters ties with a stemmer:
three cases in 703, a 95% interval spanning zero. It is rejected on two grounds. `5` is a fitted
constant, which this change exists to remove. And fixed-width truncation is the identity function for
about a quarter of the vocabulary and collapses unrelated words together, putting `слабогазований`,
`слабоалкогольний` and `слабосолена` into one meaningless token — which is the behaviour the specs
forbid by scenario.

### Alternatives are offered, not browsed

`--similar` goes as a selector. The same call stays, fired where the CLI can see that it is wanted:
the term settled on a product that is unavailable, or — new — a list asked for more of a product than
the branch holds. The listing has no quantity to compare against, so only the unavailable trigger
applies there; the partial-stock trigger belongs to the fill path alone.

Partial stock resolves to **ask**, under a rule of its own rather than as a variant of the ambiguity
rule. It is not a fifth outcome — the four stand — but it is a fifth reason to ask, and the only one
where the question is not "which of these did you mean". Its question has three answers: take what
there is, make up the difference from alternatives, or choose another product. The answering
mechanism already exists; what is new is a third kind of answer for the caller to give.

### A list is searched in one round of calls

Every item of a list is expanded in full before anything is sent — the item's text, each of its words,
and its transliteration where it carries Latin — and all of those strings go out together, batched at
the server's thirty per call, every call issued at the same time.

There is no second round. A second round exists only to send what a first round deliberately withheld,
and withholding buys nothing here: the server's limit is on strings per call, not on calls, so a
twenty-item list expanded in full is about seventy strings and three calls against about forty strings
and two. One call is a low price for the guarantee that the fill and the listing see the same
population for the same words — which is a requirement, not a preference.

What the measurement behind this actually established is that batching and concurrency are what pay:
**six calls deliver what forty deliver** when the alternative is searching an item at a time, and
issuing the calls together rather than in sequence takes a twenty-item list from **9.4 s to 1.4 s**.
Neither result depends on the first round being partial.

### Where the code lives

`src/index/` stops describing anything once there is no index. The resolver moves to
`src/resolve/products.ts`, beside `categories.ts`, `promotions.ts`, `sets.ts` and `stores.ts`; the pure
helpers that survive — item parsing, product-name parsing, restriction detection — move with it.

**The listing has two paths and not five.** `products find` grew a special case for each shape it
could take — no selector, a lone saved-products listing, a lone category, a lone promotion, a lone
set — and the three lone-scope cases are one call with a different argument. The distinction that
earns its keep is the one the spec already draws: the server sorts and pages where the CLI does not
rank and the population's own tool offers a sort, which is the scope listing alone; everywhere else
the order is the CLI's own merge and a server sort would be a second answer to the same question.
So: one path where a single scope is read with the server's sort, one path where the CLI assembles
and orders. `find_products_batch` offers no sort at all, so a query never had a server sort to lose.

**`--details` opens no pool.** Every printed product's card is fetched at once. A bound on how many
of those calls are in flight was carried over from the ceiling that used to limit which products got
a card at all, and it is a number nobody measured, guarding against a page size no caller writes.

`src/resolve/matching.ts` is shared with the catalogue, which searches with `prefix: true`. Products
must search with prefix **off**, the stemmer having replaced it. The shared helper therefore takes the
prefix rule as an argument rather than assuming one; it is not forked, and the catalogue's behaviour
is not touched.

### The store's prefix gate goes; its fuzzy gate stays

`STORE_MATCH_PREFIX_MIN_LENGTH = 4` is removed. It was never measured — it was asserted in the design
of `repair-store-resolution` as "prefix from four characters, fuzz from five" — and it is fitted to a
branch listing that changes.

`STORE_MATCH_FUZZY_MIN_LENGTH = 5` is **kept**, and the two are not the same case.

Two relative rules already do their work and are not fitted:

- The relevance floor keeps a store only within a fifth of the top score.
- The selectivity condition keeps a store only if it matched at least one term carried by no more than
  half the listing. This condition already evaluates the **expanded** term: `minisearch` reports
  matched *document* terms rather than query terms, so a two-letter prefix that reached a branch
  through `лісова` is judged on `лісова`. Confirmed against the library rather than assumed.

**A prefix expansion is judged; an edit is not.** When a short query term reaches a store by prefix,
the term recorded against that result is the store's own word — `лі` reaches `лісова`, and it is
`лісова` whose selectivity is tested. The condition therefore already covers everything removing the
prefix gate lets in, which is why removing it changes no rule, only which terms reach the rules.

An edit has no such property. `minisearch` computes the allowance as `Math.round(term.length * fuzzy)`,
not a floor, so at a ratio of `0.2` a three- or four-character term is allowed **one edit** — checked
directly, `ліс` reaches `біс` and `лісо` reaches `ліс`. One edit in a word of three letters is not a
typo, it is a different word, and nothing downstream can tell the two apart: the selectivity condition
sees a legitimate, rare street word and keeps it, having no way to know the query never contained it.

| gate | what removal would change |
| --- | --- |
| prefix, minimum 4 | terms of 1–3 characters gain prefix expansion; each match is still judged on the selectivity of the word it reached, which the existing condition already does |
| fuzzy, minimum 5 | terms of 3 and 4 characters gain one edit of tolerance, which no condition downstream can assess |

So the prefix gate is removed and the fuzzy gate is kept. Keeping it is not an exception to this
change's rule against fitted constants so much as a recognition that the constant is doing real work
that nothing else does — and that removing it was proposed on the mistaken belief that a fractional
fuzziness rounds down for short terms.

What removing the prefix gate exposes: a query whose terms all match only by prefix, with no exact
match anywhere, has a top score that is itself a prefix match, so the relative floor cuts nothing. The
narrowing fact is that since `geocode-store-queries-first` the text reaching the matcher is a street as
the **gazetteer** spells it, not as the caller typed it, so the input is a real street name rather
than a fragment.

## Risks / Trade-offs

**A receipt line with no catalogue product still has no handle.** About half a live receipt's lines
carry none, and the current spec permits the index to supply one. → Nothing to mitigate: the
permission was never implemented, so no output changes. The change converts a licence to guess into a
prohibition, which is a smaller act than it first appears — worth stating because the specs made it
look like a capability being lost.

**Filling a list now always costs the history reads.** They are issued eagerly, so a list pays for
online orders, receipts and saved products even where no term ties. → Bounded at five pages each and
issued concurrently with the search, so the cost is calls rather than wall-clock. The listing does not
pay them at all, settling nothing.

**Alternatives can no longer be browsed on demand.** A caller who wants to see what else is like a
product must reach it through a query or a category. → Accepted: the call remains, fired where the CLI
can tell it is wanted, and the two triggers cover the cases that motivated the selector.

**No offset means a large category cannot be walked.** With `--limit` alone, a category of three
thousand products shows its first N and no more. → Accepted, and consistent with the store listing and
the catalogue, which already refuse an offset for the same reason. Queries and subcategories are the
way to reach further in.

**A hand-written stemmer is a new source of error.** It is being written rather than depended on. →
The specs pin its behaviour by scenario, including the collapse cases that the measured alternative
fails, so it is testable independently of any reference implementation.

**The measurements cannot be retaken cheaply after the change lands.** They were taken against a live
API whose search results **rotate over hours** — the same `totalFound`, about half the ids different —
so they reproduce as aggregates and not as sets. → This document is where they are kept, with their
provenance, and a claim made here without its number is a claim that cannot be rechecked.

## How far to trust each number

**Measured against receipt-derived ground truth that nobody in the investigation authored** — these
are frequency estimates: the never-delete rule, the probe fan-out, the batching and concurrency of a
list's searches, the
uselessness of the history and promotion boosts, and the inertness of the full-query anchor.

**Measured against sets built while the mechanism was already known** — these are capability tests,
not frequency estimates: the substring gain (260 against 261, and 1 of 24 to 6 of 24 on compounds),
the value of the pack size, and the verdict on the slug field.

**A tie, adopted on robustness rather than accuracy**: the stemmer against five-character truncation,
three cases in 703 with a 95% interval spanning zero, and about a quarter of the vocabulary left
unchanged by truncation.

**Single observations, quoted as illustrations and not as rates**: the 47 products containing every
word of `молоко` at one large branch; the still water at 35 against 179 and the butter, which are the
promotion multiplier's failures named rather than counted; "about half" of a live receipt's lines
carrying no catalogue product.

**Properties of a corpus rather than of an outcome**, and so not subject to sampling at all: the 4 of
16,196 scored hits that matched a field other than `name`; the AUC of about 0.5 for the margin, which
is a rank statistic over the whole set rather than an estimate from part of it.

**Timings, from one run each** and therefore indicative: 9.4 s against 1.4 s for a twenty-item list,
and six calls against forty.

## Open Questions

**What share of in-store receipt lines join to a catalogue product, exactly.** Recorded as "about
half" from a live receipt. It bounds how much the history tie-break can ever fire, and it can be
measured after the change lands as easily as before it. It changes no requirement either way.

**Whether a uuid is findable through the batch search.** Two claims are in the record and they
disagree. `product-search` has said since before this change that "the batch search matches only a
numeric external product id exactly — a uuid or a slug written as a query would not reach the product
it names"; the investigation behind this change recorded the opposite for a uuid, that a slug is not
findable through search while a uuid and a numeric id are. Neither was re-checked here. It changes no
requirement of this change — nothing in it turns a handle into a query — and it is one live call to
settle, so it is left open rather than guessed at.

**What the investigation meant by removing "the coverage rule".** Its list of things to remove named
one, and this design makes coverage the sole criterion for settling a term automatically. The two are
compatible on the reading that the rule it meant was a coverage requirement on what may be *listed* —
which this change also removes, under the never-delete rule — leaving coverage to decide only whether
a term is settled or asked about. Recorded because the wording invites the opposite reading.
