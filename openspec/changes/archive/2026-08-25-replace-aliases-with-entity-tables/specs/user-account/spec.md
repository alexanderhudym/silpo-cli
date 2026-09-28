## MODIFIED Requirements

### Requirement: Saved address listing

The CLI SHALL print each saved delivery address as an item whose every field takes a line of its own under a key, with a blank line between items and no marker in front of any of them. The address SHALL be named by the local number recorded for it. A line SHALL run as long as its value needs, because the output is read by a program rather than looked at in a window. The city, the street, the building, the entrance, the floor and the apartment SHALL be joined into one address, comma separated, each of the last four behind the abbreviation that names it. The latitude and the longitude SHALL be shown as one value under one key.

#### Scenario: A field to a line, under its key

- **WHEN** a saved address is printed
- **THEN** each field it carries takes its own line under its own key, the id included, starting at the first column, and a blank line is what stands between one address and the next

#### Scenario: The address names itself by number

- **WHEN** a saved address is printed
- **THEN** its id is the local number recorded for that address, not the uuid the server named it by

#### Scenario: The parts of a place become one address

- **WHEN** an address carries any of a city, a street, a building, an entrance, a floor or an apartment
- **THEN** they are joined into one comma separated address, with the building, the entrance, the floor and the apartment each behind the abbreviation that names it, and the parts it does not carry left out

#### Scenario: Coordinates under one key

- **WHEN** an address carries both a latitude and a longitude
- **THEN** they are shown as one value under one key, comma separated, each rounded to six decimal places

#### Scenario: A coordinate without the other is no coordinate

- **WHEN** an address carries neither a latitude nor a longitude, or carries only one of the two
- **THEN** nothing is shown, because one axis alone locates nothing

#### Scenario: Free text stays on its line

- **WHEN** a field holds text a user typed, which may carry line breaks or a non-breaking space
- **THEN** its whitespace is collapsed so the field occupies the one line it was given, however long that line becomes

### Requirement: Online order output

An online order SHALL be printed as a record holding the local number recorded for its order id,
its receipt number,
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

#### Scenario: The order names itself by number

- **WHEN** an online order is printed
- **THEN** its id is the local number recorded for that order, and its receipt number appears
  separately under its own key

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
