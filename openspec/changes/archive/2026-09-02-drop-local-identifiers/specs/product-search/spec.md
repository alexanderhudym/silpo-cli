## ADDED Requirements

### Requirement: What a product record prints

The product listings SHALL print each product as one record whose keyed fields take a line each —
every identifier its payload carries, its stock, and the step it is sold in when the product is
weighted — and SHALL close that record with a single line carrying no key, holding the product's
name, the size of one package where the product is sold by the piece, its price, and its previous
price where the payload carries one.

The identifiers SHALL be the product's own uuid, its slug, and its external product id where the
payload carries one. All three SHALL be printed, because no two are accepted by the same tools: a
cart write, a removal and a replacement lookup take the uuid alone and reject the others outright; a
product card and its alternatives take any of the three; a batch search matches an external product
id exactly when it is given as a search term; and adding a product to favourites requires the uuid
and the external product id together. Since the CLI holds no mapping between the three forms, a form
left unprinted is a form the caller cannot recover.

No amount SHALL be converted in either direction: every price, stock and step SHALL be the number the
payload carried. A price SHALL carry the currency. A price SHALL also carry the unit it is per
whenever the payload flags the product as sold by weight, and that flag SHALL be the only thing
consulted — no value SHALL be inspected to decide whether a product is sold by weight. Stock and step
SHALL carry that same unit under the same condition.

The branch SHALL NOT be printed, because it is the branch the session named and the payload only
echoes it. The company SHALL be hoisted into `common` where every record of the listing shares one,
and printed on the record where they do not. The ratio SHALL NOT be printed under a key of its own:
where the product is sold by the piece it stands beside the name as the size of one package, and
where it is sold by weight it names the reference unit of the storefront and carries nothing the
caller can act on. The product image SHALL NOT be printed. Because four tools return this record with
the same fields, they SHALL build it through one shared piece of text-building.

#### Scenario: One record per product

- **WHEN** a product listing is printed
- **THEN** each product's fields take a line of their own and a blank line stands between products

#### Scenario: Every handle the payload carries

- **WHEN** a product record is printed for a product whose payload carried a uuid, a slug and an
  external product id
- **THEN** all three appear, each on a keyed line

#### Scenario: A payload short of a handle

- **WHEN** a product record is printed from a payload that carries no external product id, as a
  product card does
- **THEN** the record prints the identifiers it has and derives nothing

#### Scenario: The name and the price close the record

- **WHEN** a product record is printed
- **THEN** its last line holds the name and the price together, carries no key, and stands below
  every keyed row of that record

#### Scenario: A product sold by weight

- **WHEN** a product is flagged as sold by weight
- **THEN** its price names the unit it is per, its stock and step name that same unit, and the step
  is printed on a keyed row of its own because a caller adding the product to a cart passes that
  number unchanged

#### Scenario: A product sold by the piece

- **WHEN** a product is not flagged as sold by weight
- **THEN** the size of one package stands beside the name, the price names no unit beyond the
  currency, and no step is printed

#### Scenario: No amount is converted

- **WHEN** a price, a stock or a step is printed
- **THEN** it is the number the payload carried, digit for digit, and the unit beside it is a label
  rather than the result of any arithmetic

#### Scenario: Fields a product does not carry

- **WHEN** a product has no previous price or no special price
- **THEN** those parts are absent rather than shown as empty

#### Scenario: Availability

- **WHEN** a product reports a stock of zero, or reports that it is unavailable
- **THEN** the record says so, because a caller deciding what to buy needs it

#### Scenario: The same record across four tools

- **WHEN** the filtered listing, the batch search, the alternatives or the favorites list prints a
  product
- **THEN** the record reads identically, field for field, whichever of the four printed it

### Requirement: What the filtered listing takes

The CLI SHALL list the products of a branch, narrowed by category, product set, promotion,
stock, and price, and ordered by a requested field and direction. The category SHALL be named by
its slug, which is the one form the filter accepts, and SHALL be sent as it was given. The
listing SHALL require at least one of category, product set or promotion code, because the
server rejects a request narrowed by price or stock alone and answers with a status the caller
cannot act on. The listing SHALL NOT accept a free-text query, and SHALL say where such a query
belongs when one is given.

