## Purpose

Gives every online order a short local number so an order listing costs a number rather than a
uuid per row, and states why that number is printed but never read back.

## ADDED Requirements

### Requirement: An online order is recorded by its remote identity

The CLI SHALL record an online order under the uuid the server names it by, SHALL issue a local
number for it the first time it records one, and SHALL keep that number stable for as long as
the record exists. Recording SHALL happen as the order listing is printed.

#### Scenario: An order is printed for the first time

- **WHEN** the order listing prints an order the CLI has no record of
- **THEN** a record is created for that uuid and the local number issued for it is printed

#### Scenario: The same order again

- **WHEN** the order listing prints an order the CLI already holds
- **THEN** the number already issued is printed and no new number is consumed

#### Scenario: An in-store receipt carries no order identity

- **WHEN** in-store receipts are printed
- **THEN** no order number is issued for them, because the payload carries no identifier for a
  receipt, only the store it was made at

### Requirement: An order's receipt number is not an identifier

The receipt number an online order carries SHALL be printed as a fact about the order and SHALL
NOT be accepted as a way to name one. It is a run of digits like a local number, and the local
number is the only run of digits the CLI resolves.

#### Scenario: The receipt number is shown

- **WHEN** an order carries a receipt number
- **THEN** it is printed under its own key, distinct from the order's local number

### Requirement: No argument takes an order

The CLI SHALL NOT offer an argument that names an order. The MCP surface carries no tool that
accepts an order identifier, so an order's local number exists to shorten what is printed and
for nothing else.

#### Scenario: The surface accepts no order

- **WHEN** the order history is read
- **THEN** it is read by page and by date only, and no command takes an order to act on
