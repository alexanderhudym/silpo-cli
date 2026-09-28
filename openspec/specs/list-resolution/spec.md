# list-resolution Specification

## Purpose

Turns a shopping list written the way a person writes one into products in the cart, deciding by
itself where it can and asking where it cannot, so that the caller never reads a candidate list it
has no reason to read.

## Requirements

### Requirement: An item is parsed into a term, a quantity and a specification

An item of a list SHALL be parsed before it is matched, into three parts that are not
interchangeable:

- the **term** — what to buy;
- the **quantity** — how many of the product's own smallest sellable amount to buy;
- the **specification** — which product, where the caller named a distinguishing property: a fat
  percentage, a pack size, a pack unit.

A bare number SHALL be read as a quantity, and it SHALL count the product's step — the increment
the branch sells that product in. The step is the only unit the CLI can name for a quantity
without the caller having named one: for a packaged product it is one pack, so a bare number goes
on meaning packs; for a weighted product it is a mass, so a bare number means that many of that
mass. Read as kilograms instead, a bare number against a weighted product bought a kilogram of
bread for 169 UAH, and against an artisan loaf the caller had asked for by name.

A percentage SHALL always be read as a specification. A number carrying a mass or volume unit
SHALL always be read as a specification too, exactly as a percentage is: never as a quantity, and
never conditioned on whether a candidate happens to carry that pack. Where no candidate carries
it, the specification is simply unmatched, which blocks auto the same way a mismatched percentage
does.

`шт` following a number SHALL be read as the unit that number is counted in, and SHALL NOT reach
the term. It names no product, so searching for it narrows nothing and widens the probe expansion
by a word every product could carry: with it in the term, `яйця курячі 10 шт` was searched as
`яйця курячі шт` and answered among its candidates with a chicken drumstick.

A number written in pieces and a bare number SHALL mean the same thing. There is no reading under
which `морква 2` and `морква 2 шт` name different amounts, and a parse that distinguished them
made the bare form the larger of the two.

Where the caller named no quantity at all, the quantity SHALL be one — one step, not one
kilogram. An absent amount is not the amount one, and the difference is only invisible where the
step happens to be one.

#### Scenario: A fat percentage is not a quantity

- **WHEN** the item is `молоко 2,5%`
- **THEN** the term is `молоко`, the specification names a fat content of 2.5%, and the quantity is 1

#### Scenario: A bare number is a quantity

- **WHEN** the item is `молоко 2`
- **THEN** the term is `молоко`, the quantity is 2, and no specification is set
- **AND** no candidate is rejected for having a pack that is not two of anything

#### Scenario: A unit is always a specification

- **WHEN** the item is `молоко 950г` and a candidate carries a 950 g pack
- **THEN** the specification names a 950 g pack
- **WHEN** the item is `вода 2л` and no candidate carries a 2 l pack
- **THEN** the specification still names a 2 l pack, unmatched, and the item resolves to ask rather
  than reading 2 as a quantity

#### Scenario: A count is written with the unit it is counted in

- **WHEN** the item is `авокадо 2 шт`
- **THEN** the term is `авокадо`, the number is carried in pieces for the product to read, and `шт`
  appears nowhere in what is searched for

#### Scenario: A bare number against a weighted product counts steps

- **WHEN** the item is `морква 2` and the top candidate is sold by the kilogram in steps of 0.2
- **THEN** 0.4 is written as its quantity

#### Scenario: A bare number and a count name the same amount

- **WHEN** the items are `морква 2` and `морква 2 шт` against the same product
- **THEN** both resolve to the same quantity

#### Scenario: No quantity at all buys one step

- **WHEN** the item is `хліб` and the top candidate is sold by the kilogram in steps of 0.25
- **THEN** 0.25 is written as its quantity, not 1

### Requirement: A specification mismatch blocks auto

Where an item named a specification and the top candidate does not match it, the item SHALL NOT
resolve to auto, whatever its score. It resolves to ask.

A quantity SHALL never block auto: it is how much to buy, not which product to buy.

A mass written beside a term that resolves to a product sold by weight SHALL be read as the
quantity of that product to buy, in kilograms, and SHALL NOT be compared against a pack. Such a
product carries no pack size, so read as a specification the mass matches nothing and every term
carrying one resolves to ask — which left no way to ask for half a kilogram of anything, and made
a separate quantity write the only channel there was. Grams SHALL be converted by division, a
kilogram being a thousand of them: scaling by a reciprocal lands 950 g on 0.9500000000000001
kilograms, and that is what would be sent to the server.

