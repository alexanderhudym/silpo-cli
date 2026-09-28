## MODIFIED Requirements

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
