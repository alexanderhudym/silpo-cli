## MODIFIED Requirements

### Requirement: Cart identity

The CLI SHALL work on the cart of the session and SHALL NOT take a cart as an argument, because a
cart the caller could name is a cart the caller would first have to fetch. There SHALL be no command
whose only purpose is to print the cart's identifier.

#### Scenario: Active cart

- **WHEN** a command needs the authorized user's active cart
- **THEN** the session resolves it, and the user is neither asked for it nor shown it

#### Scenario: Cart snapshot

- **WHEN** the user asks for the details of the cart
- **THEN** the CLI returns the session's cart in full: its products, its totals, and its delivery
  context, without being told which cart that is

#### Scenario: No command names the cart

- **WHEN** the user looks for a way to ask the CLI for the cart's identifier
- **THEN** there is none, because nothing takes one

### Requirement: Cart contents

The CLI SHALL add products to the cart or change their quantities in one call, remove named products,
and empty the cart completely, each on the cart of the session.

#### Scenario: Add or update

- **WHEN** the user passes a JSON array of products with their company and quantity
- **THEN** the entries are forwarded as one call, so it can both add new lines and change existing
  quantities, with the company of each entry resolved from the local number it may be given as, and
  the branch taken from the session

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
An address the caller does give SHALL be sent as it was given, except that a Nova Poshta office named
inside it SHALL be resolved to the uuid the call needs. A move to another branch, feedback
preferences, adult confirmation, a promo code and a bonus amount SHALL stay optional and SHALL be
sent only where the caller gave them.

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

- **WHEN** the address carries a Nova Poshta office identifier as a local number
- **THEN** the uuid recorded under that number is sent in its place, and every other field of the
  address reaches the call as it was given

#### Scenario: An address the CLI knows nothing about

- **WHEN** the address carries fields the CLI declares no entity for
- **THEN** they are sent exactly as they were given, because the server describes the address as an
  unconstrained object and the CLI has no shape to enforce

#### Scenario: The settings the user changed reach the session

- **WHEN** the update changes the branch, the delivery type or the time slot
- **THEN** the context the session works within takes those values from the cart read that follows

### Requirement: Gift certificates

The CLI SHALL add and remove gift certificates on the session's cart, in one call if needed.

#### Scenario: Add and remove together

- **WHEN** the user passes certificates to add, to remove, or both
- **THEN** each list is forwarded as given, and a list the user did not pass is left unset

### Requirement: Confirmation output

Every command that changes the cart — adding or updating products, removing them, clearing the cart,
updating its delivery settings, and applying certificates — SHALL close on the cart that resulted.
It SHALL print the server's summary first, then what the CLI itself changed on the caller's behalf,
then the cart snapshot, and nothing else. It SHALL NOT print the quantities the write echoed back,
because a write echoes what was requested rather than what the cart now holds, and the snapshot
beneath it carries the truth.

#### Scenario: Products confirmed

- **WHEN** products are added, updated or removed
- **THEN** the summary is printed and the cart beneath it shows the resulting lines, so that the
  quantity the caller reads is the quantity the cart holds

#### Scenario: A payload that carries only a summary

- **WHEN** a cart is cleared or its delivery settings are updated, and the write payload carries
  nothing but a summary
- **THEN** that summary is printed and the resulting cart is printed beneath it, rather than the
  command ending on a line that says nothing about the cart

#### Scenario: The write is not read twice

- **WHEN** a command changes the cart and prints the result
- **THEN** the cart is read once for that command, and the snapshot printed is that same read

#### Scenario: The echoed quantity is absent

- **WHEN** a write reports back the quantities it was asked for
- **THEN** none of them is printed, because the snapshot reports what the cart holds instead

### Requirement: Cart output

Cart commands SHALL compose the text they print from the payloads they received, naming every field
they show, and SHALL record the call for token accounting. A cart command SHALL keep failing on a
payload that reports failure, after that payload has been printed.

#### Scenario: Successful call

- **WHEN** a cart command completes
- **THEN** the text it composed is written to standard output and the call is recorded with its
  token counts, a command that rendered more than one payload counting them together

#### Scenario: A payload that reports failure

- **WHEN** a cart payload reports that it did not succeed
- **THEN** what it carries is printed first, the cart as it stands is printed beneath it, and the
  command then exits with a failure status

