## MODIFIED Requirements

### Requirement: Store listing

The CLI SHALL list Silpo stores under one command, narrowed by a query naming the store or the place
it stands at, narrowed by self pickup and Nova Poshta support, and ordered by distance from a place
where the caller names one. It SHALL record nothing about the stores it sees.

Of those narrowings only two are the server's. The listing takes a page size, an offset, self pickup
and Nova Poshta support, and nothing else: it takes no name, no query and no point. The query, the
ordering by distance and the naming of one store are therefore the CLI's own work over the listing it
retrieved, and this capability SHALL say so plainly rather than describe them as if the server had
narrowed anything.

Where neither a query nor a place is named, the page size and the offset SHALL be forwarded as given
and the page the server answered with SHALL be what is printed. Where a query or a place is named, the
CLI SHALL read the listing through to its end in the server's own pages, narrow or order it itself,
and then apply the page size and the offset to what it prints rather than to what it fetched, because
an offset into a listing the server did not narrow selects rows the caller did not ask about.

That whole-listing read SHALL be bounded and SHALL be stated rather than left to be discovered. It is
several hundred stores; it SHALL be performed at most once for the command that asked; what it
retrieved SHALL be held no longer than that command and SHALL NOT be recorded; and the CLI SHALL name
the cost where it describes the command. It SHALL NOT be performed by a command that asked about
something else. The archived change that removed the local identifiers named exactly this read as a
defect — a branch number sending the CLI for a four-hundred-and-fifty-five-row listing in the middle of
an unrelated command — and the difference here is that the caller asked about stores, not that the
read has become cheap.

Listing the stores, finding the nearest ones and printing one store SHALL be the same command. They
differ only in whether a query or a point was given, which is an option and not a command.

#### Scenario: Filtered listing

- **WHEN** the user lists stores with the pickup or the Nova Poshta filter
- **THEN** only the filters the user passed reach the server, those two being the only narrowings the
  listing accepts

#### Scenario: A query narrows by name or place

- **WHEN** the user names part of a store's name or of the place it stands at
- **THEN** the CLI reads the whole listing and matches the query against it itself, and only the
  stores matching it are printed, because no query reaches the server

#### Scenario: One command, with or without a point

- **WHEN** the user names a place to measure from, and when the user names none
- **THEN** the same command answers, ordered by distance over the whole listing in the first case and
  as the server pages it in the second

#### Scenario: Paging a listing the CLI narrowed

- **WHEN** a query or a place is named together with a page size and an offset
- **THEN** they bound what is printed out of what the CLI narrowed, not what is asked of the server,
  because the server's own offset counts rows the query would have dropped

#### Scenario: The full listing is read once and kept for nothing

- **WHEN** a command reads the whole store listing to answer a query or an ordering
- **THEN** it reads it once, discards it when the command ends, records nothing from it, and the cost
  of that read is stated where the command is described

#### Scenario: Handles for the ids

- **WHEN** the listing returns stores
- **THEN** each store is printed with the branch uuid and the company uuid the payload carried, which
  are the values every branch-scoped and company-scoped command takes back

### Requirement: Address resolution

Turning free text into a place on the map SHALL be the CLI's work and not the caller's. Wherever a
command takes a place — a point to measure store distances from, or a destination for a cart — it
SHALL take that place as free text and geocode it itself.

No command SHALL take a latitude and a longitude. A coordinate pair is a value no caller holds and
every caller had to fetch, and fetching it was a whole command and a whole round trip. There SHALL
therefore be no command whose only work is to turn an address into candidates: what that command
answered is answered inside `silpo stores --near <text>` and `silpo cart setup --to <text>`.

Where the text resolves to more than one candidate and no rule separates them, the CLI SHALL print
the candidates and stop, as the delivery-resolution capability requires of every step of the chain.
It SHALL NOT take the first candidate. The exact-match rule that separates candidates before the
CLI stops, and the requirement that a printed candidate's address is answerable back verbatim, are
specified once by the delivery-resolution capability and apply here without restatement.

#### Scenario: Address lookup

- **WHEN** the user passes an address string to a command that needs a place
- **THEN** the CLI resolves it against the candidates the server knows and carries on with the answer
  the caller asked for, rather than printing candidates as an answer of its own

#### Scenario: A place named in words

- **WHEN** the user names a street address, a district or a landmark
- **THEN** the CLI resolves it to a point itself and uses that point, without asking the caller for
  coordinates

#### Scenario: No command takes coordinates

- **WHEN** the user looks for a command that accepts a latitude and a longitude
- **THEN** there is none, in this capability or any other

#### Scenario: The text is ambiguous

- **WHEN** the text resolves to several candidates that nothing separates
- **THEN** the candidates are printed with what distinguishes them, and the command stops

### Requirement: Delivery slots

