# shopping-cart Specification

## Purpose

Works the authorized user's active cart: finds it, reads it in full, changes what is in it, sets how and when it should be delivered, and applies gift certificates.

## Requirements

### Requirement: Cart identity

The CLI SHALL work on the cart of the session and SHALL NOT take a cart as an argument, because a
cart the caller could name is a cart the caller would first have to fetch. There SHALL be no command
whose only purpose is to print the cart's identifier.

Reading the cart SHALL repair a lapsed time slot before it answers, exactly as the delivery-resolution
capability requires of every call whose answer depends on stock or price, read and write alike. This
capability neither restates that rule nor narrows it to writes: a read repairs the slot; a read never
moves the order, so the store, the delivery type and the address are untouched by it; and the caller
is never sent to list, choose or confirm a slot to make a cart read answer correctly.

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

#### Scenario: A read repairs a lapsed slot

- **WHEN** the cart is read and the slot it sits on has already passed
- **THEN** the branch's first available slot is written back before the answer is composed, so the
  stock and the prices the snapshot prints are real rather than the slot talking, while the store, the
  delivery type and the address stay as they were and the caller is asked for nothing

### Requirement: Cart contents

The CLI SHALL put products into the cart, remove named products, and empty the cart completely, each
on the cart of the session.

Products SHALL enter the cart only through the list write path: a list of items written the way a
person writes one, resolved and written in a single cart write, as the list-resolution capability
specifies. The command that took a JSON array of products with their companies and quantities is
gone, and `silpo fill <item...>` is what replaces it. There SHALL be no command that takes a product,
a company and a quantity as a structure the caller assembled, and no cart input SHALL be a JSON
array. The company of a product SHALL be
supplied by the CLI from what it holds about that product and SHALL NOT be asked of the caller,
because the caller has no way to learn which company sells a product and the CLI does.

A removal SHALL name the products it removes as positional arguments, each a product uuid, however
many there are, and SHALL drop exactly those lines.

Changing how much of a line the cart already holds is neither an addition nor a removal, and SHALL be
a named intent of its own, specified below, taking the product and the quantity as positional values.
Nothing in this requirement forbids it: what is forbidden is a product, a company and a quantity
assembled into a structure by the caller.

#### Scenario: Add or update

- **WHEN** the caller names what to buy as free text
- **THEN** the items are resolved and the ones that resolved automatically are written to the cart in
  one call, with the company and the branch of each supplied by the CLI

#### Scenario: The company is never asked for

- **WHEN** a product is written to the cart
- **THEN** the company it is sold by is taken from what the CLI already holds about that product, and
  no command offers the caller a way to pass one

#### Scenario: Remove

- **WHEN** the caller names product uuids as positional arguments
- **THEN** exactly those lines are dropped from the cart

#### Scenario: No input is a JSON array

- **WHEN** the caller looks for a way to pass products to a cart command as a structured document
- **THEN** there is none, because every cart input is either free text or a positional identifier

#### Scenario: Clear

- **WHEN** the user clears the cart
- **THEN** every product is removed from it

### Requirement: Delivery settings of a cart

The command that sets the delivery settings SHALL be named for the settings it names rather than for
updating them, because the same command opens the cart where the account has none, and a name that
says "update" would deny half of what it does.

That command SHALL carry six things and no others: a destination as free text, a time as a person
names one, a delivery type, a branch, and the two feedback preferences an order carries — what the
picker is to do when a line cannot be filled as ordered, and whether the buyer may be telephoned about
it. It SHALL NOT carry a promo code, a bonus amount, a certificate, an adult confirmation, an address
as a structure the caller assembled, or the shipments. A promo code, a bonus amount, a certificate and
the adult confirmation are each a command of their own; an address is resolved from the destination;
the shipments are the CLI's own to write.

Each feedback preference SHALL be named by one of the two words the server uses for it — the picker's
changes approved or disapproved, and a call wanted or not wanted — and SHALL be sent only where the
caller named it, the value the cart already carries standing where the caller named none. These two
belong here rather than in commands of their own because they are settings of the order the same call
carries, not acts a caller performs once.

