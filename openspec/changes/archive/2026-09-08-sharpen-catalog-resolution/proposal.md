## Why

`sharpen-catalog-query-io` split the catalogue's three entities apart. It left three things behind.

**The ranker settles a name that belongs to nothing.** Measured against the session's branch
`1edb7345-2b99-62cc-9e83-6fea04bfe766` (Дніпро, SelfPickup): of the 249 category slugs that change
prunes, **136 — 54.6% — resolve as confident `auto` matches onto an unrelated category**, 111 ask and
2 miss. `shpynat-4843` reaches «Пет-Нат (Pet-Nat)»; `ruchky-olivtsi-markery-4654` reaches «Власна
броварня Beermaster Brewery». The caller is handed the wrong category's products with no error.

`list-resolution` already forbids this, in the requirement that governs the thresholds: *"A wrong
silent choice costs more than a question, because the caller discovers it at the till. The thresholds
SHALL be set to favour asking, and the rate of wrong auto resolutions SHALL be the measure the
thresholds are tuned against."* That rate had never been measured until that change measured it once.

**A guard was added instead of a fix, and it inspects a form that cannot be inspected.**
`looksLikeHandle` refuses to rank any value shaped like a slug — lowercase ASCII, two or more
hyphenated segments — that names no record. It works, and it is the wrong mechanism: a slug's form is
a convention of the server, not a fact about slugs, and `command-input` had to gain a fourth named
exception to its own rule that no argument's shape is inspected. The guard was declared transitional
when it landed. This change is that transition.

**No threshold constant can replace it, and no threshold is the answer either.** The catalogue's
resolvers already pass `scoreThreshold: 10` where the product path uses `AUTO_SCORE_THRESHOLD = 750`,
seventy-five times higher, because BM25 scores over a 17-record set table cannot reach 750. Two
constants for two corpora is the defect stated plainly. But the constants are a symptom. The cause is
that `src/index/rank.ts` scores **character trigrams**, and a trigram index answers every input with
its least bad fragment overlap: `granat-4794` reaches «Пет-Нат (Pet-Nat)» on the Latin fragment `nat`
and would reach it under any ranking of the same tokens. A floor cannot separate a match that should
not exist from one that should, because both are real overlaps of the same kind.

The store path solved this problem already, and differently: `matchParsedStoresByRelevance` indexes
**words with a prefix rule** and combines them with OR. Applied to the catalogue and swept against the
branch's own tables — the full pruned set recovered as the 1010 categories the flat listing returns
less the 761 the tree keeps — the configuration settles itself:

| set | today | with word matching |
| --- | --- | --- |
| 249 pruned category slugs, right answer miss | **136 auto onto an unrelated category** | **0** on titles alone, **15** with the Latin spellings indexed |
| 761 kept category titles, each naming its own record | — | **619 auto to themselves, 0 to another, 142 ask, 0 miss** |

The junk does not score low; it does not match at all, because `granat` is a prefix of nothing in
«Пет-Нат (Pet-Nat)». The 142 asks are titles sharing a word with a sibling — «Кава», «Пиво», «Риба» —
where asking is the right answer. And the same configuration behaves the same on a 761-record table and
a 17-record one, which is the scale-free judgement `list-resolution` asks for and which no absolute
constant could give.

Separately, `src/resolve/scope.ts` is one file holding three entities, three tables, three rankings,
three resolutions and the read wave. `src/resolve/` otherwise runs one domain per file — `stores.ts`,
`delivery.ts`, `nova-poshta.ts`. `scope.ts` is the last shape of the abstraction that change removed.

And the listing prints the hierarchy first. Measured, `silpo catalog` with no text is 860 lines, of
which the 10 promotions and 17 sets are the last hundred. Two short groups are buried under one long
one.

## What Changes

- **The catalogue's three entities leave `src/index/rank.ts`, and each gains a matcher of its own**:
  word tokens over the record's own fields, matched by prefix at any length, OR-combined. That is the
  whole of it, and it carries no constant. A prefix minimum was swept and then rejected: any value for
  it is a number fitted to one branch's tables on one day, and dropping it costs questions rather than
  wrong answers, because auto still requires every word of the value to be accounted for. Fuzzy
  matching costs two kept titles their own record and adds five wrong ones, so it is off; a relative
  floor changes nothing at any value the store path uses, so there is none. The store path's address
  parsing, settlement filter, building multiplier, street canonicalization and discriminating-term
  condition are scaffolding for a different corpus and are not copied. The store path's own prefix
  minimum falls to the same argument, and removing it there is a separate change.

- **`RESOLVE_SCORE_THRESHOLD` disappears with them, and `AUTO_SCORE_THRESHOLD` is left as the one
  threshold in the codebase**, on the product path, where the rate is measured and unchanged. Two
  constants disagreeing by 75× was the stated defect; one path keeping one constant is the fix.
  The catalogue reaches its own outcome in its own module, as `src/resolve/stores.ts` already does for
  its corpus, so it neither passes a sentinel through `settle` nor needs `settle` widened. What is
  shared with the product path is the policy `list-resolution` states — the four outcomes and the
  asymmetry — not the function.

