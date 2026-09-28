## 1. Storage

Every schema change the rest of the work rests on, in one handover, so that no later group reopens
the store.

- [x] 1.1 Add a saved flag to the product record. Every act that settles the fact writes it: the write
      that saves a product sets it, the write that unsaves one clears it, and a reading of the saved
      products marks what it returned, the rebuild's own favourites read included — `src/index/corpus.ts`
      folds them through the plain sighting path today and must mark them instead. A reading SHALL NOT clear the flag on a product it did not
      return: the favourites tool omits an unavailable favourite from its list while still counting it
      in the total, so treating the list as the whole truth would unmark a product the caller really
      has saved. A product folded in from a search or an order SHALL NOT acquire it.
- [x] 1.2 Add storage for the static half of a product card: the attribute dictionary as the server
      spelled its keys, open rather than a fixed set of fields, and the unit the product is counted
      in. Composition, allergens and nutrition are keys within that dictionary, not columns. No price,
      no stock, no availability, no promotion.
- [x] 1.3 Add the scope cache. Categories keyed by branch; promotions and sets keyed by branch and
      delivery type, because both tools take a delivery type and a copy keyed by branch alone would
      answer a home delivery with a pickup's table. The time slot is not part of the key. Record a
      fetch time per kind with a lifetime per kind, in tables of their own rather than in the product
      record.
- [x] 1.4 Wrap every new read and write in the same degradation the store already uses: a fault marks
      the store unavailable and returns nothing rather than throwing.
- [x] 1.5 Extend the index rebuild to discard the scope cache with the products, and to leave the
      attribute rows keyed to products that survive.
- [x] 1.6 Tests, written against the store rather than against a command name, since group 4 renames
      the commands that reach it: a save marks the record without a favourites listing having been read; unsaving
      clears the flag without discarding the record; a seen product is not marked; attributes
      round-trip with the server's own keys and with a product carrying only some of them; the scope
      cache misses when the delivery type changes and hits when only the slot moves; an unreadable
      store degrades on each new path.

## 2. The ranker

- [x] 2.1 Make the rank index corpus-generic: it indexes records carrying an identifier and a name,
      and returns them scored. Products and catalogue scopes are two corpora of the same code.
- [x] 2.2 Take the result cap out of the ranker. It returns everything it scored, in order; how many
      to take is the caller's. The existing cap of eight is how many options a question offers, not
      how many records exist — move it to where the question is built and name it for that. The
      listing takes its page size and offset, the catalogue listing its page size.
- [x] 2.3 Apply a relevance floor to what the ranker returns, because trigrams combined by OR score
      almost every record above zero and an uncapped return would otherwise print a tail of noise
      behind a large page size.
- [x] 2.4 Give the scored candidate a place to carry the live state of the product the caller already
      holds — its previous price, its tiered prices, its stock and whether it is available. The state travels
      through the ranking with the record the caller attached it to; it is never read from the store
      and never written there, so the index's rule that it holds no state is untouched.
- [x] 2.5 Make the deciding policy corpus-generic alongside the index, since scope resolution and the
      listing both settle their outcome by it. The specification check it performs applies to a parsed
      shopping-list item and must not be required of a corpus that has none.
- [x] 2.6 Key the ranked corpus so that two records sharing a handle stay two records. Scope handles
      are not unique across kinds, and the resolver reports that as an ambiguity today; a corpus keyed
      on the handle alone would silently drop one of a colliding pair instead.
- [x] 2.7 Add the saved signal, weighted above having merely been seen and below purchase history.
- [x] 2.8 Add the promotion signal, read from the live state carried on the candidate, weighted above
      purchase history, applied only to candidates within a stated fraction of the top lexical score.
- [x] 2.9 Split ordering from confidence: compute the score floor and the margin between the top two
      candidates on the lexical score and the caller's own signals, before the promotion multiplier is
      applied. The promotion reorders the candidate list and enters neither threshold.
