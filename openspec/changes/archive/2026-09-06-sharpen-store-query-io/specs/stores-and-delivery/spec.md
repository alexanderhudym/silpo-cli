## MODIFIED Requirements

### Requirement: Store listing

The CLI SHALL list Silpo stores under one command, narrowed by a query and by self pickup and Nova
Poshta support, and ordered by relevance to the caller. It SHALL record nothing about the stores it
sees.

The query SHALL be one positional value and SHALL accept every form a caller holds: a settlement, a
full or partial street address, a coordinate pair, a store's branch uuid, the store number printed
on a receipt, or a place that no store's address contains — a district, a metro station, a landmark.
Where it is absent, the command SHALL still answer, from what the account knows of the caller.

A place no address contains is not answered by matching the listing, because there is nothing in the
listing to match; it is answered by resolving the place and ordering stores around it. The CLI SHALL
NOT decline such a query on the grounds that no store's address holds those words. It SHALL, however,
say when it is less sure of that answer than of a matched address, because it is: this class is
answered correctly less often than a street address is, and a caller who cannot tell the two apart
cannot act on either.

Of those narrowings only two are the server's. The listing takes self pickup and Nova Poshta support
and nothing else: it takes no name, no query and no point. The query, the ordering and the naming of
one store are therefore the CLI's own work over the listing it retrieved, and this capability SHALL
say so plainly rather than describe them as if the server had narrowed anything.

The listing SHALL be read whole on every invocation, because the ordering is over all of it. The
caller's page size SHALL NOT be forwarded as the server's: an ordering computed over the server's
first page is an ordering of the wrong set. What the caller asked to see bounds what is printed,
never what is fetched.

**Read whole means read until the server reports no more.** The read SHALL NOT stop at a ceiling of
the CLI's own. A ranking computed over part of the estate is a ranking of the wrong set in exactly
the way a ranking over the server's first page is, and a ceiling large enough never to be reached is
a warning the CLI must maintain and can never test. The listing's own reported total SHALL be taken
from the first page and the pages it implies SHALL be requested together rather than one after the
other, so that an exhaustive read costs the same two round trips whatever the estate holds.

That whole-listing read SHALL still be stated rather than left to be discovered. It SHALL be
performed at most once for the command that asked; what it retrieved SHALL be held no longer than
that command and SHALL NOT be recorded; and the CLI SHALL name the cost where it describes the
command. It SHALL NOT be performed by a command that asked about something else.

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

#### Scenario: A place no store address contains

- **WHEN** the user names a district, a metro station or a landmark, which no store's address holds
- **THEN** the CLI resolves that place and orders stores around it rather than declining, and what is
  printed says that the answer rests on resolving a place rather than on matching an address

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

#### Scenario: The listing runs past one page

- **WHEN** the estate holds more stores than the server returns in one page
- **THEN** the pages the reported total implies are requested together and the whole listing is
  ranked, and no ceiling of the CLI's own stops the read short of what the server holds

#### Scenario: The listing outgrew the bound

- **WHEN** a reader looks for the case in which the estate holds more stores than the read allows
- **THEN** there is none: the read is exhaustive, no ceiling of the CLI's own exists to outgrow, and
  neither what is printed nor what describes the command warns that the ranking may cover part of
  the estate

#### Scenario: Handles for the ids

- **WHEN** the listing returns stores
- **THEN** each store is printed with the branch uuid and the company uuid the payload carried, which
  are the values every branch-scoped and company-scoped command takes back

### Requirement: Store listing output