- **A record is matched by its title and by the Latin spellings of that title.** Word matching over
  Ukrainian titles leaves a caller writing Latin with nothing but an exact handle: measured, `ryba`,
  `moloko`, `kolgotky` and `kuriachi iaitsia` all reach nothing. Two further spellings of the same
  record are indexed beside its title — **the record's own handle split on its hyphens**, which is the
  spelling the shop publishes, and **the title transliterated**, which is the spelling a standard
  produces. They are complementary, not redundant: measured, the handle channel reaches
  `kuriachi iaitsia` and `gigiiena`, the transliterated channel reaches `kuriachi yaitsia` and
  `hihiiena`, and neither reaches the other's. Both spellings of `г` — `g` as the shop writes it and
  `h` as the standard does — and both treatments of an apostrophe are indexed, so a caller need not
  know which convention they are following.

- **Auto SHALL require every word of the query to be accounted for.** This is not a judgement about
  meaning; it is what stops the second and third spellings from being looser than the first. Measured,
  without it a pruned handle reaches a kept record 60 times out of 249; with it, 15.

- **The exact-handle probe SHALL run before the matcher, and this becomes load-bearing.** Measured,
  `ryba-4430` and `kava-chai-4700` — real slugs of the live table — match **nothing** under word
  tokens, a slug not being the words of its own title. Today the exact `bySlug` and `byCode` lookups
  answer them first; after this change nothing else can.

- **The catalogue does not gain the dictionary, and the skill states the language instead.** The
  dictionary has never been applied to a catalogue query — `rankCategories` and its siblings search the
  bare text — so nothing is removed here. What changes is that the gap becomes visible: today a Russian
  value reaches its category through accidental fragment overlap, and under word matching it reaches
  nothing, which makes adding the dictionary the obvious repair. It is declined. Measured, it would
  half-work: `рыба`, `хлеб`, `сыр`, `сгущенка` and `творог` each return their right category once
  expanded, while `овощи` and `детское питание` return nothing either way, and so will every word the
  table has not been taught. A caller cannot tell which of their words it covers, so a partial
  translation is worse than none. `agent-skill` SHALL state that a catalogue text is written in
  Ukrainian, which is a rule the reader can follow. The product path keeps the dictionary:
  `list-resolution` requires a Russian term to reach it, and that requirement is not in question.

- **A sentence describing a need is still not understood, and the skill says so rather than the CLI
  guessing.** Word tokenization stops a junk value written as one token — every pruned slug. It does not
  stop one written as a sentence: measured, `хочу купити подарунок` reaches «Солодкі подарунки для
  дітей» on the word `подарунок` alone. Telling that from a real name is a judgement about meaning, and
  the search is lexical; closing it inside the CLI would take a semantic model, deferred on the
  embeddings measurement, or a hand-made rule about which words count, which
  is a guess of the same kind as `looksLikeHandle`. `agent-skill` gains the line that does close it for
  the caller: the search matches the words the catalogue itself uses, so a query is built from such
  words.

- **`looksLikeHandle` is removed, and `command-input` loses its fourth exception. BREAKING** for a
  handle-shaped value that today fails fast and will afterwards be ranked. It fails afterwards too, by
  the matcher rather than by its spelling.

- **The CLI infers nothing from an argument's shape but a uuid.** A uuid is unambiguous by
  construction; a slug is a convention that may change without notice. This is settled precedent — the
  store path measured BM25-with-uuid as worse than an exact uuid lookup — and it becomes the rule
  rather than a local habit.

- **`src/resolve/scope.ts` becomes one module per entity**, plus one for the catalogue's read wave.
  Each entity owns its own record, its own fields, its own index, its own matching and its own
  exact-handle probe, so that a kind's resolver is usable on its own against a table of that kind
  alone. What the three share is the *policy* — the outcome decision and the candidate rendering — and
  nothing else, because that reads a ranking rather than a corpus and three copies of it is what the
  previous change's last review round removed. The three configurations will agree on the day this
  lands; they are kept apart so that a later measurement can move one without moving the others.

- **A matched category prints its whole subtree, not one level of it. BREAKING** for anything reading
  the shape of a search result. Today a matched category shows its direct children and stops, and a
  reader cannot tell whether those children are the bottom of the catalogue or a floor above it —
  measured, 110 of the 192 second-level categories carry children of their own, so the ambiguity is the
  common case rather than the corner. The cost is measured and accepted: the deepest subtree at the
  session's branch holds 69 records and the median root holds 25, so a page of ten matched roots can
  print several hundred lines. The page size bounds how many records matched, not how deep each is
  shown; a subtree cut at a page size would reintroduce exactly the ambiguity this removes.

- **The listing leads with the promotions, then the hierarchy, then the sets. BREAKING** for anything
  reading the order. A promotion is a campaign with an end date and is worth seeing before eight
  hundred lines of hierarchy; the sets follow the hierarchy because they are the least time-bound of
  the three.

