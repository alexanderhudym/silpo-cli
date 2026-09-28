## Purpose

Turns a destination named the way a person names one — an address, a store, a Nova Poshta office —
into the store, the delivery type, the address and the time slot a cart needs, so that the caller
states where the order goes and not how to look it up.

## ADDED Requirements

### Requirement: A destination resolves the whole delivery chain

Given a destination as free text, the CLI SHALL resolve, in one command, every setting a cart needs
to carry it: the coordinates of the destination, the delivery type that serves it, the branch that
supplies it, the address object in the form the server wants, and a time slot — and SHALL write them
to the cart.

The caller SHALL NOT be required to pass coordinates, a delivery type, a branch, or a slot to do
this.

A branch that would otherwise supply the destination but carries no available slot for the
requested time does not serve it. The preferred courier delivery type is chosen first, from the
delivery types the server returned for that point, before any slot is probed. Where the preferred
type serves the destination, its own branch is the one probed for a slot: if it carries one, that
type is taken; if it does not, the command SHALL NOT fall through to a different delivery type. It
SHALL instead fail, naming the preferred delivery type and the day, and naming the other delivery
types whose branches do carry a slot for that day, so that the caller who genuinely wants one of
them can say so explicitly. Only where the preferred type does not serve the destination at all, and
more than one other delivery type does, are the branches among those others filtered to the ones
that carry an available slot for the requested time, and the rule that stops on an ambiguity no rule
separates applied to whichever of them remain. This check SHALL be bounded by the delivery types the
server returned for that point, never by a walk over the branch listing. Where none of the branches
serving the destination carries an available slot, the command SHALL fail saying so without singling
out one branch, so that the caller learns it is the day that has no room rather than that one store
cannot serve the address at all.

Where the caller names a delivery type alongside the destination, that named type stands in place of
the preference: it is the one probed for a slot, not `DeliveryHome`, and the command SHALL NOT fall
back to the preference when the named type fails. Everything else about the destination — its
coordinates, the branch, and the address object — is still resolved from the destination itself, not
from the named type. A named type that is not among the delivery types the server returned for that
point does not serve the destination, and the command SHALL fail saying so before any slot is probed.
A named type that does serve the destination but whose branch carries no available slot for the
requested day SHALL fail exactly as the day-and-branch failure below does. This is what makes a
refusal that named an alternative type actionable: repeating the same command with that type passed
as `--delivery-type` reaches that type's own branch and slot rather than the preference's.

#### Scenario: A home address

- **WHEN** the caller names a street address to deliver to
- **THEN** the address is geocoded, a courier delivery type serving it is selected, a branch that
  serves it is selected, an available slot is taken, and the cart is written with all four

#### Scenario: A store to collect from

- **WHEN** the caller names a Silpo store to collect from
- **THEN** the delivery type is self-pickup, the address carries the store's own coordinates, and a
  collection slot is taken

#### Scenario: The preferred type has no slot on the requested day

- **WHEN** an address is served by the preferred delivery type and by at least one other delivery
  type, and the branch bound to the preferred type carries no available slot for the requested day
  while another delivery type's branch does
- **THEN** the command fails naming the preferred delivery type and the day, and naming the other
  delivery type as one the caller can request explicitly, and the cart is unchanged — the preferred
  type is never quietly replaced by the other one

#### Scenario: No branch serving the destination has a slot

- **WHEN** every delivery type serving the destination is bound to a branch with no available slot
  for the requested time
- **THEN** the command fails saying no branch serving the destination has a slot for that time,
  rather than reporting one branch as if it alone had failed

#### Scenario: A caller-named delivery type replaces the preference

- **WHEN** the caller names a delivery type that is among the delivery types the server returned for
  the destination, and its own branch carries an available slot for the requested time
- **THEN** that type's branch, address and slot are taken without the preference being probed at all,
  and the cart is written with the named type

#### Scenario: A caller-named delivery type that does not serve the destination

- **WHEN** the caller names a delivery type that is not among the delivery types the server returned
  for the destination
- **THEN** the command fails saying that type does not serve the destination, before any slot is
  probed, and the cart is unchanged

#### Scenario: A caller-named delivery type with no slot on the day

- **WHEN** the caller names a delivery type that does serve the destination, and its branch carries no
  available slot for the requested day
- **THEN** the command fails naming that branch and that day, the same failure a named day with no
  slot produces anywhere else in this chain, and the command does not fall back to the preference or
  to any other delivery type

### Requirement: Ambiguity prints the candidates and stops

Where any step of the chain has more than one plausible candidate and no rule separates them, the
CLI SHALL print the candidates and stop without writing.

It SHALL NOT take the first candidate of a listing. A store listing is not ordered by anything the
caller cares about.

This applies to a destination text matching several saved addresses, to several branches serving a
point equally, and to a Nova Poshta name matching several offices.

