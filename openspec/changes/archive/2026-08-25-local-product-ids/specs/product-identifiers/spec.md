## Purpose

Gives every product a short local number the user can paste into any option that takes a
product, and defines how that number, a remote uuid or a slug is turned into whichever of the
three identifiers the tool behind the option actually requires.

## ADDED Requirements

### Requirement: A product is recorded by its remote identity

The CLI SHALL keep a record of every product it has seen, holding a local number assigned in
the order records are created, the identifier the server uses for that product, its slug where
a payload gave one, and its external product id where a payload gave one. A record SHALL NOT
exist without the server's identifier, which SHALL name at most one record. The slug and the
external product id SHALL each be allowed to be absent, because the payloads that carry a
product do not all carry all three.

The CLI SHALL create or update a record whenever a payload gives it a product's server
identifier, whichever command printed it. A record made without a slug or without an external
product id SHALL be completed when a later payload supplies one, and a payload naming a
product without one of them SHALL NOT take away a value the record already holds. A record
SHALL NOT be scoped to a branch, the server naming one product by one identifier at every
branch.

The external product id SHALL be stored only as the server sent it, and SHALL NOT be filled in
by deriving it from anything else at the time a record is written.

#### Scenario: A product is seen for the first time

- **WHEN** a payload carries a product the CLI holds no record of
- **THEN** a record is created with the next local number, the server's identifier, and
  whichever of the slug and the external product id that payload carried

#### Scenario: A product is seen again

- **WHEN** a payload carries a product the CLI already holds a record of
- **THEN** the existing local number is kept and any identifier the payload adds is filled in

#### Scenario: A payload that carries less than the record holds

- **WHEN** a payload names a product by its identifier alone and the record already holds a
  slug or an external product id
- **THEN** those values are left as they are rather than cleared

#### Scenario: An identifier that sits beside the product rather than inside it

- **WHEN** a payload names a product's identifiers in more than one place, as an in-store
  receipt does by carrying the article code on the line and the catalogue product within it
- **THEN** the record is completed from all of them together, so the product is recorded with
  the external product id the line carried and not only with what the nested part held

#### Scenario: A product carried by an order history

- **WHEN** an order line names a product by its identifier and gives neither a slug nor an
  external product id
- **THEN** a record is created holding the identifier alone

#### Scenario: One record across branches

- **WHEN** the same product is printed for two different branches
- **THEN** both printings name the same local number, one record standing for the product
  itself

#### Scenario: Local numbers are not reassigned

- **WHEN** products are recorded over several commands
- **THEN** each keeps the number it was given, and adding a product never renumbers the ones
  already recorded

### Requirement: A payload short of an identifier is resolved where it can be

Where a payload names a product by an external product id and nothing else, the CLI SHALL look
that code up so the product can be recorded and named, asking once per distinct code it does
not already hold a record for, and asking for them together rather than in turn. Where the
lookup answers, the product SHALL be recorded and printed by its local number like any other,
and the record SHALL keep the article code the payload named it by, that code being what the
server sent rather than anything the CLI worked out.

Where the lookup does not answer, or where a payload names a product with no identifier the
CLI can resolve at all, the CLI SHALL print what that payload does carry, SHALL NOT create a
record, and SHALL NOT invent an identifier for it. Rendering SHALL NOT fail on account of a
product it could not resolve, an absent identifier being an absence rather than an error.

#### Scenario: A receipt line with no catalogue entry

- **WHEN** an in-store receipt line names a product the server gives no catalogue entry for,
  carrying its article code alone
- **THEN** that code is looked up, and the product is recorded and printed by its local number

#### Scenario: A receipt line whose product no longer exists

- **WHEN** the lookup for such a line answers that there is no such product
- **THEN** the line prints its quantity, name and price and no identifier, nothing is recorded
  for it, and the command neither fails nor retries

#### Scenario: A code already recorded is not looked up again

- **WHEN** a receipt line names an article code the CLI already holds a record for
- **THEN** the local number of that record is printed and no lookup is made

#### Scenario: One lookup per distinct code

- **WHEN** several lines of one page name the same article code
- **THEN** it is looked up once and every one of those lines prints the same local number

### Requirement: Three ways to name a product

An option or a positional argument that takes a product SHALL accept the local number, the
server's identifier, or the slug, and SHALL decide which was given from the shape of the text:
a run of digits is a local number, a value in the form of a uuid is a server identifier, and
anything else is a slug.

#### Scenario: A local number

- **WHEN** a product argument is given as digits only
- **THEN** it is looked up as a local number

#### Scenario: A server identifier

- **WHEN** a product argument is given in the form of a uuid
- **THEN** it is looked up as the server's identifier

#### Scenario: A slug

- **WHEN** a product argument is neither digits only nor in the form of a uuid
- **THEN** it is looked up as a slug

#### Scenario: The external product id is not one of the three

- **WHEN** a product argument is given as an external product id
- **THEN** it is read as a local number, as its shape says, and resolves to whatever record
  carries that number or to nothing

### Requirement: A product resolves to the form its call needs

Having found the record, the CLI SHALL pass on whichever of the three identifiers the tool
being called requires, so that the same text typed by the user reaches one tool as the
server's identifier, another as the slug, and another as the external product id.

#### Scenario: A call that takes the server's identifier

- **WHEN** a resolved product is passed to a call naming a product by the server's identifier
- **THEN** the recorded identifier is sent

#### Scenario: A call that takes the slug

- **WHEN** a resolved product is passed to a call naming a product by its slug
- **THEN** the recorded slug is sent