A mass so converted SHALL then be raised to the nearest whole multiple of the product's step, and
the raising SHALL be stated on the line it settles. A branch that sells in steps of half a
kilogram cannot sell 300 g of anything, so the mass as written is not a quantity the cart can
hold; sending it unraised wrote quantities that the cart's own `set` refuses for the same line.
Raising rather than lowering follows the rule that the CLI never silently delivers less than was
asked for. This is a deliberate difference from a weight the caller typed into `cart set`, which
is refused rather than raised — there the caller can retype it, and here the mass was derived
from an item on a list with nobody to ask.

A volume written beside a product sold by weight SHALL remain a specification, and SHALL go on
blocking auto: a product sold by the kilogram is not sold by the litre, and the two are not the
same quantity written differently.

A number written in pieces SHALL be read against the product the term resolved to. Where that
product declares its own contents in pieces, the number named those contents and `ceil(n ÷
contents)` packs SHALL be bought: a carton of ten answers `яйця курячі 10 шт` with one carton, and
a carton of fifteen answers it with one carton too. Read as a count unconditionally, `яйця курячі
10 шт` ordered ten cartons of ten — measured, it took a basket to 4795 UAH before the caller
caught it; read as one carton only where the carton held exactly ten, a carton of fifteen ordered
ten of them and took a basket to 1199 UAH for a hundred and fifty eggs. Anywhere else the number
counts steps, as a bare number does.

Contents written in pieces SHALL be recognised wherever the payload states them, not only where
the whole field is a number and a unit and nothing else. The carton that produced the 1199 UAH
basket states `15шт/уп`, and a reading that accepts `15шт` and not that one leaves the case the
rule exists for falling through to the rule it is the exception to — which is how the reading
before it failed.

A quantity SHALL be raised to a whole number of steps before it is written, whatever named it.
Half a step is not an amount a branch sells, and a fractional count of packs is not one either.

A quantity so raised SHALL be a number the step divides exactly as the cart reads it. Multiplying
a count by a step of 0.2 lands three of them on 0.6000000000000001, which is what would be sent to
the server and is not a multiple of anything; the same hazard is already named for converting
grams, and it SHALL be answered the same way here.

Where the payload states no usable step for a product, or states one that is not a positive
number, the quantity SHALL be counted in whole units of one rather than of that step. A step of
zero multiplied by any count is nothing, and a rule that silently bought none of what was asked
for would be worse than the one it replaces.

A quantity that resolves to zero SHALL write no line, and the item SHALL be reported as one the
CLI could not fill rather than passing out of the outcome silently. The cart refuses a quantity of
zero on the same line through `cart set`; an item that left no trace in either the cart or the
report would be the one failure the caller cannot see.

A count SHALL never block auto: whichever reading applies, all of them are amounts rather than
descriptions of which product.

#### Scenario: The percentage does not match

- **WHEN** the item is `молоко 1%` and the top candidate is 2.5%
- **THEN** the item resolves to ask, regardless of score

#### Scenario: A mass beside a weighted product is how much to buy

- **WHEN** the item is `куряче філе 300 г` and the top candidate is sold by the kilogram in steps
  of 0.5
- **THEN** the item resolves automatically, 0.5 is written as its quantity, and the line states
  that the mass was raised to the step

#### Scenario: A mass that the step already divides is written unchanged

- **WHEN** the item is `яблука 2 кг` and the top candidate is sold in steps of 0.5
- **THEN** 2 is written as its quantity and no raising is stated

#### Scenario: A mass beside a packaged product still names a pack

- **WHEN** the item is `молоко 950г` and the top candidate is a 950 g carton
- **THEN** the pack matches and the item resolves automatically with a quantity of one

#### Scenario: A volume beside a weighted product matches nothing

- **WHEN** the item is `молоко 500мл` and the top candidate is sold by the kilogram
- **THEN** the item resolves to ask, the volume having named a pack the product does not carry

#### Scenario: A count matching the product's own pack named the pack

- **WHEN** the item is `яйця курячі 10 шт` and the product it resolves to is a carton of ten
- **THEN** one carton is bought, not ten

#### Scenario: A count smaller than the pack it resolves to still buys one pack

- **WHEN** the item is `яйця курячі 10 шт` and the product it resolves to is a carton of fifteen
- **THEN** one carton is bought, not ten

#### Scenario: A count larger than the pack buys as many packs as cover it

- **WHEN** the item is `яйця курячі 20 шт` and the product it resolves to is a carton of fifteen
- **THEN** two cartons are bought

#### Scenario: A count the product's pack does not carry is how many to buy

- **WHEN** the item is `авокадо 2 шт` and the product it resolves to is sold singly
- **THEN** two are bought

#### Scenario: A count against a weighted product counts steps