Deliberately not in this change: **the product path**. It keeps `src/index/rank.ts`, its trigrams, its
boosts and `AUTO_SCORE_THRESHOLD` exactly as they are. Measured today, `npm run eval` over the repo's
120 ground-truthed fixtures reports 12.5% auto and 5.8% wrong-auto, and this change SHALL leave both
numbers where they are — the catalogue's departure is a removal of a second caller, not a change to
the ranker. Also not in this change: the search moving inside the fetch, so that a matcher test does
not need a faked server; and `cart fill`, which resolves no catalogue entity.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `list-resolution`: the requirement that one ranker serves every corpus is restated as one matcher
  per **corpus**, shared by every command that reaches it — `cart fill` and `products find` over
  products, the listing and the matching population option over each catalogue kind — the reason being
  that a corpus of category titles and a corpus of product names are not the same kind of text and a
  ranker tuned for one was measured to answer the other with fragment noise, and that the catalogue's
  own three kinds are three corpora by the same test; the outcome decision and the candidate rendering
  are required to exist once within a domain, because they read a ranking rather than a corpus;
  "strong enough to trust" is restated as a judgement that cannot be an absolute score; and the
  wrong-auto rate gains the requirement that it is measured on every corpus a matcher serves.
- `command-input`: the fourth, transitional exception to shape inspection is removed, and the rule is
  restated as inferring nothing from an argument's shape but a uuid — qualified so that it forbids
  deciding which family a value belongs to, and still permits the store lookup separating a numeric
  code from a place name by a measured length, which it does today. The scope-selector requirement is
  restated too: it currently asserts that a ranker answers every input with its least bad match, which
  is what this change stops being true.
- `catalog-browsing`: the fixed group order becomes the promotions, then the hierarchy, then the sets;
  matching within a kind is restated as that kind's own matcher over words rather than the product
  ranker over trigrams, with the exact-handle probe named as running first and belonging to the kind;
  and the number of characters a word must carry before it matches by prefix is restated as no number
  at all, a minimum being fitted to a snapshot of tables that change without notice.
- `agent-skill`: the catalogue entry's statement of what the listing returns follows the new order, and
  the entry gains the language a catalogue text is written in, what the search actually matches — the
  catalogue's own words — and the correction that a text sharing no word with any title now returns
  nothing rather than the least bad match.

## Impact

- `src/resolve/scope.ts` splits into one module per entity plus the catalogue read wave and one module
  for the outcome policy; each entity module gains its own matching and its own exact-handle probe.
  `src/resolve/` gains files and loses none. `src/resolve/stores.ts` is untouched: the argument against
  its prefix minimum holds, and acting on it is a change of its own.
- `src/index/rank.ts`: **nothing changes in it.** `RankIndex`, `ScoredCandidate`, `settle`,
  `SettleOptions`, the trigram tokenizer, the boosts, `RELEVANCE_FLOOR` and `AUTO_SCORE_THRESHOLD` all
  stay as they are, so `src/commands/products.ts`, `src/daemon/fill.ts` and
  the eval runner are untouched. What changes is that the catalogue stops calling
  it.
- `src/commands/catalog.ts`: the group order, the whole-subtree rendering, the command's own help text
  where it describes ranking and what a text that names nothing returns, and the imports that follow
  the split.
- `src/commands/products.ts`: the imports that follow the split. Its options, its unions, its sorts and
  its own use of `settle` over the product corpus do not change.
- `plugin/skills/silpo/SKILL.md`: the listing order, the language of a catalogue text, the empty answer
  and the printed depth.
- `test/expected/catalog.whole.txt`: the golden's group order.
- `test/catalog.test.ts`: six assertions anchor the categories group as the first output, and one more
  asserts the group order outright; all follow the reorder, and several fixtures are small enough that
  the matcher's behaviour on them has to be checked rather than assumed.
- `test/products-find.test.ts`: its category and promotion fixtures go through the new matcher. The
  command's own behaviour does not change, but the fixtures that exercise it must still resolve.
- A new measurement record states the matcher's chosen constants and the rates they produce, as the
  store path's measurements do — the source carries no explanatory prose, so this is where a threshold
  becomes checkable. Two existing write-ups name `AUTO_SCORE_THRESHOLD`; neither becomes wrong, both
  are in the sweep.
- **One runtime dependency is added**: a Ukrainian transliterator. Measured, `cyrillic-to-translit-js`
  reproduces the shop's own handle spelling for 92.4% of the 761 kept categories once `г` is written as
  `g`; what it does not reproduce is the apostrophe and the word-initial `я`/`ї`, which is why both
  spellings are indexed rather than one. Writing the letter table by hand instead is a defensible
  alternative and is stated in the design. Nothing is written to disk.

## Open Questions

None that block the work. The matcher carries no constant to settle; the rates the shipped
configuration produces are owed by the implementation, measured against the branch's own tables and
recorded, because the rates stated in the design were taken with a prefix minimum this
change removes. The rest of the change is a split, a renderer and a skill entry.
