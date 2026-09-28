## MODIFIED Requirements

### Requirement: Store listing

The CLI SHALL list Silpo stores under one command, narrowed by a query and by self pickup and Nova
Poshta support, and ordered by relevance to the caller. It SHALL record nothing about the stores it
sees.

The query SHALL be one positional value and SHALL accept every form a caller holds: a settlement, a
full or partial street address, a coordinate pair, a store's branch uuid, or the store number printed
on a receipt. Where it is absent, the command SHALL still answer, from what the account knows of the
caller.

Of those narrowings only two are the server's. The listing takes self pickup and Nova Poshta support
and nothing else: it takes no name, no query and no point. The query, the ordering and the naming of
one store are therefore the CLI's own work over the listing it retrieved, and this capability SHALL
say so plainly rather than describe them as if the server had narrowed anything.

The listing SHALL be read whole on every invocation, because the ordering is over all of it. The
caller's page size SHALL NOT be forwarded as the server's: an ordering computed over the server's
first page is an ordering of the wrong set. What the caller asked to see bounds what is printed,
never what is fetched.

That whole-listing read SHALL be bounded and SHALL be stated rather than left to be discovered. It is
several hundred stores; it SHALL be performed at most once for the command that asked; what it
retrieved SHALL be held no longer than that command and SHALL NOT be recorded; and the CLI SHALL name
the cost where it describes the command. It SHALL NOT be performed by a command that asked about
something else. Where the listing outgrows that bound, what was printed SHALL say so, because a
ranking over part of the estate is not the ranking the caller was promised.

Listing the stores, finding the nearest ones and printing one store SHALL be the same command. They
differ only in whether a query was given, which is an option and not a command.

#### Scenario: Filtered listing

- **WHEN** the user lists stores with the pickup or the Nova Poshta filter
- **THEN** no narrowing other than those two reaches the server, they being the only ones the listing
  accepts, and the CLI's own paging of that listing is not one of them

#### Scenario: A filter narrows the corpus and is not a reason to be printed

- **WHEN** the user passes a filter and no query
- **THEN** the answer is still the caller's own stores and what stands near their places, narrowed to
  those the filter allows, and not every store in the estate the filter allows

#### Scenario: A query narrows by name or place

- **WHEN** the user names part of the place a store stands at
- **THEN** the CLI reads the whole listing and matches the query against it itself, and only the
  stores matching it are printed, because no query reaches the server

#### Scenario: One command, with or without a point

- **WHEN** the user names a place to look near, and when the user names none
- **THEN** the same command answers in both cases, from the query in the first and from what the
  account knows of the caller in the second

#### Scenario: Paging a listing the CLI narrowed

- **WHEN** a page size is given together with a query
- **THEN** it bounds what is printed out of what the CLI ranked, not what is asked of the server, and
  no offset is offered, because a position in a ranking is not something the caller can name

#### Scenario: The full listing is read once and kept for nothing

- **WHEN** a command reads the whole store listing to answer a query or an ordering
- **THEN** it reads it once, discards it when the command ends, records nothing from it, and the cost
  of that read is stated where the command is described

#### Scenario: The listing outgrew the bound

- **WHEN** the estate holds more stores than the read is bounded at
- **THEN** what was printed says the ranking covers part of the listing, rather than presenting a
  partial ranking as a whole one

#### Scenario: Handles for the ids

- **WHEN** the listing returns stores
- **THEN** each store is printed with the branch uuid and the company uuid the payload carried, which
  are the values every branch-scoped and company-scoped command takes back

### Requirement: Store listing output

The store listing SHALL print each store as a record holding its branch uuid, its store code,
its company uuid, the place the store stands at, and whether it supports self pickup and whether
it is open. The place SHALL be the city and the street address joined into one value under one
key by the shared address conversion, rather than a key of its own for each, and SHALL be absent
where the payload carries neither. The store code the payload carries as its external id SHALL be
printed under a key of its own, and SHALL be printed because a caller can name a store by it. The
coordinates SHALL be printed as one value under one key, each axis rounded by the shared
coordinate conversion.

Each store SHALL additionally carry a line naming why it stands where it does: the number of
receipts the caller has from it and the date of the most recent, the distance from the point it was
measured against and what that point was, or the query it matched. Only what applied SHALL be named.