- **WHEN** the item is `морква 2 шт` and the product it resolves to is sold by the kilogram in
  steps of 0.2
- **THEN** 0.4 is written as its quantity, not 2

#### Scenario: A fractional count is raised to a whole step

- **WHEN** the item is `морква 1.5 шт` and the product it resolves to is sold in steps of 0.2
- **THEN** 0.4 is written as its quantity, two whole steps

#### Scenario: Contents stated with trailing text still name a pack

- **WHEN** the item is `яйця курячі 10 шт` and the product it resolves to states its contents as
  `15шт/уп`
- **THEN** one carton is bought, the trailing text not having hidden the contents

#### Scenario: A raised quantity is a number the step divides

- **WHEN** the item is `морква 3 шт` and the product it resolves to is sold in steps of 0.2
- **THEN** the quantity written is 0.6 exactly, and the step divides it as the cart reads it

#### Scenario: A product with no usable step counts whole units

- **WHEN** the item is `морква 2 шт` and the payload states a step of zero for the product
- **THEN** 2 is written as its quantity, not nothing

#### Scenario: A quantity of zero writes nothing and says so

- **WHEN** the item is `морква 0 шт`
- **THEN** no line is written for it
- **AND** the item is reported among those the CLI could not fill, not omitted from the outcome

#### Scenario: A mass against a packaged product that counts its contents

- **WHEN** the item is `яйця курячі 600 г` and the product it resolves to states its contents in
  pieces
- **THEN** the mass is a specification the product does not carry and the item resolves to ask

### Requirement: Dietary restrictions warn, they do not filter

A product that conflicts with a stored dietary restriction SHALL NOT be silently dropped from the
candidates or from the cart. It SHALL resolve as normal and carry a **warn** row naming the
restriction it touches.

Silently omitting something the caller asked for by name is a failure the caller cannot see.

#### Scenario: A restricted product was asked for by name

- **WHEN** the item names a product that conflicts with a stored restriction
- **THEN** the product is resolved and the outcome carries a warn row naming the restriction

### Requirement: The list is written to the cart in one call

Resolving a list SHALL write every auto-resolved item to the cart itself, in a single cart write.
Items that resolved to ask or miss SHALL NOT be written.

A caller that wants the resolution without the write SHALL be able to ask for it. A caller that
wants every item put to it rather than decided SHALL be able to ask for that too.

#### Scenario: A list of ten resolves to seven auto and three ask

- **WHEN** the list is resolved
- **THEN** the seven are written to the cart in one cart write
- **AND** the three are printed as ask rows, unwritten

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

### Requirement: The outcome prints names, and identifiers only where a decision is owed

A resolution SHALL print, for the items it resolved automatically, the product names and prices,
compactly, one line each — because the caller has to report them to a person.

Each such line SHALL name the term it answers, as the parser made it. Without it the settled list
is a set of products in an order of its own, and which item of the list produced which match
cannot be recovered: a match the caller would have rejected reads no differently from one they
asked for, and the flag that overrides a match, which is keyed on the term as the parser made it,
has nothing to key on — the parser being lossy, the term cannot be guessed from the item either.
Measured, this is what let a smoked deli fillet at 679 UAH/kg answer `куряче філе` unremarked
while three matches absurd on their face were caught.

Each such line SHALL name the amount that was written wherever the product is sold by weight, and
wherever the count is not one. For a weighted product a quantity of one means a whole kilogram,
and a price printed per kilogram reads as a price tag rather than as what the line costs.

Each such line SHALL state where the amount it names is not the amount the item asked for,
whatever made it so: where a mass was raised to a whole step, where a count was read as that many
steps, where a count was covered by whole packs, and where a fractional amount was raised to a
whole one. An amount the CLI chose reads identically to one the caller wrote, and the caller
cannot correct what they cannot see. Measured, a count read as kilograms went uncorrected into a
finished cart twice, and was caught by the agent only where the price was absurd enough to notice.

Where a count was covered by whole packs, the line SHALL say so even though the quantity is one
and the line therefore prints no amount at all. `яйця курячі 10 шт` answered by a carton of
fifteen buys fifteen eggs, and a line that reads exactly as a bare `яйця курячі` would is the
whole of what the caller is told about it — which is the shape of the failure that took a basket
to 1199 UAH, only quieter. Where the count is exactly the pack's contents nothing was covered
that the caller did not ask for, and the line SHALL stay silent: `яйця курячі 15 шт` answered by a
carton of fifteen is the amount that was asked for, written the way the product sells it.

Where a product's payload names no usable step, the amount SHALL still be stated as one the CLI
chose, the absence of a step being a reason it could not honour the amount as written rather than
a reason to say nothing.

