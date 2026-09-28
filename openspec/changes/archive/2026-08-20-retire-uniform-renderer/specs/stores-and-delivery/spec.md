## ADDED Requirements

### Requirement: Store listing output

The store listing SHALL print each store as a record holding the alias of its branch, the
alias of its company, the city, the street address, and whether it supports self pickup and
whether it is open. The store's external number SHALL be printed, because it is how a store
identifies itself to a person standing in front of it. The coordinates SHALL be printed as one
value under one key, each axis rounded by the shared coordinate conversion.

#### Scenario: A store record

- **WHEN** stores are listed
- **THEN** each store's fields take a line of their own and a blank line stands between stores

#### Scenario: Coordinates under one key

- **WHEN** a store carries a latitude and a longitude
- **THEN** they are shown together on one line, each rounded by the shared conversion

#### Scenario: Flags that are not set

- **WHEN** a store reports no pickup support, or reports it as unknown
- **THEN** the record says so rather than leaving the caller to guess

### Requirement: Delivery output

The delivery type lookup SHALL print each option's type, the alias of the branch that serves
it where the payload names one, and the description the server wrote. The slot listing SHALL
print each slot's window as local wall clock time, whether it is available, its cost, the
minimum order it requires, the maximum weight it allows, its cost tiers through the shared
tier conversion, and its constraints through the shared flag conversion.

#### Scenario: A delivery option

- **WHEN** delivery types are printed for a point
- **THEN** each option shows its type, its branch where it names one, and its description

#### Scenario: A slot window

- **WHEN** a slot is printed
- **THEN** its start and end are shown as local wall clock time to the minute

#### Scenario: Cost tiers and constraints

- **WHEN** a slot carries cost tiers or a group of constraint flags
- **THEN** the tiers are shown as cost and the order total each begins at, and only the raised
  constraints are named

#### Scenario: A slot with no constraint raised

- **WHEN** every constraint flag of a slot is false
- **THEN** no constraint line appears

### Requirement: Address and Nova Poshta output

The address lookup SHALL print each candidate as a record holding the parts of the place and
its coordinates under one key. The settlement lookup SHALL print each settlement's alias,
title, area and region. The office lookup SHALL print each office's alias, its number, its
title, its address, its coordinates and its working status.

#### Scenario: An address candidate

- **WHEN** an address string resolves to candidates
- **THEN** each candidate takes a record of its own, with its coordinates on one line

#### Scenario: A settlement

- **WHEN** settlements are printed
- **THEN** each shows its alias, title and area, and its region where it has one, so the alias
  can be passed to the office lookup

#### Scenario: Every office is printed

- **WHEN** a settlement holds thousands of offices
- **THEN** all of them are printed, because the tool offers no way to ask for fewer

## MODIFIED Requirements

### Requirement: Address resolution

The CLI SHALL resolve a free-form address string into the candidates the server knows, and
SHALL print those candidates.

#### Scenario: Address lookup

- **WHEN** the user passes an address string
- **THEN** the CLI prints the candidates the server returned and records the call for token
  accounting

### Requirement: Nova Poshta lookup

The CLI SHALL find Nova Poshta settlements by name and the offices inside a settlement,
optionally narrowed by office name.

#### Scenario: Settlements

- **WHEN** the user passes a settlement name
- **THEN** the CLI prints the matching settlements and records the call

#### Scenario: Offices

- **WHEN** the user passes a settlement id, with or without an office name filter
- **THEN** the CLI prints the offices of that settlement and records the call

## REMOVED Requirements

### Requirement: Commands pending output rendering

**Reason**: The store listing, the delivery type lookup and the delivery slot lookup printed
nothing while the output rendering was being reworked. This change is that rework, and all
three now state their output.

**Migration**: The three commands print the records described by the store listing output and
the delivery output requirements, and record their calls for token accounting like every other
command.
