## ADDED Requirements

### Requirement: What an in-store receipt prints, and what it cannot

An in-store receipt SHALL be printed as a record holding the store's name and city, the moment of the
receipt as local wall clock time, the sum paid, the discount and the bonuses it earned, its rewards
as records, and its lines as records showing the quantity and, where the line names the catalogue
product behind it, that product's uuid and slug so it can be put in a cart, each closing with the
same keyless line of name and price a product listing uses. A receipt line SHALL read what its price
is per from the unit the payload names on that line: where the unit is a unit of weight the price
SHALL name it, where the unit names a package size that size SHALL stand beside the name, and where
the unit merely counts pieces neither SHALL be printed. No amount SHALL be converted. The receipt's
own web address SHALL NOT be printed.

A line the server gives no catalogue product for SHALL be printed with no identifier the server did
not give, and the command SHALL neither fail nor retry. The absence SHALL stand: no identifier is
supplied from anywhere but the payload, no lookup is attempted for the line, and buying that product
again means searching for it by name, which the skill states. The absence is common rather than
exceptional — on a live receipt, half the lines carried no catalogue product.

An identifier SHALL NOT be recovered for such a line by matching its name against products seen
before. A handle printed beside a name it was matched to rather than carried by is a guess presented
as a fact, and the caller discovers the guess at the till.

No lookup SHALL be made on the line's article code, and the article code SHALL NOT be printed, being
a machine handle no command accepts and the caller cannot act on.

#### Scenario: A receipt and its lines

- **WHEN** in-store receipts are printed
- **THEN** each receipt takes a record of its own, its lines indented beneath the name of their group

#### Scenario: A line that names a catalogue product

- **WHEN** a receipt line carries the catalogue product behind it
- **THEN** that product's uuid and slug are printed on the line, so the caller can buy it again

#### Scenario: A line with no catalogue product

- **WHEN** a receipt line carries no catalogue product
- **THEN** it prints its quantity, name and price and no identifier, no lookup is attempted, the
  command neither fails nor retries, and buying it again means naming it in a search

#### Scenario: A name known from elsewhere is still not a handle

- **WHEN** a receipt line carries no catalogue product and the same product was bought online, or
  named by a listing in the same session
- **THEN** the line still prints no identifier, because the only identifier it could print was matched
  to the name rather than carried by the line

#### Scenario: The article code stays out

- **WHEN** a receipt line is printed, matched or not
- **THEN** its article code does not appear, because no command accepts one

#### Scenario: A line priced by weight

- **WHEN** a receipt line names a unit of weight
- **THEN** its price names that unit and its quantity names it too, both as the payload sent them

#### Scenario: A line that names a package size

- **WHEN** a receipt line's unit names the size of one package rather than a unit of weight
- **THEN** that size stands beside the name and the price names only the currency

#### Scenario: Rewards

- **WHEN** a receipt carries rewards
- **THEN** each reward is printed with the text describing it and the amount it applied

## REMOVED Requirements

### Requirement: What an in-store receipt prints

**Reason**: The requirement permitted a receipt line to borrow an identifier from the product index
where the server had given the line none, and carried a scenario describing it. The permission was
never exercised: the command prints an identifier only where the payload carries one. With no index
the only way to honour the permission would be to match the line's name against a product seen
elsewhere, which is a guess presented to the caller as a handle.

**Migration**: Replaced by "What an in-store receipt prints, and what it cannot", which keeps every
other clause unchanged — the fields, the units, the refusal to convert an amount, the article code
staying out — and turns the permission into a prohibition. **No printed output changes.** What the
change closes is a licence to guess that the code had not taken up; a caller sees exactly what they
saw before, which for about half a live receipt's lines is a name and a price and no identifier.