It SHALL NOT print identifiers for those items. Identifiers SHALL appear only on ask rows, where
one has to be passed back.

#### Scenario: Seventeen items resolve automatically

- **WHEN** seventeen items resolve to auto
- **THEN** their names and prices are printed
- **AND** each line names the term it answers
- **AND** no identifier appears among them
- **AND** the caller needs no further command to report what was bought

#### Scenario: A weighted match states what it weighs

- **WHEN** a term resolves to a product sold by the kilogram and a whole kilogram is written
- **THEN** the line states the kilogram alongside the price per kilogram

#### Scenario: A settled weighted line names its amount

- **WHEN** an item settles on a product sold by weight
- **THEN** the line names the quantity in kilograms

#### Scenario: A raised mass says it was raised

- **WHEN** `куряче філе 300 г` settles on a product sold in steps of 0.5
- **THEN** the line names 0.5 kg and states that the mass was raised to the step

#### Scenario: A count read as steps says so

- **WHEN** `морква 2 шт` settles on a product sold by weight
- **THEN** the line names the quantity in kilograms and states that the count named steps

#### Scenario: A count covered by whole packs says so

- **WHEN** `яйця курячі 10 шт` settles on a carton of fifteen
- **THEN** the line states that the count was covered by one pack, and does not read as a line that
  named no amount

#### Scenario: A fractional amount raised to a whole one says so

- **WHEN** `молоко 1.5 шт` settles on a packaged product and two are bought
- **THEN** the line states that the amount was raised

#### Scenario: An amount chosen for want of a step says so

- **WHEN** an item names a mass against a weighted product whose payload states no usable step
- **THEN** the line states that the CLI chose the amount

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
candidates of a question. The CLI SHALL NOT substitute one product for another on its own, and
the chosen-but-unavailable product SHALL be named in the question.

Where the branch holds less of the top candidate than the item asked for, the item SHALL resolve
to ask rather than settle, and the ask SHALL carry both how much the branch holds and the ranked
alternatives that could make up the rest.

The lookup SHALL happen only where the resolution was decisive. A term whose candidates could not
be told apart is already a question, and alternatives to a product that was never chosen answer
nothing.

Availability and stock SHALL be taken from the payload that returned the candidate, so that the
question is put before anything is written rather than after a write came back short. This SHALL
NOT displace the cart write as the authority on stock: a line the branch cannot fill is still
reduced by the rule the cart states, and this lookup only spares the caller a write it can see
will not hold.

The alternatives put into a question SHALL be bounded to the number of options a question offers.

The comparison SHALL be made in the product's own unit. How much the branch holds and how much
the item asked for are quantities of the same product and SHALL be denominated the same way before
either is compared or subtracted; compared across units, a request for five pieces of a product
stocked in kilograms reported a shortfall against a branch holding fifty times what was wanted,
and the question it raised had no answer because it described nothing true.

The note SHALL name the unit on both numbers. A bare pair of numbers beside a weighted product
reads as pieces to a caller who wrote pieces, which is the reading the shortfall exists to
correct.

Where the shortfall is answered by filling the rest from alternatives, the remainder SHALL be
computed in the product's own unit, and it SHALL be carried to an alternative only where that
alternative is sold in the same unit. A remainder in kilograms means nothing to a product sold by
the pack, and carried across regardless it wrote three kilograms of pork-and-beef sausages against
a request for five chicken wings. Where no alternative is sold in that unit, the remainder SHALL
go unfilled and SHALL be reported rather than approximated.

The remainder so carried SHALL then be raised to a whole number of the alternative's own step,
which is not necessarily the short product's: two products both sold by the kilogram may be sold
in steps of 0.5 and 0.4, and a remainder legal for one is not legal for the other.

Where the shortfall is answered by taking what the branch holds, the amount written SHALL be what
is there, as the answer that names it says. Where the branch reports a stock the product's own
step does not divide, the amount SHALL be the largest whole number of steps within that stock,
that being the most of it the branch can actually sell; where that is less than one step, the
item SHALL resolve to a miss rather than write a line holding nothing.

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

#### Scenario: Stock in kilograms against a count of steps

- **WHEN** the item is `курячі крила 5 шт`, the product is sold in steps of 0.5 and the branch
  holds 2 kg
- **THEN** the item settles at 2.5 kg being beyond the stock only if 2.5 exceeds 2, both read as
  kilograms

#### Scenario: The shortfall note names its units

- **WHEN** an item resolves to a shortfall on a product sold by weight
- **THEN** both the amount held and the amount asked for are printed with their unit

