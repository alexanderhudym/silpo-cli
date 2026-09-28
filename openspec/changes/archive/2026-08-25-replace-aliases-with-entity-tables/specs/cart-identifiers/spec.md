## Purpose

Gives every shopping cart a short local number the user can paste into any option that takes a
cart, and defines how that number or a remote uuid is turned into the identifier the MCP call
needs.

## ADDED Requirements

### Requirement: A cart is recorded by its remote identity

The CLI SHALL record a cart under the uuid the server names it by, SHALL issue a local number
for it the first time it records one, and SHALL keep that number stable for as long as the
record exists. Recording SHALL happen as a command prints a cart, so that any cart the caller
has seen can be named back by its number without a separate registration step.

#### Scenario: A cart is printed for the first time

- **WHEN** a command prints a cart the CLI has no record of
- **THEN** a record is created for that uuid and the local number issued for it is printed

#### Scenario: The same cart again

- **WHEN** a command prints a cart the CLI already holds
- **THEN** the number already issued is printed and no new number is consumed

#### Scenario: Numbers of one entity are its own

- **WHEN** carts and other entities are recorded in turn
- **THEN** the numbers issued for carts follow their own sequence, independent of any other
  entity's

### Requirement: Two ways to name a cart

An argument that takes a cart SHALL accept the local number recorded for it or the remote uuid,
and SHALL send the remote uuid to the call in either case. A uuid SHALL be recognised by its own
shape and passed through without consulting the record.

#### Scenario: Named by number

- **WHEN** an argument takes a cart and receives a number the CLI issued
- **THEN** the uuid recorded under that number is sent

#### Scenario: Named by uuid

- **WHEN** an argument takes a cart and receives a uuid
- **THEN** that uuid is sent unchanged, whether or not the CLI holds a record of it

### Requirement: An unresolved cart fails the command

A cart the CLI cannot resolve SHALL fail the command before any tool is called, naming the cart
and the value that failed. The CLI SHALL NOT go looking for the cart, because the MCP surface
offers no way to list carts: it answers for the active cart and for a cart whose id is already
known.

#### Scenario: A number nobody issued

- **WHEN** an argument takes a cart and receives a number the CLI never issued
- **THEN** the command fails naming the cart and the value, and makes no call to find it

#### Scenario: Text of no known form

- **WHEN** an argument takes a cart and receives text that is neither a uuid nor a number
- **THEN** the command fails naming the cart and the value