The shipments SHALL NOT be an option of this command or of any other. Where a branch is named, the CLI
SHALL rewrite the shipments to that branch itself, in the same call that moves the cart, because the
call carries the shipments whether or not they are the point of it and no command is left through
which a caller could state them. A cart whose branch says one store while its shipments say another is
a cart priced at a store the order will not be filled from, and until now nothing in this capability
said whose fault that was to mend.

The destination SHALL resolve the whole delivery chain — the coordinates, the delivery type, the
branch, the address object the server wants, and the slot — as the delivery-resolution capability
specifies, including its rule that ambiguity at any step prints the candidates and stops without
writing. This capability does not restate that chain; it only requires that the settings it produces
are what the cart is written with.

Where there is no cart, that command SHALL open one, and the four the creating call demands — the
delivery type, the time slot, the branch and an address carrying coordinates — SHALL be resolved from
the destination and the time rather than required of the caller. Where the destination cannot be
resolved, nothing SHALL be created and the command SHALL say which step of the chain failed.

Where there is a cart, the CLI SHALL update its delivery settings, taking from the caller only the
settings that caller means to change, and SHALL send the values the cart already carries for the
rest, because the call demands all four whether or not any of them is the subject of the change. The
address the cart carries SHALL be sent field for field where the caller named no new destination,
because the call replaces the stored address rather than merging into it.

#### Scenario: Opening the first cart

- **WHEN** the account has no cart and the caller names a destination and a time
- **THEN** a cart is opened on the delivery type, branch, address and slot the destination resolved
  to, it becomes the cart the session works within, and the output says a cart was opened rather than
  settings changed

#### Scenario: Opening without a destination

- **WHEN** a cart is being opened and no destination was named
- **THEN** the command says so and nothing is created

#### Scenario: Opening without one of the four

- **WHEN** a cart is being opened and the caller named a destination and a time and nothing else
- **THEN** nothing is missing, because the delivery type, the branch, the slot and the address are
  resolved from the destination rather than required of the caller

#### Scenario: The address type of an opened cart

- **WHEN** a cart is opened for collection or for a Nova Poshta office
- **THEN** the address the CLI writes is typed after the delivery type the destination resolved to,
  and the caller types nothing

#### Scenario: Update settings

- **WHEN** the caller names some of the destination, the time, the delivery type, the branch and the
  two feedback preferences
- **THEN** what was named is applied, what was not is taken from the session's cart, and the caller is
  not asked to restate the rest

#### Scenario: One setting changed alone

- **WHEN** the caller moves the cart to another branch and names nothing else
- **THEN** the cart's own delivery type, address and time travel with it, its shipments are rewritten
  to the branch it was moved to by the CLI, and the caller is not asked to copy anything out of the
  cart first

#### Scenario: An address the caller did not give

- **WHEN** the delivery is changed without a new destination
- **THEN** the address the cart carries is sent field for field, because the call replaces the stored
  address with whatever it is given rather than merging into it

#### Scenario: Time slot in local time

- **WHEN** the caller names a day and a wall clock time
- **THEN** the slot the cart is written with is the one the branch offers for that time, sent as the
  absolute instants the call wants, with the rest of the slot untouched

#### Scenario: Dropping a promo code or bonuses

- **WHEN** the caller wants the cart's promo code or bonus request cleared
- **THEN** it is done by the command that owns that setting, naming none, and this command carries
  neither

#### Scenario: No promo code, bonus, certificate or adult confirmation on this command

- **WHEN** the caller looks for a promo code, a bonus amount, a certificate or the adult confirmation
  among the settings this command takes
- **THEN** there is none, because each of those is a command that changes one thing

#### Scenario: An office named inside the address

- **WHEN** the destination names a Nova Poshta office
- **THEN** the address written to the cart carries the office identifier and the coordinates the CLI
  resolved for it, neither of them passed by the caller

#### Scenario: An address the CLI knows nothing about

- **WHEN** the caller looks for a way to pass an address as a structure of its own fields, known or
  unknown
- **THEN** there is none, because the address the cart is written with is the one the destination
  resolved to

#### Scenario: The caller is never asked for the four