Where a distance is named, the point it was measured from SHALL be identified and not merely located.
A bare pair of coordinates names nothing a caller or an agent can act on. The point SHALL be given as
what it actually was — the caller's own saved delivery address, by the label they gave it where it has
one and the place it stands at; the store the query matched; or the address the text resolved to — and
SHALL carry its coordinates alongside. The one exception is a coordinate pair the caller themselves
passed as the query, where the pair is what they named and repeating it back is the honest answer.

Where a store is in the answer because the query matched it, the line SHALL carry enough to tell it
apart from the store printed above it — the strength of its match, and which of its fields the query
reached. A line reading only that the query matched, identical on every text result, explains an
ordering to nobody and leaves a wrong one indistinguishable from a right one.

The count of stores that qualified SHALL be printed beside the page, so that a caller can tell a
store ranked below the cut from a store the filters excluded.

Whether the store is open SHALL be printed and SHALL take no part in the ordering. It changes through
the day, the payload reports it as unknown for some stores, and a delivery order is served by a slot
rather than by an open door.

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
  the key is what tells it apart from the uuid

#### Scenario: Flags that are not set

- **WHEN** a store reports no pickup support, or reports it as unknown
- **THEN** the record says so rather than leaving the caller to guess

#### Scenario: A store the caller shops at

- **WHEN** a store the caller has receipts from is printed
- **THEN** its record names how many of those receipts it holds and the date of the most recent

#### Scenario: A store that is merely near

- **WHEN** a store the caller has no receipts from is printed because of where it stands
- **THEN** its record names the distance and the point that distance was measured from

#### Scenario: The point is named, not just located

- **WHEN** the point a distance was measured from is one of the caller's saved delivery addresses
- **THEN** the record identifies it as that address, by its label where it has one and the place it
  stands at, with its coordinates alongside, rather than as a bare pair of numbers

#### Scenario: Two stores the same query matched

- **WHEN** two stores both matched the query and one is printed above the other
- **THEN** each record carries what separated them — how strongly it matched and which of its fields
  the query reached — rather than the same sentence twice

#### Scenario: How many qualified

- **WHEN** more stores qualify than the page size allows
- **THEN** the count that qualified is printed beside the page, so the caller knows the answer was cut
  rather than exhausted

#### Scenario: Being open does not move a store

- **WHEN** a closed store and an open one are equally relevant on every other signal
- **THEN** their order does not depend on which is open, and both records still say which they are

### Requirement: Address resolution

Turning free text into a place on the map SHALL be the CLI's work and not the caller's. Wherever a
command takes a place — a point to look near, or a destination for a cart — it SHALL take that place
as free text and geocode it itself.

No command SHALL require a latitude and a longitude. A coordinate pair is a value no caller holds and
every caller had to fetch, and fetching it was a whole command and a whole round trip. There SHALL
therefore be no command whose only work is to turn an address into candidates: what that command
answered is answered inside `silpo stores <text>` and `silpo cart setup --to <text>`.

The store listing's own query SHALL accept a coordinate pair in addition to text, because a caller
that already holds a point — having read one off a store, an office or an earlier answer — should not
have to turn it back into words for the CLI to turn it into a point again. It remains one positional
value, and no option of its own.

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

- **WHEN** the user looks for a command that requires a latitude and a longitude, or an option that
  takes one
- **THEN** there is none: the store listing's positional query accepts a pair where the caller
  happens to hold one, and every other place in the CLI is named in words

#### Scenario: The text is ambiguous

- **WHEN** the text resolves to several candidates that nothing separates
- **THEN** the candidates are printed with what distinguishes them, and the command stops

## ADDED Requirements

### Requirement: Stores ordered by relevance to the caller

The CLI SHALL answer the store listing from one of two situations, and SHALL order the answer by what
that situation makes relevant.

**Where a query was given**, it names a place, and the stores at or near that place are the answer.
The query SHALL be resolved against three things, in this order, and the first that answers wins:

- **A coordinate pair** is taken as the point directly.
- **The listing itself** — the place each store stands at, its store code and its branch uuid, all
  matched the same way with no form privileged over another. Matching SHALL be by word relevance and
  not by literal containment: a query whose words appear in a store's place in any order, with any
  street-type abbreviation, and with a building number given in part, SHALL match that store, and the
  stores that matched SHALL be ordered by how well they matched. Words that appear in nearly every
  address SHALL carry nearly no weight, without a list of them being maintained by hand. A store
  matching too weakly to be an answer SHALL be left out, so that a page size does not fill with
  stores nothing connects to the query.
