# delivery-resolution Specification

## Purpose

Turns a destination named the way a person names one — an address, a store, a Nova Poshta office —
into the store, the delivery type, the address and the time slot a cart needs, so that the caller
states where the order goes and not how to look it up.

## Requirements
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

That reason bounds the rule. It holds wherever the candidates come from the store listing, and it
holds wherever a candidate is being chosen in order to write it — a cart's destination, its branch,
its delivery type, its Nova Poshta office — because a value written on a guess is one the caller has
to discover and undo. It does not hold for a geocoded response, which the server returns in its own
order of relevance, read only to order an answer the CLI is about to print and write nowhere. A
ranking is not an ambiguity, and refusing to read one returns the caller a list to resolve by hand.

Where such a response is read **to write a value** — a cart's destination above all — a candidate
SHALL be taken only where it is clear which one is meant: where the response holds one, or where
exactly one of several matches the text the caller gave under the exact-match rule below. Where
several remain and nothing separates them, the candidates are printed and nothing is written. The
first SHALL NOT be taken for standing first, because a value written on a guess is one the caller has
to discover and undo.

Where such a response is read **to select stores for a listing**, no candidate SHALL be privileged by
its position either, and for a different reason: nothing is being written, so there is nothing to
refuse. The gazetteer orders by its own knowledge, which does not include where the stores are, and
the store listing is what says which candidates were real, so every candidate is matched against it
and what they find is taken together. The stores-and-delivery capability sets the terms of that
selection.

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

#### Scenario: A cart destination geocodes to several candidates

- **WHEN** the destination text for a cart geocodes to several candidates and no rule separates them
- **THEN** the candidates are printed and the cart is not written, the narrowing above not reaching a
  candidate that is about to be written

#### Scenario: A ranking read to order an answer that is only printed

- **WHEN** the store listing's query geocodes to several candidates and no rule separates them
- **THEN** every candidate is matched against the store listing, no candidate is privileged by its
  position, nothing is written, and the answer names every place the stores came from

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

Moving the cart to another time SHALL change that setting and carry every other one forward
unchanged. The caller SHALL NOT have to restate the settings that are not the point of the call.

The destination is not one setting among those. A destination fixes the delivery type, the branch,
the address and the slot together, and they cannot be carried forward independently of one another:
a self-pickup cart naming one shop while another fulfils it is not a set of carried-forward
settings, it is a cart nobody can collect. When the destination changes, all four SHALL be resolved
from it.

#### Scenario: The time changes

- **WHEN** the cart is moved to another time
- **THEN** the delivery type, the branch and the address are unchanged
- **AND** the slot is rebooked at that time, or the command fails saying it cannot be

#### Scenario: The store changes

- **WHEN** the cart is moved to another store
- **THEN** the delivery type, the address, the branch and the slot are all resolved from that store,
  so that the address the cart shows is the one it will be collected at

### Requirement: A named delivery type decides what kind of place the destination is

A destination text is resolved against several listings in turn — the account's saved addresses,
the store listing, the geocoder, the Nova Poshta offices — and the kind of place it lands on
decides which delivery types can serve it. Where the caller names a delivery type alongside the
text, that type SHALL decide which of those listings the text is resolved against, before any of
them is tried.

- `SelfPickup` is served only by a store, so the text SHALL be resolved against the store listing
  alone.
- A Nova Poshta type is served only by an office, so the text SHALL be resolved against the office
  listing alone.
- A courier type is never served by a store, so the store listing SHALL be skipped and the saved
  addresses and the geocoder tried as before.
- Where the caller names no delivery type, every listing is tried in turn, in the order it is
  tried today.

A text that resolves to no place of the kind the named type requires SHALL fail saying no such
place was found, and SHALL name the kind it looked for. It SHALL NOT report that the type does not
serve the destination. That report is what a text resolved to the wrong kind of place produces, and
it sends the caller to change the delivery type — which was the one part of the request that was
right.

#### Scenario: Self-pickup named with a store's street address

- **WHEN** the caller asks for self-pickup and names the street address of a store
- **THEN** the text is resolved against the store listing, the store is taken, and the cart is
  written for self-pickup at it — the address is never geocoded and the command never reports that
  self-pickup does not serve the destination