- **WHEN** a cart is opened or its delivery is changed
- **THEN** the caller is asked for no delivery type, no branch, no slot and no address object, because
  the destination and the time resolve all four

#### Scenario: The settings the user changed reach the session

- **WHEN** the update changes the branch, the delivery type or the time slot
- **THEN** the context the session works within takes those values from the cart read that follows

#### Scenario: What the picker may do, and whether to telephone

- **WHEN** the caller names how the picker should handle a change, or whether the buyer may be called
- **THEN** that preference is written to the cart under the word the server uses for it, the other one
  keeps the value the cart already carries, and nothing else about the cart changes

#### Scenario: The shipments are the CLI's to write

- **WHEN** the caller looks for a way to pass the cart's shipments
- **THEN** there is none, because moving the cart to another branch rewrites them to that branch as
  part of the same call, leaving no state for the caller to mend afterwards

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

### Requirement: Validations are always printed

A cart payload SHALL have every validation it carries printed — its level, its type, its
message and the context it names — whether the response reported success or not. A validation
whose context is an empty list SHALL print its message alone. This holds for every cart write alike:
the list write, a change to one line, a removal, a clearing, a change of delivery settings, a promo
code, a bonus amount and a certificate.

#### Scenario: Errors inside a successful response

- **WHEN** a successful cart response carries validations at error level
- **THEN** every one of them is printed, because the response succeeded while the cart did not

#### Scenario: Context in either shape

- **WHEN** a validation carries its context as an object of named values, or as an empty list
- **THEN** the named values are printed under the validation, and an empty list adds nothing

#### Scenario: Validations of a list write

- **WHEN** a list of items is resolved and written and the cart reports validations
- **THEN** they are printed with their levels beside the resolution's own rows, because the caller
  learns from them what the cart would not take

### Requirement: Confirmation output

Every command that changes the cart — putting products in through the list, changing how much of one
line it holds, removing them, clearing the cart, setting its delivery settings, setting a promo code,
setting a bonus amount, adding or removing a certificate, and confirming the buyer is old enough —
SHALL close on the cart that resulted. It SHALL print the server's summary first, then what the CLI
itself changed on the caller's behalf, then the cart snapshot, and nothing else. It SHALL NOT print
the quantities the write echoed back, because a write echoes what was requested rather than what the
cart now holds, and the snapshot beneath it carries the truth.

The command that fills the cart from a list SHALL close on the cart in the same way, and the "nothing
else" above SHALL be read against its own composition rather than against the shape of a single-line
write. It SHALL print, in this order: the count of the items it settled and those items as names and
prices; what the CLI changed on the caller's behalf; the row per item that still needs the caller;
the validations; and then the cart snapshot. Nothing beyond those SHALL be printed.

No further command SHALL be needed to see what the cart holds after a write. This SHALL hold for the
fill as much as for any other write: a caller that has just turned a list into cart lines SHALL be
able to read the total, the bonus balance and the checkout links out of that command's own output.

#### Scenario: Products confirmed

- **WHEN** products are put in, changed or removed
- **THEN** the summary is printed and the cart beneath it shows the resulting lines, so that the
  quantity the caller reads is the quantity the cart holds

#### Scenario: A payload that carries only a summary

- **WHEN** a cart is cleared, its delivery settings are set, or a promo code or bonus amount is
  applied, and the write payload carries nothing but a summary
- **THEN** that summary is printed and the resulting cart is printed beneath it, rather than the
  command ending on a line that says nothing about the cart

#### Scenario: The write is not read twice

- **WHEN** a command changes the cart and prints the result
- **THEN** the cart is read once for that command, and the snapshot printed is that same read

#### Scenario: No read follows a write

- **WHEN** a write has printed its snapshot
- **THEN** the caller has what it needs, and a command asking for the cart again would add nothing

#### Scenario: The echoed quantity is absent

- **WHEN** a write reports back the quantities it was asked for
- **THEN** none of them is printed, because the snapshot reports what the cart holds instead

#### Scenario: A list is turned into cart lines