- **The caller's own saved addresses**, matched the same way against their labels and their places.
  A caller naming a place they have told the CLI about — their home, their work, whatever they
  labelled it — means that place, and its coordinates become the point.
- Text that answered none of the three SHALL be geocoded, and the point it resolves to is the point.
  Text in the shape of a branch uuid or a store code that the listing does not hold SHALL NOT be
  geocoded: it names a store, and a store the listing has no record of is a failure naming it, not a
  place to look near.

Every one of those paths SHALL yield a point. Where the query matched the listing, the point SHALL be
the coordinates of the best match — the place the caller named is where the store they named stands.

The answer SHALL then be assembled the same way in every case: the stores the query matched, best
match first; then the stores within the radius of the point, nearest first, each carrying its
distance. Where the query resolved to a point without matching any store, the second part is the
whole answer.

The caller's receipts SHALL NOT change which stores answer a query — a caller asking about a city
they have never shopped in is asking about that city. Among the stores a query did answer, a store
the caller has receipts from SHALL come first, because between two stores that equally answer the
question, the one they already use is the better answer.

**Where no query was given**, the answer is what the account knows of the caller:

- The stores the caller's till receipts name, most receipts first, each carrying its count and the
  date of the most recent. These are stores the caller walked into, which is a choice about them.
- Then the stores within the radius of any of the caller's saved delivery addresses, nearest first.
- Where the account holds neither receipts nor saved addresses, there SHALL be no relevance to
  compute, and the CLI SHALL say that and name what would give it one, rather than printing an
  arbitrary page of a listing it did not order.
- An account that does hold receipts or saved addresses, but whose filters left no store qualifying,
  is a different situation and SHALL be reported as one. The CLI SHALL name the filters that emptied
  the answer and SHALL NOT state that the account holds nothing. Telling a caller with a full history
  that they have no receipts, in the same breath as counting those receipts, describes neither what
  happened nor what would fix it.

The store a receipt names SHALL be taken from the receipt itself and joined to the store listing by
the store code. A branch reached through a receipt's products is the branch the request carried
rather than the branch that sold them, and a count built on it would credit every past purchase to
whichever store the caller happened to be asking about.

Distance SHALL be the great-circle distance between a point and the coordinates the store listing
already carries: a straight line, not a route, and the CLI SHALL say so where it describes the
command. A store carrying no coordinates SHALL be left out of any distance comparison rather than
placed at an invented one.

The self pickup and Nova Poshta filters SHALL be applied before the ordering, so that the most
relevant store the caller is shown is the most relevant store that satisfies them.

The ranking SHALL NOT read the cart. The cart is one of the callers that asks it which store to use —
a cart being recreated has no store to offer, and a cart consulting a ranking that consults the cart
is a cycle. Anything the cart knows SHALL reach the ranking as an argument or not at all.

#### Scenario: A place named in the query

- **WHEN** the user names a city they have never shopped in
- **THEN** the stores of that city answer, best match first, followed by the stores within the radius
  of the best match, and the stores the caller does shop at elsewhere do not displace them

#### Scenario: A coordinate pair is written as two numbers

- **WHEN** the user passes a latitude and a longitude as one value, in that order, separated by a
  comma
- **THEN** it is recognised as a point before anything is matched against the listing, so that the
  latitude is not read as a building number

#### Scenario: A store handle the listing does not hold

- **WHEN** the user passes a branch uuid or a store code that the listing does not carry
- **THEN** the command fails naming it, rather than treating it as free text and geocoding it into a
  place that has nothing to do with what was asked

#### Scenario: A street the listing already carries

- **WHEN** the user names a street that appears in the listing's own addresses
- **THEN** the stores standing on it are the answer, and no geocoding is performed

#### Scenario: The words are not contiguous

- **WHEN** the user names a settlement and a street together, in either order, and the listing writes
  them apart with other words between
- **THEN** the store standing there is found, because the words are matched as words and not as a
  run of characters

#### Scenario: The street type is written differently

