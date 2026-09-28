## ADDED Requirements

### Requirement: The company of a listing

A listing of products SHALL print the alias of the company that sells them once, in a section
named `common` standing between the summary and the records, rather than in every record.
Where the records of one payload do not all name the same company, each record SHALL carry
its own company row instead and the section SHALL NOT be printed, so that the section never
states something the payload contradicts. A single product card, which is one record and not
a listing, SHALL keep the company as a row of its own.

#### Scenario: One company for the whole listing

- **WHEN** every product of a listing names the same company
- **THEN** that company's alias is printed once under the `common` section above the
  records, and no record repeats it

#### Scenario: Records that disagree

- **WHEN** the products of one payload do not all name the same company
- **THEN** the `common` section is absent and every record carries its own company row

#### Scenario: A single card

- **WHEN** a product card is printed
- **THEN** its company is a row of the record, because one record is not a listing

## MODIFIED Requirements

### Requirement: The product record

The product listings SHALL print each product as one record whose keyed fields take a line
each — the alias of its id, its slug, its external product id, its stock, and the step it is
sold in when the product is weighted — and SHALL close that record with a single line
carrying no key, holding the product's name, the size of one package where the product is
sold by the piece, its price, and its previous price where the payload carries one.

No amount SHALL be converted in either direction: every price, stock and step SHALL be the
number the payload carried. A price SHALL carry the currency. A price SHALL also carry the
unit it is per whenever the payload flags the product as sold by weight, and that flag SHALL
be the only thing consulted — no value SHALL be inspected to decide whether a product is sold
by weight. Stock and step SHALL carry that same unit under the same condition.

The external product id SHALL be printed as the number it is, because the favorites tool
requires it and the batch search accepts it as an exact-match term. The branch SHALL NOT be
printed, because it is the branch the caller named in the command and the payload only echoes
it. The company SHALL NOT be printed in the record. The ratio SHALL NOT be printed under a
key of its own: where the product is sold by the piece it stands beside the name as the size
of one package, and where it is sold by weight it names the reference unit of the storefront
and carries nothing the caller can act on. The product image SHALL NOT be printed. Because
four tools return this record with the same fields, they SHALL build it through one shared
piece of text-building.

#### Scenario: One record per product

- **WHEN** a product listing is printed
- **THEN** each product's fields take a line of their own and a blank line stands between
  products

#### Scenario: The name and the price close the record

- **WHEN** a product record is printed
- **THEN** its last line holds the name and the price together, carries no key, and stands
  below every keyed row of that record

#### Scenario: A product sold by weight

- **WHEN** a product is flagged as sold by weight
- **THEN** its price names the unit it is per, its stock and step name that same unit, and
  the step is printed on a keyed row of its own because a caller adding the product to a
  cart passes that number unchanged

#### Scenario: A product sold by the piece

- **WHEN** a product is not flagged as sold by weight
- **THEN** the size of one package stands beside the name, the price names no unit beyond
  the currency, and no step is printed

#### Scenario: No amount is converted

- **WHEN** a price, a stock or a step is printed
- **THEN** it is the number the payload carried, digit for digit, and the unit beside it is a
  label rather than the result of any arithmetic

#### Scenario: Fields a product does not carry

- **WHEN** a product has no previous price or no special price
- **THEN** those parts are absent rather than shown as empty

#### Scenario: Availability

- **WHEN** a product reports a stock of zero, or reports that it is unavailable
- **THEN** the record says so, because a caller deciding what to buy needs it

#### Scenario: The same record across four tools

- **WHEN** the filtered listing, the batch search, the alternatives or the favorites list
  prints a product
- **THEN** the record reads identically, field for field, whichever of the four printed it

### Requirement: Product card output

The single product card SHALL print the alias of the product's id, its slug, its stock and
its company under their keys, SHALL close the record with the same keyless line of name and
price the listings use, and SHALL print the attribute dictionary the server
supplies as one line per entry, with the keys exactly as the server spelled them. The card
SHALL decide whether the product is sold by weight from the unit the payload names, not from
its weighted flag, because that flag is returned as false for products every listing reports
as weighted. The gallery of images and the web page address SHALL NOT be printed.

#### Scenario: The card reads the unit, not the flag

- **WHEN** a product card names a unit of weight while its weighted flag says otherwise
- **THEN** the price is printed as a price per that unit, so the card and the listing agree
  on the same product

#### Scenario: Attributes as the server named them

- **WHEN** a product card carries attributes
- **THEN** each attribute takes a line as its own key and value, keeping the server's
  spelling, unit included

#### Scenario: No gallery

- **WHEN** a product card carries a list of image addresses and a page address
- **THEN** neither is printed

#### Scenario: The branch is absent from the card too

- **WHEN** a product card is printed for the branch the caller named
- **THEN** no branch row appears, for the same reason it is absent from a listing's records