- **WHEN** a shopping list is resolved and written
- **THEN** the count, the settled names and prices, the CLI's own changes, the rows that need the
  caller and the validations are printed, and the cart snapshot closes the output beneath them

#### Scenario: The totals after a list is filled

- **WHEN** the caller has filled the cart from a list and needs the amount the person will pay, the
  bonus balance or the checkout links
- **THEN** all three are in that command's own output, and no second command is issued to reach them

#### Scenario: A list that settles nothing

- **WHEN** every item of a list needs the caller and none was written
- **THEN** the cart snapshot is still printed beneath the rows, because the caller learns from it
  what the cart holds regardless of what this call added

### Requirement: Gift certificate output

The certificate command SHALL print each certificate the server accepted or removed with its
barcode and face value, and SHALL print the validations of a certificate the server refused,
including the message the server wrote for the user.

#### Scenario: A refused certificate

- **WHEN** the server refuses a certificate inside a response that reports failure
- **THEN** the barcode and every validation under it are printed, the server's message
  included

#### Scenario: An accepted certificate

- **WHEN** the server accepts a certificate
- **THEN** its barcode and face value are printed

### Requirement: A quantity the branch cannot fill is reduced

Where the cart reports that a product a write just added or changed exceeds what the branch holds, the
CLI SHALL reduce that line to the quantity the report names and SHALL say what it asked for and what
it got. It SHALL reduce only lines that write itself touched, leaving a line the write did not name to
the caller who put it there.

#### Scenario: More than the branch holds

- **WHEN** a written item carries a quantity larger than the stock the cart reports for it
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

- **WHEN** the cart reports a quantity problem for a product the write did not touch
- **THEN** that line is left as it is and the problem is printed as the validation it is

#### Scenario: Nothing to reduce

- **WHEN** every product the write added fits within its stock
- **THEN** no second write is made and nothing about reduction is printed

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
product's slug SHALL be printed because it is one of the handles the product card command takes, and
because the cart payload carries no external product id — so
the slug is the only route from a cart line to the tools that answer under another form. The cart's
own identifier SHALL NOT be printed, in any form, because no command consumes it. A shipment's company
and branch SHALL be printed, unlike a product listing's, because a cart may hold more than one
shipment and neither is an argument the caller passed. The quantity, the stock and the step of a line
sold by weight SHALL name the unit they are counted in, and SHALL be the numbers the payload carried,
unconverted, so that the price, the quantity and the total on one record still multiply. The ratio
SHALL NOT be printed under a key of its own. The shipment's own id SHALL NOT be printed, because no
tool accepts it. The totals of the calculation and the bonus state SHALL be printed, and the checkout
address where the payload carries one, because the CLI offers no tool that places an order and that
address is the only way to finish one. The product image SHALL NOT be printed.

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

The products of a cart write — an addition, a quantity change or a removal — SHALL be named on the
wire by the product uuid, and the company and branch of an addition by their uuids. The CLI SHALL
send these values unchanged and SHALL NOT translate a slug or an external product id into one at the
moment of the write.

The caller SHALL NOT be required to hold a uuid in order to buy something. A caller putting products
in names them as free text, and the CLI supplies the uuid, the company and the branch. A uuid SHALL
reach the caller's eye only where a decision is owed back — an ambiguity to be answered, or a line to
be removed — and never for an item that resolved on its own.

#### Scenario: A write with a uuid

- **WHEN** the uuid a listing or a cart line printed reaches the write
- **THEN** the write reaches the tool and succeeds or fails on its own merits

#### Scenario: A write from free text

- **WHEN** the caller names what to buy in words and every item resolves automatically
- **THEN** the write reaches the tool carrying uuids, and no uuid appears in what the caller reads

#### Scenario: A uuid where a decision is owed

- **WHEN** an item is ambiguous, or a line is to be removed
- **THEN** the uuid the server issued is printed, because the caller has to pass it back

#### Scenario: A write with a slug

- **WHEN** a slug reaches the write where the tool wants a uuid
- **THEN** the command fails carrying the tool's own validation error, and no request reaches Silpo

### Requirement: How much of one line the cart holds is changed by a named intent