The CLI SHALL list the delivery time slots of a branch, narrowed by delivery type and a time
window, and capped in count. The branch SHALL be named by an option, and where that option is absent
the branch of the session's cart SHALL be used, because the branch a caller asking about slots means
is almost always the one the cart already stands at. Where there is no cart and no branch was named,
the command SHALL fail saying so. The value the caller gives SHALL be sent as it was given, and the
command SHALL NOT accept the branch as a positional argument.

The window SHALL be applied by the CLI to the slots it received, not sent to the server, because the
server answers a window that spans a whole local day with nothing while answering a window an hour
shorter with that day's slots in full. A window that reaches beyond what the server returns unasked
SHALL be the only case in which bounds are forwarded.

Listing slots SHALL NOT move the order: the store, the delivery type and the address the cart carries
SHALL NOT be written by it. The lapsed-slot repair specified by the delivery-resolution capability is
unaffected and applies here as it does everywhere, because a cart on a passed slot answers wrongly
rather than merely stale. The caller SHALL never be sent to this command to make another command
return a correct answer.

#### Scenario: Branch by handle or id

- **WHEN** the user names the branch
- **THEN** the value reaches the call as typed, and the tool decides whether it is a branch it knows

#### Scenario: Branch named by option

- **WHEN** the user names the branch
- **THEN** it is given through the same option every other branch-scoped command uses

#### Scenario: Branch left out

- **WHEN** the branch option is absent and the session has a cart
- **THEN** the cart's own branch is used, and the caller is not asked to fetch it first

#### Scenario: Branch left out with no cart

- **WHEN** the branch option is absent and the session has no cart
- **THEN** the command fails saying there is no branch to take, before any tool is called

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

The CLI SHALL answer Nova Poshta questions under one read-only command: settlements matching a name,
and the offices inside a settlement where the caller narrows it by an office name.

The settlement SHALL be named in words, as it is spoken, and SHALL NOT be required as the uuid a
previous listing printed. The CLI SHALL resolve the settlement itself. Where the name matches several
settlements, or the office text matches several offices, the candidates SHALL be printed and the
command SHALL stop.

This command SHALL only read. Putting an office on a cart is the work of the destination the cart is
set up with, specified by the delivery-resolution capability, and no chain of lookups SHALL be left
for the caller to walk.

#### Scenario: Settlements

- **WHEN** the user passes a settlement name
- **THEN** the CLI prints the matching settlements

#### Scenario: Offices

- **WHEN** the user names a settlement in words and narrows it by an office name
- **THEN** the CLI resolves the settlement itself and prints the offices matching that name

#### Scenario: The lookup writes nothing

- **WHEN** offices are printed
- **THEN** no cart is written and no delivery setting changes, because this is a read

### Requirement: Delivery output

The slot listing SHALL print each slot's window as local wall clock time, whether it is available as
a value of its own rather than as the absence of a word, its cost, the minimum order it requires, the
maximum weight it allows, its cost tiers through the shared tier conversion, and its constraints
through the shared flag conversion.

Where a delivery type is reported at all, it SHALL be reported as part of what a destination resolved
to, alongside the branch and the address it was resolved with, rather than as a listing of its own.

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

#### Scenario: A delivery option

- **WHEN** a destination resolves to a delivery type
- **THEN** that type is named in what the cart write printed, with the uuid of the branch serving it
  and the description the server wrote, and no separate listing of types is offered

### Requirement: Address and Nova Poshta output

The settlement lookup SHALL print each settlement's identifier, title, area and region. The office
lookup SHALL print each office's identifier and its coordinates under their keys, and its title on a
line of its own carrying no key, in that order. The coordinates SHALL be printed on every office
record without exception, because they are what an address naming that office must carry and because
a caller reading them can tell where the office is. The office's number and its address SHALL NOT be
printed, because the number stands inside the title and the address is the title's street part behind
the name of the settlement the caller already named. The office's working status SHALL be printed
only when the server reports the office as anything other than working.

Where free text was geocoded to a place, the place the CLI settled on SHALL be printed with the
answer it produced, so that a caller can see what its words were taken to mean.

#### Scenario: A settlement

- **WHEN** settlements are printed
- **THEN** each shows its identifier, title and area, and its region where it has one

#### Scenario: An office record

- **WHEN** offices are printed
- **THEN** each office shows its identifier and its coordinates under their keys and then its
  title with no key, and shows neither its number nor its address

#### Scenario: The coordinates are always there

- **WHEN** an office is printed
- **THEN** its latitude and longitude are printed, so that the office can be told from another of the
  same name

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

#### Scenario: An address candidate

- **WHEN** free text is geocoded and an answer is printed against it
- **THEN** the place it resolved to is named with the parts of that place and its coordinates under
  one key, so the caller sees what its words were understood to mean, and where several candidates
  stopped the command each takes a record of its own

### Requirement: Stores ordered by distance

