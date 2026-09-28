## MODIFIED Requirements

### Requirement: Online order output

An online order SHALL be printed as a record holding the alias of its order id, its number,
its status, the moment it was created as local wall clock time, its amount and its discount,
its delivery type with the delivery window as local wall clock time, its address joined into
one line by the shared address conversion, and its lines as records showing the product's
local number, quantity and line total, each closing with the same keyless line of name and
price a product listing uses. An order line SHALL print its price with the currency and no
unit beyond it, because an online order line declares neither a weighted flag nor a unit and
the CLI SHALL NOT infer one from the shape of the quantity. A line the order reports as
removed SHALL say so. The product image SHALL NOT be printed.

An order line names its product by the server's identifier alone, so printing it SHALL record
that product under that identifier and SHALL NOT make any call to learn more about it.

#### Scenario: An order and its lines

- **WHEN** online orders are printed
- **THEN** each order takes a record of its own, its lines indented beneath the name of their
  group

#### Scenario: A line names its product by number

- **WHEN** an online order line is printed
- **THEN** it names its product by the local number recorded for it

#### Scenario: Printing an order fetches nothing

- **WHEN** an online order names a product the CLI holds no slug for
- **THEN** the product is recorded under its identifier alone and no lookup is made, the
  local number being all the line prints

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
names the catalogue product behind it, that product's local number so it can be put in a cart,
each closing with the same keyless line of name and price a product listing uses. A receipt
line SHALL read what its price is per from the unit the payload names on that line: where the
unit is a unit of weight the price SHALL name it, where the unit names a package size that
size SHALL stand beside the name, and where the unit merely counts pieces neither SHALL be
printed. No amount SHALL be converted. The receipt's own web address SHALL NOT be printed.

A line that names the catalogue product behind it SHALL be recorded with every identifier the
line and that product carry between them, the article code sitting on the line itself rather
than within the catalogue product.

A line the server gives no catalogue product for SHALL have its article code looked up, so that
it too can print a local number: the server having decided that field against the branch the
caller named, its absence says where the article is not sold rather than that the product is
gone. Where the lookup answers with no such product, the line SHALL be printed with no
identifier at all and SHALL NOT be recorded, and the command SHALL neither fail nor retry. The
article code SHALL NOT be printed in the identifier's place, being a machine handle the caller
cannot act on.

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
- **THEN** that product's local number is printed on the line, so the caller can buy it again,
  and the record behind that number holds the article code the line carried alongside the
  identifiers the catalogue product carried

#### Scenario: A line with no catalogue product

- **WHEN** a receipt line carries no catalogue product
- **THEN** its article code is looked up, and the line prints the local number of the product
  that code names

#### Scenario: A line whose product no longer exists

- **WHEN** the lookup for such a line finds no product
- **THEN** it prints its quantity, name and price and no identifier, nothing is recorded for
  it, and the command neither fails nor retries

#### Scenario: Rewards

- **WHEN** a receipt carries rewards
- **THEN** each reward is printed with the text describing it and the amount it applied
