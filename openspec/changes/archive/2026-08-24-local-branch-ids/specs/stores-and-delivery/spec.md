## MODIFIED Requirements

### Requirement: Store listing

The CLI SHALL list Silpo stores, narrowed by self pickup and Nova Poshta support, forwarding the page size and offset as given, and SHALL record a local number for every branch id and company id it sees.

#### Scenario: Filtered listing

- **WHEN** the user lists stores with the pickup or the Nova Poshta filter
- **THEN** only the filters the user passed reach the server

#### Scenario: Handles for the ids

- **WHEN** the listing returns stores
- **THEN** every branch id and company id in the payload is recorded under a local number, so later commands can be given the number instead of the id

### Requirement: Store listing output

The store listing SHALL print each store as a record holding the local number of its branch,
the local number of its company, the place the store stands at, and whether it supports self
pickup and whether it is open. The place SHALL be the city and the street address joined into
one value under one key by the shared address conversion, rather than a key of its own for
each, and SHALL be absent where the payload carries neither. The store's external number SHALL
be printed, because it is how a store identifies itself to a person standing in front of it,
and SHALL be printed as the payload spelled it, digits or otherwise. The coordinates SHALL be
printed as one value under one key, each axis rounded by the shared coordinate conversion.

#### Scenario: A store record

- **WHEN** stores are listed
- **THEN** each store's fields take a line of their own and a blank line stands between stores

#### Scenario: The place is one line

- **WHEN** a store carries a city and a street address
- **THEN** they are joined into one line by the same conversion the saved address listing uses

#### Scenario: A store with no place

- **WHEN** a store carries neither a city nor a street address
- **THEN** no place line appears at all

#### Scenario: Coordinates under one key

- **WHEN** a store carries a latitude and a longitude
- **THEN** they are shown together on one line, each rounded by the shared conversion

#### Scenario: An external number that is not a number

- **WHEN** a store's external number is not made of digits
- **THEN** it is printed as the payload spelled it

#### Scenario: Flags that are not set

- **WHEN** a store reports no pickup support, or reports it as unknown
- **THEN** the record says so rather than leaving the caller to guess

### Requirement: Delivery slots

The CLI SHALL list the delivery time slots of a branch, narrowed by delivery type and a time window, and capped in count.

#### Scenario: Branch by handle or id

- **WHEN** the user names the branch by its local number
- **THEN** the number is resolved to the branch id before the call, and an id in the form of a uuid is passed through as typed

#### Scenario: Window in local time

- **WHEN** the user passes the window bounds as local wall clock times
- **THEN** they are converted to absolute instants before the call

#### Scenario: Several delivery types

- **WHEN** the user repeats the delivery type option
- **THEN** all of them travel in one call

### Requirement: Delivery output

The delivery type lookup SHALL print each option's type, the local number of the branch that
serves it where the payload names one, and the description the server wrote. The slot listing
SHALL print each slot's window as local wall clock time, whether it is available, its cost, the
minimum order it requires, the maximum weight it allows, its cost tiers through the shared
tier conversion, and its constraints through the shared flag conversion.

#### Scenario: A delivery option

- **WHEN** delivery types are printed for a point
- **THEN** each option shows its type, its branch as a local number where it names one, and its description

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
