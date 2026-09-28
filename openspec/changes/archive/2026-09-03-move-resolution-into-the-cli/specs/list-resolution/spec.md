## Purpose

Turns a shopping list written the way a person writes one into products in the cart, deciding by
itself where it can and asking where it cannot, so that the caller never reads a candidate list it
has no reason to read.

## ADDED Requirements

### Requirement: An item is parsed into a term, a quantity and a specification

An item of a list SHALL be parsed before it is matched, into three parts that are not
interchangeable:

- the **term** — what to buy;
- the **quantity** — how much of it, a count of packs;
- the **specification** — which product, where the caller named a distinguishing property: a fat
  percentage, a pack size, a pack unit.

A bare number SHALL be read as a quantity. A percentage SHALL always be read as a specification. A
number carrying a mass or volume unit SHALL always be read as a specification too, exactly as a
percentage is: never as a quantity, and never conditioned on whether a candidate happens to carry
that pack. Where no candidate carries it, the specification is simply unmatched, which blocks auto
the same way a mismatched percentage does.

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

### Requirement: A Russian term reaches a Ukrainian catalogue

The catalogue is Ukrainian and the caller may write Russian. A term SHALL be matched against a
dictionary of grocery terms that maps Russian forms to their Ukrainian equivalents, and both forms
SHALL be searched.

The dictionary is one of only two lexical signals the ranker has — trigrams over the name, and this
expansion — so a term it fails to expand is a term that reaches the catalogue in a language the
catalogue does not use, and it SHALL be treated as a defect of the dictionary rather than as a hard
case for the ranker. It SHALL therefore cover the grocery vocabulary a shopping list actually uses,
including the words whose Ukrainian form shares no stem with the Russian one, and its coverage SHALL
be measured against the terms callers have written rather than assumed.

The dictionary SHALL be data, editable without touching the ranker. Adding a mapping SHALL change
what resolves without changing how anything is scored.

#### Scenario: A Russian term with a different Ukrainian word

- **WHEN** the item is `творог`
- **THEN** `сир кисломолочний` is searched alongside `творог`

#### Scenario: An unexpanded Russian term is a dictionary gap

- **WHEN** a Russian term the dictionary does not map resolves to miss or to ask
- **THEN** the CLI can be asked why, and reports that the term was searched unexpanded
- **AND** the fix is a dictionary entry, not a change to the ranker

### Requirement: Candidates are ranked lexically over the product name

Ranking SHALL be lexical and SHALL score one field only: the product's name. The score SHALL be a
BM25 score over character trigrams of that name, computed for the term as written and for every
Ukrainian equivalent the dictionary expanded it into.

There SHALL be no weighting across fields, because there are no other fields: the catalogue names no
brand and no category on a product. The brand is nevertheless matched, because it sits inside the
name — `Молоко ультрапастеризоване Яготинське 2,5% тетра 950г` carries `Яготинське` in the only field
there is — and trigrams over the name reach it. What is lost is not the brand as a matchable string
but the brand as a field of its own, which cannot be weighted because it does not exist.

Two further signals SHALL adjust the lexical score:

- the caller's own history SHALL raise a candidate in proportion to how often and how recently it was
  bought;
- presence at the cart's current branch SHALL raise it slightly.

Where a record happens to carry a category slug and that slug matches the scope the caller named, the
candidate MAY be raised by a weak boost. That boost SHALL NOT be part of the core formula: a record
without a category slug SHALL be ranked and SHALL be eligible for every outcome, and the boost SHALL
never be large enough to lift a weaker name match over a stronger one.

#### Scenario: History separates two equal lexical matches

- **WHEN** two candidates score alike on the text
- **AND** one has been bought before
- **THEN** the bought one ranks first

#### Scenario: A brand written in the term matches inside the name

- **WHEN** the item is `молоко яготинське`
- **THEN** candidates whose name contains `Яготинське` outrank candidates whose name does not
- **AND** no field other than the name was consulted to reach that order

#### Scenario: A record with no category is not disadvantaged

- **WHEN** two candidates match the name equally well and only one carries a category slug
- **THEN** both are ranked and both remain candidates
- **AND** the category boost alone does not decide between them where the caller named no scope

### Requirement: A cold index resolves from a live search and says so

The index is empty on a first run, empty again after a rebuild, and holds nothing for a product the
caller has never bought. Resolution SHALL work in that state without a special mode and without an
instruction to the caller.

Where the index yields no candidate for a term, the CLI SHALL search the live catalogue for that
term, rank what comes back by the same rules, apply the same thresholds, and fold the result into the
index so that the next run does not repeat the search. The absence of a record SHALL NOT be a miss:
only an empty live search is a miss.

The outcome SHALL say which of the two answered. A caller SHALL be able to tell a match backed by the
caller's own purchase history from a first sighting of a product, because the two deserve different
confidence and only one of them was ever bought before.