The store listing SHALL print each store as a record holding its branch uuid, its store code,
its company uuid, the place the store stands at, and whether it supports self pickup and whether
it is open. The place SHALL be the city and the street address joined into one value under one
key by the shared address conversion, rather than a key of its own for each. The store code the
payload carries as its external id SHALL be printed under a key of its own, and SHALL be printed
because a caller can name a store by it. The coordinates SHALL be printed as one value under one
key, each axis rounded by the shared coordinate conversion.

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
apart from the store printed above it — the strength of its match, and **which parts of the query it
answered**: the settlement, the street, the building number, and whether the resolved place agreed
with it. Naming the field the query reached no longer separates anything, because the street is the
only field a query is scored against; what separates two stores on one street is which of them the
building number fits. A line reading only that the query matched, identical on every text result,
explains an ordering to nobody and leaves a wrong one indistinguishable from a right one.

Where the answer rests on a resolved place rather than on a matched address, the record SHALL say so,
and SHALL name the candidate the place resolved to. Where the two readings disagreed, it SHALL say
that too, and name the store the other reading would have given.

**Where the query was a coordinate pair, the answer SHALL also name the branches that serve that
point.** The server answers which branch serves a point, one per delivery type whose service area is
a polygon, and returns nothing for the types that have no polygon. Those SHALL be reported as part of
the answer, each named as the store the listing holds for it and not as a bare uuid, and each against
the delivery type it serves. A caller who passed a coordinate pair is usually asking a delivery
question, and that answer stands one call away from the one they asked for.

They SHALL be reported and SHALL take no part in the ordering. Which branch serves a point and which
stores stand near it are different questions, and the ordering answers the second from the distances
the listing already carries. A type the server answers with no branch SHALL be named as unserved
rather than omitted, so that a caller can tell a type that has no polygon from one that was not asked
about.

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

- **WHEN** the payload carries a record holding neither a city nor a street address
- **THEN** no such store is printed at all: the record is excluded as unusable before the ordering,
  so there is no place line to omit and no nameless store beside the real ones

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
- **THEN** each record carries what separated them — how strongly it matched and which parts of the
  query it answered — rather than the same sentence twice

#### Scenario: An answer that rests on a resolved place

- **WHEN** the query named a place no store address contains and the answer was ordered around the
  point it resolved to
- **THEN** the record says the answer rests on that place, names the candidate it resolved to, and is
  distinguishable from a record whose store matched an address

#### Scenario: A coordinate query names who would deliver there

- **WHEN** the user passes a coordinate pair as the query
- **THEN** the answer names, beside the ranked stores, the branch serving that point for each
  delivery type whose area is a polygon, each identified as the store the listing holds for it

#### Scenario: A delivery type with no serving branch

- **WHEN** the server answers a delivery type at that point with no branch
- **THEN** that type is named as having none, rather than being left out of what was printed

#### Scenario: A serving branch does not move a store

- **WHEN** a branch that serves the point for delivery stands further from it than another store
- **THEN** the ordering is unchanged by its being the serving branch, and it is reported beside the
  ranking rather than lifted within it

#### Scenario: How many qualified

- **WHEN** more stores qualify than the page size allows
- **THEN** the count that qualified is printed beside the page, so the caller knows the answer was cut
  rather than exhausted

#### Scenario: Being open does not move a store

- **WHEN** a closed store and an open one are equally relevant on every other signal
- **THEN** their order does not depend on which is open, and both records still say which they are

### Requirement: A store query is read by what it names

The store query is one positional value that may be a handle, an address, a settlement alone, or a
place that no address contains, and the CLI SHALL decide which of those it is holding before it
matches anything. Reading all four as one string against one index is what lets a building number
match hex inside a branch uuid and a district name lose to a street that merely shares a syllable
with it.

**A handle is resolved exactly, and before anything else is matched.** A branch uuid or the store
number printed on a receipt SHALL be looked up against the values the listing carries and answered
directly, and neither SHALL take part in approximate matching of any kind — no prefix, no fuzz, no
scoring. A handle SHALL be recognised inside a longer text and not only as the whole query, because a
caller writes the shop's name beside the number as readily as the number alone. A number too short to
be a store number SHALL NOT be read as one; the CLI SHALL take the shape of the numbers the listing
actually carries as the test, rather than reading every digit as a possible handle.

