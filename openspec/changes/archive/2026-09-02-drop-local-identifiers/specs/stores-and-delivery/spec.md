## MODIFIED Requirements

### Requirement: Address and Nova Poshta output

The address lookup SHALL print each candidate as a record holding the parts of the place and
its coordinates under one key. The settlement lookup SHALL print each settlement's identifier, title,
area and region. The office lookup SHALL print each office's identifier and its coordinates under
their keys, and its title on a line of its own carrying no key, in that order. The coordinates SHALL
be printed on every office record without exception, because they are what a cart address naming that
office must carry and nothing else supplies them. The office's number and its address SHALL NOT be
printed, because the number stands inside the title and the address is the title's street part behind
the name of the settlement the caller already named. The office's working status SHALL be printed
only when the server reports the office as anything other than working.

#### Scenario: An address candidate

- **WHEN** an address string resolves to candidates
- **THEN** each candidate takes a record of its own, with its coordinates on one line

#### Scenario: A settlement

- **WHEN** settlements are printed
- **THEN** each shows its identifier, title and area, and its region where it has one, so the
  identifier can be passed to the office lookup

#### Scenario: An office record

- **WHEN** offices are printed
- **THEN** each office shows its identifier and its coordinates under their keys and then its
  title with no key, and shows neither its number nor its address

#### Scenario: The coordinates are always there

- **WHEN** an office is printed
- **THEN** its latitude and longitude are printed, because the caller building a cart address around
  that office has no other source for them

#### Scenario: The office number stays inside the title

- **WHEN** an office is printed
- **THEN** the number the carrier gave it appears only inside the title, and the office's own
  identifier is the only value under a key, so the two cannot be confused for one another

#### Scenario: A working office says nothing about it

- **WHEN** an office reports the working status the server uses for an office in service
- **THEN** no status line appears in that office's record

#### Scenario: An office that is not working

- **WHEN** an office reports any other status
- **THEN** that status is printed on a line of its own under its key, between the
  coordinates and the title, exactly as the server spelled it

#### Scenario: Every office is printed

- **WHEN** a settlement holds thousands of offices
- **THEN** all of them are printed, because the tool offers no way to ask for fewer

### Requirement: Store listing

The CLI SHALL list Silpo stores, narrowed by self pickup and Nova Poshta support, forwarding the page size and offset as given. It SHALL record nothing about the stores it sees.

#### Scenario: Filtered listing

- **WHEN** the user lists stores with the pickup or the Nova Poshta filter
- **THEN** only the filters the user passed reach the server

#### Scenario: Handles for the ids

- **WHEN** the listing returns stores
- **THEN** each store is printed with the branch uuid and the company uuid the payload carried, which are the values every branch-scoped and company-scoped command takes back

### Requirement: Address resolution

The CLI SHALL resolve a free-form address string into the candidates the server knows, and
SHALL print those candidates.

#### Scenario: Address lookup

- **WHEN** the user passes an address string
- **THEN** the CLI prints the candidates the server returned

### Requirement: Delivery slots

The CLI SHALL list the delivery time slots of a branch, narrowed by delivery type and a time
window, and capped in count. The branch SHALL be named by a required option, as it is on every
other command scoped to a branch, and SHALL be sent as it was given. The command SHALL NOT accept
the branch as a positional argument. The window SHALL be applied by the CLI to the slots it
received, not sent to the server, because the server answers a window that spans a whole local day
with nothing while answering a window an hour shorter with that day's slots in full. A window that
reaches beyond what the server returns unasked SHALL be the only case in which bounds are forwarded.

#### Scenario: Branch by handle or id

- **WHEN** the user names the branch
- **THEN** the value reaches the call as typed, and the tool decides whether it is a branch it knows

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

### Requirement: Nova Poshta lookup

The CLI SHALL find Nova Poshta settlements by name and the offices inside a settlement,
optionally narrowed by office name. The settlement SHALL be named by the uuid the settlement
lookup printed, which is the one form the office lookup accepts, and SHALL be sent as given.

