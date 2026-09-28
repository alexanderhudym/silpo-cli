# Tasks

## 1. The catalogue's own matcher and its own outcome

Owns the catalogue's matching and its tests, in whichever modules hold them — group 3 states the
layout. `src/index/rank.ts` is not touched by this group or any other.

The configuration is settled and stated in `design.md` — word tokens over the record's own fields, no
prefix minimum, OR-combined, no fuzzy, no relative floor. Nothing here is swept, because the matcher
carries no constant to sweep.

- [x] 1.1 Give each catalogue kind a matcher of its own, in that kind's own module: a MiniSearch index
      over that kind's own fields with the default word tokenizer — no `tokenize` option — searched
      with `prefix: true`, `fuzzy: false` and `combineWith: "OR"`. **No minimum length is required of a
      word before it matches by prefix.** `src/resolve/stores.ts` is the worked example for the
      tokenizer and the OR combination and for nothing else: its address parsing, its settlement
      filter, its building multiplier, its street canonicalization, its discriminating-term condition
      and its own prefix minimum are scaffolding for a different corpus. A catalogue title is indexed
      as the shop wrote it. Three matchers that currently agree are the expected outcome; do not fold
      them into one for looking alike.
- [x] 1.2 Write no condition expressed as a count divided by the table's size, and add no rule that
      tries to tell a name from a description of a need. A sentence sharing one word with one record
      reaches it; that is left open and the skill carries it, in group 6.
- [x] 1.3 Where a kind's handle is a transliteration of its title — the category's case — index each
      record under three spellings of its own name: its title; its own handle split on its hyphens,
      with the numeric tail dropped; and its title transliterated. Carry **both** conventions for the
      two places they differ — `г` as `g` and as `h`, and an apostrophe both split and dropped — so a
      caller need not know which they are reproducing. Decide this per kind against that kind's own
      handles rather than giving a kind a field because another kind has one.
- [x] 1.4 Take a Ukrainian transliterator as a dependency, or write the letter table by hand. Measured,
      `cyrillic-to-translit-js` reproduces the shop's own handle spelling for 553 of 761 kept
      categories as it ships and 703 of 761 once `г` is pre-mapped to `ґ`; the residue is the
      apostrophe and the word-initial `я`/`ї`, which the wrapper handles either way. Whichever is
      chosen, record which and why beside the numbers in 1.9.
- [x] 1.5 Require every word of the value to be accounted for by the chosen candidate before it may be
      used without asking. Measured, without this the extra spellings let 60 of 249 pruned handles
      resolve silently; with it, 15. Compute it over the words of the value against the terms the
      candidate matched — it is a test of a spelling being accounted for, not of what a phrase means.
- [x] 1.6 Decide the catalogue's outcome **in the command that decides** — `src/commands/products.ts`
      — rather than by calling `settle` and rather than inside a resolver: the exact handle, then the
      match, then miss where nothing matched, then ask where the top does not lead the runner-up by the
      existing margin ratio, then auto. Keep the four outcomes `list-resolution` names and its
      asymmetry — what is shared with the product path is the policy, not the function. A resolver
      SHALL NOT settle an outcome: the listing has nothing to settle, and a resolver that had already
      chosen could not serve it.
- [x] 1.7 Delete `RESOLVE_SCORE_THRESHOLD`. Do not widen `SettleOptions` and do not pass a sentinel
      through it: the catalogue has no absolute score, so it has no business in a gate built for one.
- [x] 1.8 Keep the exact-handle probe ahead of the matcher, and confirm it is reached first. It belongs
      to the kind, not to the shared policy: it reads that kind's own table by that kind's own handle
      forms — a category by slug or identifier, a promotion by code, a set by slug — so each entity
      module carries its own. Measured, `ryba-4430` and `kava-chai-4700` match nothing under word
      tokens, so the probe is the only path for a handle the CLI itself printed.
- [x] 1.9 Do not apply `expandTerm` to a catalogue query. It never has been; this is a line in the
      checklist, not work.
- [x] 1.10 Cover in tests, over tables built by hand: a value sharing a fragment but no word with a
      title matching nothing; a value that is the beginning of a title's word matching it; a
      **one-record table returning its record**; the same values reaching the same outcomes against a
      table of seventeen and a table of several hundred; a table growing by records the value does not
      name not changing an outcome; and an exact handle answered without matching.
