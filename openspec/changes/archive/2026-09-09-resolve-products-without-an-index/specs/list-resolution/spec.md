## MODIFIED Requirements

### Requirement: Every ask is answered in one further call

Ask rows SHALL be answerable together, in a single call naming an answer per term. Nothing SHALL
require one call per ambiguity.

An answer SHALL be one of three things. **A chosen candidate**, named by the identifier the server
issued for it — the CLI SHALL NOT mint an identifier of its own. **What the branch holds**, where the
ask was that the branch holds less than the item asked for, taking the shortfall as accepted.
**The alternatives**, where the ask was the same, taking what the branch holds and making the
difference up from the products offered beside it. The second and third are not candidates, so the
answering form SHALL NOT require every answer to name one.

The answering call SHALL carry the whole original list as well as the answers. The list is the
carrier: it is what tells the CLI the quantity and the specification each answered term was written
with, none of which an answer names. An answer SHALL therefore be written with the quantity its term
carried in the original list, not with a quantity of one and not with a quantity the answer has to
restate — except where the answer is that the branch's stock is accepted, which names its own
quantity by naming what is there.

Because the list is repeated, the answering call SHALL re-resolve every item in it. An item the first
call already wrote to the cart SHALL be a no-op on the second: it SHALL NOT be written again, its
quantity SHALL NOT be added to, and the cart SHALL hold what it held after the first call. The CLI
SHALL NOT require the caller to strip resolved items out of the list before answering.

#### Scenario: Three asks are answered

- **WHEN** three terms came back as asks
- **AND** the caller repeats the original list and names an answer for each in one call
- **THEN** all three are written to the cart in one cart write

#### Scenario: A picked term keeps the quantity it was written with

- **WHEN** the original list contained `молоко 2` and it came back as an ask
- **AND** the caller repeats the list and picks a candidate for `молоко`
- **THEN** two packs of the picked product are written
- **AND** the quantity came from the list, not from the pick

#### Scenario: An answer that names no candidate

- **WHEN** an item came back asking because the branch holds one of a product and three were asked
  for, and the caller answers that what the branch holds is enough
- **THEN** one is written, the answer having named no product, and the command does not require an
  identifier it was never given

#### Scenario: Re-sending an already resolved item writes nothing

- **WHEN** a list of ten resolved to seven auto and three ask
- **AND** the whole list of ten is sent again with answers for the three
- **THEN** only the three answered items are written
- **AND** the seven already in the cart keep the quantities the first call gave them

## ADDED Requirements


### Requirement: Candidates are ranked over stemmed words of the name and the shop's own handle

Ranking SHALL be lexical and SHALL score the product's name and the words of its slug — the slug
split on its hyphens with the numeric tail dropped — those being the two spellings the shop itself
publishes for a product. No other field SHALL be scored, the catalogue naming no brand and no
category on a product. A brand is nevertheless matched, because it sits inside the name.

**Terms SHALL be matched as stemmed words, not as fragments.** Both the query and the text being
searched SHALL be reduced to word stems, and a word SHALL match a word. There SHALL be no character
n-grams, no prefix matching, no matching of one word inside another, and no folding of one letter
into another. Each of those was measured and each cost more than it returned: a trigram boost sweep
decreases monotonically, its best value always being none; sub-word matching scores 260 against 261
overall while inverting the sense of Ukrainian's inner prefixes `не-`, `без-`, `напів-`, `слабо-` and
`мало-`; folding и/і/ї, е/є and г/ґ is zero or negative on every set, including one built to favour
it.

The stemming SHALL be rule-based, SHALL strip inflection rather than truncate, and SHALL carry no
constant fitted to any corpus. Truncating every word to a fixed width was measured as its equal on
accuracy — three cases in 703, a 95% interval spanning zero — and is refused because the width is
such a constant, because it is the identity function for a quarter of the vocabulary, and because it
merges words that share nothing but a beginning.

**The ranking SHALL reorder and SHALL NOT remove.** A candidate the catalogue returned SHALL remain a
candidate whether or not the matching accounted for it. The matcher has no dictionary, no morphology
beyond its stemmer and no knowledge of transliteration, all of which the catalogue resolves, so it
SHALL NOT be permitted to discard what it failed to understand.

