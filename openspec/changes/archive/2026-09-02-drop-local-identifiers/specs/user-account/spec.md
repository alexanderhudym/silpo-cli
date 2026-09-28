## ADDED Requirements

### Requirement: What an in-store receipt prints

An in-store receipt SHALL be printed as a record holding the store's name and city, the moment of the
receipt as local wall clock time, the sum paid, the discount and the bonuses it earned, its rewards
as records, and its lines as records showing the quantity and, where the line names the catalogue
product behind it, that product's uuid and slug so it can be put in a cart, each closing with the
same keyless line of name and price a product listing uses. A receipt line SHALL read what its price
is per from the unit the payload names on that line: where the unit is a unit of weight the price
SHALL name it, where the unit names a package size that size SHALL stand beside the name, and where
the unit merely counts pieces neither SHALL be printed. No amount SHALL be converted. The receipt's
own web address SHALL NOT be printed.

A line the server gives no catalogue product for SHALL be printed with no identifier at all, and the
command SHALL neither fail nor retry. No lookup SHALL be attempted on the line's article code: the
CLI resolves nothing, and the code is a machine handle no tool accepts. The absence is common rather
than exceptional — on a live receipt, half the lines carried no catalogue product — and it means the
line cannot be reordered from the receipt, which the skill states.

The article code SHALL NOT be printed, being a handle the caller cannot act on.

#### Scenario: A receipt and its lines

- **WHEN** in-store receipts are printed
- **THEN** each receipt takes a record of its own, its lines indented beneath the name of their group

#### Scenario: A line that names a catalogue product

- **WHEN** a receipt line carries the catalogue product behind it
- **THEN** that product's uuid and slug are printed on the line, so the caller can buy it again

#### Scenario: A line with no catalogue product

- **WHEN** a receipt line carries no catalogue product
- **THEN** it prints its quantity, name and price and no identifier, no lookup is attempted, and the
  command neither fails nor retries

#### Scenario: The article code stays out

- **WHEN** a receipt line is printed, matched or not
- **THEN** its article code does not appear, because no tool accepts one

#### Scenario: A line priced by weight

- **WHEN** a receipt line names a unit of weight
- **THEN** its price names that unit and its quantity names it too, both as the payload sent them

#### Scenario: A line that names a package size

- **WHEN** a receipt line's unit names the size of one package rather than a unit of weight
- **THEN** that size stands beside the name and the price names only the currency

#### Scenario: Rewards

- **WHEN** a receipt carries rewards
- **THEN** each reward is printed with the text describing it and the amount it applied

### Requirement: Account records print the identifiers their payloads carry

An order, a saved address, a coupon, a certificate, a promo and a household member SHALL each be
printed with the identifier its payload names it by, in the form the payload carried, and SHALL NOT
be printed with any identifier the CLI derived. Where no tool accepts that identifier back — as none
accepts an order, a saved address, a promo, a profile or a family member — the identifier SHALL still
be printed where it is the only way to refer to the row in conversation, and left out otherwise.

A gift certificate SHALL print its barcode, because the barcode is what adds and removes it from a
cart, and its own numeric identifier SHALL be left out, because no tool accepts it.

#### Scenario: An order

- **WHEN** the online order history is printed
- **THEN** each order carries the identifier its payload named it by, and the user is still told
  about it by its receipt number or its date

#### Scenario: A certificate

- **WHEN** the account's certificates are printed
- **THEN** each carries its barcode and not its numeric identifier

### Requirement: What a saved address prints

The CLI SHALL print each saved delivery address as an item whose every field takes a line of its own under a key, with a blank line between items and no marker in front of any of them. The address SHALL be named by the identifier its payload carried, which no tool accepts back but which is the only way to refer to one address among several in conversation. A line SHALL run as long as its value needs, because the output is read by a program rather than looked at in a window. The city, the street, the building, the entrance, the floor and the apartment SHALL be joined into one address, comma separated, each of the last four behind the abbreviation that names it. The latitude and the longitude SHALL be shown as one value under one key.

#### Scenario: A field to a line, under its key

- **WHEN** a saved address is printed
- **THEN** each field it carries takes its own line under its own key, the id included, starting at the first column, and a blank line is what stands between one address and the next

#### Scenario: The address names itself as the payload named it

- **WHEN** a saved address is printed
- **THEN** its id is the identifier the server sent, printed as it stands

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

### Requirement: What an online order prints