#### Scenario: Listing with filters

- **WHEN** the user lists products with any combination of category, product set, promotion code, promotion-only, in-stock-only, lowest price, and highest price
- **THEN** only the filters the user passed reach the server, and the rest are left unset

#### Scenario: A category named by its slug

- **WHEN** the user narrows the listing by a category slug
- **THEN** that slug reaches the server as it was typed, and the products of that category are
  listed

#### Scenario: A category the branch carries nothing under

- **WHEN** the user narrows the listing by a slug this branch holds no products for
- **THEN** an empty listing is printed and the command succeeds, because an empty answer is what
  the server gave and no second call is made to reinterpret it

#### Scenario: Ordering and paging

- **WHEN** the user passes a sort field, a sort direction, a page size, or a page offset
- **THEN** they are forwarded to the server unchanged

#### Scenario: No anchor to narrow by

- **WHEN** the user lists products with neither a category, a product set nor a promotion code
- **THEN** the command fails before the call, naming the three options one of which is
  required, rather than letting the server answer with a status that names nothing

#### Scenario: A query written where a listing was asked for

- **WHEN** the user passes free text to the listing
- **THEN** the command fails and names the search as the place a free-text query belongs

### Requirement: One product and its neighbours

The CLI SHALL open the full card of a product, and SHALL offer alternatives to it and
replacements for it. The card and the alternatives SHALL take the product under any of the three
forms the tool accepts — its uuid, its slug or its external product id — and SHALL send whichever
was given, unchanged. Replacements SHALL take the product uuid alone, because the tool rejects
every other form. Replacements SHALL be described as candidates for a product at risk of not
being assembled into the order, not as a lookup for a product that has run out: a product with
stock remaining SHALL be a valid subject, and an empty answer SHALL be the ordinary outcome
rather than a failure.

#### Scenario: Product card

- **WHEN** the user asks for a product by its uuid, its slug or its external product id
- **THEN** the CLI returns that product's full card, composition, nutrition, and attributes included

#### Scenario: Alternatives

- **WHEN** the user asks for products similar to a named product
- **THEN** the CLI returns the alternatives for that branch, paged by the requested page size and
  offset

#### Scenario: Replacements

- **WHEN** the user asks for replacements, naming a company and one or more products
- **THEN** the CLI returns the replacement suggestions for exactly those products, whatever stock
  those products currently have

#### Scenario: The form the caller chose is the form that travels

- **WHEN** the user names the same product to the card three times, once under each form
- **THEN** each call carries the text that was typed, and the server decides whether it resolves

### Requirement: What a product card prints

The single product card SHALL print the product's uuid, its slug, its stock and its company
under their keys, SHALL close the record with the same keyless line of name and price the
listings use, and SHALL print the attribute dictionary the server supplies as one line per
entry, with the keys exactly as the server spelled them. No external product id SHALL be
printed, because the card's payload carries none and the CLI derives nothing. The card SHALL
decide whether the product is sold by weight from the unit the payload names, not from its
weighted flag, because that flag is returned as false for products every listing reports as
weighted. The gallery of images and the web page address SHALL NOT be printed.

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

#### Scenario: The card carries its slug

- **WHEN** a product card is printed
- **THEN** its slug appears under a key of its own, because the card's payload carries one and
  it is the handle the alternatives lookup takes

#### Scenario: The card carries no external product id

- **WHEN** a product card is printed for a product a listing would have given an external
  product id for
- **THEN** no such row appears, because the card's payload does not carry one

#### Scenario: The branch is absent from the card too

- **WHEN** a product card is printed for the branch the caller named
- **THEN** no branch row appears, for the same reason it is absent from a listing's records


## MODIFIED Requirements

### Requirement: Product output

Product commands SHALL compose the text they print from the payload they received, naming
every field they show. No product command SHALL print whether the call succeeded, because a
call that did not succeed fails instead of printing. No product command SHALL record anything
about the call it made: the CLI keeps no ledger.

