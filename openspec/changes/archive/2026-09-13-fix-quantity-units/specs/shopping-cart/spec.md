## ADDED Requirements

### Requirement: Every quantity written to a cart is one the cart would accept

Whatever path writes a quantity to a cart line — a named intent, a shopping list resolved on the
caller's behalf, or a line reduced to what the branch can fill — that quantity SHALL satisfy the
same rules. It SHALL be greater than nothing, and where the product is sold by weight it SHALL be
a whole multiple of the step the branch sells that product in.

Held apart, the paths drifted: the list path wrote 0.5 kg of a carrot sold in steps of 0.2, and
1 kg of a sausage sold in steps of 0.35, and wrote a line holding nothing at all — every one of
which the named-intent path refuses for the same line of the same cart.

Where the two paths differ, they SHALL differ only in what they do with a quantity the rule
rejects, and the difference SHALL be the presence of a caller to correct it. A weight typed into a
named intent is refused, naming the step. A weight derived from an item on a list, or from a stock
figure the branch reported, is brought to a legal step and the change is stated, there being
nobody to retype it.

#### Scenario: A list never writes what a named intent would refuse

- **WHEN** a shopping list settles a line at some quantity
- **THEN** setting that same line to that same quantity through a named intent is accepted

#### Scenario: A reduced line is reduced to a legal quantity

- **WHEN** a line is reduced to the stock the branch reported and that stock is not a whole
  multiple of the line's step
- **THEN** the line is reduced to the largest whole number of steps within that stock

#### Scenario: A derived weight is raised where a typed weight is refused

- **WHEN** a list item names 300 g of a product sold in steps of 0.5 kg
- **THEN** the list writes 0.5 kg and says it raised the amount, while typing 0.3 for that line
  fails naming the step