- **WHEN** the user writes the street type in full and the listing abbreviates it, or the other way
- **THEN** the store is still found, and the street-type word does not decide which store ranks
  highest, because a word carried by nearly every address carries nearly no weight

#### Scenario: Part of a building number

- **WHEN** the user names a street and the numeric part of a building the listing writes with a
  letter after it
- **THEN** that building's store ranks above the others on the street, rather than the query
  matching nothing

#### Scenario: A store named by its number

- **WHEN** the user passes the store code printed on a receipt
- **THEN** that store is the answer, because the code is a handle the caller holds and is matched
  the same way every other form is

#### Scenario: A place the caller has named before

- **WHEN** the user names one of their own saved addresses by the label they gave it
- **THEN** the stores near that address are the answer, resolved from the saved address itself
  without geocoding anything

#### Scenario: Receipts order what a query answered

- **WHEN** two stores answer a query equally well and the caller has receipts from one of them
- **THEN** the one they shop at is printed first, while the other still appears, because receipts
  order the answer and do not narrow it

#### Scenario: Coordinates as the query

- **WHEN** the user passes a coordinate pair
- **THEN** it is taken as the point directly, without being geocoded

#### Scenario: The caller's own stores first

- **WHEN** the user lists stores and names nothing
- **THEN** the stores the caller has receipts from are printed first, most receipts first, each
  naming its count and the date of the most recent

#### Scenario: Near the caller's places

- **WHEN** the user lists stores, names nothing, and has saved delivery addresses
- **THEN** stores within the radius of any of those addresses follow the caller's own, nearest first

#### Scenario: The receipt count does not follow the request

- **WHEN** the same caller's stores are ranked twice, the two runs differing only in which branch the
  receipt history was requested against
- **THEN** the counts are identical, because they come from what each receipt names and not from a
  branch the request carried into the answer

#### Scenario: A straight line, not a route

- **WHEN** a distance is printed
- **THEN** it is the straight-line distance, and the command's own description says so, because a
  caller planning a journey would otherwise read it as a driving distance

#### Scenario: A store with no coordinates

- **WHEN** a store carries neither a latitude nor a longitude
- **THEN** it is left out of the distance comparison rather than placed at an invented distance

#### Scenario: The most relevant store that also fits

- **WHEN** the user asks for stores with self pickup
- **THEN** the pickup filter narrows the listing before the ordering, so the first answer is the most
  relevant pickup store and not the most relevant store of any kind

#### Scenario: The ranking never asks the cart

- **WHEN** a cart with no store asks the ranking which store to use
- **THEN** the ranking answers from the listing, the receipts and the saved addresses alone, and does
  not read the cart it is answering

#### Scenario: Nothing to rank by

- **WHEN** an account with no receipts and no saved addresses lists stores without a query
- **THEN** the CLI says there is nothing to order the listing by and names what would give it one,
  rather than printing the first stores the listing happened to carry

#### Scenario: The filters emptied the answer, not the account

- **WHEN** an account holding receipts and saved addresses lists stores with a filter that no store
  satisfies
- **THEN** the CLI names the filter as what left nothing qualifying, and does not report the account
  as holding no receipts and no saved addresses

### Requirement: A radius bounds what counts as near

The store listing SHALL take a radius, defaulting to fifteen kilometres, bounding which stores
qualify by being near. It SHALL apply wherever nearness is the reason a store is in the answer: to
the point a query named, and to the caller's saved addresses where no query was given.

The radius SHALL bound only those stores whose sole reason for being in the answer is proximity. A
store already in the answer for another reason SHALL NOT be dropped by it: where a query was given,
the stores the query matched by name, code or uuid; where none was given, the stores the caller has
receipts from. A radius measured from somewhere else would drop the very store the caller asked for.

That exemption follows the reason, not the signal. Where a query was given, the caller's receipts
order the answer and do not widen it, as "Stores ordered by relevance to the caller" requires, so a
receipts store the query did not match and the radius does not reach SHALL NOT appear: the caller
asked about a place, and their own stores elsewhere are not that place.

Without such a bound, "near one of my places" says nothing for a caller whose saved addresses are
spread across the country, and the page size would fill with stores that are near nothing in
particular.

#### Scenario: Beyond the radius

- **WHEN** a store the caller has never shopped at stands further from every one of their places than
  the radius allows