#### Scenario: The remainder goes to the alternative in the alternative's own step

- **WHEN** a shortfall on a weighted product is filled with alternatives
- **THEN** the remainder written to the alternative is a whole number of that alternative's step

### Requirement: A tie between fully covered candidates is broken by what the caller buys

Where two or more candidates account for every word of a term, are returned by as many of its
expansions, and answer the term at least as well as the candidate the ranking put first, the ranking
has run out of evidence: the candidates are the same kind of thing, and the question is which of them
the caller meant. The CLI SHALL settle it in this order, and SHALL NOT ask:

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

This SHALL apply only where every tied candidate accounts for the term in full **and** matches the
term as well as the first candidate does or better. Accounting for the term in full was taken to be
enough on its own, on the reasoning that a candidate answering the term could only ever be exchanged
for another answer to the same term. Measurement falsified it. A term of one word expands to one
probe, so every candidate it returns shares a coordination of one and the whole hundred counted as
tied; and a word of the term appearing anywhere in a name makes that name account for it. Under those
two together a promoted baby purée answered `морква` over the carrot the shop had ranked first, a
promoted milk drink answered `банани` over the banana, and promoted noodles answered `рис` over the
rice. Across four errands assembling a basket from an unconstrained list this cost between 48% and
72% of the bill: the rule written to save the caller money was the one inflating it.

How well a candidate answers the term is what the matcher already scored it at, over the name and the
shop's own handle. Requiring it of every tied candidate keeps the tie-breaks reaching the several
right answers they were written for, and stops them reaching a different kind of product that merely
carries one of the words.

**What this bounds and what it does not.** The score rewards a name the term takes up more of, so a
candidate scoring above the first one is admitted rather than excluded — which is deliberate, a
shorter name answering the term more squarely being no worse an answer, and is why a promoted
`Морква` may still take a term the shop answered first with `Морква мита`. Both are carrots, and
choosing between them is what the tie-breaks are for. What remains unguarded is a product of another
kind whose name is *also* mostly the term. Nothing measured has produced one: every substitution the
sweep caught had the term as one word among several, which is what made it score below the first
candidate and what makes it off-kind in the first place. This is a bound on the rule's reach, not a
proof it cannot be crossed, and it SHALL be re-examined against any measurement that crosses it
rather than defended.

Where the reads fail or return nothing, the rules below them SHALL answer, and the resolution SHALL
NOT fail for want of a history. The promotion rule SHALL remain available in that case, being read
from the record the search already returned rather than from any call that could fail.

The reads SHALL be made when the search is made, alongside it and not after it, so that a term that
ties costs no extra round trip. They SHALL be bounded at five pages each. Nothing they return SHALL be
kept once the command has finished.

Asking instead was considered and refused. A term of one broad word ties among dozens of products at a
large branch — measured, 47 of them contain every word of `молоко` — and it is the commonest way an
item is written on a real list. A question there asks the caller to choose between things that all
answer what they wrote.

#### Scenario: A broad term the caller has bought before

- **WHEN** the term is `молоко`, many candidates account for it in full and answer it as well as the
  first does, and one of them appears in the caller's order history
- **THEN** that one is chosen and the item resolves automatically

#### Scenario: A broad term the caller has never bought

- **WHEN** the term is `молоко`, many candidates account for it in full, and none appears in the
  caller's history or saved products, and none is being promoted
- **THEN** the candidate the catalogue returned first is chosen and the item resolves automatically

#### Scenario: A tie the shop is promoting one side of

- **WHEN** the term is `молоко`, several candidates account for it in full and answer it as well as
  the first does, none appears in the caller's history or saved products, and one of them carries a
  previous price or a special price
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

#### Scenario: A promotion cannot reach a worse answer to the term

- **WHEN** the term is `морква`, the first candidate is a carrot the shop sells at its ordinary
  price, and a promoted purée carries the word `морква` in its name among several others
- **THEN** the carrot is chosen, the purée answering the term less well than it does and so never
  entering the tie

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

### Requirement: A settled item keeps the candidates it was settled from

An item the CLI resolved on its own SHALL keep the candidates it chose among, bounded as an ask's
list is bounded, so that the flag putting every resolvable item back to the caller has a list to put.

Recording only what was chosen left that flag re-asking a question with a single answer, which is no
question at all: it is the caller's only way out of a match they disagree with short of removing the
product and filling again, and measured it offered one candidate where eight existed.

#### Scenario: Every resolvable item is put back to the caller

- **WHEN** a term settles automatically among several candidates and the caller asks for every
  resolvable item to be put to them instead
- **THEN** the question carries the candidates the term settled among, not only the one it settled on