- [x] 2.10 Carry the reason for each scored candidate — promotion and its size, purchase count and
      recency, saved — as data on the result, so that a caller can print it without recomputing it.
      The branch and scope bonuses are applied and not reported.
- [x] 2.11 Report in a resolution's explanation only the signals that were actually applied. The
      explanation resolves against the index with no live call, so it never has a promotion to report;
      it must not print one as absent-but-possible either, and where it gains a live path later the
      same rule holds.
- [x] 2.12 Tests: a saved candidate outranks a seen one; a promotion reorders two otherwise equal
      candidates; a promotion cannot lift a candidate across the margin, so an `ask` stays an `ask`,
      asserted with a third candidate present so that reordering can change which pair the margin is
      taken over; a promotion outside the relevance fraction does not displace a better match; a
      resolution carrying no live state reports no promotion; a request for thirty ranked records
      returns thirty where thirty scored above the floor; a question still offers eight; two scopes
      sharing a handle survive as two candidates.

## 3. Scope resolution

- [x] 3.1 Read the branch's scope table through the cache, filling and refreshing it per kind, and
      remove the unconditional four-call read from the resolution path.
- [x] 3.2 Resolve a scope name by the shared ranker over the scope corpus, keeping the handle as an
      exact match ahead of it.
- [x] 3.3 Settle the ranking by the shared policy: one clear winner is used; candidates too close to
      separate, and a best match too weak to trust, are both printed with their kinds and handles and
      the command stops. Only a value nothing matches at all fails naming the value. A weak top is the
      policy's question outcome, and the question is answerable — printing candidates beats refusing.
- [x] 3.4 Tests: a handle resolves without reading the table from the server; a title written
      approximately resolves; two close scopes print candidates and stop; a name belonging to no scope
      fails rather than returning the least bad row, while a weak-but-present match prints candidates
      instead of failing; a second command at the same branch makes no
      catalogue call.

## 4. The product listing

- [x] 4.1 Regroup the product commands under one group: the listing, the card, and the two favourite
      writes, each named for its intent. Remove the old top-level names without leaving aliases.
- [x] 4.2 Implement selector composition: repeated selectors of one kind union, selectors of different
      kinds intersect, and a free-text query is the filter and the ordering over the resulting
      population rather than a population of its own.
- [x] 4.3 Draw a union as one listing per scope and merge, removing the duplicates the merge created.
      Draw an intersection by reading each population separately and intersecting on product identity,
      no server call taking a scope alongside the saved products or a product's alternatives.
- [x] 4.4 Carry forward the existing ceiling on records the CLI reads through and widen it to every
      such reading — a query matched over a scope, a filter over the saved products or over
      alternatives, a union, an intersection, and any population the CLI ranks. State it in the
      command's own description, not in the help of an option — an option's help names the value being
      asked for. Take it out of `--in`'s help, where it sits today. Say in the listing when it stopped
      the reading short, and say separately when an intersection had a truncated side, because such an
      intersection is a subset rather than the whole of it.
- [x] 4.5 Where the CLI orders the records itself, read to the ceiling or to the end of the population
      before cutting the page: the paging loops stop at the caller's page size today, which is correct
      only while the order is the one the records arrived in. The best ten are not the first ten read.
- [x] 4.6 Rank a listing that carries a query through the shared ranker, making no further call. Each
      received record is first merged with what the index holds for that product, so that purchase
      history and saved status reach the ranking — a record built from a payload alone carries neither,
      and ranking those would leave both signals dead in the listing and the reason row able to name
      only a promotion. The live state the payload carries rides along with it.
- [x] 4.7 Refuse the server-side sort wherever the CLI ranks, naming the conflict. Forward it only
      over a scope listing with no query — the saved products and a product's alternatives take no
      sort argument at all, and the CLI refuses it for them today. Honour the page size and offset over
      whichever ordering stands, the page size sizing the one listing rather than each query, and take
      the offset by slicing where the population's own tool offers none. Refuse it over a union too:
      the order of a union is the CLI's own merge, so a server sort cannot be honoured over it.
