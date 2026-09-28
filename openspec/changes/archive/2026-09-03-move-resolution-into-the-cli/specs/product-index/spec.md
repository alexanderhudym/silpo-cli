## Purpose

A personal catalogue the CLI keeps on disk, so that a term the caller has bought before resolves to
a product without a network call, and so that every identifier form a product carries is available
wherever one of them is held.

## ADDED Requirements

### Requirement: The index holds identity, never state

An index record SHALL carry only fields that identify a product: its `productId`, its `companyId`,
its name, its slug, its `externalId`, its parsed pack size and unit, and its parsed specification. It
SHALL also carry the caller's own history of it — how many times it was bought, and when last.

A record SHALL NOT carry a brand. No product payload the catalogue returns names one; a brand is part
of the product's name and is not separable from it.

A record MAY carry a category slug, and that slug SHALL be optional. It is present only where the
product entered the index through a listing that was already scoped to a category, and absent
wherever the product was first seen through an unscoped search, an order, or a favourite. Nothing
SHALL require it: it is never a filter, and its absence SHALL never keep a record out of the index or
out of a candidate set.

The index SHALL NOT hold price, stock, promotion membership, or availability. Those are the state of
a product at a branch at a moment, they go stale in hours, and the cart write already reports both
`reduced` and `unfillable`. The cart write is the authority on state; the index is the authority on
nothing but identity.

#### Scenario: A record is written from a listing that carried a price

- **WHEN** a product listing carrying a price and a stock count is folded into the index
- **THEN** the identifying fields are stored
- **AND** the price and the stock count are discarded rather than stored

#### Scenario: A resolved product is quoted back with a price

- **WHEN** a command prints a product the index resolved
- **THEN** the price it prints is the one the current call returned, never one the index held

#### Scenario: A record is written from an unscoped search

- **WHEN** a product is folded into the index from a search that named no category
- **THEN** the record is written with no category slug
- **AND** it is a candidate for later resolutions on the same terms as a record that carries one

#### Scenario: A record is written from a scoped listing

- **WHEN** a product is folded into the index from a listing scoped to a category
- **THEN** the record carries that category's slug

### Requirement: The index is single, and the branch is a signal

`productId` is catalogue-global: the same product carries the same identifier at every store. The
index SHALL therefore be one collection, not one per branch.

A record SHALL carry the set of branches at which the product has been seen. That set SHALL act as a
ranking signal in favour of a candidate seen at the cart's current branch, and SHALL NOT act as a
filter. Moving the cart to another store SHALL invalidate no record.

#### Scenario: The cart moves to a store where a product was never seen

- **WHEN** the cart is moved to a branch absent from a record's seen-at set
- **AND** a later resolution ranks that record among its candidates
- **THEN** the record remains a candidate, without the branch bonus
- **AND** where the store cannot supply it, the cart write reports `unfillable`

### Requirement: The index is filled from what the caller has already paid for

The index SHALL be built from the caller's own history — online orders, in-store receipts, and
favourites — because those are the products a repeat errand asks for.

Every product listing the CLI receives in the course of any other command SHALL be folded into the
index. Nothing SHALL be fetched for the sake of the index alone.

Enrichment SHALL happen after the command has printed its answer, never on the path to it.

#### Scenario: A search enriches the index

- **WHEN** a search returns products absent from the index
- **THEN** the search prints its answer first
- **AND** the new products are folded into the index afterwards

#### Scenario: An in-store receipt line carries no catalogue handle

- **WHEN** a receipt line arrives with neither a `productId` nor a slug
- **THEN** no record is written for it, and the build continues

### Requirement: The index is inspectable and disposable

Hidden state that decides what goes into a cart SHALL be readable. The CLI SHALL report what the
index holds, SHALL rebuild it on request, and SHALL explain why a given term resolved as it did —
the candidates it considered, the score of each, and which rule decided.

Discarding the index SHALL cost the caller nothing but a rebuild: every record is derivable from the
account.

#### Scenario: A resolution is questioned

- **WHEN** the caller asks why a term resolved to a product
- **THEN** the CLI prints the candidates it ranked, their scores, and the rule that chose

#### Scenario: The index is discarded

- **WHEN** the index is rebuilt
- **THEN** it is repopulated from order history and favourites
- **AND** no command fails in the meantime

### Requirement: The index is isolatable per run

The index SHALL live at a location that follows from the CLI's home directory, and from nothing else.
Pointing the home directory at a different place SHALL therefore give a run its own index, empty
until that run fills it, and SHALL leave every other index untouched.

Two runs given different home directories SHALL NOT observe each other's records: what one run
searched SHALL NOT rank a candidate in the other. Two runs given the same home directory SHALL share
one index.

This is what lets a measured run stay independent of the run before it, so that repeating a
measurement measures the same thing twice; and it is what lets a test pin the index to a fixed,
known set of records rather than whatever the machine happened to accumulate.

#### Scenario: A repeated measurement does not inherit the first run's searches

- **WHEN** a run resolves a list against its own home directory, folding what it searched into the
  index
- **AND** the same list is resolved again under a different home directory
- **THEN** the second run starts with an empty index
- **AND** it resolves without any candidate raised by what the first run searched

#### Scenario: A test pins the index

- **WHEN** a home directory holding a prepared index is given to a command
- **THEN** the command resolves against exactly those records
- **AND** nothing it writes reaches the index of any other home directory

### Requirement: A missing index degrades, it does not fail

A command SHALL work with an empty index, a partial index, or none at all. Where the index cannot
answer, the CLI SHALL fall back to the live catalogue. An index fault SHALL never be the reason a
command fails.

#### Scenario: The index file is absent or unreadable

- **WHEN** a command runs and the index cannot be opened
- **THEN** the command resolves against the live catalogue and completes
- **AND** it says the index was unavailable rather than reporting a catalogue failure