Resolution in this state SHALL NOT be claimed to be cheaper than a search followed by a cart write:
it costs the same search, and where the ranker is not confident it costs a printed ask and a second
call on top. The saving in the cold case is narrower and SHALL be stated as what it is — the
candidate payload is read and discarded by the CLI and never reaches the caller. The saving in the
warm case, where the index answers, is the search itself.

#### Scenario: A first run resolves a list against an empty index

- **WHEN** a list is resolved and the index holds no records at all
- **THEN** every term is searched live and resolved from what the search returned
- **AND** no term misses merely because the index was empty
- **AND** the products returned are folded into the index afterwards

#### Scenario: A never-bought product resolves beside a familiar one

- **WHEN** one term matches a record the caller has bought and another matches only a live search
- **THEN** both may resolve
- **AND** the outcome distinguishes the one drawn from history from the one seen for the first time

#### Scenario: The cold case is not cheaper, only quieter

- **WHEN** a term absent from the index resolves to auto through a live search
- **THEN** the same catalogue search was made that the caller would have made
- **AND** the candidate list the search returned is not printed

### Requirement: A resolution is auto, ask, warn or miss

Every item SHALL resolve into exactly one of four outcomes:

- **auto** — the CLI chose, and adds it to the cart without asking;
- **ask** — candidates exist and none is safe to choose; they are printed for the caller to pick;
- **warn** — a choice was made, and something about it needs saying;
- **miss** — nothing matched, and the caller is told so.

An item SHALL resolve to **auto** only when all of these hold: the top candidate clears an absolute
score threshold; it leads the second candidate by a relative margin; and every specification the
item named is matched by it.

#### Scenario: A confident, previously bought match

- **WHEN** the top candidate clears both thresholds, matches the specification, and is in the
  caller's history
- **THEN** the item resolves to auto and is written to the cart

#### Scenario: Two close candidates

- **WHEN** the top two candidates are within the relative margin of each other
- **THEN** the item resolves to ask, and both are printed

### Requirement: A specification mismatch blocks auto

Where an item named a specification and the top candidate does not match it, the item SHALL NOT
resolve to auto, whatever its score. It resolves to ask.

A quantity SHALL never block auto: it is how much to buy, not which product to buy.

#### Scenario: The percentage does not match

- **WHEN** the item is `молоко 1%` and the top candidate is 2.5%
- **THEN** the item resolves to ask, regardless of score

### Requirement: The thresholds are asymmetric

A wrong silent choice costs more than a question, because the caller discovers it at the till. The
thresholds SHALL be set to favour asking, and the rate of wrong auto resolutions SHALL be the
measure the thresholds are tuned against.

#### Scenario: A borderline score

- **WHEN** the top candidate's score sits at the threshold
- **THEN** the item resolves to ask rather than auto

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

Ask rows SHALL be answerable together, in a single call naming a chosen candidate per term. Nothing
SHALL require one call per ambiguity.

A candidate SHALL be named in an ask row by the identifier the server issued for it. The CLI SHALL
NOT mint an identifier of its own.

The answering call SHALL carry the whole original list as well as the picks. The list is the carrier:
it is what tells the CLI the quantity and the specification each picked term was written with, none
of which a pick names. A pick SHALL therefore be written with the quantity its term carried in the
original list, not with a quantity of one and not with a quantity the pick has to restate.

Because the list is repeated, the answering call SHALL re-resolve every item in it. An item the first
call already wrote to the cart SHALL be a no-op on the second: it SHALL NOT be written again, its
quantity SHALL NOT be added to, and the cart SHALL hold what it held after the first call. The CLI
SHALL NOT require the caller to strip resolved items out of the list before answering.

#### Scenario: Three asks are answered

- **WHEN** three terms came back as asks
- **AND** the caller repeats the original list and names a chosen candidate for each in one call
- **THEN** all three are written to the cart in one cart write

#### Scenario: A picked term keeps the quantity it was written with

- **WHEN** the original list contained `молоко 2` and it came back as an ask
- **AND** the caller repeats the list and picks a candidate for `молоко`
- **THEN** two packs of the picked product are written
- **AND** the quantity came from the list, not from the pick

#### Scenario: Re-sending an already resolved item writes nothing

- **WHEN** a list of ten resolved to seven auto and three ask
- **AND** the whole list of ten is sent again with picks for the three
- **THEN** only the three picked items are written
- **AND** the seven already in the cart keep the quantities the first call gave them

### Requirement: The outcome prints names, and identifiers only where a decision is owed

A resolution SHALL print, for the items it resolved automatically, the product names and prices,
compactly, one line each — because the caller has to report them to a person.

It SHALL NOT print identifiers for those items. Identifiers SHALL appear only on ask rows, where
one has to be passed back.

#### Scenario: Seventeen items resolve automatically

- **WHEN** seventeen items resolve to auto
- **THEN** their names and prices are printed
- **AND** no identifier appears among them
- **AND** the caller needs no further command to report what was bought
