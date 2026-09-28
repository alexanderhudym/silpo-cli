## MODIFIED Requirements

### Requirement: Single product

The CLI SHALL open the full card of a product named by any of the forms a product is named by, and
SHALL offer alternatives to it and replacements for it. Replacements SHALL be described as candidates
for a product at risk of not being assembled into the order, not as a lookup for a product that has
run out: a product with stock remaining SHALL be a valid subject, and an empty answer SHALL be the
ordinary outcome rather than a failure.

#### Scenario: Product card

- **WHEN** the user asks for a product by its local number, its identifier or its slug
- **THEN** the CLI returns that product's full card, composition, nutrition, and attributes included

#### Scenario: Alternatives

- **WHEN** the user asks for products similar to a named product
- **THEN** the CLI returns the alternatives for that branch, paged by the requested page size and
  offset

#### Scenario: Replacements

- **WHEN** the user asks for replacements, naming a company and one or more products
- **THEN** the CLI returns the replacement suggestions for exactly those products, whatever stock
  those products currently have

#### Scenario: A card asked for by local number

- **WHEN** the user asks for a card by a local number recorded from a listing
- **THEN** the slug that call requires is taken from the record rather than from the user

### Requirement: Favorites

The CLI SHALL list the user's saved products within the session's delivery context, and SHALL add or
remove up to five of them in one call. The caller SHALL name each product by one of the forms a
product is named by and SHALL NOT be asked for its external product id, the CLI resolving that value
itself.

#### Scenario: List favorites

- **WHEN** the user lists favorites
- **THEN** the CLI returns the saved products for the session's context, paged by the requested page
  size and offset

#### Scenario: Update favorites

- **WHEN** the user passes a JSON array of favorite actions naming products and whether to drop them
- **THEN** the CLI resolves each named product to the identifiers the call requires and forwards the
  actions, so a single call can both add and remove entries

#### Scenario: The external product id is not asked for

- **WHEN** a favorite action names a product
- **THEN** the external product id the call requires is resolved from that product's record, and an
  external product id the caller supplied does not decide which product is acted on

#### Scenario: A favorite named by a slug never seen before

- **WHEN** a favorite action names a product by a slug the CLI holds no record of
- **THEN** the slug is looked up, the external product id the call requires comes back with it, and
  the favorite is acted on

#### Scenario: A product that resolves to no external product id

- **WHEN** a favorite action names a product no step of resolution can supply an external product id
  for
- **THEN** the command fails naming the product, and no favorite is added or removed

### Requirement: Replacements and favorites update output

The replacements lookup SHALL print a group per requested product, named by that product's local
number, holding the replacement records the server offered. Its summary SHALL count the products a
replacement was found for, not the products that were asked about, and SHALL NOT describe an empty
answer as a fault, because most products carry no assembly risk. The favorites update SHALL print
what the server confirmed.

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
- **THEN** the output states, per product, which of the two happened, naming the product by its
  local number

## ADDED Requirements

### Requirement: Delivery context comes from the session

Every product lookup that depends on availability SHALL be answered within the session's delivery
context — its branch, its delivery type and its time slot — and SHALL NOT accept those values from
the caller. A product lookup SHALL therefore never fail for want of them.

#### Scenario: A lookup carries no context of its own

- **WHEN** a product lookup is run
- **THEN** the branch, the delivery type and the time slot come from the session, and the command
  offers the caller no option to name any of them

#### Scenario: The answer states the context it was given

- **WHEN** a product lookup prints its results
- **THEN** the branch the results belong to is discoverable from the cart, and the listing does not
  repeat it per record

#### Scenario: A lapsed slot does not reach the query

- **WHEN** a product lookup runs and the session's time slot has lapsed
- **THEN** the slot is repaired before the lookup is issued, so that stock and price are answered
  within a slot the user could actually book

## REMOVED Requirements

### Requirement: Delivery context is explicit

**Reason**: It mandates the opposite of what the CLI now does — it requires every availability lookup
to take the branch, the delivery type and the time slot from the caller and to fail without them,
while those three now come from the session's cart and no command accepts them. A requirement whose
subject is that the caller supplies the context cannot be edited into one whose subject is that the
caller never sees it. Replaced by "Delivery context comes from the session".

**Migration**: Scripts passing `--branch-id`, `--delivery-type`, `--timeslot-start` or
`--timeslot-end` to a product command should drop those options; the commands reject them.