A token is a handle only where it is shaped like a branch uuid, or where it is a number of that shape
**and the listing carries it**. A number of the right shape that the listing does not carry is not a
handle and SHALL fall through to be read as part of an address, because a postal code, a year or a
building number of four digits would otherwise turn a perfectly good query into a refusal. Where the
whole query is a handle the listing does not carry, that is the failure the capability already
specifies, and it stands.

**An address is matched by its parts, not as one string.** The CLI SHALL read a settlement, a street
and a building number out of the query and out of each store's address, and SHALL match each part by
the rule that part deserves: a settlement narrows which stores are considered rather than adding to
any store's score, a street name is matched approximately so that a case ending or a transliteration
still finds it, and a building number is matched near-exactly. Where the query names a building
number, a store whose own number contradicts it SHALL rank below one that does not. A street-type
word — the equivalent of `вул.`, `просп.`, `бульв.` — SHALL NOT contribute to any store's score,
because every address carries one.

That a settlement narrows rather than scores is what stops a settlement's name, occurring inside a
street name, from outranking every store actually in that settlement.

**The settlement is recognised from what the listing itself carries, and the CLI SHALL NOT hold
spellings of settlements as data of its own.** A settlement SHALL be resolved against the names the
listing already holds, allowing for the case ending and the near miss a typed name carries. A
settlement the query spells some other way — a name from another language, a transliteration, a
former name — SHALL NOT be resolved by a table the CLI maintains. Such a table is unbounded in
principle, grows by hand with every spelling a caller invents, and duplicates a gazetteer the CLI
already queries.

Where no settlement is recognised, the query SHALL fall through to be read and resolved as a place,
which is the path that answers it. That path selects the same stores a settlement filter would: the
stores of a settlement stand within the radius of the point that settlement resolves to.

**A query that names a settlement and nothing else is answered by that settlement.** Where the query
resolves to a settlement the listing carries and leaves no street to match, the stores of that
settlement are the answer, ordered as the capability already requires. A matcher that scores streets
has nothing to score there, and SHALL NOT be allowed to answer nothing: a settlement is one of the
forms the query is promised to take.

**The query is reduced only by what would misdirect the geocoder.** The CLI SHALL remove from the
geocoding probe the tokens that make the map answer a different question than the one asked — the
retailer's own name above all, because the geocoder indexes its shops as places and returns the shop
instead of the street. It SHALL keep the words a map reads, among them street-type words and the
equivalents of `метро`, `площа` and `центр`.

The rest of the reduction SHALL be the skill's contract and not a list the CLI maintains. Words of
politeness, of proximity and of question are how a person wraps a place, and the caller here is an
agent that can be told to send the place rather than the sentence. A list of such words is a standing
guess about phrasings, unbounded in the same way a table of spellings is, and every phrasing it fails
to anticipate is a new entry.

The CLI SHALL NOT classify what kind of place the query names. Nothing downstream branches on whether
the text is a street, a district, a metro station or a landmark; the geocoding path is reached by the
listing matching nothing, whatever the text was.

**The caller's own settlement is added to that probe only when the query names none.** Where the
query names a settlement, that settlement stands, and the CLI SHALL NOT append another.

**Where both readings produce a point, their distance apart is the CLI's confidence in the answer.**
A query can be answered from the store listing and from the map independently, and where both answer,
how far apart they land SHALL be what decides whether the CLI presents the answer as settled or as
the better of two candidates. This is an absolute measure and SHALL NOT be replaced by a score whose
scale moves with the corpus.

Where the two readings disagree, the CLI SHALL still answer — with the reading that the query gives
more reason to trust — and SHALL mark that answer as the less certain kind and name the other
candidate. It SHALL NOT withhold an answer on a disagreement: nothing is being written, and a caller
given two places and no answer has been handed back the work the CLI exists to do.