#### Scenario: The command states its output

- **WHEN** a cart command prints a payload
- **THEN** every field shown is one the command named, and nothing is chosen by inspecting the
  payload's shape or a field's name

## ADDED Requirements

### Requirement: What the cart snapshot prints

The cart snapshot SHALL print the cart's delivery type, its time slot as local wall clock time, and
its address joined into one line by the shared address conversion. Each shipment SHALL be printed
with the local numbers of its company and branch, holding its products as records that show the
product's local number, quantity, line total, discount, stock, the step it is sold in when the
product is weighted, and the comment where the line carries one, and that close with the same keyless
line of name and price a product listing uses — the name, the size of one package where the product
is sold by the piece, the price with its currency and the unit it is per where the product is sold by
weight, and the previous price where the line carries one. The product's slug SHALL NOT be printed,
for the reason it is absent from a product listing's records. The cart's own identifier SHALL NOT be
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
- **THEN** its company and its branch appear as the local numbers those two are named by

#### Scenario: The cart does not name itself

- **WHEN** a cart snapshot is printed
- **THEN** no identifier for the cart appears, neither a local number nor a uuid, because nothing
  takes one back

#### Scenario: A line names its product by number

- **WHEN** a cart line is printed
- **THEN** it names its product by the local number recorded for it, and prints no slug, because that
  number reaches every tool a cart line feeds

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

### Requirement: A quantity the branch cannot fill is reduced

Where the cart reports that a product the command just added exceeds what the branch holds, the CLI
SHALL reduce that line to the quantity the report names and SHALL say what it asked for and what it
got. It SHALL reduce only lines the command itself added, leaving a line that was already in the cart
to the caller who put it there.

#### Scenario: More than the branch holds

- **WHEN** the user adds a quantity of a product larger than the stock the cart reports for it
- **THEN** the line is reduced to that stock, and the output names the product, the quantity asked
  for and the quantity kept

#### Scenario: A reduced line keeps what it was added with

- **WHEN** a line carrying a comment is reduced
- **THEN** the comment is sent again with the reduced quantity, because the re-send replaces the line
  rather than amending it

#### Scenario: The cart itself reports the slot as unusable

- **WHEN** the cart that comes back reports a time slot problem, which makes every line report no
  stock
- **THEN** nothing is reduced and nothing is named unfillable, because the stock figures are the
  slot talking rather than the branch

#### Scenario: An existing line already over stock

- **WHEN** the cart reports a quantity problem for a product the command did not touch
- **THEN** that line is left as it is and the problem is printed as the validation it is

#### Scenario: Nothing to reduce

- **WHEN** every product the command added fits within its stock
- **THEN** no second write is made and nothing about reduction is printed

### Requirement: A line the branch cannot fill at all is named, not removed

Where a product the command added cannot be reduced to any quantity — because the branch holds none
of it, or carries no offer for it at all — the CLI SHALL leave the line in the cart and SHALL name it
as unfillable, together with the replacements the server offers for it where it offers any. The CLI
SHALL NOT remove the line, because the caller asked for that product and only the caller can decide
to give it up.

#### Scenario: Nothing left at the branch

- **WHEN** a product the command added is reported with no stock at the branch
- **THEN** the line stays in the cart, the output names the product as unfillable, and the command
  fails

#### Scenario: The branch does not carry the product

- **WHEN** a product the command added is reported as having no offer at the branch
- **THEN** the line stays in the cart and is named the same way

#### Scenario: Replacements are offered

- **WHEN** the server offers replacements for an unfillable product
- **THEN** they are printed beneath it, so the caller can choose one without a further lookup

#### Scenario: No replacements are offered

- **WHEN** the server offers no replacements for an unfillable product
- **THEN** the product is named alone, and the empty result is not reported as a failure of its own

## REMOVED Requirements

### Requirement: Cart snapshot output

**Reason**: The snapshot no longer prints the cart's local number, and a requirement that mandates
printing an identifier no command consumes cannot be edited into one that forbids it. Replaced by
"What the cart snapshot prints", which is the same contract without the cart id.

**Migration**: None for the caller. Scripts that read the cart's number off the first line should
drop that read — no command accepts the value.
