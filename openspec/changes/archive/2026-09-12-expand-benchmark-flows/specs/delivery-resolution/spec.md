## ADDED Requirements

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

## MODIFIED Requirements

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