**The CLI SHALL say how it read the query.** Where the text it geocoded is not the text the caller
gave, and where the answer was taken from one reading over another, what is printed SHALL say so in
one line, so that a caller who disagrees can correct the CLI in the same turn instead of guessing why
the answer looks wrong.

#### Scenario: A store number inside a sentence

- **WHEN** the caller names the store number from a receipt with other words around it
- **THEN** that store is answered directly from its number, exactly as it is when the number is the
  whole query

#### Scenario: A building number is not a store number

- **WHEN** the caller names a street and a building number
- **THEN** the building number is read as a building number, and no store is answered on the strength
  of that number matching a handle

#### Scenario: A number of handle shape that names no store

- **WHEN** the caller's query carries a number shaped like a store code that the listing does not
  carry, alongside words naming a place
- **THEN** the query is still read as a place and answered, rather than failing as an unknown handle

#### Scenario: The building number separates two stores on one street

- **WHEN** the caller names a street that carries two stores, and a building number that is one of
  them
- **THEN** the store at that number is answered, and the other ranks below it

#### Scenario: A settlement's name occurs inside a street name

- **WHEN** the caller names a place in a settlement one of whose streets carries that settlement's
  name
- **THEN** the settlement narrows which stores are considered, and the store on that street does not
  outrank the stores the caller meant

#### Scenario: A settlement and nothing else

- **WHEN** the caller names only a settlement the listing carries
- **THEN** the stores of that settlement are the answer, and the query is not treated as unmatched
  because it left no street to score

#### Scenario: A settlement spelled some other way

- **WHEN** the caller names a settlement in a spelling the listing does not carry — another language,
  a transliteration, or a former name
- **THEN** no table of the CLI's own is consulted, and the query is read as a place and answered from
  the point it resolves to, which selects the stores of that settlement where the map knows the name

#### Scenario: No table of settlement spellings exists to be maintained

- **WHEN** a reader looks in the CLI for the spellings of settlements it recognises
- **THEN** there are none beyond the names the listing itself carries, and adding a spelling is not
  how a mis-resolved settlement is fixed

#### Scenario: The same place asked five ways

- **WHEN** the caller names one place bare, and again wrapped in a request for a shop, in a request
  for something nearby, and as a question
- **THEN** the CLI is no longer what makes those five agree: it removes only the tokens that would
  misdirect the map, and the skill's contract is what keeps the other four phrasings from arriving

#### Scenario: The retailer's own name is removed from the probe

- **WHEN** the caller's query carries the retailer's name beside the place
- **THEN** the name does not reach the geocoder, because it would return the shop rather than the
  street

#### Scenario: The filler is the caller's to strip

- **WHEN** the caller's query wraps a place in words of politeness, of proximity or of question
- **THEN** the CLI does not maintain a list of them, the skill's contract asks the caller for the
  place rather than the sentence, and what the CLI still removes is only what misdirects the map

#### Scenario: The kind of place is never decided

- **WHEN** the query names a street, a district, a metro station or a landmark
- **THEN** the CLI takes the same path for all four, deciding nothing about which it is holding, and
  reaches the geocoder because the listing matched nothing

#### Scenario: A query that names its own settlement

- **WHEN** the caller names a place in a settlement other than their own
- **THEN** the settlement the caller named is the one used, and the caller's own is not appended

#### Scenario: The two readings disagree

- **WHEN** the store the listing matches and the point the map returns are far apart
- **THEN** one of them is still answered, marked as the less certain kind, with the other named as
  the alternative

#### Scenario: The CLI says what it did to the query

- **WHEN** the CLI geocodes something other than the text it was given, or answers from one reading
  over another
- **THEN** what is printed says which text was looked up and which reading was answered from

### Requirement: Stores ordered by relevance to the caller

The CLI SHALL answer the store listing from one of two situations, and SHALL order the answer by what
that situation makes relevant.