#### Scenario: Settlements

- **WHEN** the user passes a settlement name
- **THEN** the CLI prints the matching settlements

#### Scenario: Offices

- **WHEN** the user passes a settlement id, with or without an office name filter
- **THEN** the CLI prints the offices of that settlement

### Requirement: Store listing output

The store listing SHALL print each store as a record holding its branch uuid, its store code,
its company uuid, the place the store stands at, and whether it supports self pickup and whether
it is open. The place SHALL be the city and the street address joined into one value under one
key by the shared address conversion, rather than a key of its own for each, and SHALL be absent
where the payload carries neither. The store code the payload carries as its external id SHALL be
printed under a key of its own: no tool accepts it, but a person can quote it to a shop, and it
cannot be confused with the uuid beside it because the two are told apart by their keys. The
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
- **THEN** it is printed under the key that names it a store code, whatever it is made of, because
  the key is what tells it apart from the uuid and no command takes either shape of it

#### Scenario: Flags that are not set

- **WHEN** a store reports no pickup support, or reports it as unknown
- **THEN** the record says so rather than leaving the caller to guess

### Requirement: Delivery output

The delivery type lookup SHALL print each option's type, the uuid of the branch that
serves it where the payload names one, and the description the server wrote. The slot listing
SHALL print each slot's window as local wall clock time, whether it is available as a value of
its own rather than as the absence of a word, its cost, the minimum order it requires, the
maximum weight it allows, its cost tiers through the shared tier conversion, and its
constraints through the shared flag conversion.

#### Scenario: A delivery option

- **WHEN** delivery types are printed for a point
- **THEN** each option shows its type, its branch as the uuid the payload carried where it names one, and its description

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

## ADDED Requirements

### Requirement: A Nova Poshta cart address carries its own coordinates

The CLI SHALL NOT supply the coordinates of a Nova Poshta office to a cart address. Where the caller
names an office on a cart address, the caller SHALL also pass `latitude` and `longitude`, and the CLI
SHALL send all three as given. The CLI holds no record of any office, and the only tool that returns
an office requires a settlement identifier the caller may no longer be holding, so a fill-in would
mean a lookup the CLI cannot always perform and would sometimes silently omit.

The office lookup prints the coordinates on every record, so they are on screen at the moment the
office is chosen.

#### Scenario: A cart address naming an office

- **WHEN** the caller sets a Nova Poshta address carrying `officeId`, `latitude` and `longitude`
- **THEN** all three reach the tool as given

#### Scenario: A cart address naming an office without coordinates

- **WHEN** the caller sets a Nova Poshta address carrying `officeId` and no coordinates
- **THEN** the CLI supplies none, and the call fails or stores an address without them exactly as
  the server decides

### Requirement: One store printed on its own

The CLI SHALL print a single store named by its branch uuid, showing what the listing shows for
that store. It SHALL find that store by reading the whole store listing and matching the uuid
against it, because the surface offers no tool that fetches one branch. A uuid the listing does
not hold SHALL fail the command naming it, that being a listing that does not carry the store
rather than an identifier the CLI could not translate.

#### Scenario: A store by its uuid

- **WHEN** the user asks for one store by the uuid a listing printed
- **THEN** that store's record is printed on its own, without the caller having to page a
  listing to find it

#### Scenario: A uuid the listing does not carry

- **WHEN** the user names a store the full listing does not hold
- **THEN** the command fails naming that store, and prints no listing around it


## REMOVED Requirements

### Requirement: One store on its own

**Reason**: Both of its scenarios turned on a local number — a store asked for by the number a
listing issued, and a number no listing had issued being resolved the way every branch-scoped
command resolved one. No numbers are issued and nothing is resolved.

**Migration**: Replaced by "One store printed on its own", above, which keeps the clause about
reading the whole listing to find one store, and states what a uuid the listing does not carry
now does.
