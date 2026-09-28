## ADDED Requirements

### Requirement: An item resolving to an unavailable product asks with its alternatives

Where a resolution would otherwise be automatic and the product it chose is out of stock or
unavailable, the CLI SHALL fetch that product's alternatives and put them to the caller as the
candidates of a question, rather than writing a line the branch cannot fill or reporting that nothing
matched.

The CLI SHALL NOT substitute one product for another on its own. The term resolved, and it resolved
to something the branch has none of; which alternative is acceptable is the caller's judgement, and
it is exactly the judgement the question outcome exists for. The chosen-but-unavailable product SHALL
be named in the question, so the caller learns what was found as well as what is offered instead.

The lookup SHALL happen only where the resolution was decisive. Where several candidates were already
close enough to put a question, the question is put with those candidates and no alternatives are
fetched: there is no single product to find alternatives to, and the caller is already being asked.

Availability SHALL be taken from wherever the resolution can see it, and the index is not one of those
places — it holds no stock by its own requirement. Where the chosen record came from a live payload,
that payload says whether the branch has the product and the question is put before anything is
written. Where the chosen record was one the index alone supplied and nothing priced it, nothing knows
until the cart write answers, and the write already reports a line the branch cannot fill: that report
SHALL open the same offer, so such a resolution reaches it one step later rather than not at all.

The alternatives put into a question SHALL be bounded to the number of options a question offers.
Pricing a candidate costs a call apiece, so an unbounded list of alternatives would turn one
unavailable item into as many calls as the branch has substitutes for it.

#### Scenario: The named product is out of stock

- **WHEN** a term resolves decisively to one product and the branch has none of it
- **THEN** that product's alternatives are fetched and put to the caller as the candidates of a
  question, with the unavailable product named

#### Scenario: An unavailable product found only by the cart write

- **WHEN** a term resolves decisively to a record the index alone supplied and the cart write reports
  the line unfillable
- **THEN** that product's alternatives are offered as a question, the same offer a live listing would
  have made before writing

#### Scenario: More alternatives than a question offers

- **WHEN** a branch stocks many alternatives to an unavailable product
- **THEN** the question offers no more of them than it offers options for any other item, because each
  costs a call to price

#### Scenario: Nothing is substituted silently

- **WHEN** alternatives are offered for an unavailable product
- **THEN** nothing is written to the cart until the caller names one

#### Scenario: An ambiguous term is not given alternatives

- **WHEN** a term already resolves to a question because its candidates stand too close together
- **THEN** those candidates are put to the caller and no alternatives are fetched

#### Scenario: An available product is resolved as before

- **WHEN** a term resolves decisively to a product the branch can supply
- **THEN** the resolution is automatic as before and no alternatives are fetched

### Requirement: A promotion orders candidates and never decides one

A promotion SHALL raise a candidate above the candidates it is otherwise comparable to, and SHALL be
weighted above the caller's own purchase history.

It SHALL enter the ordering of candidates only. The thresholds that separate an automatic resolution
from a question — the floor a top score must clear and the margin it must hold over the second — SHALL
be computed on the lexical score and the caller's own signals, before any promotion has been applied.

This is what keeps one ranker honest in two commands. A promotion may put the discounted one of two
equivalent products first, and where the resolution was going to be automatic anyway that product is
what gets written — which is the intended behaviour and in the caller's interest. What a promotion
SHALL NOT do is change whether the caller is asked at all: it cannot lift a candidate past the margin
and so turn a question into a silent cart write.

The margin SHALL be taken over the two highest candidates by that pre-promotion score, and not over
whichever two the promotion left at the top. Reordering can change which pair stands first, and a
margin measured over the reordered pair would let the promotion decide the outcome by the back door.

The boost SHALL apply only to candidates within a stated fraction of the top lexical score, so that a
discounted product of another kind cannot displace a plainly better match for what the caller wrote.

The signal SHALL be read from the payload that priced the candidate — its previous price and its
tiered prices — and SHALL cost no call of its own. Where a candidate was supplied by the index alone
and nothing priced it, no promotion is known, because the index holds no price by its own
requirement, and none SHALL be applied or claimed.

#### Scenario: Two equivalent candidates, one discounted

- **WHEN** two candidates score alike on the text and on the caller's history, and one carries a
  promotion
- **THEN** the discounted one is printed first

#### Scenario: A discount cannot change which pair the margin is taken over

- **WHEN** three candidates are ranked and a promotion lifts the third above the other two
- **THEN** the margin is still measured between the two highest by the pre-promotion score, and the
  outcome is what it would have been with no promotion at all

