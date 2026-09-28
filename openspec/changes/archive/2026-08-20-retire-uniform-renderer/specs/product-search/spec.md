## ADDED Requirements

### Requirement: The product record

The product listings SHALL print each product as one record whose fields take a line each:
the alias of its id, its slug, its name, its price, its previous price when the payload
carries one, the ratio it is sold by, the step it is sold in when the product is weighted, and
its stock. The company and the branch SHALL be printed as aliases, and the external product id
as the number it is, because the favorites tool accepts it. The product image SHALL NOT be
printed. Because four tools return this record with the same fields, they SHALL build it
through one shared piece of text-building.

#### Scenario: One record per product

- **WHEN** a product listing is printed
- **THEN** each product's fields take a line of their own and a blank line stands between
  products

#### Scenario: Fields a product does not carry

- **WHEN** a product has no previous price, no ratio or no special price
- **THEN** those lines are absent rather than shown as empty

#### Scenario: A product sold by weight

- **WHEN** a product is flagged as weighted
- **THEN** the step it is sold in is printed, because a quantity that is not a multiple of it
  cannot be put in a cart, and a product sold by the piece shows no step

#### Scenario: Availability

- **WHEN** a product reports a stock of zero, or reports that it is unavailable
- **THEN** the record says so, because a caller deciding what to buy needs it

#### Scenario: The same record across four tools

- **WHEN** the filtered listing, the batch search, the alternatives or the favorites list
  prints a product
- **THEN** the record reads identically, field for field, whichever of the four printed it

### Requirement: Batch search output

The batch search SHALL print each query as a group named by the query text, holding the
matches for that query as product records, with the number the server found for it. Queries
SHALL appear in the order they were given.

#### Scenario: A group per query

- **WHEN** several queries were searched in one call
- **THEN** each query names a group of its own, in the order given, holding its matches

#### Scenario: A query that matched nothing

- **WHEN** a query found no product
- **THEN** the query still appears, stating that it found nothing

### Requirement: Product card output

The single product card SHALL print the product's alias, slug, name, price, previous price,
ratio, stock, company and branch, and SHALL print the attribute dictionary the server
supplies as one line per entry, with the keys exactly as the server spelled them. The gallery
of images and the web page address SHALL NOT be printed.

#### Scenario: Attributes as the server named them

- **WHEN** a product card carries attributes
- **THEN** each attribute takes a line as its own key and value, keeping the server's
  spelling, unit included

#### Scenario: No gallery

- **WHEN** a product card carries a list of image addresses and a page address
- **THEN** neither is printed

### Requirement: Replacements and favorites update output

The replacements lookup SHALL print a group per requested product, named by that product's
alias, holding the replacement records the server offered. The favorites update SHALL print
what the server confirmed: which products it now holds and which it dropped.

#### Scenario: Replacements grouped by their product

- **WHEN** replacements are printed for several products
- **THEN** each requested product names a group of its own holding its replacements

#### Scenario: A product with no replacement

- **WHEN** the server offers no replacement for a requested product
- **THEN** the product still appears, stating that there is none

#### Scenario: Favorites confirmed

- **WHEN** favorites are added or removed
- **THEN** the output states, per product, which of the two happened

## MODIFIED Requirements

### Requirement: Product output

Product commands SHALL compose the text they print from the payload they received, naming
every field they show, and SHALL record the call for token accounting. No product command
SHALL print whether the call succeeded, because a call that did not succeed fails instead of
printing.

#### Scenario: Successful lookup

- **WHEN** a product command completes
- **THEN** the text it composed is written to standard output and the call is recorded with
  its token counts

#### Scenario: The command states its output

- **WHEN** a product command prints a payload
- **THEN** every field shown is one the command named, and nothing is chosen by inspecting
  the payload's shape or a field's name