The order SHALL be built from what is already known without a further call: first, how many of the
term's expansions returned the candidate; then, within one such level, the position the catalogue
gave it, which is the best of the positions its expansions returned it at; and the size of one
package, where the payload states it, MAY scale the order and SHALL NOT exclude anything from it.

No score the matcher computes SHALL order the candidates. The matcher establishes which of a term's
words a candidate accounts for and nothing else: a score computed over the candidates of one query
is the measure the requirement below forbids, and reading it here would reintroduce by the back door
what that requirement removes by the front.

**No inverse document frequency SHALL be computed over the candidates of one query.** The candidates
of a query are the products that matched some part of it, so the frequency of the query's own words
approaches the whole of that set: the measure collapses for the terms that matter and rises for
incidental ones such as a weight or a brand, and the order comes to be driven by the least relevant
words in a name. A stable background corpus would answer this and SHALL NOT be introduced, being
state of exactly the kind this capability no longer keeps.

**No signal SHALL be drawn from a stored record of the caller.** Neither what the caller has bought,
nor what they have saved, nor which branch a product was seen at, nor which category it belongs to,
SHALL adjust the order. Measured as such a boost, purchase history moved one candidate in 221 and
moved it wrongly. Where the caller's own purchases decide anything, it is under the requirement that
settles a term, at the point where the order has already run out.

**Nor SHALL a promotion adjust it.** That a product is discounted says nothing about whether it
answers the term, and measured as a multiplier over the whole pool it replaced correct answers with
wrong ones — a still water at 35 UAH by an imported one at 179, plain butter by garlic butter. A
promotion decides only under the requirement that settles a term, on the same footing and for the
same reason as the caller's own history.

There SHALL be one matcher per corpus, and every command that reaches that corpus SHALL use it. The
shopping list and the product listing SHALL be answered by the one product matcher, over the same
population, the same scoring and the same order, so that a change to how products are matched changes
both at once and neither can drift into being the smarter path. What differs between them is what
they do with the ranking — one lists, the other decides — and nothing else.

Where a domain holds several corpora that are not alternatives to one another, each SHALL carry its
own matcher rather than one matcher serving them all. The catalogue is such a domain: a category, a
promotion and a curated set are read from different calls, carry different fields and are published
under different handles, so one index over all three would fix a single field set and a single
configuration for three corpora.

The product matcher SHALL be indifferent to what its records describe beyond an identifier and the
text it scores. What a record holds beyond those SHALL be the caller's concern rather than the
matcher's, the live state of a product included: it travels with the record it belongs to.

How many candidates a matcher returns SHALL be the caller's to say, and SHALL NOT be fixed inside it.
A matcher SHALL return what it was given, in order, and each caller SHALL take what it needs.

Whatever matcher produced a ranking, the outcome SHALL follow the one policy stated below — the same
four outcomes, the same preference for asking, the same refusal to use a least bad match.

**A matcher SHALL return a ranking and nothing more.** What a caller does with that ranking — deciding
between auto, ask and miss, or listing it, or printing it — belongs to the caller and SHALL NOT be
carried by the module that matched.

**What MAY be shared between corpora is the mechanism of searching, filtering and ranking, and nothing
else.** A generic index that takes the fields it is given and the matching rules it is told to use, a
generic ordering by relevance — these carry no knowledge of any corpus and may be written once. Where
two corpora need different matching rules, the rule SHALL be a parameter of the shared mechanism
rather than a reason to write it twice.

#### Scenario: A word matches a word

- **WHEN** the term is `молоко` and a candidate is named `Шоколад молочний`
- **THEN** the candidate is not matched by the term, the stems differing, and it is not raised by any
  shared fragment

#### Scenario: Inflection does not hide a match

- **WHEN** the term is `картопля` and a candidate's name carries `картоплі`
- **THEN** both reduce to the same stem and the candidate is matched

#### Scenario: Words that merely begin alike stay apart

- **WHEN** `слабогазований`, `слабоалкогольний` and `слабосолена` are reduced for matching
- **THEN** they do not reduce to one token, and a term naming one of them does not match the others

#### Scenario: A brand written in the term matches inside the name

- **WHEN** the item is `молоко яготинське`
- **THEN** candidates whose name carries `Яготинське` outrank candidates whose name does not

#### Scenario: The shop's own handle is matched too

- **WHEN** a term names a product whose slug carries a word its name spells differently
- **THEN** the slug's words are scored beside the name's

#### Scenario: A candidate the matcher could not account for

