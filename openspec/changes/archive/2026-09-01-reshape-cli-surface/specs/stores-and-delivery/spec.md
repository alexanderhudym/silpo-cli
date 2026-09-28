## ADDED Requirements

### Requirement: Stores ordered by distance

The CLI SHALL order Silpo stores by their distance from a point, nearest first, and SHALL print
that distance with each store. The point SHALL be given as a latitude and a longitude under
options of their own, the same pair the delivery-type lookup takes, rather than as one argument
holding both. The distance SHALL be the great-circle distance between the point and the
coordinates the store listing already carries: a straight line, not a route, and the CLI SHALL
say so where it describes the command. Because the server pages the listing and cannot order it
this way, the CLI SHALL retrieve the whole listing before ordering it. Filters SHALL be applied
before the ordering, so that the nearest store the caller is shown is the nearest store that
satisfies them.

Because the caller's question is about distance and not about position in a list, the result
SHALL be narrowed by a nearest and a furthest distance rather than by a page offset, with a cap
on how many are printed. An offset into a distance-ordered list answers no question a caller
has.

#### Scenario: Nearest first

- **WHEN** the user asks for the stores nearest a point
- **THEN** the stores are printed nearest first, each with its distance from that point

#### Scenario: The point is two values

- **WHEN** the user names the point
- **THEN** the latitude and the longitude are given as separate options, so the pair reads the
  same here as everywhere else the CLI takes coordinates

#### Scenario: A store with no coordinates

- **WHEN** a store carries neither a latitude nor a longitude
- **THEN** it is left out of the ordering rather than placed at an invented distance

#### Scenario: The nearest store that also fits

- **WHEN** the user asks for the nearest store with self pickup
- **THEN** the pickup filter narrows the listing before the ordering, so the answer is the
  nearest pickup store and not the nearest store of any kind

#### Scenario: Looking past the nearest few

- **WHEN** the user bounds the result by a nearest and a furthest distance
- **THEN** only the stores within that ring are printed, and the count beside them is what the
  ring holds, because a caller asking to look further asks in kilometres and not in rows

### Requirement: One store on its own

The CLI SHALL print a single store named by its local number or by the branch id, showing what
the listing shows for that store. A number the CLI holds no record of SHALL be resolved the way
every branch-scoped command resolves one.

#### Scenario: A store by its local number

- **WHEN** the user asks for one store by the local number a listing issued
- **THEN** that store's record is printed on its own, without the caller having to page a
  listing to find it

#### Scenario: A number the CLI has not issued

- **WHEN** the user names a store by a number no listing has issued here
- **THEN** the command resolves it the way any branch-scoped command does, and fails the same
  way when it cannot

## MODIFIED Requirements

### Requirement: Store listing output

The store listing SHALL print each store as a record holding the local number of its branch,
the local number of its company, the place the store stands at, and whether it supports self
pickup and whether it is open. The place SHALL be the city and the street address joined into
one value under one key by the shared address conversion, rather than a key of its own for
each, and SHALL be absent where the payload carries neither. The store's external number SHALL
NOT be printed: nothing the CLI accepts takes it, nothing else in the payload refers to it, and
printed beside the local number it is read as the identifier a caller should quote. The
coordinates SHALL be printed as one value under one key, each axis rounded by the shared
coordinate conversion.

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

- **WHEN** a store carries an external number, whether it is made of digits or not
- **THEN** nothing is printed for it, because the field is absent from the record: a line
  holding both it and the local number invites the caller to quote whichever came first

#### Scenario: Flags that are not set

- **WHEN** a store reports no pickup support, or reports it as unknown
- **THEN** the record says so rather than leaving the caller to guess

### Requirement: Delivery slots

The CLI SHALL list the delivery time slots of a branch, narrowed by delivery type and a time
window, and capped in count. The branch SHALL be named by a required option, as it is on every
other command scoped to a branch. The command SHALL NOT accept the branch as a positional
argument. The window SHALL be applied by the CLI to the slots it received, not sent to the
server, because the server answers a window that spans a whole local day with nothing while
answering a window an hour shorter with that day's slots in full. A window that reaches beyond
what the server returns unasked SHALL be the only case in which bounds are forwarded.

#### Scenario: Branch by handle or id

- **WHEN** the user names the branch by its local number
- **THEN** the number is resolved to the branch id before the call, and an id in the form of a uuid is passed through as typed

#### Scenario: Branch named by option

- **WHEN** the user names the branch
- **THEN** it is given through the same option the branch-scoped catalogue and product commands use

#### Scenario: Branch left out

- **WHEN** the branch option is absent
- **THEN** the command fails before any tool is called

#### Scenario: Branch given positionally

- **WHEN** the branch is written as a bare argument rather than through the option
- **THEN** the command fails rather than reading it as the branch

#### Scenario: A whole local day

- **WHEN** the user asks for every slot of one local day, from its first minute to its last
- **THEN** that day's slots are printed, because the bounds were compared against the slots the
  CLI holds rather than handed to a server that treats the first hours of a local day as the
  day before

#### Scenario: Window in local time

- **WHEN** the user passes the window bounds as local wall clock times
- **THEN** a slot is kept when it falls inside those bounds read as local wall clock, and the
  result does not change with the offset the CLI happens to send

#### Scenario: Several delivery types

- **WHEN** the user repeats the delivery type option
- **THEN** all of them travel in one call

### Requirement: Delivery output

The delivery type lookup SHALL print each option's type, the local number of the branch that
serves it where the payload names one, and the description the server wrote. The slot listing
SHALL print each slot's window as local wall clock time, whether it is available as a value of
its own rather than as the absence of a word, its cost, the minimum order it requires, the
maximum weight it allows, its cost tiers through the shared tier conversion, and its
constraints through the shared flag conversion.

#### Scenario: A delivery option

- **WHEN** delivery types are printed for a point
- **THEN** each option shows its type, its branch as a local number where it names one, and its description

#### Scenario: A slot window

- **WHEN** a slot is printed
- **THEN** its start and end are shown as local wall clock time to the minute

#### Scenario: Availability is a value

- **WHEN** a slot is available and another is not
- **THEN** each says which it is, so that a caller filtering the printed list matches on what
  is there rather than on what is missing

#### Scenario: Cost tiers and constraints

- **WHEN** a slot carries cost tiers or a group of constraint flags
- **THEN** the tiers are shown as cost and the order total each begins at, and only the raised
  constraints are named

#### Scenario: A slot with no constraint raised

- **WHEN** every constraint flag of a slot is false
- **THEN** no constraint line appears