- [x] 4.8 Print one flat deduplicated listing: a product appears once, names the queries that matched
      it where more than one did, and the records follow the order of the queries as given. Account in
      the summary for a query that found nothing.
- [x] 4.9 Add the reason row to a raised record, naming promotion, purchase history and saved status
      only, absent where nothing raised the record.
- [x] 4.10 Where the ranking singles out one product and that product is unavailable, fetch its
      alternatives and print them below it, each marked as an alternative to it. One such lookup per
      listing, and none where no product was singled out.
- [x] 4.11 Fold every record received into the index, including those the ranking did not print and
      the alternatives fetched, after the answer has been printed. Where the listing named more than
      one scope, no single scope is recorded on a folded record.
- [x] 4.12 Tests: two scopes union and deduplicate; saved products intersect with a scope; an
      intersection with a truncated side says so; a query orders a chosen population without a further
      call; the sort conflicts with a query; a page size of ten over three queries prints ten records
      in all; one product matched by two queries prints once naming both; a single query names none;
      the reason row never names the branch or the scope; an unavailable top match brings its
      alternatives and an available one does not; unprinted records reach the index.

## 5. The static half

- [x] 5.1 Add the option that prints the static half of a card beside each product of a listing,
      reading what the store holds and fetching a card only for a product it holds nothing for.
- [x] 5.2 Take price, previous price, stock, availability and step from the listing's own payload,
      never from storage.
- [x] 5.3 Bound the fetching, state the bound in the command's description beside the reading ceiling,
      and say in the listing when the bound stopped it short.
- [x] 5.4 Keep the single card its own command, taking one handle in any of the three forms and
      sending it unchanged, and fold the attributes it fetched into the store so that a later listing
      answers from them.
- [x] 5.5 Tests: attributes already held cost no call; an unknown product is fetched once and kept; a
      product whose dictionary carries only some keys prints those; the live half comes from the
      listing; the bound is reported when reached; the card command still answers all three handle
      forms.

## 6. The catalogue listing

- [x] 6.1 Rename the scope listing for the thing it lists, and remove the old name without an alias.
- [x] 6.2 Give it a page offset alongside the page size, both taken by the CLI over the table it
      holds rather than forwarded, since the table is answered from disk and a filter needs all of it
      in hand anyway.
- [x] 6.3 Bound it by a page size that holds whether or not the caller passed one. Where no filter was
      given, state the number of scopes the branch holds beside the number printed, that being the
      same set; where a filter was given, state the number the filter matched and never the size of
      the branch's catalogue.
- [x] 6.4 Rank the listing against the filter text through the shared ranker; keep the server's order
      where no text was given.
- [x] 6.5 Read its scopes through the cache.
- [x] 6.6 Tests: the listing with no argument prints a bounded page and states the branch's total; a
      filtered listing cut short states the matched count and not the branch total; a name written
      approximately finds its scope; all three kinds still appear with their kind; a text matching
      nothing succeeds reporting so.

## 7. Filling from the cart

- [x] 7.1 Move the shopping-list fill under the cart family, named for what it does to the cart, and
      remove the top-level name without an alias.
- [x] 7.2 Route its resolution through the same ranker, the same policy **and the same population** the
      listing uses. The corpus is the union built in group 9; the fill does not consult the index
      instead of the catalogue, and the two commands are expected to agree.
- [x] 7.3 Where a resolution would be automatic and the chosen product is unavailable, fetch its
      alternatives and put them as the candidates of a question naming the unavailable product. Write
      nothing until the caller picks. Where the outcome was already a question, fetch nothing.