- **WHEN** the catalogue returns a candidate for a term and the matcher accounts for none of the
  term's words in it
- **THEN** the candidate remains in the ranking, in the place the catalogue's order gives it

#### Scenario: The caller's history does not move a score

- **WHEN** two candidates match a term equally on the text and one has been bought before
- **THEN** their lexical order is the same as if neither had, the purchase deciding only where the
  requirement that settles a term admits it

#### Scenario: The listing and the resolution agree

- **WHEN** the same term is ranked for a product listing and for a shopping list, against the same
  branch
- **THEN** both were given the same records, the catalogue's answer to the same expansions
- **AND** the order is the same, both having been produced by the one product matcher

#### Scenario: A corpus that is not products

- **WHEN** a record of the catalogue is named, as the text of the listing or as the population of a
  product search
- **THEN** the catalogue's own matcher scores it, under its own matching rules, and the same policy
  settles the outcome

#### Scenario: Two corpora share a mechanism and not a rule

- **WHEN** the product matcher matches stemmed words and a catalogue matcher matches by prefix
- **THEN** both are built from the one shared mechanism, the differing rule being given to it rather
  than written twice

### Requirement: A resolution is auto, ask, warn or miss, and no number decides which

Every item SHALL resolve into exactly one of four outcomes:

- **auto** — the CLI chose, and adds it to the cart without asking;
- **ask** — candidates exist and none is safe to choose; they are printed for the caller to pick;
- **warn** — a choice was made, and something about it needs saying;
- **miss** — nothing matched, and the caller is told so.

**For a product, no numeric threshold SHALL decide between them.** A score compared against a constant
is a constant fitted to the assortment it was measured over, and the assortment changes without anyone
re-measuring it. What decides SHALL be answerable yes or no, and SHALL be answerable the same way for a
corpus of seventeen records and one of a thousand.

Where a corpus is not the catalogue's products — the catalogue's own categories, promotions and sets
are the case that exists — the rule it settles by SHALL be its own, and this change SHALL NOT alter it.
Those corpora are fixed tables a branch publishes rather than an assortment that turns over, and a
relative margin measured over one is not the fitted constant this requirement forbids. What SHALL hold
for all of them alike is the outcome policy above: the four outcomes, the preference for asking, and
the refusal to settle on a least bad match.

An item SHALL resolve to **auto** only when all of these hold:

- **Every word of the term is accounted for** in the chosen candidate, after stemming. This is what
  separates the failure that matters — a term answered by a product of another kind — from the failure
  that does not.
- **No other candidate is accounted for as fully and returned by as many of the term's expansions.**
  How many expansions returned a candidate is a whole number, so two candidates level on it are
  genuinely indistinguishable to everything the CLI can see, rather than merely close.
- **Every specification the item named is matched by it.**

Where the first holds and the second does not, the tie SHALL be broken before the caller is asked —
see "A tie between fully covered candidates is broken by what the caller buys". Only a term whose
words are not all accounted for SHALL reach **ask** on the strength of the ranking alone.

A **miss** SHALL be reachable for a value that names nothing. A matcher that answers every input with
its least bad match cannot be trusted to produce one, so the matcher SHALL be built such that a value
naming nothing matches nothing wherever it can be, and the policy SHALL catch what reaches it anyway.

A lone candidate SHALL resolve to auto where the term's words are accounted for in it, and SHALL
reach ask where they are not. Standing alone is not evidence of being right; being what the term
names is.

The policy SHALL NOT be asked to tell a name from a description of a need. A matcher that matches
words returns a record for a sentence sharing one word with it, and no rule separates that from a
short name genuinely matched: the difference is in what the text means, not in how it scored. That
judgement belongs to whoever writes the query, and `agent-skill` states the rule they need.

#### Scenario: A term fully accounted for by one candidate

- **WHEN** the term is `молоко яготинське 2.5%` and one candidate carries every word while the others
  carry one or two
- **THEN** the item resolves to auto

#### Scenario: A term answered by a product of another kind

- **WHEN** the term is `вершкове масло` and the best candidate accounts for `масло` alone
- **THEN** the item resolves to ask, whatever its position in the order

#### Scenario: No score is consulted

- **WHEN** the same two product candidates are matched against corpora of very different sizes and the
  absolute scores differ by an order of magnitude
- **THEN** the outcome is the same in both, no operand of the decision having been an absolute score