**A record that names no place is not a store, and SHALL be excluded before anything is matched or
ordered.** The listing carries records that are not shops — stores that were removed, and rows kept
for the server's own bookkeeping. A record carrying neither a settlement nor a street address holds
nothing the query is matched against and nothing the answer prints, and where it carries coordinates
it will be offered as a nameless store standing beside a real one. It SHALL be dropped from the
listing the CLI ranks, and dropped for every command that reads that listing rather than for the
ranking alone.

**A record whose coordinates place it where no store of this estate could stand is not a store
either**, and SHALL be excluded on the same terms. Such a record will otherwise be answered to a
query naming its settlement, because the settlement is read from the text of the record and not from
where it says it is.

That exclusion SHALL be structural and SHALL NOT be a list of names or prefixes the CLI maintains.
The test is that the record fails to hold what the command matches, ranks and prints — not that it is
spelled the way the server happens to spell its removed rows today. Whether the record reports itself
open SHALL NOT be the test either: that flag reports something else, and it neither excludes a record
nor keeps one.

**The reads the ranking needs whatever the query SHALL be issued together.** The store listing and
the caller's till receipts are read on every invocation, and neither depends on the other: the
receipts are joined to the listing by store code after both have arrived, and the call that fetches
them takes nothing the listing provides. They SHALL be issued concurrently, and each SHALL take its
own reported total from its first page and request the pages that total implies together rather than
one at a time.

**A read that only one path needs SHALL stay on that path.** The caller's saved delivery addresses
are needed unconditionally where no query was given, and there they may be issued with the other two.
Where a query was given they are needed only if the listing matched nothing, and they SHALL NOT be
fetched before that is known, because the caller's settlement "SHALL NOT be asked of the server by a
call made only for it".

**Where a query was given**, it names a place, and the stores at or near that place are the answer.
The query SHALL be resolved against these, in this order:

- **A coordinate pair** is taken as the point directly.
- **A store handle** — a branch uuid or a store number the listing carries — is resolved exactly and
  answers directly. It SHALL be looked up rather than matched, and SHALL take no part in the
  approximate matching below, because a query word landing inside a uuid resolves nothing and a
  building number is not a store number.
- **The listing itself**, matched by the parts of an address as the query-reading requirement sets
  out. Matching SHALL be by word relevance and not by literal containment: a query whose words appear
  in a store's street in any order, with any street-type abbreviation, and with a building number
  given in part, SHALL match that store, and the stores that matched SHALL be ordered by how well
  they matched. Words that appear in nearly every address SHALL carry nearly no weight, without a
  list of them being maintained by hand. A store matching too weakly to be an answer SHALL be left
  out, so that a page size does not fill with stores nothing connects to the query.
- **The caller's own saved addresses**, matched the same way against their labels and their places.
  A caller naming a place they have told the CLI about — their home, their work, whatever they
  labelled it — means that place, and its coordinates become the point.
- **The place the text names**, geocoded. Text in the shape of a branch uuid, or a whole query in the
  shape of a store code, that the listing does not hold SHALL NOT be geocoded: it names a store, and
  a store the listing has no record of is a failure naming it, not a place to look near.

The first three answer alone where they answer at all. **The listing and the geocoded place are not
alternatives, and the first of them to answer does not end the search.** Both SHALL be taken, and the
answer chosen by whether they agree, except where the query named a building number that a store's
own number matches, which settles it and SHALL NOT be geocoded. A street name occurring in the
listing is not proof that the caller meant that street — districts and streets share roots — and it is
the second reading that tells the two apart.

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

The settlement the caller belongs to, where the query names none and one is needed to resolve a
place, SHALL be taken from what the account already tells the CLI — the settlements of the stores its
receipts name, and of its saved delivery addresses. It SHALL NOT be asked of the server by a call
made only for it, and where the account gives none, the CLI SHALL resolve the place without one
rather than inventing a settlement.