Changing the cart's lines SHALL be a command that names a product as its first positional value and
its quantity as its second, and takes a line's comment as an option. It SHALL change quantities,
a comment, or both, and SHALL change nothing else about the cart. Without it, a caller wanting three
of something the cart holds two of has no command at all: the list write puts products in, a removal
takes them out, and neither says how much.

Further product and quantity pairs SHALL follow the first, and all of them SHALL reach the server in
one write. The list write and the removal both already take as many products as the caller has; this
one taking a single pair is what forces a caller correcting several lines to loop over the command in
a shell. That is a loop whose quoting is easy to get wrong and whose failure looks like the CLI's,
and a cart is routinely corrected on several lines at once because a weighed line comes back at the
step its branch sells in.

Arguments that do not pair up SHALL fail saying so, before anything is written. A product named twice
SHALL fail rather than letting one quantity win silently, because a quantity is a total and two
totals for one line are a contradiction rather than a sum. A quantity that is rejected anywhere among
the pairs SHALL leave the whole call unwritten, so that a caller reading a failure does not have to
work out which half of their correction landed.

The comment option names one line's comment, so it SHALL be passed with a single pair and SHALL fail
alongside more, rather than writing one comment onto every line named.

The quantity SHALL be the quantity the line is to hold and SHALL NOT be an amount added to what it
holds, because a caller asking for three instead of two says three. There SHALL be no option that
turns it into an increment. It SHALL be greater than nothing: a line is emptied by removing it, not by
setting it to nothing, so that a caller reading the command cannot mistake one act for the other.

A product sold by weight SHALL be named in kilograms, in multiples of the step the cart snapshot
prints for that line. A quantity that is not such a multiple SHALL fail naming the step the line is
sold in, rather than being rounded to one, because a rounded weight is a quantity the caller did not
ask for and would read back as the CLI's own.

Where a comment is named, it SHALL replace the comment the line carries. Where none is named, the
comment the line carries SHALL be sent again unchanged, by the same rule that governs a reduction:
the write replaces the line rather than amending it, so a comment not re-sent is a comment lost.

#### Scenario: Several lines corrected at once

- **WHEN** the caller names several product and quantity pairs
- **THEN** every line is set to its named quantity in a single write to the server

#### Scenario: A product left without a quantity

- **WHEN** the arguments do not pair up
- **THEN** the command fails saying so and nothing is written

#### Scenario: One product named twice

- **WHEN** the same product appears in two pairs
- **THEN** the command fails naming it, rather than taking either quantity

#### Scenario: A quantity rejected among several pairs

- **WHEN** any one of the named quantities is rejected
- **THEN** nothing is written, including the pairs that would have been accepted

#### Scenario: A comment named alongside several pairs

- **WHEN** the comment option is passed with more than one pair
- **THEN** the command fails, rather than writing that comment onto every line named

#### Scenario: Three instead of two

- **WHEN** the caller names a product the cart holds and a larger quantity
- **THEN** that line holds the named quantity, every other line is untouched, and the resulting cart
  is printed

#### Scenario: The quantity is not an increment

- **WHEN** the caller looks for a way to add to what a line already holds rather than state its total
- **THEN** there is none, because the quantity named is the quantity the line ends with

#### Scenario: Nothing is not a quantity

- **WHEN** the caller sets a line to nothing
- **THEN** the command fails naming the removal as the way to take a line out of the cart

#### Scenario: A line sold by weight

- **WHEN** the caller changes a weighted line and names the quantity in kilograms as a multiple of
  the step the snapshot printed
- **THEN** that weight is written, named in the same unit the snapshot prints it in

#### Scenario: A weight the step does not divide

- **WHEN** the quantity named for a weighted line is not a multiple of that line's step
- **THEN** the command fails naming the step, and nothing is rounded on the caller's behalf

#### Scenario: A comment changed alone

- **WHEN** the caller names the quantity the line already holds together with a new comment
- **THEN** the comment is replaced and the quantity is unchanged

#### Scenario: A comment survives a quantity it was not named with

- **WHEN** the quantity of a line carrying a comment is changed and no comment is named
- **THEN** the comment the line carried is sent again with the new quantity and still stands afterwards