An online order SHALL be printed as a record holding the identifier its payload named it by, its
receipt number, its status, the moment it was created as local wall clock time, its amount and
its discount, its delivery type with the delivery window as local wall clock time, its address
joined into one line by the shared address conversion, the uuid of the branch its lines were
bought at, and its lines as records showing the product's uuid, quantity and line total, each
closing with the same keyless line of name and price a product listing uses. An order line SHALL
print its price with the currency and no unit beyond it, because an online order line declares
neither a weighted flag nor a unit and the CLI SHALL NOT infer one from the shape of the
quantity. A line the order reports as removed SHALL say so. The product image SHALL NOT be
printed.

An order line names its product by uuid alone, and that is what SHALL be printed. No call SHALL
be made to learn a slug or an external product id for it, so an order line reaches the cart but
not a product card.

#### Scenario: An order and its lines

- **WHEN** online orders are printed
- **THEN** each order takes a record of its own, its lines indented beneath the name of their
  group

#### Scenario: The order names itself as the payload named it

- **WHEN** an online order is printed
- **THEN** its id is the identifier the server sent, and its receipt number appears
  separately under its own key

#### Scenario: The order names the store it came from

- **WHEN** an online order's lines carry a branch
- **THEN** that branch is printed once for the order as the uuid the payload carried, so that
  checking what is still available at the same store costs no search of the store listing

#### Scenario: A line names its product by uuid

- **WHEN** an online order line is printed
- **THEN** it names its product by the uuid the payload carried, which is what a cart write takes

#### Scenario: Printing an order fetches nothing

- **WHEN** an online order names a product the payload carries no slug for
- **THEN** the uuid is all the line prints and no lookup is made

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


## MODIFIED Requirements

### Requirement: Household and restrictions

The CLI SHALL fetch the saved delivery addresses of the authorized user, and SHALL return the household members including children and pets, and the dietary restrictions. A household member, child or pet SHALL be printed with each of its fields on a line of its own and without its id, which no tool accepts, one blank line apart, under the name of the group it belongs to.

#### Scenario: Household

- **WHEN** the user asks for their family
- **THEN** the CLI returns the household members, their children and their pets, each field on its own line and no id among them, each group named above the members it holds

#### Scenario: Restrictions

- **WHEN** the user asks for their food restrictions
- **THEN** the CLI returns the dietary restrictions and preferences as items in the same form as the rest of the household, each field on its own line

#### Scenario: Household timestamps to the minute

- **WHEN** a household member carries an absolute instant for the moment their profile was created
- **THEN** it is shown as local wall clock time to the minute

#### Scenario: A household timestamp that names no zone

- **WHEN** a household member carries that moment as a date and time naming no zone, which is what the server sends today
- **THEN** it is taken for a local time by the same rule that governs every time the CLI handles, and shown to the minute unmoved, with the command doing nothing to tell the two shapes apart

### Requirement: Account output

Account commands SHALL compose the text they print from the payload they received, naming
every field they show. No account command SHALL print whether the call succeeded, because a
call that did not succeed fails instead of printing. No account command SHALL record anything
about the call it made: the CLI keeps no ledger.

#### Scenario: Successful call

- **WHEN** an account command completes
- **THEN** the rendered text is written to standard output, and nothing else is written anywhere

#### Scenario: Profile commands state their own output

- **WHEN** one of the four `profile` commands completes
- **THEN** the text it printed follows from what that command names, field by field, and not
  from any default applied to the payload's shape

#### Scenario: Every account command states its own output

- **WHEN** an order history, a loyalty listing or the premium subscription is printed
- **THEN** every field shown is one the command named, and nothing is chosen by inspecting
  the payload's shape or a field's name

## REMOVED Requirements

### Requirement: In-store receipt output

**Reason**: The requirement turned on recording each line under a local number and, for a line the
server matched to nothing, looking its article code up so that it too could carry one. Both are gone:
nothing is recorded and nothing is resolved, so a line either carries the catalogue product the server
gave it or carries no handle at all.

**Migration**: Replaced by "What an in-store receipt prints", above, which keeps every clause about
units, amounts, rewards and the receipt's own web address unchanged.

### Requirement: Saved address listing

**Reason**: The requirement held that a saved address is named by the local number recorded for
it rather than by the uuid the server sent, and one of its scenarios says so outright. Nothing is
recorded.

**Migration**: Replaced by "What a saved address prints", above, which keeps every clause about
the line-per-field shape, the joined address, the coordinates and the free text unchanged.

### Requirement: Online order output

**Reason**: The requirement named the order, its branch and every line by the local number
recorded for each, and reserved a clause for recording the branch and company so a later command
could be given them. Three of its scenarios name the numbering directly.

**Migration**: Replaced by "What an online order prints", above, which keeps every clause about
the window, the address, the price without a unit, the removed line and the image unchanged, and
states what an order line can and cannot reach with the one form it carries.