Distance SHALL be the great-circle distance between a point and the coordinates the store listing
already carries: a straight line, not a route, and the CLI SHALL say so where it describes the
command. A store carrying no coordinates SHALL be left out of any distance comparison rather than
placed at an invented one.

The self pickup and Nova Poshta filters SHALL be applied before the ordering, so that the most
relevant store the caller is shown is the most relevant store that satisfies them.

The ranking SHALL NOT read the cart. The cart is one of the callers that asks it which store to use —
a cart being recreated has no store to offer, and a cart consulting a ranking that consults the cart
is a cycle. Anything the cart knows SHALL reach the ranking as an argument or not at all.

#### Scenario: A removed store is not an answer

- **WHEN** the listing carries a record with no settlement and no street address, standing at
  coordinates a metre from a live store
- **THEN** it is not printed, not matched and not ranked, because a record naming no place is not a
  store, and the live store beside it is the answer

#### Scenario: A record standing nowhere real

- **WHEN** the listing carries a record naming a settlement whose coordinates place it outside the
  estate's own country
- **THEN** it does not answer a query naming that settlement, having been excluded before the
  settlement was matched

#### Scenario: The exclusion is not a list of names

- **WHEN** a reader looks for how removed records are recognised
- **THEN** it is by their failing to carry a place or to stand at plausible coordinates, and not by a
  prefix or a name the CLI keeps a list of

#### Scenario: Being closed is not being excluded

- **WHEN** a store carrying a place and plausible coordinates reports itself closed
- **THEN** it is ranked and printed like any other, because the flag reports something other than
  whether the record is usable

#### Scenario: The unconditional reads do not wait for one another

- **WHEN** the ranking is computed, with a query or without one
- **THEN** the store listing and the till receipts are requested at the same time and joined once
  both have arrived, rather than the second being requested after the first returned

#### Scenario: The pages of a listing are not walked one at a time

- **WHEN** either the store listing or the receipt listing runs past its first page
- **THEN** the remaining pages are requested together, the total having been reported on the first

#### Scenario: The saved addresses are not fetched to answer a query that matched

- **WHEN** a query matches the store listing
- **THEN** the caller's saved delivery addresses are not requested, because nothing on that path
  needs them

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

- **WHEN** the user names a street that appears in the listing's own addresses, together with a
  building number that a store on it carries
- **THEN** the stores standing on it are the answer, and no geocoding is performed

#### Scenario: A street the listing carries, without a building number

- **WHEN** the user names a street that appears in the listing's own addresses and no building number
- **THEN** the place is resolved as well, and the two readings are compared before one is answered,
  because a name shared by a street and a district is not evidence of which was meant

#### Scenario: The words are not contiguous

- **WHEN** the user names a settlement and a street together, in either order, and the listing writes
  them apart with other words between
- **THEN** the store standing there is found, because the words are matched as words and not as a
  run of characters

#### Scenario: The street type is written differently

- **WHEN** the user writes the street type in full and the listing abbreviates it, or the other way
- **THEN** the store is still found, and the street-type word does not decide which store ranks
  highest, because it takes no part in the score at all

#### Scenario: Part of a building number

- **WHEN** the user names a street and the numeric part of a building the listing writes with a
  letter after it
- **THEN** that building's store ranks above the others on the street, rather than the query
  matching nothing

#### Scenario: A store named by its number

- **WHEN** the user passes the store code printed on a receipt
- **THEN** that store is the answer, resolved exactly from the listing's own store numbers before
  anything is matched as text

#### Scenario: A place the caller has named before

- **WHEN** the user names one of their own saved addresses by the label they gave it
- **THEN** the stores near that address are the answer, resolved from the saved address itself
  without geocoding anything

#### Scenario: The caller's settlement comes from the account

- **WHEN** the query names a place but no settlement, and the account holds receipts or saved
  delivery addresses
- **THEN** the settlement those already name is the one used to resolve the place, and no call is
  made whose only purpose is to learn it

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
