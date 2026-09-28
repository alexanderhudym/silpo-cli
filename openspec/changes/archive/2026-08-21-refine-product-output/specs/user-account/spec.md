## MODIFIED Requirements

### Requirement: Online order output

An online order SHALL be printed as a record holding the alias of its order id, its number,
its status, the moment it was created as local wall clock time, its amount and its discount,
its delivery type with the delivery window as local wall clock time, its address joined into
one line by the shared address conversion, and its lines as records showing the product's
alias, quantity and line total, each closing with the same keyless line of name and price a
product listing uses. An order line SHALL print its price with the currency and no unit
beyond it, because an online order line declares neither a weighted flag nor a unit and the
CLI SHALL NOT infer one from the shape of the quantity. A line the order reports as removed
SHALL say so. The product image SHALL NOT be printed.

#### Scenario: An order and its lines

- **WHEN** online orders are printed
- **THEN** each order takes a record of its own, its lines indented beneath the name of their
  group

#### Scenario: A line with no declared unit

- **WHEN** an online order line carries a fractional quantity, which is how a product sold by
  weight appears
- **THEN** its price still names only the currency, because the payload declares no field
  saying what the price is per

#### Scenario: A removed line

- **WHEN** an order line is flagged as removed
- **THEN** the line says so, because a caller reading a receipt needs to know what did not
  arrive

#### Scenario: Delivery that has not happened

- **WHEN** an order carries no delivery window or no delivery moment
- **THEN** those lines are absent rather than shown as empty

### Requirement: In-store receipt output

An in-store receipt SHALL be printed as a record holding the store's name and city, the moment
of the receipt as local wall clock time, the sum paid, the discount and the bonuses it earned,
its rewards as records, and its lines as records showing the quantity and, where the line
names the catalogue product behind it, that product's alias so it can be put in a cart, each
closing with the same keyless line of name and price a product listing uses. A receipt line
SHALL read what its price is per from the unit the payload names on that line: where the unit
is a unit of weight the price SHALL name it, where the unit names a package size that size
SHALL stand beside the name, and where the unit merely counts pieces neither SHALL be
printed. No amount SHALL be converted. The receipt's own web address SHALL NOT be printed.

#### Scenario: A receipt and its lines

- **WHEN** in-store receipts are printed
- **THEN** each receipt takes a record of its own, its lines indented beneath the name of
  their group

#### Scenario: A line priced by weight

- **WHEN** a receipt line names a unit of weight
- **THEN** its price names that unit and its quantity names it too, both as the payload sent
  them

#### Scenario: A line that names a package size

- **WHEN** a receipt line's unit names the size of one package rather than a unit of weight
- **THEN** that size stands beside the name and the price names only the currency

#### Scenario: A line that names a catalogue product

- **WHEN** a receipt line carries the catalogue product behind it
- **THEN** that product's alias is printed on the line, so the caller can buy it again

#### Scenario: Rewards

- **WHEN** a receipt carries rewards
- **THEN** each reward is printed with the text describing it and the amount it applied