An exact match is a rule that separates candidates. Where exactly one candidate's own address
string equals the text the caller gave, that candidate SHALL be taken, and the command SHALL NOT
stop. The comparison SHALL be case-insensitive and SHALL normalise surrounding and repeated
whitespace. For a geocoded candidate, whose own address string the server is free to spell
differently from how the caller wrote it — a street-type word abbreviated on one side and spelled
out on the other, a building-number prefix present on one side and absent on the other — the
comparison SHALL also tolerate that difference, so that a rewrite the caller did not choose and
could not predict does not turn an answer that was really unambiguous into a stop. Where none
matches even so, or more than one does, the ambiguity stands as above. A candidate carries no other
handle a caller could name back, so its own printed address string is the only one this rule reads,
and what is printed SHALL be exactly that string, so that a caller facing an ambiguity this rule did
not resolve can answer it by copying a candidate's address back verbatim.

Two stores can stand at the same address closely enough that no exact match, and no rewording, ever
tells them apart — the text a caller could copy back is identical for both. Where every candidate an
ambiguity prints carries an identifier a later call accepts back — a branch uuid `cart setup
--branch` takes — the printed block SHALL say, in one line, which option accepts it, so the caller
who cannot separate the candidates by address still has an answer.

#### Scenario: The destination matches two saved addresses

- **WHEN** the destination text matches two of the caller's saved addresses
- **THEN** both are printed with what distinguishes them, and the cart is not written

#### Scenario: One candidate's address matches the text exactly

- **WHEN** the destination text matches more than one candidate but equals, case-insensitively and
  whitespace-normalised, the own address string of exactly one of them
- **THEN** that candidate is taken and the cart is written, without printing the others

#### Scenario: The server rewrote the address the caller typed

- **WHEN** the destination text matches more than one geocoded candidate, and the server's own
  address string for exactly one of them differs from the text only in how a street-type word is
  abbreviated or in whether a building-number prefix is present
- **THEN** that candidate is taken and the cart is written, without printing the others

#### Scenario: Two stores share one address

- **WHEN** the destination text matches two stores whose printed address is the same string
- **THEN** both are printed with their own branch uuid, and the block names `cart setup --branch`
  as the option that takes one of those uuids back

#### Scenario: One branch clearly serves the point

- **WHEN** exactly one branch serves the destination for the chosen delivery type
- **THEN** it is selected without asking

### Requirement: A time is named the way a person names it

A time SHALL be accepted as a relative word — today, tomorrow — as a date, or as a date and a wall
clock time. Given a day rather than a slot, the CLI SHALL take the earliest available slot on that
day at the selected branch.

Where the named day has no available slot, the command SHALL fail saying so, and SHALL NOT silently
book another day.

#### Scenario: Tomorrow

- **WHEN** the caller asks for delivery tomorrow
- **THEN** the earliest available slot on the following day is taken

#### Scenario: No slot on the named day

- **WHEN** the named day has no available slot at the selected branch
- **THEN** the command fails naming the day and the branch, and the cart is unchanged

### Requirement: A Nova Poshta destination supplies its own coordinates

Where the destination is a Nova Poshta office, the CLI SHALL resolve the settlement, then the
office, and SHALL take the office's own coordinates and its identifier into the cart address itself.

The caller SHALL NOT be asked for the office coordinates.

#### Scenario: An office named by settlement and number

- **WHEN** the caller names a Nova Poshta office in a settlement
- **THEN** the office is resolved, and the cart address carries its identifier and its own
  coordinates
- **AND** the branch shipping to it is one that serves Nova Poshta near the office

### Requirement: A read-only errand chooses nothing, and repairs only what would poison its answer

Reading the catalogue, the cart, or the account SHALL NOT change the store, the delivery type, or
the address on the cart. A read never moves the order.

The lapsed-slot repair is the one exception, and it stays: a cart sitting on a slot that has already
passed reports every line as out of stock, so a listing answered in that context is wrong rather
than merely stale. The CLI SHALL therefore write the branch's first available slot back before any
call whose answer depends on stock or price, read or write alike, exactly as it does today.

What a read SHALL NOT do is send the caller after a slot. The caller SHALL never have to list slots,
confirm a slot, or rebook one to make a read return a correct answer.

#### Scenario: A catalogue listing on a cart whose slot has lapsed

- **WHEN** a listing is requested against a cart whose slot has lapsed
- **THEN** the first available slot at the cart's branch is written back
- **AND** the listing is answered against that slot, with real stock and real prices
- **AND** the store, the delivery type and the address are unchanged

#### Scenario: A read on a cart whose slot is still good

- **WHEN** a read-only command runs against a cart whose slot has not lapsed
- **THEN** nothing on the cart is written

#### Scenario: The branch has no slot to repair with

- **WHEN** the slot has lapsed and the branch has no available slot to replace it
- **THEN** the command fails saying so, and names the choice as the caller's
- **AND** it is not retried

### Requirement: Changing one setting leaves the rest standing

Moving the cart to another store, or moving it to another time, SHALL change that setting and carry
every other one forward unchanged. The caller SHALL NOT have to restate the settings that are not
the point of the call.

#### Scenario: The store changes

- **WHEN** the cart is moved to another branch
- **THEN** the delivery type and the address are unchanged
- **AND** the slot is rebooked at the new branch, or the command fails saying it cannot be