#### Scenario: Self-pickup named with a text no store matches

- **WHEN** the caller asks for self-pickup and names a text that matches no store
- **THEN** the command fails saying no store matched that text, and the cart is unchanged — it does
  not fall through to the geocoder and it does not report a delivery type that does not serve

#### Scenario: A courier type named with a store's address

- **WHEN** the caller names a courier delivery type and a text that would match a store
- **THEN** the store listing is skipped, the text is resolved as an address, and a courier type
  serving that point is taken under the rules already governing a named type

#### Scenario: A Nova Poshta type named with an office

- **WHEN** the caller names a Nova Poshta delivery type and the name of an office
- **THEN** the office listing is resolved directly, without the saved addresses, the store listing
  or the geocoder being tried first

### Requirement: A store is found by its parts when its own string does not contain the text

The store listing is searched by testing whether a branch's address string contains the caller's
text. That test is literal: it sees no difference between a word and its abbreviation, tolerates no
reordering, and fails on any word the branch's own string does not carry. A caller who writes a
street type out in full, or names the shop before its address, misses a store whose address they
gave correctly.

Where a store is what the request is for and that containment test matches no branch, the CLI SHALL
geocode the text and match the parsed result — settlement, street and building — against the
branches by the same part-by-part comparison the store listing command already uses, and SHALL take
its result as the store match.

A geocoded response carrying several candidates SHALL have every one of them matched, not only a
response that carried exactly one. The geocoder answers a store's own address with several spellings
of the same street, and several spellings that converge on one branch are not an ambiguity about
which branch was meant. Only where the candidates reach more than one distinct branch is the
ambiguity real, and it is then reported over the branches rather than over the address spellings the
caller never chose between.

The containment test SHALL be tried first and its match SHALL stand: it costs no call, and it
matches a fragment carrying neither a settlement nor a building, which a geocoded lookup cannot
resolve.

This fallback SHALL run only where a store is what is being sought — where the caller asked for
self-pickup. Where no delivery type was named, the caller has not said a store is wanted, and a
courier address that happens to sit on a street a branch also stands on SHALL keep resolving as an
address, as it does today. Reaching for a store there would turn a home delivery into a collection
the caller never asked for.

Where both find nothing, the outcome is the same as no store matching today.

#### Scenario: A street type spelled out rather than abbreviated

- **WHEN** the caller names a store's address writing the street type in full where the branch's own
  address abbreviates it
- **THEN** the store is found, because the geocoded parts match the branch's settlement, street and
  building even though neither string contains the other

#### Scenario: A fragment of an address

- **WHEN** the caller names only a street, with no settlement and no building, and exactly one
  branch's address contains it
- **THEN** that branch is taken by the containment test, without a geocoding call

#### Scenario: The shop's name written before its address

- **WHEN** the caller writes the chain's name ahead of a store's address
- **THEN** the store is found, because the extra word is absent from the parsed street, settlement
  and building the comparison reads

### Requirement: One option names a destination, whatever form the name takes

A destination SHALL be named through a single option, and that option SHALL accept every form a
destination is named in: a saved address, a store by its address, a store by the branch uuid an
ambiguity printed, and a settlement with an office. There SHALL NOT be a second option that moves
the cart's branch on its own.

Two options split one question and the caller cannot tell which half they are answering. The run
that prompted this shows an agent identifying the right store immediately, then spending ten steps
trying one option, then the other, then both together, then the help page.

A uuid naming no branch SHALL fail saying so, naming the uuid, and SHALL NOT be carried on to the
settlement lookup as though it were a place name.

#### Scenario: A branch uuid as the destination

- **WHEN** the caller passes a branch uuid as the destination
- **THEN** the cart is moved to that store, with its delivery type, address, branch and slot all
  resolved from it

#### Scenario: A uuid naming no branch

- **WHEN** the caller passes a uuid that matches no branch
- **THEN** the command fails naming that uuid, and no settlement lookup is attempted

#### Scenario: A store named as the destination under a courier type

- **WHEN** the caller names a store and asks for a courier delivery type
- **THEN** the command fails saying that type does not serve the destination, and the cart is
  unchanged