- **THEN** it is not printed, rather than being printed as the last of an arbitrarily long tail

#### Scenario: A store the caller shops at, far away

- **WHEN** the caller names nothing and has receipts from a store further away than the radius
- **THEN** it is printed, because receipts and not proximity are why it is in the answer

#### Scenario: A store the caller shops at, far from the place they asked about

- **WHEN** the caller names a place, and holds receipts from a store that the query did not match and
  that stands beyond the radius of the point
- **THEN** it is not printed, because the question was about a place and receipts order the answer to
  it rather than widening it

#### Scenario: The radius applies to a named place too

- **WHEN** the user names a place and asks for a wider or narrower radius
- **THEN** the stores within that radius of the point the query resolved to are the answer, the
  option applying to this selection as it does to every other

#### Scenario: The radius does not drop what the query named

- **WHEN** a store matched the query but stands further from the point than the radius allows
- **THEN** it is printed, because the query named it and the radius bounds only the stores that are
  in the answer for standing nearby

## REMOVED Requirements

### Requirement: Stores ordered by distance

**Reason**: Distance from a named place was the only ordering the command had, and it applied only
when a place was named; with no place the listing was printed in the server's own order, which
answers nobody. Ordering is now specified by "Stores ordered by relevance to the caller", where
distance orders the answer to a named place and the caller's own receipts order the answer to no
query at all.

**Migration**: `--near <text>` becomes the command's positional query, which takes the same free text,
is geocoded the same way, and additionally accepts a coordinate pair, a store code and a branch uuid.
`--to-distance` becomes `--radius`. Three capabilities are **dropped rather than migrated**, and have
no replacement:

- **`--from-distance`**, a minimum distance, and with it the ring query. Widening `--radius` does not
  replace it: the radius is an upper bound and the page fills from the nearest, so nothing past the
  first page can be reached that way. A caller looking further narrows the query instead.
- **Passing a query and a separate place to measure from.** The query is the place.
- **Enumerating the estate**, which `--has-np true --limit 500` did. A filter narrows the corpus the
  answer is drawn from; it is not a reason for a store to be in the answer. Asking which stores in a
  named place support Nova Poshta still works — `silpo stores <place> --np` — but asking for all of
  them everywhere does not. `silpo raw silpo_list_branches` remains, uncompressed, for a caller who
  genuinely wants the whole table.

Reading the whole listing, the great-circle distance, the exclusion of stores without coordinates and
the filters applying before the ordering all carry over unchanged.

### Requirement: One store printed on its own

**Reason**: The requirement rested on two rules this change reverses. It required that a query
matching several stores print the candidates and stop, which spends a turn asking a question the
ordering has already answered; and it refused the store code as a handle on the grounds that it
exists only to be quoted to a person, when it is the value a caller reads off their own receipt.
Printing one store is no longer a case of its own — it is a listing that one store qualified for.

**Migration**: `silpo stores <uuid>` and `silpo stores <text>` are unchanged in spelling and now also
accept the store code. A query matching exactly one store still prints that store alone. A query
matching several now prints them in relevance order and succeeds, where before it printed candidates
and stopped; a caller wanting one takes the first. A uuid the listing does not hold still fails the
command naming it.

## ADDED Requirements

### Requirement: A page size is a maximum

The store listing SHALL take a page size and no offset. The page size SHALL bound how many stores are
printed and SHALL NOT be a count to reach: where fewer stores qualify than it allows, fewer SHALL be
printed, and no store that did not qualify SHALL be added to fill the page. Where it is not given, it
SHALL default to ten, a ranked answer being one whose first rows are the answer.

An offset SHALL NOT be offered. An offset into an order the caller did not ask for selects rows by
their position in a ranking rather than by anything the caller can name, and a caller who wants to
look further narrows the query or widens the radius.

#### Scenario: Fewer qualify than were allowed

- **WHEN** the user asks for at most five stores and two match the query
- **THEN** two are printed, and no third store is added

#### Scenario: More qualify than were allowed

- **WHEN** the user asks for at most five stores and forty match
- **THEN** the five most relevant are printed, and the count that qualified is printed beside them

#### Scenario: There is no offset

- **WHEN** the user looks for an option to skip the first stores of the order
- **THEN** there is none