- [x] 7.4 Tests: the fill is reachable only under the cart; the same words give the listing and the
      fill the same population and the same order; an unavailable decisive match becomes a question
      carrying alternatives
      and writes nothing; an already-ambiguous term fetches no alternatives; the existing outcomes and
      the answer-an-ask flow are otherwise unchanged.

## 8. The skill and the harness

- [x] 8.1 Rewrite the skill's catalogue and cart entries against the new surface: thirty entries, one
      per leaf the agent drives, none naming a command that no longer exists. The cart's snapshot is
      `cart details`; the group `cart` performs no action alone and gets no entry.
- [x] 8.2 State in the skill how selectors compose, what the reason row means — including that the
      ordering prefers bought, saved and discounted products — and that an unavailable decisive match
      brings its alternatives unasked. Carry no weight, threshold or fraction.
- [x] 8.3 Update the command-name list in the benchmark harness that the isolation
      gate builds its pattern from. Without it a read-only run halts claiming the CLI was never called,
      and a leak through the new commands passes unseen. The flows and their pass criteria name no
      command and are left alone.
- [x] 8.4 Make the arm that drives the CLI rebuild the index before the flow begins, so a run exercises
      the purchase-history and saved signals instead of measuring them at zero, and record in the
      benchmark write-up that the arm driving the MCP directly has no equivalent and that this asymmetry
      is the thing being measured.
- [x] 8.5 Restate in the benchmark write-up what the measurement now compares: the new CLI against the
      raw MCP arm, the recorded arm-A figures being history rather than a target, since the surface
      they measured no longer exists.
- [x] 8.6 Run the build and the full suite and record the result.

## 9. One population for the listing and the fill

- [x] 9.1 Build the query-with-no-selector population as a union: the batch search's answer together
      with what the personal index matches for the same words, deduplicated by product identity. Both
      the listing and the fill draw it through the one function; neither builds a population of its own
      and neither consults the index instead of the catalogue.
- [x] 9.2 Carry, per candidate, whether a live payload priced it. The catalogue's answer supplies price,
      stock and availability; an index-only record supplies none, and nothing SHALL read them out of
      the index or invent them.
- [x] 9.3 After ranking and after the page has been cut, fetch the live state of the index-only records
      that reached the printed page — **by identifier**, not by re-searching the text — under a bound of
      its own, and print them from what came back. Where the bound stopped it short, say so in the
      summary. Fetch nothing for a record the ranking dropped.
- [x] 9.4 A record whose live state could not be had is printed without a price and without a stock,
      and is not printed as though the branch held none of it.
- [x] 9.5 Route the fill's resolution through the same population, completing 7.2. A candidate the
      index alone supplied and nothing priced carries no promotion and is not claimed to; where it is
      settled automatically, the cart write remains what discovers an unfillable line.
- [x] 9.6 Tests: a product the batch search does not return and the index holds is printed by the
      listing and acted on by the fill, for the same words on the same branch; its live state came from
      a by-identifier fetch and not from the index; the fetch runs only over the printed page; the bound
      is reported when it stops short; a record nothing priced prints no price. Then run the live smoke
      pass — `products find "Яйця курячі С1 Квочка"` is the case that motivated this group and must
      print the product.

## Review checklist

Properties the finished code must hold. Each is a check against the code, not a step of the plan.

- [x] The listing and the fill draw their population from one function. A second place in `src/` that
      assembles a query's candidates is a defect, and a path that reaches the index without also
      reaching the catalogue is the specific defect this group exists to remove.
- [x] No price, stock, availability or promotion is read out of the index on the union path. An
      index-only candidate that reaches the page is priced by a by-identifier fetch or printed without
      those fields.
- [x] The by-identifier fetch runs over the printed page only. A test with a ranked reading far longer
      than the page asserts the number of fetches against the page, not against the reading.

- [x] No top-level command named `search`, `browse`, `fill`, `product` or `favorite` exists, and no
      alias forwards to one. The command tree the CLI prints holds `products`, `catalog` and `cart`,
      and `cart` holds the fill.
