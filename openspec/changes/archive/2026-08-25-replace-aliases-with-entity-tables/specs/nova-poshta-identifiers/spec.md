## Purpose

Gives every Nova Poshta settlement and office a short local number the user can paste into any
option that takes one, and keeps with an office record the facts a later cart update needs to
build a delivery address from that number alone.

## ADDED Requirements

### Requirement: A settlement and an office are each recorded by their remote identity

The CLI SHALL record a Nova Poshta settlement and a Nova Poshta office under the uuid the server
names each by, SHALL issue a local number the first time it records one, and SHALL keep that
number stable for as long as the record exists. Each SHALL draw its numbers from its own
sequence. Recording SHALL happen as the settlement listing and the office listing are printed.

#### Scenario: A settlement is printed for the first time

- **WHEN** the settlement listing prints a settlement the CLI has no record of
- **THEN** a record is created for that uuid and the local number issued for it is printed

#### Scenario: An office is printed for the first time

- **WHEN** the office listing prints an office the CLI has no record of
- **THEN** a record is created for that uuid and the local number issued for it is printed

#### Scenario: The same place again

- **WHEN** either listing prints a place the CLI already holds
- **THEN** the number already issued is printed and no new number is consumed

### Requirement: An office record keeps what a delivery address is built from

An office record SHALL keep the office's coordinates, title, address, type and number alongside
its identity, because a cart address naming that office is built long after the office listing
that carried them, and the coordinates are required by the call. An office's working status
SHALL NOT be kept: it is printed from the listing that reported it and is needed nowhere else.

#### Scenario: An address built from a number alone

- **WHEN** a cart address names an office by its local number
- **THEN** the coordinates the call requires come from the office record, without asking the
  caller to copy them

#### Scenario: Status is not kept

- **WHEN** an office is recorded
- **THEN** its working status is not part of the record

### Requirement: Two ways to name a settlement or an office

An argument that takes a settlement or an office SHALL accept the local number recorded for it
or the remote uuid, and SHALL send the remote uuid to the call in either case. A uuid SHALL be
recognised by its own shape and passed through without consulting the record. An office SHALL be
nameable this way wherever a call carries an office identifier, including inside the address of
a cart update.

#### Scenario: A settlement by number

- **WHEN** the office lookup receives a number the CLI issued for a settlement
- **THEN** the uuid recorded under that number is sent

#### Scenario: An office inside a cart address

- **WHEN** the address of a cart update carries an office identifier as a local number
- **THEN** the uuid recorded under that number is sent in its place

#### Scenario: Named by uuid

- **WHEN** either argument receives a uuid
- **THEN** that uuid is sent unchanged, whether or not the CLI holds a record of it

### Requirement: An office number is not an identifier

The number Nova Poshta prints on an office, which stands inside the office title, SHALL NOT be
accepted as a way to name that office. It is a run of digits like a local number, and the local
number is the only run of digits the CLI resolves.

#### Scenario: The printed office number names nothing

- **WHEN** an argument that takes an office receives a run of digits
- **THEN** it is read as a local number the CLI issued, never as the office number the carrier
  gave that office

### Requirement: An unresolved settlement or office fails the command

A settlement or an office the CLI cannot resolve SHALL fail the command before any tool is
called, naming which of the two failed and the value that failed. The CLI SHALL NOT go looking
for it, because neither can be listed without already naming something: offices are listed only
inside a settlement, and settlements only by a name to search for.

#### Scenario: A number nobody issued

- **WHEN** an argument takes a settlement or an office and receives a number the CLI never issued
- **THEN** the command fails naming the entity and the value, and makes no call to find it

#### Scenario: Text of no known form

- **WHEN** an argument takes a settlement or an office and receives text that is neither a uuid
  nor a number
- **THEN** the command fails naming the entity and the value