- [x] 1.11 Measure the shipped configuration against the live branch, driving the index and the outcome
      directly. Two sets, both recovered from the branch's own tables: the **pruned handles** — the flat
      listing's categories less the ones the tree keeps, whose right answer is miss — and the **kept
      titles**, each of which must find its own record. The sizes of both sets are whatever the branch
      holds on the day; they are not acceptance criteria and are not to be reproduced. What must hold:

      - **no pruned handle reaches a record outside its own subtree without asking.** A pruned record
        reaching a kept relative — «Дитячі шкарпетки» reaching «Шкарпетки» — is accepted and counted
        separately; a pruned handle reaching an unrelated category is the defect this change exists to
        remove, and its count is the number that must be small and stated.
      - **no kept title auto-resolves to a record outside its own subtree.** A title resolving to a
        descendant of itself is `catalog-browsing`'s "the deepest SHALL be preferred" and is not a wrong
        answer; count it separately rather than against the bound.
      - **the counts are stated with the branch, the delivery type and the slot**, so a later reader can
        tell a measurement from a requirement.

      Also check the Latin set: `kolgotky`, `zamorozhena ryba`, `kuriachi iaitsia`, `kuriachi yaitsia`,
      `organichna izha`, `organichna yizha`, `gigiiena`, `hihiiena`, `miasni`, `m-iasni`. And check what
      dropping the prefix minimum costs: a one-character and a two-character text against the category
      table, reporting how many records they keep and that the outcome is a question rather than a
      choice. Report what you actually get.
- [x] 1.12 Record the configuration and those rates beside the measurements, with the branch, the
      delivery type and the slot. The store path's measurement record is the precedent. Not in a
      source comment — `src/` carries no explanatory prose. State plainly that the rates in `design.md`
      were taken at a prefix minimum this change removes, so that the two are not read as one
      measurement.
- [x] 1.13 Run `npm test` and `npm run eval`. The eval must report what it reported before this group;
      the catalogue is leaving the ranker, not changing it.

## 2. The guard goes

Owns `src/resolve/scope.ts` and `test/resolve-scope.test.ts`. Depends on group 1 and on 1.11 having
shown 0 wrongly-auto pruned slugs. Do not start this before that number exists.

- [x] 2.1 Delete `HANDLE_SHAPE`, `looksLikeHandle` and its three call sites in `resolveCategory`,
      `resolvePromotion` and `resolveSet`.
- [x] 2.2 Verify against the live branch that `products find --category granat-4794` still fails naming
      the value, now because the table holds no such record and nothing matched it, and that
      `products find --category pet-nat` reaches «Пет-Нат (Pet-Nat)», which the guard refused. Both
      must be checked live: `pet-nat` resolves against the branch's whole category table and cannot be
      pinned by a hand-built fixture.
- [x] 2.3 Replace the test that pins the guard's behaviour with one that pins the outcome: a
      handle-shaped value naming nothing fails, and a hyphenated Latin value approximating a real title
      resolves. Neither test may mention a shape.
- [x] 2.4 Run `npm test`.

## 3. One module per entity

Owns `src/resolve/`. Depends on groups 1 and 2, so that it moves correct code rather than code that is
about to change.

- [x] 3.1 Split `src/resolve/scope.ts` into `categories.ts`, `promotions.ts`, `sets.ts` and
      `matching.ts` — **named in the plural**, each answering with records rather than standing for
      one. Flat, as `src/resolve/` already is. **Each kind's module is self-sufficient**: it reads what
      that kind needs from the server itself, builds its own table, carries its own indexed fields and
      its own exact-handle probe, and answers with the records of that kind most relevant to a value,
      most relevant first — callable against a table of that kind alone. **It settles no outcome and
      renders no text.** **`matching.ts` carries the mechanism and nothing else**: build an index over
      the fields it is handed, search it, drop what did not match, order what did. It knows no kind.
      **There is no `resolution.ts` and no `catalog.ts`** — the outcome decision belongs to the one
      command that decides, the rendering to the command that prints, and the assembling of the three
      kinds to the command that needs all three.
