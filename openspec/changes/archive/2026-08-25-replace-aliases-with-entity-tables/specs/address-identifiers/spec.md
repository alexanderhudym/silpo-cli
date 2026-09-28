## Purpose

Gives every saved delivery address a short local number so the address listing costs a number
rather than a uuid per row, and states why that number is printed but never read back.

## ADDED Requirements

### Requirement: A saved address is recorded by its remote identity

The CLI SHALL record a saved delivery address under the uuid the server names it by, SHALL issue
a local number for it the first time it records one, and SHALL keep that number stable for as
long as the record exists. Recording SHALL happen as the address listing is printed.

#### Scenario: An address is printed for the first time

- **WHEN** the address listing prints an address the CLI has no record of
- **THEN** a record is created for that uuid and the local number issued for it is printed

#### Scenario: The same address again

- **WHEN** the address listing prints an address the CLI already holds
- **THEN** the number already issued is printed and no new number is consumed

### Requirement: No argument takes a saved address

The CLI SHALL NOT offer an argument that names a saved address. No tool of the MCP surface
accepts a saved address identifier: a delivery address reaches a call as the parts of a place
and a pair of coordinates, never as a reference to the address book.

#### Scenario: A cart address is built, not referenced

- **WHEN** a cart's delivery settings are updated
- **THEN** the address is given as its own object of fields, and no saved address identifier
  takes part in the call