#### Scenario: A product the cart does not hold

- **WHEN** the caller names a product no line of the cart carries
- **THEN** the command fails naming that product and names the list write as the way to put it in,
  because there is no line whose company and branch it could take

### Requirement: A promo code and a bonus amount are each a command of their own

Setting a promo code and spending bonuses SHALL each be a command that changes that one thing and
carries the cart's other settings forward untouched. Because each command changes one thing by
construction, there SHALL be no rule asking the caller to pass only what is changing: there is
nothing else to pass.

Each SHALL also take a word meaning none, which clears the value the cart carries rather than leaving
it standing.

#### Scenario: A promo code applied

- **WHEN** the caller sets a promo code
- **THEN** the code is applied, every other delivery setting of the cart is unchanged, and the
  resulting cart is printed

#### Scenario: A promo code cleared

- **WHEN** the caller sets the promo code to none
- **THEN** the cart's promo code is cleared rather than kept

#### Scenario: A bonus amount

- **WHEN** the caller names an amount of bonuses to spend, or names none
- **THEN** that amount is requested, or the request is cleared, and nothing else about the cart
  changes

### Requirement: A gift certificate is added and removed by its barcode

A gift certificate SHALL be added to the cart, and removed from it, by the barcode it is printed
under, named as a positional argument. Where a certificate is protected by a pin, the pin SHALL be
given as an option of its own. Adding and removing SHALL be separate acts of the command rather than
two lists passed together.

#### Scenario: A certificate added

- **WHEN** the caller adds a certificate by its barcode, with a pin where the certificate needs one
- **THEN** it is applied to the cart and the resulting cart is printed

#### Scenario: A certificate removed

- **WHEN** the caller removes a certificate by its barcode
- **THEN** it is taken off the cart and the resulting cart is printed

#### Scenario: Adding and removing are not one call

- **WHEN** the caller looks for a way to add one certificate and remove another in a single call
- **THEN** there is none, because the command names one act and one barcode

### Requirement: The adult confirmation is an act of its own, and it is one-way

Confirming that the buyer is old enough to be sold restricted goods SHALL be a command that does that
and nothing else, carrying the cart's other settings forward untouched.

The confirmation SHALL be one-way: the server accepts the setting of it, and answers a request to
clear it with success while ignoring it. The CLI SHALL state that where it describes the command,
because a caller that reads success and sees the flag still standing would otherwise take it for a
fault of the CLI. The CLI SHALL NOT offer a way to clear it that it cannot honour.

No other command SHALL set the confirmation on the caller's behalf. Where a list write puts something
in the cart that needs it, the resolution SHALL say so as a warning row naming the product, and the
confirmation SHALL remain an explicit act, because confirming an age is a statement about the person
and not a step in filling a basket.

#### Scenario: The confirmation is given

- **WHEN** the caller confirms the buyer is old enough
- **THEN** the cart carries the confirmation, nothing else about the cart changes, and the resulting
  cart is printed

#### Scenario: The confirmation cannot be taken back

- **WHEN** the caller looks for a way to clear a confirmation already given
- **THEN** the CLI offers none and says the flag is one-way, because the server answers such a request
  with success and no effect

#### Scenario: A list write does not confirm on the caller's behalf

- **WHEN** a list resolves an item that needs the confirmation and the cart carries none
- **THEN** the item carries a warning row naming what it needs, and the confirmation is not set

### Requirement: A line the branch cannot fill at all is named and left in the cart

Where a product a write added cannot be reduced to any quantity — because the branch holds none
of it, or carries no offer for it at all — the CLI SHALL leave the line in the cart and SHALL name it
as unfillable. The CLI
SHALL NOT remove the line, because the caller asked for that product and only the caller can decide
to give it up.

The cart write is the authority on stock. Nothing the CLI holds about a product SHALL be consulted in
its place, and nothing it holds SHALL be trusted to say a product is available.

#### Scenario: Nothing left at the branch

- **WHEN** a product a write added is reported with no stock at the branch
- **THEN** the line stays in the cart, the output names the product as unfillable, and the command
  fails

#### Scenario: The branch does not carry the product