- [x] 3.2 Keep each entity's read and its most-relevant function as two separately callable functions
      in its own module. A matching test must be able to match against a table built by hand, with no
      server faked, and must not have to import another kind's module or a command to do it.
- [x] 3.3 Repoint `src/commands/catalog.ts` and `src/commands/products.ts`, and give each what left the
      resolvers: `products.ts` gains the outcome decision, and each command gains the rendering it
      prints. Neither command's options, output or observable behaviour changes in this group.
      `src/commands/catalog.ts` reads the three kinds with one `Promise.all`; `src/commands/products.ts`
      reads only the kinds its options named, concurrently where more than one is named.
- [x] 3.3a Assert the call saving where it is observable: a test pins that `products find --category`
      makes no promotions and no sets call (`test/products-find.test.ts`, "--category reads only
      categories: no promotions call and no sets call"). Do **not** prove the listing's three reads are
      issued together by failing one read against a fake server and reading back which calls it
      recorded: that observes a structural property through a side channel and races with the command's
      own fast failure — measured, such a test failed 2 runs in 40. The reads being issued together is
      `Promise.all` over the three readers, held by the review checklist against the code.
- [x] 3.4 Confirm no import cycle and no cross-kind import: the three entities import `matching.ts` and
      nothing else of `src/resolve/`, no entity module imports another entity module, no entity module
      imports a command, and there is no `catalog.ts` for anything to import back. Verified by grepping
      each module's own imports.
- [x] 3.5 Split `test/resolve-scope.test.ts` along the same lines, losing no assertion. A test that
      asserted on a resolver's outcome or its rendered text now asserts where that work lives.
      `test/resolve-category.test.ts` renamed to `test/resolve-categories.test.ts`,
      `test/resolve-promotion.test.ts` to `test/resolve-promotions.test.ts`,
      `test/resolve-product-set.test.ts` to `test/resolve-sets.test.ts`; `test/resolve-catalog.test.ts`
      folded into `test/resolve-categories.test.ts` (the popular-read-failure test, now driven through
      `readCategoryTable`) and deleted.

## 4. A matched category prints its whole subtree

Owns `src/commands/catalog.ts`, `test/catalog.test.ts` and `test/expected/`. Depends on group 3.

- [x] 4.1 Render a matched category's whole subtree beneath it, to whatever depth it runs, instead of
      its direct children alone. The function is `rankedCategoryText`
      (`src/commands/catalog.ts:102`), which reads `table.byParent` once.
- [x] 4.2 Keep the search result's own row shape: a descendant carries `slug`, `title` and `count` and
      **no path**, at every depth, indented under the child it belongs to. Do not call
      `hierarchyNodeText` — it prints a different shape, and `test/catalog.test.ts:226` and `:248` pin
      the shape the search result uses.
- [x] 4.3 Keep the page size a bound on how many records matched per kind, and confirm it does not cut
      a subtree.
- [x] 4.4 Cover in tests: a matched category whose child has children of its own printing all three
      levels; a matched leaf printing no children section; a subtree larger than the page size printed
      whole; and a descendant carrying no path.
- [x] 4.5 Confirm no subtree is printed twice. `pruneCategoryAncestors` (`src/resolve/scope.ts:279`)
      already drops a matched record that is an ancestor of another match, so a matched parent and a
      matched descendant cannot both reach the renderer — assert it rather than assume it.
- [x] 4.6 Report what the change costs in lines for a realistic query against the live branch, beside
      the 69-record and 25-record figures the design carries.

## 5. The promotions lead

Owns `src/commands/catalog.ts`, `test/catalog.test.ts` and `test/expected/catalog.whole.txt`. Depends
on group 4.

- [x] 5.1 Print the promotions, then the hierarchy, then the sets, with no text and with a text alike.
      Change nothing else about any group.
- [x] 5.2 Regenerate the golden and justify the reordered output against the requirement rather than
      against what the code emitted.
- [x] 5.3 Fix the assertions that depend on the categories group being first: six anchored
      `assert.match(text, /^Found N categories/)` at `test/catalog.test.ts:86, 105, 121, 245, 269, 417`,
      and the explicit order assertion at `:60-67`
      (`promotionsAt > categoriesAt && setsAt > promotionsAt`). Each must assert on the group it means.
- [x] 5.4 Update the command's own help text (`src/commands/catalog.ts:167,172`): it says the kinds are
      "ranked" within their kind and describes the page size, and both the wording and the behaviour on
      a text naming nothing have changed.
- [x] 5.5 Cover in tests: the order with no text, the order with a text, and that it does not follow the
      relative sizes of the groups.

## 6. The skill

Owns `plugin/skills/silpo/SKILL.md`. Depends on group 5.

- [x] 6.1 Restate the catalogue entry's account of the listing with no text in the new order, and say
      the order is fixed.
- [x] 6.2 State the language a catalogue text is written in, and that nothing is translated for the
      caller.
- [x] 6.3 State what the search matches — the words the catalogue itself uses — and that a query is
      built from such words rather than from a description of a need. This is the line that carries the
      limit the CLI does not close: a sentence usually shares a word with something and gets it back.
      State also that a text sharing no word returns nothing, and that a handle is matched exactly while
      half a handle reaches nothing. Promise nothing about a wrong query being refused.
- [x] 6.4 State that a matched category's whole subtree is printed, so the deepest printed row is the
      deepest row there is.
- [x] 6.5 Carry no count measured at one branch on one day, as the entry already must not. Check the
      file's length against `agent-skill`'s own ceiling while adding four statements; if it now exceeds
      it, say so rather than quietly passing.

## 7. The sweep

Depends on all of the above.

- [x] 7.1 Grep for `scope.ts`, `looksLikeHandle`, `HANDLE_SHAPE` and `RESOLVE_SCORE_THRESHOLD` across
      `src/`, `test/`, `plugin/` and the measurement notes; confirm every match is deliberate. The notes
      are in the list because two of them name the ranker's constants and the eval runner imports
      `dist/index/rank.js`. Grep also for a prefix
      minimum left behind on the catalogue path — a `length >=` guarding a `prefix` option — and confirm
      the only one remaining is `src/resolve/stores.ts`'s own, which this change does not touch.
- [x] 7.2 Run `npm test` and report the output as it is.
- [x] 7.3 Run `npm run eval` and confirm it reports what it did before the change, to the digit.
- [x] 7.4 Run the catalogue and product commands against the live server and read the output, not the
      exit code. Include a one-character and a two-character text, which the dropped prefix minimum
      newly admits.

## Review checklist

These are properties the finished code must hold. Check them against the code, not against the task
list above.

### The matcher

- [x] The matching carries no absolute score threshold, no count divided by the table's size, and no
      constant that never changes an answer. Find each comparison and check its two operands.
- [x] Nothing in the matcher tries to judge what a text means. No stopword list, no rule about which
      words count, no minimum number of matched terms.
- [x] Tokenization is by word, not by character fragment. A value sharing a fragment but no word with a
      title returns no candidate at all — not a low-scoring one.
- [x] A one-record table returns its record for a value that names it. A test exercises it.
- [x] The same values reach the same outcomes against a 17-record table and a several-hundred-record
      one. A test exercises both, not one.
- [x] The exact-handle probe runs before the matcher, and belongs to the kind rather than to the shared
      policy — each entity module carries its own, reading its own table by its own handle forms. A test
      names a real slug and asserts it resolves; that test fails if the probe is moved after the
      matcher, because a slug matches no word of its own title.
- [x] Each kind's matching is callable on its own, against a table of that kind alone, without
      importing another kind's module. Three matchers that currently agree is the intended outcome, not
      a duplication to be folded up.
- [x] `expandTerm` is not called on a catalogue query, and is still called on a product term.
- [x] Nothing from `stores.ts` beyond the word tokenization, prefix matching and the OR combination was
      copied — and of prefix matching, the rule but not its constant. No catalogue title is normalized
      before indexing.
- [x] **The matcher carries no constant.** No minimum length is required of a word before it matches by
      prefix; there is no fuzzy option and no relative floor. Find every number in the matching and
      account for it, or find none. A category is indexed under its title, its handle's words and its
      transliteration, with both `г` spellings and both apostrophe treatments; a kind whose handle
      carries no such spelling does not index one.
- [x] A one-character and a two-character text reach every record whose title carries a word beginning
      with them, and are offered rather than chosen. A test exercises a text below the length the
      rejected minimum would have required.
- [x] A candidate is used without asking only where every word of the value is accounted for by it.
      A test exercises a two-word value matched on one word settling to ask. Each of those was measured, and the measurement record says so with the branch,
      delivery type and slot. Not in a source comment — `src/` carries none.
- [x] **No pruned handle reaches a record outside its own subtree without asking, and no kept title
      auto-resolves to a record outside its own subtree.** A pruned record reaching a kept relative and
      a title resolving to its own descendant are both counted separately and neither counts against
      this; the second is what `catalog-browsing` requires. The rate of the ones that do is stated in
      the measurement record with the branch, the delivery type and the slot. No count of a set's size
      is a criterion here: the tables change between one day and the next, and a number that cannot be
      reproduced cannot be a property of the code.
- [x] `RESOLVE_SCORE_THRESHOLD` appears nowhere, and `AUTO_SCORE_THRESHOLD` is the only threshold left.

### The product path

- [x] `src/index/rank.ts` is byte-identical to what it was before this change. Diff it. The catalogue
      decides its own outcome in its own module, so nothing about `settle`, `SettleOptions` or
      `AUTO_SCORE_THRESHOLD` needed to move.
- [x] `npm run eval` reports what it reported before the change, to the digit.
- [x] `src/commands/products.ts` behaves exactly as before: its options, its unions, its intersections,
      its sorts, its messages and its own call to `settle` over the product corpus. Only its imports
      moved.
- [x] `src/daemon/fill.ts` is untouched.

### The guard

- [x] `HANDLE_SHAPE` and `looksLikeHandle` appear nowhere.
- [x] No test asserts on the shape of a value. A test that would pass if the guard were reinstated is
      testing the wrong thing.
- [x] `--category granat-4794` fails, and `--category pet-nat` resolves, both checked live.

### The modules

- [x] No module holds two entities. A matching across kinds is still unwritable.
- [x] No resolver settles an outcome and no resolver renders text. Each entity module answers with the
      records of its kind most relevant to a value, most relevant first, and stops there.
- [x] The outcome decision exists once, in `src/commands/products.ts`, the only command that decides.
      The rendering lives in the command that prints it. `resolution.ts` does not exist.
- [x] The fields and the exact-handle probe exist **once per kind**, in that kind's own module. A module
      holding a matcher for a kind that is not its own is a defect.
- [x] The only thing shared across the three kinds is the search mechanism in `matching.ts` — an index
      over the fields it is handed, a search, a drop of what did not match, an ordering by relevance. It
      names no kind, settles nothing and prints nothing.
- [x] Each kind reads its own data. Nothing sits above the three kinds fetching on their behalf, and
      there is no `catalog.ts`. The modules are named in the plural — `categories.ts`, `promotions.ts`,
      `sets.ts`.
- [x] A command reads only the kinds it names. `products find --category` issues no promotions call and
      no sets call; a test asserts it rather than the code merely looking that way.
- [x] The listing issues the three kinds' reads together, not in turn — one `Promise.all` over the three
      readers, not three awaits in sequence. Check this against the code. A test that proves it by
      failing one read and reading back which calls a fake server recorded is racy and is not wanted.
- [x] Each entity's read and its most-relevant function are separately callable, and a matching test
      matches against a table built by hand without importing a command.
- [x] No import cycle.

### The output

- [x] A matched category's subtree is printed to its full depth, and a test exercises three levels
      rather than two.
- [x] A descendant at any depth carries slug, title and count and no path.
- [x] The page size bounds how many records matched and cuts no subtree.
- [x] No subtree is printed twice under a matched ancestor and a matched descendant.
- [x] The order is fixed in one place, and no group's position depends on how many records it holds.
- [x] The golden shows promotions, then the hierarchy, then the sets.
- [x] No assertion in `test/catalog.test.ts` still relies on the categories group being first, the
      explicit order assertion included.
- [x] The command's help text says what the command now does.
- [x] The skill names the same order the renderer prints, states the language, states that a text
      sharing no word returns nothing, states what the search matches and that a query is built from
      the catalogue's own words, and states that the whole subtree is printed.
