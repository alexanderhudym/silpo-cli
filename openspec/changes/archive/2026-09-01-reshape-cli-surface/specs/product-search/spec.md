## MODIFIED Requirements

### Requirement: Filtered product listing

The CLI SHALL list the products of a branch, narrowed by category, product set, promotion,
stock, and price, and ordered by a requested field and direction. The category SHALL be
accepted under any of the forms a category may be named by, and SHALL be resolved to the one
the call requires before the call is made. The listing SHALL require at least one of category,
product set or promotion code, because the server rejects a request narrowed by price or stock
alone and answers with a status the caller cannot act on. The listing SHALL NOT accept a
free-text query, and SHALL say where such a query belongs when one is given.

#### Scenario: Listing with filters

- **WHEN** the user lists products with any combination of category, product set, promotion code, promotion-only, in-stock-only, lowest price, and highest price
- **THEN** only the filters the user passed reach the server, and the rest are left unset

#### Scenario: A category named any of three ways

- **WHEN** the user narrows the listing by a category given as a local number, as the
  server's identifier, or as a slug
- **THEN** the same products are listed in each case

#### Scenario: A category that resolves to nothing

- **WHEN** the user narrows the listing by a category that cannot be resolved
- **THEN** the command fails and no products are requested

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

### Requirement: Batch search

The CLI SHALL search several free-text product queries in one call, keeping the queries in the
order they were given, with an optional cap on matches per query. The queries SHALL be accepted
as bare arguments and in no other form: the search exists to take them, so a second way of
writing the same list would only be one more thing to choose between. At least one query SHALL
be required.

#### Scenario: Several queries at once

- **WHEN** the user writes several product queries
- **THEN** all queries travel in a single call, in the order given, so a shopping list costs one round trip

#### Scenario: Queries written as bare arguments

- **WHEN** the user writes the queries after the command name
- **THEN** they are the queries the search runs, because that is the form a caller reaches for
  first and the only form the command offers

#### Scenario: A query holding a space

- **WHEN** a query names a product in more than one word
- **THEN** it travels as one query, the shell having kept it together, and is not split into
  one query per word

#### Scenario: No query at all

- **WHEN** the user runs the search with no query
- **THEN** the command fails before the call, rather than asking the server for nothing

### Requirement: Replacements and favorites update output

The replacements lookup SHALL print a group per requested product, named by that product's
local number, holding the replacement records the server offered. Its summary SHALL count the
products a replacement was found for, not the products that were asked about. The favorites
update SHALL print what the server confirmed, naming each product by its local number: which
products it now holds and which it dropped.

#### Scenario: Replacements grouped by their product

- **WHEN** replacements are printed for several products
- **THEN** each requested product names a group of its own, headed by its local number and
  holding its replacements

#### Scenario: A product with no replacement

- **WHEN** the server offers no replacement for a requested product
- **THEN** the product still appears, stating that there is none

#### Scenario: Nothing was replaced

- **WHEN** every requested product comes back without a replacement
- **THEN** the summary says that none were offered, rather than reporting that replacements
  were found for as many products as were asked about

#### Scenario: Favorites confirmed

- **WHEN** favorites are added or removed
- **THEN** the output states, per product, which of the two happened, naming the product by
  its local number
