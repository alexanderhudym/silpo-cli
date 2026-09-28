# list-resolution

## MODIFIED Requirements

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

`шт` following a number SHALL be read as the unit that number is counted in, and SHALL NOT reach the
term. It names no product, so searching for it narrows nothing and widens the probe expansion by a
word every product could carry: with it in the term, `яйця курячі 10 шт` was searched as
`яйця курячі шт` and answered among its candidates with a chicken drumstick.

A number written in pieces SHALL NOT be read as a quantity by the parser. `яйця курячі 10 шт` names
the pack a carton comes in and `авокадо 2 шт` names how many to buy, and the two are written
identically — nothing in the text separates them, so the parser SHALL carry the number and leave the
reading to the product.

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

### Requirement: A specification mismatch blocks auto

Where an item named a specification and the top candidate does not match it, the item SHALL NOT
resolve to auto, whatever its score. It resolves to ask.

A quantity SHALL never block auto: it is how much to buy, not which product to buy.

A mass written beside a term that resolves to a product sold by weight SHALL be read as the quantity
of that product to buy, in kilograms, and SHALL NOT be compared against a pack. Such a product
carries no pack size, so read as a specification the mass matches nothing and every term carrying one
resolves to ask — which left no way to ask for half a kilogram of anything, and made a separate
quantity write the only channel there was. Grams SHALL be converted by division, a kilogram being a
thousand of them: scaling by a reciprocal lands 950 g on 0.9500000000000001 kilograms, and that is
what would be sent to the server.

A volume written beside a product sold by weight SHALL remain a specification, and SHALL go on
blocking auto: a product sold by the kilogram is not sold by the litre, and the two are not the same
quantity written differently.

A number written in pieces SHALL be read against the product the term resolved to, the same way. Where
the product's own pack is that many pieces, the number named the pack and one of it SHALL be bought;
anywhere else it is how many to buy. Read as a count unconditionally, `яйця курячі 10 шт` ordered ten
cartons of ten — measured, it took a basket to 4795 UAH before the caller caught it. A count SHALL
never block auto: whichever of the two readings applies, both are amounts rather than descriptions of
which product.

#### Scenario: The percentage does not match

- **WHEN** the item is `молоко 1%` and the top candidate is 2.5%
- **THEN** the item resolves to ask, regardless of score

#### Scenario: A mass beside a weighted product is how much to buy

- **WHEN** the item is `куряче філе 300 г` and the top candidate is sold by the kilogram
- **THEN** the item resolves automatically and 0.3 is written as its quantity

#### Scenario: A mass beside a packaged product still names a pack

- **WHEN** the item is `молоко 950г` and the top candidate is a 950 g carton
- **THEN** the pack matches and the item resolves automatically with a quantity of one

#### Scenario: A volume beside a weighted product matches nothing

- **WHEN** the item is `молоко 500мл` and the top candidate is sold by the kilogram
- **THEN** the item resolves to ask, the volume having named a pack the product does not carry

#### Scenario: A count matching the product's own pack named the pack

- **WHEN** the item is `яйця курячі 10 шт` and the product it resolves to is a carton of ten
- **THEN** one carton is bought, not ten

#### Scenario: A count the product's pack does not carry is how many to buy

- **WHEN** the item is `авокадо 2 шт` and the product it resolves to is sold singly
- **THEN** two are bought

### Requirement: The outcome prints names, and identifiers only where a decision is owed

A resolution SHALL print, for the items it resolved automatically, the product names and prices,
compactly, one line each — because the caller has to report them to a person.

Each such line SHALL name the term it answers, as the parser made it. Without it the settled list is
a set of products in an order of its own, and which item of the list produced which match cannot be
recovered: a match the caller would have rejected reads no differently from one they asked for, and
the flag that overrides a match, which is keyed on the term as the parser made it, has nothing to key
on — the parser being lossy, the term cannot be guessed from the item either. Measured, this is what
let a smoked deli fillet at 679 UAH/kg answer `куряче філе` unremarked while three matches absurd on
their face were caught.

Each such line SHALL name the amount that was written wherever the product is sold by weight, and
wherever the count is not one. For a weighted product a quantity of one means a whole kilogram, and a
price printed per kilogram reads as a price tag rather than as what the line costs.

It SHALL NOT print identifiers for those items. Identifiers SHALL appear only on ask rows, where
one has to be passed back.

#### Scenario: Seventeen items resolve automatically

- **WHEN** seventeen items resolve to auto
- **THEN** their names and prices are printed
- **AND** each line names the term it answers
- **AND** no identifier appears among them
- **AND** the caller needs no further command to report what was bought

#### Scenario: A weighted match states what it weighs

- **WHEN** a term resolves to a product sold by the kilogram and one kilogram is written
- **THEN** the line states the kilogram alongside the price per kilogram

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

## ADDED Requirements

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
