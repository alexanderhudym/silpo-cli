## MODIFIED Requirements

### Requirement: Online order output

An online order SHALL be printed as a record holding the local number recorded for its order id,
its receipt number,
its status, the moment it was created as local wall clock time, its amount and its discount,
its delivery type with the delivery window as local wall clock time, its address joined into
one line by the shared address conversion, the local number of the branch its lines were bought
at, and its lines as records showing the product's
local number, quantity and line total, each closing with the same keyless line of name and
price a product listing uses. An order line SHALL print its price with the currency and no
unit beyond it, because an online order line declares neither a weighted flag nor a unit and
the CLI SHALL NOT infer one from the shape of the quantity. A line the order reports as
removed SHALL say so. The product image SHALL NOT be printed.

An order line names its product by the server's identifier alone, so printing it SHALL record
that product under that identifier and SHALL NOT make any call to learn more about it. The
branch and the company an order's lines name SHALL be recorded under local numbers the same
way, so that a later command can be given the branch the order was placed at without the caller
searching the store listing for it.

#### Scenario: An order and its lines

- **WHEN** online orders are printed
- **THEN** each order takes a record of its own, its lines indented beneath the name of their
  group

#### Scenario: The order names itself by number

- **WHEN** an online order is printed
- **THEN** its id is the local number recorded for that order, and its receipt number appears
  separately under its own key

#### Scenario: The order names the store it came from

- **WHEN** an online order's lines carry a branch
- **THEN** that branch is printed once for the order as a local number, so that checking what
  is still available at the same store costs no search of the store listing

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
