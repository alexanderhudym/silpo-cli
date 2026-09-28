## ADDED Requirements

### Requirement: What a cart snapshot prints

The cart snapshot SHALL print the cart's delivery type, its time slot as local wall clock time, and
its address joined into one line by the shared address conversion. Each shipment SHALL be printed
with the uuids of its company and branch, holding its products as records that show the product's
uuid and slug, quantity, line total, discount, stock, the step it is sold in when the product is
weighted, and the comment where the line carries one, and that close with the same keyless line of
name and price a product listing uses — the name, the size of one package where the product is sold
by the piece, the price with its currency and the unit it is per where the product is sold by weight,
and the previous price where the line carries one.

The product's uuid SHALL be printed because every cart write takes it and takes nothing else. The
product's slug SHALL be printed because it is the handle a product card and its alternatives take,
and because the cart payload carries no external product id — so the slug is the only route from a
cart line to the tools that answer under another form. The cart's own identifier SHALL NOT be
printed, in any form, because no command consumes it. A shipment's company and branch SHALL be
printed, unlike a product listing's, because a cart may hold more than one shipment and neither is an
argument the caller passed. The quantity, the stock and the step of a line sold by weight SHALL name
the unit they are counted in, and SHALL be the numbers the payload carried, unconverted, so that the
price, the quantity and the total on one record still multiply. The ratio SHALL NOT be printed under
a key of its own. The shipment's own id SHALL NOT be printed, because no tool accepts it. The totals
of the calculation and the bonus state SHALL be printed, and the checkout address where the payload
carries one, because the CLI offers no tool that places an order and that address is the only way to
finish one. The product image SHALL NOT be printed.

#### Scenario: A cart with several shipments

- **WHEN** a cart holds more than one shipment
- **THEN** each shipment names a group of its own holding its products, indented beneath it

#### Scenario: A shipment names its store

- **WHEN** a shipment is printed
- **THEN** its company and its branch appear as the uuids the payload carried, which are the form
  every cart write takes

#### Scenario: The cart does not name itself

- **WHEN** a cart snapshot is printed
- **THEN** no identifier for the cart appears, because nothing takes one back

#### Scenario: A line names its product twice

- **WHEN** a cart line is printed
- **THEN** it carries both the product's uuid and its slug, the first being what a removal or a
  quantity change takes and the second being what a product card takes

#### Scenario: A line carries no external product id

- **WHEN** a cart line is printed for a product whose listing record would carry an external product
  id
- **THEN** none is printed, because the cart payload does not carry one and the CLI derives nothing

#### Scenario: A line sold by weight

- **WHEN** a cart line is flagged as weighted
- **THEN** its price names the unit it is per, its quantity, stock and step name that same unit, and
  multiplying the printed price by the printed quantity still yields the printed total

#### Scenario: A line reads like a search result

- **WHEN** a cart line and a product listing print the same product
- **THEN** the name and price line reads the same in both

#### Scenario: The address is one line

- **WHEN** a cart carries a delivery address
- **THEN** its parts are joined into one line by the same conversion the saved address listing uses

#### Scenario: A line comment

- **WHEN** a product line carries a comment
- **THEN** it takes a line of its own under the product, and a line without one shows nothing

#### Scenario: The shipment id is absent

- **WHEN** a cart snapshot is printed
- **THEN** no shipment id appears, because no tool accepts one

#### Scenario: The checkout addresses

- **WHEN** a cart snapshot carries a web checkout address, a mobile one, or both
- **THEN** each one it carries is printed, as the exception to leaving out addresses the CLI cannot
  follow, because no tool of the surface places an order

### Requirement: A cart write names its products by uuid

The products of a cart write — an addition, a quantity change or a removal — SHALL be named by the
product uuid, and the company and branch of an addition by their uuids. The CLI SHALL send these
values unchanged. It SHALL NOT accept a slug or an external product id in their place and translate,
because it holds no mapping, and the tool rejects both forms at its own validation layer before the
request reaches Silpo.

#### Scenario: A write with a uuid

- **WHEN** the caller passes the product uuid a listing or a cart line printed
- **THEN** the write reaches the tool and succeeds or fails on its own merits

#### Scenario: A write with a slug

- **WHEN** the caller passes a product slug where the write wants a uuid
- **THEN** the command fails carrying the tool's own validation error, and no request reaches Silpo

## MODIFIED Requirements

### Requirement: Cart contents

The CLI SHALL add products to the cart or change their quantities in one call, remove named products,
and empty the cart completely, each on the cart of the session.

#### Scenario: Add or update

- **WHEN** the user passes a JSON array of products with their company and quantity
- **THEN** the entries are forwarded as one call, so it can both add new lines and change existing
  quantities, with the product and the company of each entry sent as the uuids they were given as,
  and the branch taken from the session

#### Scenario: Remove

- **WHEN** the user passes a JSON array of product ids to remove
- **THEN** exactly those lines are dropped from the cart

#### Scenario: Clear