#### Scenario: A discount cannot answer a question

- **WHEN** two candidates stand close enough that the margin rule would put the choice to the caller
- **AND** one of them carries a promotion
- **THEN** the choice is still put to the caller, because the margin was computed before the
  promotion was applied

#### Scenario: A discount cannot outrank a better match

- **WHEN** a discounted product matches the term far less well than an undiscounted one
- **THEN** the better match ranks first, the discounted one having fallen outside the fraction the
  boost applies within

#### Scenario: A candidate nothing priced

- **WHEN** a candidate reaches the ranking from the index alone, the catalogue's answer having not
  carried it and nothing having fetched its live state
- **THEN** no promotion is applied to it, and the explanation of that resolution does not name one

## MODIFIED Requirements

### Requirement: Candidates are ranked lexically over the product name

Ranking SHALL be lexical and SHALL score one field only: the product's name. The score SHALL be a
BM25 score over character trigrams of that name, computed for the term as written and for every
Ukrainian equivalent the dictionary expanded it into.

There SHALL be one ranker, and the product listing SHALL use it. The same corpus, the same lexical
scoring and the same signals SHALL answer both, so that a change to how products are matched changes
both at once and neither can drift into being the smarter path. What differs between them is what
they do with the ranking — one lists, the other decides — and nothing else.

There SHALL be no weighting across fields, because there are no other fields: the catalogue names no
brand and no category on a product. The brand is nevertheless matched, because it sits inside the
name — `Молоко ультрапастеризоване Яготинське 2,5% тетра 950г` carries `Яготинське` in the only field
there is — and trigrams over the name reach it. What is lost is not the brand as a matchable string
but the brand as a field of its own, which cannot be weighted because it does not exist.

Further signals SHALL adjust the lexical score:

- the caller's own history SHALL raise a candidate in proportion to how often and how recently it was
  bought;
- a product the caller has saved SHALL be raised, and SHALL be raised by more than a product the
  caller has merely been shown, saving being a choice and seeing not;
- a promotion SHALL raise a candidate under the rule stated separately for it;
- presence at the cart's current branch SHALL raise it slightly.

Where a record happens to carry a category slug and that slug matches the scope the caller named, the
candidate MAY be raised by a weak boost. That boost SHALL NOT be part of the core formula: a record
without a category slug SHALL be ranked and SHALL be eligible for every outcome, and the boost SHALL
never be large enough to lift a weaker name match over a stronger one.

The ranker SHALL be indifferent to what its records describe, so that a corpus of catalogue scopes is
ranked by the same code and settled by the same policy as a corpus of products. What a record holds
beyond an identifier and a name SHALL be the caller's concern rather than the ranker's, the live
state of a product included: where the caller holds a price or an availability, it travels with the
record it belongs to and is never read from or written to the index.

How many candidates the ranker returns SHALL be the caller's to say, and SHALL NOT be fixed inside
it. How many a question offers is a different number from how many a listing prints, and one figure
serving both would either make a question unreadable or make a listing shorter than the page that was
asked for. The ranker SHALL return what cleared the relevance floor, in order, and each caller SHALL
take what it needs.

#### Scenario: History separates two equal lexical matches

- **WHEN** two candidates score alike on the text
- **AND** one has been bought before
- **THEN** the bought one ranks first

#### Scenario: A saved product outranks a seen one

- **WHEN** two candidates score alike on the text and neither has been bought
- **AND** one of them is saved by the caller
- **THEN** the saved one ranks first

#### Scenario: A brand written in the term matches inside the name

- **WHEN** the item is `молоко яготинське`
- **THEN** candidates whose name contains `Яготинське` outrank candidates whose name does not
- **AND** no field other than the name was consulted to reach that order

#### Scenario: The listing and the resolution agree

- **WHEN** the same term is ranked for a product listing and for a shopping list, against the same
  branch and the same index
- **THEN** both were given the same records, the catalogue's answer together with what the index
  holds
- **AND** the order is the same, both having been produced by the one ranker

#### Scenario: A listing and a question take different amounts

- **WHEN** a listing asks for thirty ranked records and a question is built from the same ranking
- **THEN** the listing is given thirty where thirty cleared the floor, and the question offers the
  smaller number of options a question offers

#### Scenario: A corpus that is not products

- **WHEN** the catalogue's scopes are ranked against a name
- **THEN** the same ranker scores them and the same policy settles the outcome

#### Scenario: A record with no category is not disadvantaged

- **WHEN** two candidates match the name equally well and only one carries a category slug
- **THEN** both are ranked and both remain candidates
- **AND** the category boost alone does not decide between them where the caller named no scope
