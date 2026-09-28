## MODIFIED Requirements

### Requirement: Single product

The CLI SHALL open the full card of a product named by any of the forms a product is named by, and SHALL offer alternatives to it and replacements for it.

#### Scenario: Product card

- **WHEN** the user asks for a product by its local number, its identifier or its slug within a delivery context
- **THEN** the CLI returns that product's full card, composition, nutrition, and attributes included

#### Scenario: Alternatives

- **WHEN** the user asks for products similar to a named product
- **THEN** the CLI returns the alternatives for that branch, paged by the requested page size and offset

#### Scenario: Replacements

- **WHEN** the user asks for replacements, naming a branch, a company, a delivery type, and one or more products
- **THEN** the CLI returns the replacement suggestions for exactly those products

#### Scenario: A card asked for by local number

- **WHEN** the user asks for a card by a local number recorded from a listing
- **THEN** the slug that call requires is taken from the record rather than from the user

### Requirement: Favorites

The CLI SHALL list the user's saved products for a branch and delivery context, and SHALL add or remove up to five of them in one call. The caller SHALL name each product by one of the forms a product is named by and SHALL NOT be asked for its external product id, the CLI resolving that value itself.

#### Scenario: List favorites

- **WHEN** the user lists favorites with a branch, a delivery type, and a slot start
- **THEN** the CLI returns the saved products, paged by the requested page size and offset

#### Scenario: Update favorites

- **WHEN** the user passes a JSON array of favorite actions naming products and whether to drop them
- **THEN** the CLI resolves each named product to the identifiers the call requires and forwards the actions, so a single call can both add and remove entries

#### Scenario: The external product id is not asked for

- **WHEN** a favorite action names a product
- **THEN** the external product id the call requires is resolved from that product's record, and an external product id the caller supplied does not decide which product is acted on

#### Scenario: A favorite named by a slug never seen before

- **WHEN** a favorite action names a product by a slug the CLI holds no record of, the command naming no branch
- **THEN** the slug is looked up, the external product id the call requires comes back with it, and the favorite is acted on

#### Scenario: A product that resolves to no external product id

- **WHEN** a favorite action names a product no step of resolution can supply an external product id for
- **THEN** the command fails naming the product, and no favorite is added or removed

### Requirement: The product record

The product listings SHALL print each product as one record whose keyed fields take a line
each — its local number, its stock, and the step it is sold in when the product is weighted —
and SHALL close that record with a single line carrying no key, holding the product's name,
the size of one package where the product is sold by the piece, its price, and its previous
price where the payload carries one.

No amount SHALL be converted in either direction: every price, stock and step SHALL be the
number the payload carried. A price SHALL carry the currency. A price SHALL also carry the
unit it is per whenever the payload flags the product as sold by weight, and that flag SHALL
be the only thing consulted — no value SHALL be inspected to decide whether a product is sold
by weight. Stock and step SHALL carry that same unit under the same condition.

The slug SHALL NOT be printed, and neither SHALL the external product id, because the local
number resolves to both wherever a call wants one and neither is anything the caller acts on
directly. The branch SHALL NOT be printed, because it is the branch the caller named in the
command and the payload only echoes it. The company SHALL NOT be printed in the record. The
ratio SHALL NOT be printed under a key of its own: where the product is sold by the piece it
stands beside the name as the size of one package, and where it is sold by weight it names the
reference unit of the storefront and carries nothing the caller can act on. The product image
SHALL NOT be printed. Because four tools return this record with the same fields, they SHALL
build it through one shared piece of text-building.

#### Scenario: One record per product

- **WHEN** a product listing is printed
- **THEN** each product's fields take a line of their own and a blank line stands between
  products

#### Scenario: The name and the price close the record

- **WHEN** a product record is printed
- **THEN** its last line holds the name and the price together, carries no key, and stands
  below every keyed row of that record

#### Scenario: Neither handle is printed

- **WHEN** a product record is printed for a product whose payload carried a slug and an
  external product id
- **THEN** neither appears, the local number standing for both

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

The single product card SHALL print the product's local number, its stock and its company
under their keys, SHALL close the record with the same keyless line of name and price the
listings use, and SHALL print the attribute dictionary the server supplies as one line per
entry, with the keys exactly as the server spelled them. The slug SHALL NOT be printed, for
the reason it is absent from a listing's records. The card SHALL decide whether the product is
sold by weight from the unit the payload names, not from its weighted flag, because that flag
is returned as false for products every listing reports as weighted. The gallery of images and
the web page address SHALL NOT be printed.

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

#### Scenario: The slug is absent from the card too

- **WHEN** a product card is printed for a product the caller named by its slug
- **THEN** no slug row appears, the local number standing for it

#### Scenario: The branch is absent from the card too

- **WHEN** a product card is printed for the branch the caller named
- **THEN** no branch row appears, for the same reason it is absent from a listing's records

### Requirement: Replacements and favorites update output

The replacements lookup SHALL print a group per requested product, named by that product's
local number, holding the replacement records the server offered. The favorites update SHALL
print what the server confirmed, naming each product by its local number: which products it
now holds and which it dropped.

#### Scenario: Replacements grouped by their product

- **WHEN** replacements are printed for several products
- **THEN** each requested product names a group of its own, headed by its local number and
  holding its replacements

#### Scenario: A product with no replacement

- **WHEN** the server offers no replacement for a requested product
- **THEN** the product still appears, stating that there is none

#### Scenario: Favorites confirmed

- **WHEN** favorites are added or removed
- **THEN** the output states, per product, which of the two happened, naming the product by
  its local number
