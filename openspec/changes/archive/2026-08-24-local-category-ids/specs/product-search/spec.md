## MODIFIED Requirements

### Requirement: Filtered product listing

The CLI SHALL list the products of a branch, narrowed by category, product set, promotion,
stock, and price, and ordered by a requested field and direction. The category SHALL be
accepted under any of the forms a category may be named by, and SHALL be resolved to the one
the call requires before the call is made.

#### Scenario: Listing with filters

- **WHEN** the user lists products with any combination of category, product set, promotion
  code, promotion-only, in-stock-only, lowest price, and highest price
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