#### Scenario: A catalogue corpus keeps its own rule

- **WHEN** a category, a promotion or a set is settled from a title
- **THEN** it settles as it did before this change, by the rule its own resolver carries, and reaches
  one of the same four outcomes

#### Scenario: A value naming nothing

- **WHEN** a value names no record of the corpus it was matched against
- **THEN** the matcher returns no candidate for it, or the outcome is miss or ask, and never auto

#### Scenario: A lone candidate that does not answer the term

- **WHEN** a term returns exactly one candidate and that candidate accounts for only some of the
  term's words
- **THEN** the item resolves to ask, standing alone not being sufficient

#### Scenario: A corpus grows

- **WHEN** records that the value does not name are added to a corpus and the same value is matched
  against it again
- **THEN** the decision reaches the same verdict, no operand of it having been a count of the corpus

### Requirement: An item the branch cannot fill in full asks with its alternatives

Where a resolution would otherwise be automatic and the product it chose is out of stock or
unavailable, the CLI SHALL fetch that product's alternatives and put them to the caller as the
candidates of a question, rather than writing a line the branch cannot fill or reporting that nothing
matched.

The CLI SHALL NOT substitute one product for another on its own. The term resolved, and it resolved
to something the branch has none of; which alternative is acceptable is the caller's judgement, and
it is exactly the judgement the question outcome exists for. The chosen-but-unavailable product SHALL
be named in the question, so the caller learns what was found as well as what is offered instead.

**Where the branch holds some of the product but less than the item asked for, the item SHALL resolve
to a question of its own** rather than to an automatic line silently short of what was asked, or to a
report that the product cannot be had. The question SHALL name the product, how much of it the branch
holds and how much was asked for, and SHALL offer three answers: take what there is, take what there
is and make up the difference from the alternatives, or take a different product from the candidates
already ranked. The alternatives SHALL be fetched for this question as they are for an unavailable
product.

Writing what the branch holds without saying so would hand the caller a cart quietly short of the
list they wrote, which they discover at the till; reporting the item as unfillable would hide stock
the branch has.

The lookup SHALL happen only where the resolution was decisive. Where several candidates were already
close enough to put a question, the question is put with those candidates and no alternatives are
fetched: there is no single product to find alternatives to, and the caller is already being asked.

Availability and stock SHALL be taken from the payload that returned the candidate, which carries
both. Every candidate reaches the resolution from a call made for that resolution, so no candidate is
settled on without its stock being known, and no resolution SHALL discover an unfillable line only
after writing it.

**This SHALL NOT displace the cart write as the authority on stock.** The payload is what the branch
held when the search was answered; the write is what the branch holds when the write lands, and the
two can differ. The question put before the write is an offer made from the better information
available at the time, not a claim that the write will agree — so the rule that reduces a quantity the
branch cannot fill, and names a product it cannot fill at all, stands untouched and still fires where
the write disagrees.

The alternatives put into a question SHALL be bounded to the number of options a question offers.

#### Scenario: The named product is out of stock

- **WHEN** a term resolves decisively to one product and the branch has none of it
- **THEN** that product's alternatives are fetched and put to the caller as the candidates of a
  question, with the unavailable product named

#### Scenario: The branch holds fewer than the item asked for

- **WHEN** the item is `молоко 3` and the branch holds one of the product the term resolved to
- **THEN** the item resolves to a question naming the product, the one in stock and the three asked
  for, offering to take the one, to take the one and make up two from the alternatives, or to choose
  another product

#### Scenario: Enough of the product is in stock

- **WHEN** the item is `молоко 3` and the branch holds three or more of the product the term resolved
  to
- **THEN** the resolution is automatic and no question is put

#### Scenario: Nothing is substituted silently

- **WHEN** alternatives are offered for an unavailable product, or to make up a shortfall
- **THEN** nothing is written to the cart until the caller names one

#### Scenario: An ambiguous term is not given alternatives

- **WHEN** a term already resolves to a question because its candidates could not be told apart
- **THEN** those candidates are put to the caller and no alternatives are fetched

#### Scenario: Stock is known before anything is written

- **WHEN** a term resolves decisively
- **THEN** the stock of the product it resolved to was carried by the payload that returned it, and
  the question, if there is one, is put before the cart write

### Requirement: A tie between fully covered candidates is broken by what the caller buys