- **WHEN** a product a write added is reported as having no offer at the branch
- **THEN** the line stays in the cart and is named the same way

### Requirement: A shopping list is filled from the cart family

Turning a shopping list into cart lines SHALL be a command of the cart family, named for what it does
to the cart. It writes to the cart, it reports the cart it produced, and its outcome is a cart — so it
belongs beside the commands that change a line, empty the cart and set its delivery, rather than
standing at the top level as a family of one.

What it does with a list SHALL be unchanged by where it is named: the resolution, the outcomes it
sorts items into, and the way an unresolved item is answered are the list-resolution capability's, and
this requirement SHALL NOT restate them.

The command SHALL resolve products by the same ranker and the same policy as the product listing, so
that neither can drift into being the smarter path.

What the two rank SHALL be the same. For the same words against the same branch, both SHALL draw the
same population — the catalogue's answer to the same probes — and rank it with the one ranker under
the one policy. Neither SHALL be able to name a product the other fails to find.

Where they SHALL differ is in settling, which only one of them does. Ranking puts the candidates in
an order; settling picks one, and picking one requires separating candidates the order left level. The
fill therefore consults what the listing does not — the caller's own purchases and saved products,
under the list-resolution capability's rule — and only ever to choose among candidates the ranking has
already tied. That is why a term whose candidates are tied MAY be written to the cart as a product
other than the one the listing printed first, and it is the only way the two may diverge. Neither
SHALL consult anything the other cannot while ranking.

#### Scenario: The list is filled from the cart family

- **WHEN** a caller turns a shopping list into cart lines
- **THEN** the command is one of the cart's own, beside the commands that change and empty it

#### Scenario: One ranker, one corpus

- **WHEN** the same words are given to the fill and to the listing against the same branch
- **THEN** both drew the same population from the same probes and ranked it with the one ranker under
  the one policy
- **AND** where the ranking leaves one product clearly first, that product is the one the fill acts
  on, the two differing only in that one printed it and the other wrote it to the cart

#### Scenario: A tie the fill settles and the listing does not

- **WHEN** a term's best candidates are level, and one of them is a product the caller has bought
- **THEN** the listing prints them in the ranked order, unshaped by that purchase
- **AND** the fill writes the bought one, having had to choose where the listing did not

#### Scenario: Neither path remembers what the other saw

- **WHEN** a listing is run and then a fill is run for the same words
- **THEN** the fill draws its own answer from the catalogue and is neither faster nor better informed
  for the listing having run first

### Requirement: Every quantity written to a cart is one the cart would accept

Whatever path writes a quantity to a cart line — a named intent, a shopping list resolved on the
caller's behalf, or a line reduced to what the branch can fill — that quantity SHALL satisfy the
same rules. It SHALL be greater than nothing, and where the product is sold by weight it SHALL be
a whole multiple of the step the branch sells that product in.

Held apart, the paths drifted: the list path wrote 0.5 kg of a carrot sold in steps of 0.2, and
1 kg of a sausage sold in steps of 0.35, and wrote a line holding nothing at all — every one of
which the named-intent path refuses for the same line of the same cart.

Where the two paths differ, they SHALL differ only in what they do with a quantity the rule
rejects, and the difference SHALL be the presence of a caller to correct it. A weight typed into a
named intent is refused, naming the step. A weight derived from an item on a list, or from a stock
figure the branch reported, is brought to a legal step and the change is stated, there being
nobody to retype it.

#### Scenario: A list never writes what a named intent would refuse

- **WHEN** a shopping list settles a line at some quantity
- **THEN** setting that same line to that same quantity through a named intent is accepted

#### Scenario: A reduced line is reduced to a legal quantity

- **WHEN** a line is reduced to the stock the branch reported and that stock is not a whole
  multiple of the line's step
- **THEN** the line is reduced to the largest whole number of steps within that stock

#### Scenario: A derived weight is raised where a typed weight is refused

- **WHEN** a list item names 300 g of a product sold in steps of 0.5 kg
- **THEN** the list writes 0.5 kg and says it raised the amount, while typing 0.3 for that line
  fails naming the step