- **WHEN** the user clears the cart
- **THEN** every product is removed from it

### Requirement: Delivery settings of a cart

The command that sets the delivery settings SHALL be named for the settings it names rather than for
updating them, because the same command opens the cart where the account has none, and a name that
says "update" would deny half of what it does.

Where there is no cart, that command SHALL open one, and the four the creating call demands — the
delivery type, the time slot, the branch and an address carrying coordinates — SHALL all be required
of the caller, each named separately when it is missing, because there is no cart to take a default
from. The branch MAY be named as the branch or through the shipments. The address type SHALL be
taken from the delivery type where the address does not name its own. No other command SHALL create
a cart.

Where there is a cart, the CLI SHALL update its delivery settings, taking from the caller only the
settings that caller means to change. The delivery type, the time slot, the address and the shipments
SHALL all be optional, and where one is not given the CLI SHALL send the value the cart already
carries, because the call demands all four whether or not any of them is the subject of the change.
An address the caller does give SHALL be sent exactly as it was given, every field of it included: the
CLI SHALL NOT rewrite a Nova Poshta office identifier and SHALL NOT supply coordinates for one. A move
to another branch, feedback preferences, adult confirmation, a promo code and a bonus amount SHALL
stay optional and SHALL be sent only where the caller gave them.

#### Scenario: Opening the first cart

- **WHEN** the account has no cart and the caller names a delivery type, a time slot, a branch and an
  address with coordinates
- **THEN** a cart is opened on those, it becomes the cart the session works within, and the output
  says a cart was opened rather than settings changed

#### Scenario: Opening without one of the four

- **WHEN** a cart is being opened and one of the four is missing
- **THEN** the command names that one and nothing is created

#### Scenario: The address type of an opened cart

- **WHEN** a cart is opened for collection or for a Nova Poshta office and the address names no type
  of its own
- **THEN** the address is typed after the delivery type

#### Scenario: Update settings

- **WHEN** the user updates the cart, naming some of the delivery type, time slot, address, and
  shipments
- **THEN** what was named is sent, what was not is taken from the session's cart, and only the
  optional fields the user passed are included

#### Scenario: One setting changed alone

- **WHEN** the user changes a single setting, such as a promo code, and names none of the four the
  call requires
- **THEN** the cart's own delivery type, time slot, address and shipments travel with it unchanged,
  and the caller is not asked to copy them out of the cart first

#### Scenario: An address the caller did not give

- **WHEN** an update carries no address
- **THEN** the address the cart carries is sent field for field, because the call replaces the stored
  address with whatever it is given rather than merging into it

#### Scenario: Time slot in local time

- **WHEN** the time slot object carries `start` or `end` as local wall clock times
- **THEN** the CLI converts those two fields to absolute instants and leaves the rest of the object
  untouched

#### Scenario: Dropping a promo code or bonuses

- **WHEN** the user passes the literal `null` as the promo code or the bonus amount
- **THEN** an explicit null is sent, so the server clears the current value instead of keeping it

#### Scenario: An office named inside the address

- **WHEN** the address carries a Nova Poshta office identifier
- **THEN** it is sent exactly as it was given, along with every other field of the address, and the
  CLI adds no coordinates of its own

#### Scenario: An address the CLI knows nothing about

- **WHEN** the address carries fields the CLI declares no entity for
- **THEN** they are sent exactly as they were given, because the server describes the address as an
  unconstrained object and the CLI has no shape to enforce

#### Scenario: The settings the user changed reach the session

- **WHEN** the update changes the branch, the delivery type or the time slot
- **THEN** the context the session works within takes those values from the cart read that follows

### Requirement: Cart output

Cart commands SHALL compose the text they print from the payloads they received, naming every field
they show. A cart command SHALL keep failing on a payload that reports failure, after that payload
has been printed. No cart command SHALL record anything about the calls it made: the CLI keeps no
ledger.

#### Scenario: Successful call

- **WHEN** a cart command completes
- **THEN** the text it composed is written to standard output, and nothing else is written anywhere,
  however many payloads it rendered

#### Scenario: A payload that reports failure

- **WHEN** a cart payload reports that it did not succeed
- **THEN** what it carries is printed first, the cart as it stands is printed beneath it, and the
  command then exits with a failure status

#### Scenario: The command states its output

- **WHEN** a cart command prints a payload
- **THEN** every field shown is one the command named, and nothing is chosen by inspecting the
  payload's shape or a field's name

## REMOVED Requirements

### Requirement: What the cart snapshot prints

**Reason**: The requirement held that a cart line names its product by the local number recorded for
it and prints no slug, because that number reached every tool a cart line feeds. No number is
recorded, and no single form reaches every tool: a removal and a quantity change take the uuid alone,
a product card takes the slug, and the cart payload carries no external product id at all.

**Migration**: Replaced by "What a cart snapshot prints", above, which keeps every clause about
totals, units, comments, the address line and the checkout addresses unchanged.