#### Scenario: A call that takes the external product id

- **WHEN** a resolved product is passed to a call naming a product by its external product id
- **THEN** the external product id the record resolves to is sent

### Requirement: A missing identifier is resolved in a fixed order

Where the record does not hold the identifier a call requires, the CLI SHALL try to obtain it,
trying the cheapest source first and stopping at the first that answers. The CLI SHALL first
read the external product id out of the slug, and only then ask the product card tool.
Whatever a step returns SHALL be recorded before the command continues, so that the same
resolution is not paid for twice.

The external product id SHALL be read out of a slug as the digits following the last hyphen,
and a slug whose text after the last hyphen is not a run of digits SHALL yield no external
product id rather than an unusable value. Because the card carries no external product id, a
resolution that ends at the card SHALL take that identifier from the slug the card returned,
reading it as this same step does rather than storing a value the server never sent.

The product card tool SHALL be reached as the last step, taking whichever of the three
identifiers the CLI holds as its key — the server's identifier, the slug or the article code
alike — and answering with the identifier and the slug. What it answers SHALL NOT depend on the
delivery context the request names, a product carrying the same identifiers at every shop and at
every hour, so every command SHALL be able to reach it whether or not it holds one.

Where the command names a branch, or a branch stands beside the product in the same entry of a
JSON argument, the CLI SHALL ask under that branch. Where none is named the CLI SHALL fill the
branch the tool demands with the nil identifier rather than choosing a shop, and SHALL NOT treat
the absence of a branch as a reason to leave a product unresolved. The rest of the delivery
context the tool demands SHALL be filled with fixed values carrying no meaning, because the
server requires the fields and reads none of them.

Where a JSON argument carries a product and a branch in one entry, as a cart update does, that
branch SHALL be read before the product, so that a field is not resolved without a value sitting
beside it.

Resolution SHALL NOT be recorded as a call of the command that caused it, being work the CLI
does under the hood rather than an answer the caller asked for.

The batch search tool SHALL NOT be used to resolve a product. It ranks matches rather than
looking one up, and misses products the same server resolves by the same code at the same
branch.

#### Scenario: The external product id comes from the slug

- **WHEN** a call needs an external product id for a product whose record holds a slug but no
  external product id
- **THEN** the digits after the last hyphen of the slug are used, and no call is made

#### Scenario: A slug that carries no number

- **WHEN** the text after the last hyphen of a slug is not a run of digits
- **THEN** no external product id is taken from it, and resolution moves on rather than
  sending an unusable value

#### Scenario: An unrecorded slug where the slug is what is wanted

- **WHEN** a product argument names a slug the CLI holds no record of and the call being made
  names a product by its slug
- **THEN** the slug is sent as it was typed and no lookup is made, the argument already being
  the value the call wants

#### Scenario: An unrecorded slug where the identifier is what is wanted

- **WHEN** a product argument names a slug the CLI holds no record of and the call being made
  names a product by the server's identifier
- **THEN** the value counts as unresolved, because no step can supply an identifier from a slug

#### Scenario: Only an identifier is held

- **WHEN** a call needs a slug or an external product id for a product whose record holds the
  server's identifier alone, and the command names a branch
- **THEN** the CLI asks the product card tool for that product at that branch, records the slug
  it answers with, and continues

#### Scenario: The card supplies no external product id of its own

- **WHEN** a call needs an external product id and the card is what answered
- **THEN** the number is read out of the slug the card returned, and the record keeps only what
  the server sent

#### Scenario: A command that names no branch

- **WHEN** a command holding no branch at all needs an identifier it has no record of, as
  removing a product from the cart by its slug does
- **THEN** the branch the tool demands is filled with the nil identifier, the product resolves,
  and no shop is chosen on the caller's behalf

#### Scenario: A branch standing beside the product in one JSON entry

- **WHEN** one entry of a JSON argument names a product the CLI holds no record of and a branch
  in the same entry
- **THEN** that branch is read first and the lookup for that product is made under it

#### Scenario: A product no lookup answers for

- **WHEN** the lookup finds no product for any key the CLI can offer
- **THEN** the value counts as unresolved and the command fails naming it, whether or not a
  branch was named

#### Scenario: The cheaper step is preferred

- **WHEN** a needed identifier can be had from the record or from the slug
- **THEN** no call of any kind is made to obtain it

#### Scenario: What a lookup returns is kept

- **WHEN** a lookup resolves a product
- **THEN** its record is completed, and a later command needing the same identifier makes no
  call

### Requirement: An unresolved product fails the command

Where a product argument matches no record and cannot be resolved by any of the steps above,
the CLI SHALL fail the command, naming the value it could not resolve, and SHALL NOT call the
tool with the text as typed. A local number matching no record SHALL fail without fetching any
listing to look for it.

#### Scenario: A local number nothing was recorded under

- **WHEN** a product argument is digits that match no record
- **THEN** the command fails naming the value, no tool is called, and no listing is fetched to
  search for it

#### Scenario: A slug nothing resolves

- **WHEN** a product argument names a slug that neither the records nor any lookup resolve
- **THEN** the command fails naming the value, and the call it was meant for is not made

#### Scenario: An identifier that resolves to no slug

- **WHEN** a call needs a slug for a product every step fails to supply one for
- **THEN** the command fails naming the value rather than calling the tool without it

#### Scenario: A lookup that fails

- **WHEN** a step of the resolution answers with an error
- **THEN** the value counts as unresolved and the command fails naming it, rather than the
  error reaching the user as it came