Where two or more candidates account for every word of a term and are returned by as many of its
expansions, the ranking has run out of evidence: the candidates are the same kind of thing, and the
question is which of them the caller meant. The CLI SHALL settle it in this order, and SHALL NOT ask:

1. **A candidate the caller has bought before.** The caller's online orders and in-store receipts
   SHALL be read, and a candidate they name SHALL be chosen.
2. **A candidate the caller has saved.** The saved products SHALL be read, and a candidate among them
   SHALL be chosen.
3. **A candidate the shop is promoting.** A candidate whose payload states a price it was previously
   sold at, or a special price, SHALL be chosen over one the shop is selling at its ordinary price.
   This SHALL cost no call: the promotion is already carried by the record the search returned, so
   unlike the two steps above it is free wherever the tie arises.
4. **The candidate the catalogue put first.** The shop's own order is the only remaining evidence of
   what people buy, and the CLI holds nothing better.

This SHALL apply only where every tied candidate accounts for the term in full. A candidate that does
not answer the term SHALL NOT be reachable by any of the four, so neither a history nor a promotion
can substitute one kind of product for another; the worst this rule can do is choose the wrong one of
several right answers.

**Why a promotion is admissible here and not as a boost.** Measured as a multiplier over the whole
candidate pool it converted correct answers into wrong ones, because a multiplier lifts candidates
that do not answer the term at all — that is how a still water at 35 UAH came to be replaced by an
imported one at 179, and plain butter by garlic butter. A tie-break cannot do this: every candidate
it chooses among already accounts for the term in full, so the substitution the measurement caught is
structurally unreachable. The same argument admits the caller's history one step above, and it is the
only argument that admits either.
Measured as a boost over a whole candidate pool, where it could reach candidates that did not answer
the term, the caller's history moved one candidate in 221 and moved it wrongly — which is a
measurement of that mechanism and not of this one.

Asking instead was considered and refused. A term of one broad word ties among dozens of products at a
large branch — measured, 47 of them contain every word of `молоко` — and it is the commonest way an
item is written on a real list. A question there asks the caller to choose between things that all
answer what they wrote.

The reads SHALL be made when the search is made, alongside it and not after it, so that a term that
ties costs no extra round trip. They SHALL be bounded at five pages each. Nothing they return SHALL be
kept once the command has finished.

Where the reads fail or return nothing, the rules below them SHALL answer, and the resolution SHALL
NOT fail for want of a history. The promotion rule SHALL remain available in that case, being read
from the record the search already returned rather than from any call that could fail.

#### Scenario: A broad term the caller has bought before

- **WHEN** the term is `молоко`, many candidates account for it in full, and one of them appears in
  the caller's order history
- **THEN** that one is chosen and the item resolves automatically

#### Scenario: A broad term the caller has never bought

- **WHEN** the term is `молоко`, many candidates account for it in full, and none appears in the
  caller's history or saved products, and none is being promoted
- **THEN** the candidate the catalogue returned first is chosen and the item resolves automatically

#### Scenario: A tie the shop is promoting one side of

- **WHEN** the term is `молоко`, several candidates account for it in full, none appears in the
  caller's history or saved products, and one of them carries a previous price or a special price
- **THEN** the promoted one is chosen and the item resolves automatically

#### Scenario: A promotion does not outrank what the caller buys

- **WHEN** one tied candidate is in the caller's order history and a different tied candidate is
  being promoted
- **THEN** the one the caller has bought is chosen, the history being the earlier rule

#### Scenario: History cannot reach a candidate that does not answer the term

- **WHEN** the caller has bought a product that accounts for only part of the term
- **THEN** it is not chosen by this rule, having never entered the tie

#### Scenario: A promotion cannot reach a candidate that does not answer the term

- **WHEN** a discounted product accounts for only part of the term and an undiscounted one accounts
  for all of it
- **THEN** the undiscounted one is chosen, the discount having never entered the tie

#### Scenario: The history reads do not wait on the search

- **WHEN** a list is resolved
- **THEN** the order history, the receipts and the saved products are requested at the same time as
  the catalogue search rather than after a tie is found

#### Scenario: An account with no history at all

- **WHEN** a term ties and the account has no orders and no saved products
- **THEN** the catalogue's own order settles it, and nothing fails

### Requirement: A list is searched in one round of calls