The CLI SHALL order Silpo stores by their distance from a place, nearest first, and SHALL print
that distance with each store. The place SHALL be given as free text under one option and geocoded by
the CLI, rather than as a latitude and a longitude the caller had to fetch. The distance SHALL be the
great-circle distance between that point and the coordinates the store listing already carries: a
straight line, not a route, and the CLI SHALL say so where it describes the command. Because the
listing tool takes no point at all and pages what it does return, the ordering SHALL be the CLI's own
over the whole listing, retrieved as "Store listing" bounds it. The self pickup and Nova Poshta
filters SHALL be applied before the ordering, so that the nearest store the caller is shown is the
nearest store that satisfies them.

Because the caller's question is about distance and not about position in a list, the result
SHALL be narrowed by a nearest and a furthest distance rather than by a page offset, with a cap
on how many are printed. An offset into a distance-ordered list answers no question a caller
has.

#### Scenario: Nearest first

- **WHEN** the user asks for the stores near a place
- **THEN** the stores are printed nearest first, each with its distance from that place

#### Scenario: The point is two values

- **WHEN** the user looks for the latitude and the longitude this command once took as two options of
  their own
- **THEN** there are none, because the place is named once, in words, and the CLI turns it into a
  point itself

#### Scenario: A straight line, not a route

- **WHEN** a distance is printed
- **THEN** it is the straight-line distance, and the command's own description says so, because a
  caller planning a journey would otherwise read it as a driving distance

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

### Requirement: A Nova Poshta cart address carries its own coordinates

The CLI SHALL supply the coordinates of a Nova Poshta office to a cart address itself. Where the
destination of a cart names an office, the CLI SHALL resolve the settlement, then the office, and
SHALL take that office's identifier and its own coordinates into the address it writes. The caller
SHALL NOT be asked for them.

This reverses the rule that stood before. That rule held that the caller must pass the coordinates,
because the only tool returning an office wanted a settlement identifier the caller might no longer
hold, so a fill-in would have meant a lookup the CLI could not always perform. The CLI now performs
that lookup as a step of the destination chain, holds the settlement it resolved, and therefore has
the coordinates in hand at the moment it writes the address.

#### Scenario: A cart address naming an office

- **WHEN** the caller names a Nova Poshta office as the cart's destination
- **THEN** the settlement and the office are resolved, and the address written to the cart carries the
  office's identifier and the office's own coordinates

#### Scenario: A cart address naming an office without coordinates

- **WHEN** a cart is set up for a Nova Poshta office and the caller passes no coordinates, which is
  now the only way to name one
- **THEN** the CLI supplies them from the office it resolved, and the address it writes is complete

#### Scenario: The office cannot be told from another

- **WHEN** the office text matches more than one office
- **THEN** the candidates are printed and the cart is not written, rather than one being guessed at

### Requirement: One store printed on its own

The CLI SHALL print a single store, showing what the listing shows for that store, under the store
command itself and not under a command of its own. The store SHALL be named either by its branch uuid
or by a query that matches exactly one store: both are positional, both are answered out of the same
listing, and there SHALL be no separate single-record command to dispatch on the form of a handle.

It SHALL find that store by reading the whole store listing and matching against it, because the
listing tool takes no name and no identifier and the surface offers no tool that fetches one branch.
That read is the one specified by "Store listing" and is bounded by it. A uuid the listing does not
hold SHALL fail the command naming it, that being a listing that does not carry the store rather than
an identifier the CLI could not translate. A query matching more than one store SHALL print the
candidates and stop, as every ambiguity does.

The store code SHALL NOT be accepted in the uuid's place. It remains a value for a person to quote to
a shop, and no command takes it.

#### Scenario: A store by its uuid

- **WHEN** the user asks for one store by the uuid a listing printed
- **THEN** that store's record is printed on its own, without the caller having to page a
  listing to find it

#### Scenario: A store by its name

- **WHEN** the user names a store in words and exactly one store matches
- **THEN** that store's record is printed on its own, under the same command that lists them

#### Scenario: A query that matches several stores

- **WHEN** the words the user names match more than one store
- **THEN** the matching stores are printed as candidates and the command stops, rather than one of
  them being taken as the answer

#### Scenario: A uuid the listing does not carry

- **WHEN** the user names a store the full listing does not hold
- **THEN** the command fails naming that store, and prints no listing around it

#### Scenario: A store code is not a handle

- **WHEN** the user passes the store code the listing printed
- **THEN** it is not accepted as a store, because the code exists to be quoted to a person

## REMOVED Requirements

### Requirement: Delivery types for a point

**Reason**: The requirement existed to let a caller ask which delivery types serve a coordinate pair,
and both halves of it are gone. No command takes coordinates any more, and choosing the delivery type
that serves a destination is a step the CLI performs itself rather than an answer the caller reads and
acts on. A listing whose every row leads to a further call the CLI could have made is a wrong turn the
caller pays for twice.

**Migration**: Name the destination on the cart instead: `silpo cart setup --to <text>` geocodes it,
selects the delivery type serving it, selects the branch, and writes the cart. Where more than one
type or branch is plausible, the candidates are printed and nothing is written, so the caller still
sees the choice — but only when there is one to make. The behaviour is specified by the
`delivery-resolution` capability.