#### Scenario: Successful lookup

- **WHEN** a product command completes
- **THEN** the text it composed is written to standard output, and nothing else is written
  anywhere

#### Scenario: The command states its output

- **WHEN** a product command prints a payload
- **THEN** every field shown is one the command named, and nothing is chosen by inspecting
  the payload's shape or a field's name

### Requirement: The company of a listing

A listing of products SHALL print the uuid of the company that sells them once, in a
section named `common` standing between the summary and the records, rather than in every
record. Where the records of one payload do not all name the same company, each record SHALL
carry its own company row instead and the section SHALL NOT be printed, so that the section
never states something the payload contradicts. A single product card, which is one record and
not a listing, SHALL keep the company as a row of its own. The hoisting carries more weight than
it did, a uuid repeated on thirty rows costing thirty times what one costs.

#### Scenario: One company for the whole listing

- **WHEN** every product of a listing names the same company
- **THEN** that company's uuid is printed once under the `common` section above the
  records, and no record repeats it

#### Scenario: Records that disagree

- **WHEN** the products of one payload do not all name the same company
- **THEN** the `common` section is absent and every record carries its own company row

#### Scenario: A single card

- **WHEN** a product card is printed
- **THEN** its company is a row of the record, because one record is not a listing

### Requirement: Replacements and favorites update output

The replacements lookup SHALL print a group per requested product, named by that product's uuid,
holding the replacement records the server offered. A replacement record SHALL print the
product's uuid and slug and no external product id, because the payload carries none. Its
summary SHALL count the products a replacement was found for, not the products that were asked
about, and SHALL NOT describe an empty answer as a fault, because most products carry no
assembly risk. The favorites update SHALL print what the server confirmed.

#### Scenario: Replacements grouped by their product

- **WHEN** replacements are printed for several products
- **THEN** each requested product names a group of its own, holding its replacements

#### Scenario: A product with no replacement

- **WHEN** the server offers no replacement for a requested product
- **THEN** the product still appears, stating that there is none

#### Scenario: Nothing was replaced

- **WHEN** every requested product comes back without a replacement
- **THEN** the summary says that none were offered, and reports it as the ordinary result it is
  rather than as a fault

#### Scenario: Favorites confirmed

- **WHEN** favorites are added or removed
- **THEN** the output states, per product, which of the two happened, naming the product by the
  uuid the server confirmed it under

## REMOVED Requirements

### Requirement: The product record

**Reason**: The requirement turned on a rule that has inverted. It held that the slug and the
external product id are never printed, because the local number resolved to both wherever a call
wanted one. There is no local number and no resolution, and the three forms are taken by three
different sets of tools, so every form the payload carries must now be printed.

**Migration**: Replaced by "What a product record prints", above, which keeps every clause about
amounts, units, availability and the shared record shape unchanged.

### Requirement: Filtered product listing

**Reason**: The requirement held that a category is accepted under any of the forms a category
may be named by and resolved to the one the call requires. There is one form the filter accepts,
the slug, and nothing is resolved. Two of its scenarios name the machinery directly — a category
given three ways, and a category that resolves to nothing.

**Migration**: Replaced by "What the filtered listing takes", above, which keeps every clause
about the anchors, the ordering, the paging and the free-text query unchanged.

### Requirement: Single product

**Reason**: Its last scenario, a card asked for by local number, described the CLI taking the
slug out of a record rather than from the user. There are no records.

**Migration**: Replaced by "One product and its neighbours", above, which keeps the card, the
alternatives and the replacements clauses unchanged and states which forms each of the three
tools accepts.

### Requirement: Product card output

**Reason**: The requirement held that the slug SHALL NOT be printed on a card, the local number
standing for it. The card now prints the slug, because it is the handle the alternatives lookup
takes and the card is the only place a caller may hold.

**Migration**: Replaced by "What a product card prints", above, which keeps every clause about
attributes, the unit, the weighted flag, the gallery and the branch unchanged.