A list SHALL be resolved in one round of searches. Every item SHALL be expanded in full before
anything is sent, and everything the expansion produced SHALL travel together, batched into as few
calls as the server's limit on one call allows, every call issued at the same time rather than one
after another.

**Nothing SHALL be withheld from that round and sent afterwards.** A second round exists only to send
what a first deliberately held back, and holding back buys nothing: the server's limit is on how many
strings one call carries, not on how many calls are made, so expanding in full costs a call or two
more over a whole list and never a further round trip.

Withholding also costs a guarantee. The listing searches a term expanded in full; a list that
searched a reduced form of the same term would draw a different population from it, and the two paths
are required to draw the same one.

Measured, batching and issuing together deliver in six calls what searching an item at a time delivers
in forty, and take a twenty-item list from 9.4 s to 1.4 s.

An item that the round answers with nothing SHALL be a miss. Searching it again in another form was
measured to return products and no acceptable ones.

#### Scenario: Every item goes out together

- **WHEN** a list of twenty items is resolved
- **THEN** every string every item expanded into is issued at the same time, in as few calls as the
  server's batch limit allows

#### Scenario: One round and no other

- **WHEN** two of twenty items are answered by nothing
- **THEN** no further search is issued for them, every form of them having already been sent, and they
  are reported as misses

#### Scenario: A list is searched as the listing would search it

- **WHEN** the same term appears in a shopping list and in a product listing
- **THEN** the same strings are sent for it in both, so the population it draws is the same

### Requirement: Asking is preferred to choosing wrongly, and nothing is tuned

A wrong silent choice costs more than a question, because the caller discovers it at the till. Where
the rules that settle a term leave any doubt that the term was answered by the kind of thing it names,
the CLI SHALL ask.

**That preference SHALL be expressed structurally and SHALL NOT be tuned.** No constant SHALL exist
whose value could be raised to ask more often or lowered to ask less, because such a constant is set
against one assortment and is never re-measured against the next. Where a rule of this capability
admits a number, that number SHALL be one the data itself produces — a count of the expansions that
returned a candidate, a count of the term's words accounted for — and not one chosen to make a
measurement come out.

Because there is nothing to tune, there is nothing to justify by measurement, and this capability
SHALL NOT require a recorded tuning run. What SHALL be recorded instead, whenever the matching rules
change, is the rate at which a term is answered by a product of another kind, measured over a corpus
whose right answers are known independently of the matcher. That is the failure the rules exist to
prevent, and it is the one worth watching.

The measurement SHALL cover every corpus the matcher being changed serves.

#### Scenario: A term that might name another kind of thing

- **WHEN** the best candidate for a term does not account for every word of it
- **THEN** the item is put to the caller, whatever its position in the order

#### Scenario: No knob exists

- **WHEN** the rules that separate an automatic resolution from a question are read
- **THEN** no constant among them can be changed to shift the balance between the two

#### Scenario: The rate that is watched

- **WHEN** the matching rules are changed
- **THEN** the rate at which a term resolves automatically onto a product of another kind is measured
  over a corpus whose right answers are known, and recorded in the repository

## REMOVED Requirements

### Requirement: A Russian term reaches a Ukrainian catalogue

**Reason**: The catalogue resolves Russian to Ukrainian itself — `хлеб` returns Хліб — as it resolves
morphology, transliteration and typos. The dictionary was 116 hand-written pairs standing in front of
a translation the server already performs, and it was justified by the ranker having only two lexical
signals, one of which — trigrams over the name — this change also removes. A hand-kept table of a
language's grocery vocabulary is unbounded in principle and grows by hand with every word a caller
uses, which is the same objection this capability already makes to a hand-kept table of settlement
spellings.

**Migration**: A Russian term is sent to the catalogue as the caller wrote it and the catalogue
answers it. The ranking must not then discard what came back for being spelled in another language,
which is why the matcher is forbidden to remove a candidate it could not account for: measured, the
shipped ranker turned 30 of 50 valid Russian terms into a reported miss by doing exactly that.
Transliteration survives, not as a table but as an extra query sent to the server, under
`product-search` — "Batch search".

### Requirement: A cold index resolves from a live search and says so

**Reason**: There is no index to be cold. Every term is searched live, always, so the state this
requirement described — an empty store, a first run, a product never bought — is the only state there
is, and a rule distinguishing it from a warm one has nothing to distinguish.