- [x] There is exactly one construction site for the lexical index, and both the product listing and
      the cart fill reach it. A second BM25 construction anywhere in `src/` is a defect.
- [x] The ranker holds no result cap of its own. `grep` for a constant bounding what its search
      returns finds none, and a request for thirty ranked records yields thirty where thirty cleared
      the floor. The cap that remains lives where a question is built and is named for that.
- [x] The records the listing ranks are merged with what the index holds for each product. A test
      ranks a listing containing a product bought before and asserts the reason row names the purchase
      history — with the merge missing, the row can only ever name a promotion.
- [x] The live state a candidate is scored on travels on the candidate and is neither read from nor
      written to the store. A test asserts a promotion boost applies to a candidate whose stored record
      holds no price.
- [x] A favourites listing does not clear the saved flag on a product it did not return. A test lists
      favourites at a branch where a saved product is unavailable and asserts the flag survives.
- [x] The score the auto-versus-ask floor and margin are computed on has not had the promotion
      multiplier applied to it. A test constructs candidates whose margin would *open* once the
      promotion is applied — the dangerous direction, a question turning into a silent write — and
      asserts the outcome is still `ask`. Three candidates, so that reordering can change which pair
      the margin would be taken over.
- [x] The promotion signal is read from a payload field and never from the store. No query reads a
      promotion, a price or a stock out of the index.
- [x] The index schema carries no price, stock, availability or promotion column, the attribute
      storage and the scope cache included. The existing gate asserts this of one product record only;
      it needs new assertions covering the tables this change adds, and a checklist item satisfied by
      the old gate alone is not satisfied.
- [x] The scope cache lives in tables of its own, no product record gained a scope column, and a
      record folded in from a listing that named several scopes carries none of them.
- [x] The scope cache key includes the delivery type for promotions and sets. A test changes the
      delivery type and asserts the cache misses.
- [x] Read paths do not write: the listing, the card and the catalogue make no cart or favourite call.
      The folding into the index happens after the answer is written.
- [x] Every record a listing received reaches the index, including the ones the ranking dropped before
      printing. A test asserts the index count after a listing that printed fewer records than it
      received.
- [x] The reason row names promotion, purchase history and saved status, and names neither the branch
      nor the scope. Grep the row's construction for either and find nothing.
- [x] `--details` takes no price, stock, availability or step from storage; a test with a stale
      attribute row and a fresh listing asserts the printed price is the listing's.
- [x] A union of two scopes prints each product once. A test with two overlapping scopes asserts the
      count.
- [x] The ceiling on records read is stated in the command's description and in no option's help —
      `--in`'s help no longer carries it. A listing that hit it says so, and an intersection with a
      truncated side is not reported as complete.
- [x] A ranked reading does not stop at the caller's page size. A test asks for a small page of a
      population whose best match sits past that page and asserts the best match is printed.
- [x] The alternatives lookup fires only on a decisive match that is unavailable, at most once per
      listing, and nothing is written to the cart on its account.
- [x] The scope resolver refuses a name nothing ranks strongly enough for, rather than returning the
      top row. A test passes a value belonging to no scope and asserts a failure, not a listing.
- [x] The catalogue listing with no argument prints a bounded page. A test asserts the record count
      against the bound, not against the branch's scope total.
- [x] No command takes a JSON document, on any path added by this change. The existing gate walks the
      whole command tree and still passes.
- [x] `src/` carries no comments beyond the documentation-sourced markers the repository already
      allows.
- [x] The skill names thirty leaf commands, every one of which the CLI runs, with only options those
      commands accept. It carries no ranker constant, and it names `cart details` rather than `cart`.
- [x] The harness's isolation pattern matches the new command names. A dry check of the pattern
      against `silpo products find` and `silpo catalog` matches both.
- [x] The build and the full suite pass, and the run that produced the result is the one reported.