**Migration**: The behaviour it guaranteed is now unconditional: every term reaches the catalogue,
and only an empty answer is a miss. Its second half — that the outcome says whether history or a live
search answered — is withdrawn rather than migrated. Every answer comes from a live search, so the
distinction no longer names anything, and the caller's history appears in a resolution only where it
broke a tie between candidates that all answered the term.

### Requirement: A promotion orders candidates and never decides one

**Reason**: The requirement was an elaborate guard around a signal that should not be applied at all.
It kept a promotion out of the threshold computation, took the margin over the pre-promotion pair, and
confined the boost to a fraction of the top score — three rules to stop a promotion deciding an
outcome. Measured, ordering by promotion converts correct answers into wrong ones even within those
limits: a still water at 35 UAH replaced by an imported one at 179, plain butter replaced by garlic
butter. A signal that needs three guards and still misleads is not a signal.

**Migration**: A promotion is printed on the record it belongs to, as the previous price beside the
current one, and takes no part in any order. A caller looking for what is discounted asks for it: the
product listing takes a filter for products carrying a promotion, and a promotion is one of the
populations a listing can be drawn from.

### Requirement: The thresholds are asymmetric

**Reason**: The requirement governed constants that no longer exist. It required a floor a top score
must clear and a margin it must hold over the second, and required their tuning to be measured and
recorded. Both constants are removed: the margin's ability to separate a right answer from a wrong one
was measured at an AUC of about 0.5, which is the value of a coin, and the floor was a raw score whose
meaning changed with the corpus — which this capability had already recorded as a defect, at 160.01
against 157.93 for a wrong answer and a right one in different corpora.

**Migration**: The principle survives in full, under "Asking is preferred to choosing wrongly, and
nothing is tuned", which restates the asymmetry and replaces the requirement to tune with a
prohibition on there being anything to tune. The requirement to measure survives too, pointed at the
rate that still matters: how often a term is answered automatically by a product of another kind.

### Requirement: Candidates are ranked lexically over the product name

**Reason**: The requirement specified BM25 over character trigrams of the name, and four signals
adjusting that score — the caller's history, saved products, presence at the branch and a matching
category slug. Every one of them is removed: the trigram sweep's best value is always none, and
history as a boost moved one candidate in 221 and moved it wrongly. The scenarios that survive it are
the ones asserting that history and saved products raise a candidate, which is the behaviour being
withdrawn.

**Migration**: Replaced by "Candidates are ranked over stemmed words of the name and the shop's own
handle", which keeps the one-matcher-per-corpus rule, the matcher-returns-a-ranking rule, the rule
about what may be shared between corpora and the indifference of the matcher to what its records
describe, and replaces the scoring. What history and saved products used to do to a score they now
do only to a tie, under "A tie between fully covered candidates is broken by what the caller buys",
where they cannot reach a candidate that does not answer the term.

### Requirement: A resolution is auto, ask, warn or miss

**Reason**: The requirement made an automatic resolution depend on the top candidate being "strong
enough to trust" and leading the second "by a relative margin". Both are numbers. The requirement had
already recorded that the first is not comparable across corpora — 160.01 for a wrong answer against
157.93 for a right one — and the margin was since measured at an AUC of about 0.5.

**Migration**: Replaced by "A resolution is auto, ask, warn or miss, and no number decides which",
which keeps the four outcomes unchanged, keeps the specification rule and the rule that a value naming
nothing must be able to miss, and replaces both thresholds with two questions that have yes-or-no
answers: whether every word of the term is accounted for, and whether any other candidate is accounted
for as fully and returned by as many expansions. The scale-free requirement the old text argued for is
satisfied by there being no scale at all. A lone candidate no longer resolves automatically merely for
being alone: it must also answer the term.

### Requirement: An item resolving to an unavailable product asks with its alternatives

**Reason**: The requirement described a resolution that could reach the cart write without knowing
whether the branch had the product, because a candidate could come from the index and carry no stock.
That case cannot arise: every candidate now arrives from a call made for the resolution, carrying its
stock.

**Migration**: Replaced by "An item the branch cannot fill in full asks with its alternatives", which
keeps the unavailable-product rule word for word — the fetch, the question, the named product, the
refusal to substitute silently, the bound on how many alternatives a question offers — drops the
discovered-at-the-cart-write path as unreachable, and adds the case the old requirement had no answer
for: a branch holding some of the product but less than the item asked for.
