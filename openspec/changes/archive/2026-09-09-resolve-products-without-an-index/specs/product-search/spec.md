## MODIFIED Requirements
### Requirement: Favorites

The CLI SHALL list the caller's saved products within the session's delivery context as one more
population of the single listing, and SHALL add or remove up to five of them in one call. Saving and
unsaving SHALL be commands of the group named for products, because what is saved is a product; each
SHALL be named for its intent, and the products SHALL be named positionally, by any of the forms a
product is named by. No JSON SHALL be accepted as an input form.

The caller SHALL NOT be asked for the external product id the write requires. The CLI SHALL take it
from the record the product was printed from where it carries one, and from a lookup otherwise. The
write needs the product's uuid and its external product id together, and no form of a handle carries
both: a uuid names no external product id and a slug names no uuid. A handle given on its own
therefore costs one lookup, and the CLI SHALL make it rather than refuse the write.

#### Scenario: List favorites

- **WHEN** the user lists the saved products
- **THEN** the CLI returns them for the session's context, paged by the requested page size, printed
  as the one product record every listing prints

#### Scenario: Update favorites

- **WHEN** the user names several products to add, or several to remove, positionally
- **THEN** the CLI resolves each named product to the identifiers the call requires and forwards the
  write in a single call, the intent being the command that was run rather than a field of an
  argument

#### Scenario: Saving sits beside the listing

- **WHEN** a caller reads the saved products and then saves another
- **THEN** both are subcommands of the one group named for products, and the read is not a command of
  one family and the write of another

#### Scenario: The external product id is not asked for

- **WHEN** a favourite write names a product
- **THEN** the external product id the call requires is resolved from that product's record or by
  looking the product up, and an external product id the caller supplied does not decide which
  product is acted on

#### Scenario: A favorite named by a slug never seen before

- **WHEN** a favourite write names a product by a bare handle — a slug, or a uuid — and by nothing
  else
- **THEN** that product is looked up, the identifiers the call requires come back together, and the
  favourite is acted on

#### Scenario: A product that resolves to no external product id

- **WHEN** a favourite write names a product no step of resolution can supply an external product id
  for
- **THEN** the command fails naming the product, and no favourite is added or removed

### Requirement: What the filtered listing takes

The CLI SHALL list the products of a category, a curated set or a promotion, and SHALL narrow the
listing by stock, by carrying a promotion and by price, and order it by a requested field and
direction. Each of those narrowings is a filter the listing itself takes, and each SHALL reach the
server only when the caller passed it.

The population SHALL be named by one option per kind — one for a category, one for a promotion, one
for a set — rather than by one option accepting a handle of any kind. The kind is not recoverable from
the handle: measured over the branch's 1042 handles, one value is both a promotion code and a category
slug and another is both a promotion code and a set slug. Naming the kind in the option is what lets a
caller who holds a handle use it without the CLI guessing, and it is what keeps a title from being
resolved against records that are not alternatives to it.

Each option SHALL accept the handle its kind is taken by and the title the record is called by, the
CLI resolving a title against that kind's table alone, so that a caller who knows what a part of the
catalogue is called does not first have to find out how it is spelled.

A category named as the population SHALL list its whole subtree. Measured over five categories, the
catalogue returns for a parent exactly the count the hierarchy reports for it — 97, 42, 498, 370 and
911 — each differing from the naive sum of its children's counts — 155, 46, 498, 378 and 1094 — so the
subtree is already included and deduplicated, and the children SHALL NOT be named beside the parent to
obtain it.

A category the branch stocks nothing under SHALL NOT be listable. Such a category is absent from the
branch's catalogue, so naming it SHALL fail as any unknown name does, rather than costing a call to
return an empty listing. A caller is better served by being told the category is not part of this
branch than by an empty answer that looks like a stock outage.

The listing SHALL NOT require a population, and SHALL NOT refuse a free-text query. A query together
with a population searches inside it. What SHALL remain refused is a listing narrowed by price or
stock alone, with neither a query nor a population to narrow, because the server rejects such a
request and answers with a status the caller cannot act on.

The sort field and the sort direction are the server's ordering, and SHALL be forwarded only where the
CLI does not impose its own. Where a query was given the CLI ranks, and the server-side sort SHALL be
refused naming the conflict rather than forwarded and then overridden.

**The listing SHALL take a page size and no page offset.** The page size bounds how much is printed,
over whichever ordering stands. An offset SHALL NOT be offered: where the CLI ranks, a position in a
ranking is not something the caller can name, and a ranking has no meaningful tail to walk into;
where the server orders, the same holds of an order the caller did not ask for. A caller wanting to
see further asks for a larger page, or narrows what they asked for. The store listing and the
catalogue already refuse an offset for this reason and the product listing SHALL agree with them.

#### Scenario: Listing with filters

- **WHEN** the user lists products with any combination of population, in-stock-only,
  promotion-only, lowest price, and highest price
- **THEN** only the filters the user passed reach the server, and the rest are left unset

#### Scenario: A category named by its slug

- **WHEN** the user names a category by its slug, a promotion by its code or a set by its slug, using
  the option for that kind
- **THEN** that handle reaches the server as it was typed, and the products of that population are
  listed

#### Scenario: A scope named by its title

- **WHEN** the user names a population by the title it is called by rather than by its handle
- **THEN** the title is resolved against that kind's table alone to exactly one handle and the
  products are listed, and where more than one record of that kind carries the title the candidates
  are printed and the command stops

#### Scenario: A category the branch carries nothing under

- **WHEN** the user names a category this branch holds no products for
- **THEN** the command fails naming the value, because such a category is not part of this branch's
  catalogue, and no call is made to discover an empty listing

#### Scenario: A parent category lists its subtree

- **WHEN** the user names a category that has children
- **THEN** the products of the whole subtree are listed, without the children being named beside it

#### Scenario: Ordering and paging

- **WHEN** the user passes a sort field or a sort direction over a population and writes no query
- **THEN** they are forwarded to the server unchanged
- **AND** a page size is honoured over whichever ordering stands, query or no query

#### Scenario: There is no offset

- **WHEN** the caller looks for a way to ask for the products after the first page
- **THEN** no offset is offered, and a larger page size or a narrower question is the only way to see
  more

#### Scenario: Ordering against a query

- **WHEN** the user passes a sort field together with a query
- **THEN** the command fails naming the conflict, because the CLI ranks whatever a query was given for
  and two orderings cannot both be the answer

#### Scenario: No anchor to narrow by

- **WHEN** the user asks for products in stock under a price, with neither a query nor a population
- **THEN** the command fails before the call, naming what it needs, rather than letting the server
  answer with a status that names nothing

#### Scenario: A query written where a listing was asked for

- **WHEN** the user passes free text alongside a population
- **THEN** the population reaches the server and the text does not, the CLI paging that population
  within the stated ceiling and matching the text over the records itself, the listing and the search
  being one command with nowhere else to send the caller

### Requirement: Selectors compose by kind

A selector names a population. Selectors SHALL compose rather than exclude one another, under two
rules and no others:

- **Repeated within one kind, they union.** Two categories named together SHALL list the products of
  either.
- **Given across different kinds, they intersect.** The saved products together with a category SHALL
  list the saved products that lie in that category.

The catalogue populations SHALL be three kinds of selector rather than one, on the same footing as the
saved products. A category, a promotion and a set are read from different calls and selected by
different request parameters, and the CLI SHALL NOT flatten them into one option whose kind it then
has to infer.

Repeating the option of one kind SHALL union within that kind. Giving the options of two kinds
together SHALL intersect.

The intersection SHALL be assembled by the CLI, not delegated to the catalogue tool, even though that
tool can express one — it takes a category, a set and a promotion together in a single call. Delegating
it would answer only the case where each kind was named once and no other selector stood beside them.
A union within one kind intersected with a second kind, or any catalogue population intersected with
the saved products, cannot be expressed in one call at all, and those compositions are on the same
footing as the simple one. Two assembly paths for one rule would differ in their call counts, their
read ceilings and the note they print when a ceiling cut them short, so there SHALL be one.

A free-text query SHALL NOT be a selector. It SHALL be the filter and the ordering over whatever
population the selectors chose. Where no selector was given, the query SHALL choose the population
itself, and that population SHALL be what the catalogue answered to the query and its expansions and
nothing else. The CLI SHALL NOT add a product the catalogue did not return. A product the CLI put
into an answer the shop did not put there is the CLI's invention: it carries no price, no stock and
no availability from that branch, and the CLI cannot know the branch has it at all.

A narrowing option — in-stock only, promotion only, a price bound, a page size — SHALL conflict with
no selector and SHALL narrow whatever population the selectors chose. Where the population cannot
honour one, the command SHALL say so rather than drop it silently. A server-side ordering over a union
SHALL be refused on that rule: the order of a union is the CLI's own merge of several listings, and no
server can be asked for it.

Where several queries are given over a chosen population, each SHALL be matched over that population
in its own right, and the record SHALL name the ones that matched it. They SHALL NOT be joined into a
single phrase: joining them makes a shopping list one long query that matches nothing, and the flat
listing has a place to say which query found what.

Where the server offers no single call for a composition, the CLI SHALL assemble it: the catalogue
tool intersects a category, a set and a promotion within one call but offers no union at all, so a
union SHALL be drawn as one listing per population and merged, and every merge SHALL remove the
duplicates it created.

#### Scenario: One option per kind

- **WHEN** the caller names a category, a promotion or a set as the population of a listing
- **THEN** the option they used says which kind it is, and no handle has to be guessed at

#### Scenario: A handle two kinds carry

- **WHEN** the caller holds a value that is both a promotion code and a set slug
- **THEN** the option they choose settles which is meant, and the command does not have to ask

#### Scenario: A sort over a union

- **WHEN** the caller names two populations of one kind and asks for a server-side ordering
- **THEN** the command says the ordering cannot be honoured over a union, rather than sorting one
  listing and merging another into it

#### Scenario: Several queries inside a scope

- **WHEN** the caller names a population and writes three queries
- **THEN** each is matched over that population in its own right and the records name which matched
  them

#### Scenario: Two scopes named together

- **WHEN** the caller names two categories in one listing
- **THEN** the products of either are listed, each product once, however many of the two hold it

#### Scenario: Two populations of different catalogue kinds

- **WHEN** the caller names a category and a promotion in one listing
- **THEN** only the products lying in both are listed

#### Scenario: Two populations of different kinds

- **WHEN** the caller asks for the saved products within a category
- **THEN** only the saved products that lie in that category are listed

#### Scenario: A query over a chosen population

- **WHEN** the caller writes a query and names a population
- **THEN** the population is drawn and the query orders and filters it, and the query is not itself
  treated as a population

#### Scenario: A query alone

- **WHEN** the caller writes a query and names no population
- **THEN** the population is the catalogue's answer to that query and its expansions, and every
  product printed came from that answer

#### Scenario: Nothing to list

- **WHEN** the caller runs the listing with neither a query nor a selector
- **THEN** the command fails before the call, naming the query and the selectors, rather than asking
  the server for the whole catalogue

### Requirement: What the CLI reads through is bounded

Where the CLI answers a question by reading records and narrowing them itself, rather than by asking
the server to narrow them, that reading SHALL be bounded, and the bound SHALL be stated rather than
left to the size of the catalogue.

This covers every composition the server has no single call for: a query matched over the records of
a scope; a filter applied over the saved products or over a free-text search, whose tool takes no
stock, promotion or price argument at all; a union drawn as one listing per scope; an intersection
drawn from two populations read separately; and any population the CLI orders, since ordering reads
past what it prints by construction.

Where the CLI orders the records itself, it SHALL NOT stop at the page the caller asked for. The
best ten of a population are not the first ten read, and a reading that stops at ten cannot know
that the eleventh record would have outranked them. Reading SHALL therefore run to the ceiling, or
to the end of the population, and the page SHALL be taken from what was ordered. Only where the CLI
imposes no order of its own MAY it stop as soon as the page is filled, the order it is preserving
being the one the records arrived in.

That ceiling SHALL be the same whichever population the CLI itself pages, and SHALL be stated in the
description of the command it bounds rather than in the help of each option — it bounds what the
command can answer, and an option's help names the value being asked for.

Where a population's own tool takes no offset, the CLI cannot page it at all, and that tool's own cap
on one call bounds it instead. Such a population SHALL be bounded by that cap, the cap SHALL be stated
in the same description beside the ceiling, and the listing SHALL NOT report having read to the
ceiling where the cap is what stopped it. A ceiling the CLI cannot reach is not a ceiling, and
reporting one is a false account of how much of the population was seen.

Where either bound stopped the reading before a population was exhausted, the listing SHALL say so, so
that a short answer is never read as the population holding nothing more.

Where an intersection was drawn and either side was cut short by the ceiling, the listing SHALL say
so, because an intersection of two truncated readings can omit a product that both populations hold
and neither reading reached. A listing SHALL NOT report such an intersection as complete.

#### Scenario: A scope larger than the ceiling

- **WHEN** a scope holds more products than the ceiling on records read allows
- **THEN** the matches found within the ceiling are printed and the listing states that the scope
  was not read to its end, rather than reporting the scope exhausted

#### Scenario: The ceiling is discoverable

- **WHEN** the caller reads the description of the listing command
- **THEN** the ceiling on records read is stated there, and no option's help carries it
- **AND** the cap that bounds a population the CLI cannot page is stated beside it

#### Scenario: A population the CLI cannot page

- **WHEN** a population is drawn from a tool that takes no offset, and its own cap on one call stops
  the reading short
- **THEN** the listing says the reading stopped at that cap, and does not report having read to the
  ceiling it never approached

#### Scenario: A ranked page is not the first page read

- **WHEN** the caller asks for the best ten of a population the CLI orders
- **THEN** the reading does not stop at ten matches, and the ten printed are the ten highest of what
  was read rather than the first ten found

#### Scenario: An intersection over a truncated side

- **WHEN** two populations are intersected and one of them was cut short by the ceiling
- **THEN** the listing states that it was, and does not present the intersection as the whole of it

#### Scenario: A union larger than the ceiling

- **WHEN** two scopes are unioned and one holds more records than the ceiling allows
- **THEN** the records read are merged and deduplicated, and the listing states that it stopped short

### Requirement: Alternatives to an unavailable match are offered without being asked for

Where the ordering puts one product clearly ahead of the rest and that product is out of stock or
unavailable, the CLI SHALL fetch that product's alternatives and print them below it, each marked as
an alternative to it, without the caller having asked for them.

This is the question the caller is about to ask. A listing that answers "the thing you named exists
here and there is none of it" and stops has told the caller to run a second command they could not
have known they would need; the CLI already holds the handle that answers it.

The lookup SHALL be bounded to the one product the ordering singled out, and SHALL happen only where
the ordering was decisive — where no single product stands clearly ahead, there is nothing to find
alternatives to, and the listing SHALL print what it found.

The alternatives SHALL be marked as such and SHALL NOT be mixed into the matches as though the caller
had asked for them, because they answer a different question from the one that was typed.

This SHALL be the only way the listing prints alternatives. No selector SHALL list them on request:
the question they answer arises from a product the caller has already been shown, and the CLI can see
when it arises.

#### Scenario: The named product is out of stock

- **WHEN** a query resolves decisively to one product and that product is out of stock
- **THEN** its alternatives are printed below it, marked as alternatives to it

#### Scenario: The named product is in stock

- **WHEN** a query resolves decisively to one product that is available
- **THEN** no alternatives are fetched, and no extra call is made

#### Scenario: Nothing stands clearly ahead

- **WHEN** a query returns several comparable matches and none is singled out
- **THEN** no alternatives are fetched, because there is no one product to find alternatives to

#### Scenario: Alternatives are not passed off as matches

- **WHEN** alternatives are printed beside the matches
- **THEN** each is marked as an alternative to the named product, and none is presented as having
  matched the query

#### Scenario: Alternatives cannot be asked for directly

- **WHEN** the caller tries to list the alternatives to a product as a population of its own
- **THEN** no such selector exists, the alternatives being printed where the CLI can see they answer
  the question the listing raised

## ADDED Requirements
### Requirement: Batch search and the expansions a query travels with

The CLI SHALL search several free-text product queries in one call, keeping the queries in the
order they were given. The queries SHALL be accepted as bare arguments and in no other form: the
search exists to take them, so a second way of writing the same list would only be one more thing to
choose between. A query SHALL be required wherever no selector chose the population instead.

**A query SHALL be sent as more than itself.** The catalogue matches all of a query's words at once,
so a query of several words returns nothing wherever the branch carries no product answering every
one of them — measured, that was over a third of multi-word queries, with `кава` returning 66
products, `кава мелена` 54 and `кава мелена арабіка` none. The CLI SHALL therefore send, for each
query: the query itself; each of its words longer than two characters and not purely numeric; and the
query transliterated into Cyrillic, where it carries Latin characters.

**The words SHALL travel unconditionally, and SHALL NOT wait on what the query alone returned.** A
condition on the query's answer can only be evaluated after that answer arrives, which makes two
round trips of one and contradicts the requirement in `list-resolution` that nothing be withheld from
the first round. The server bills a probe rather than a call, so withholding the words saves nothing
to weigh against the round trip it costs.

The CLI SHALL NOT build combinations of a query's words — pairs, triples, or the query with one word
left out. Measured over 46 multi-word cases they returned 133 products and not one acceptable answer,
so they cost calls and add only noise.

Everything a query is expanded into SHALL travel in as few calls as the server allows, and every
query of one invocation SHALL be expanded before any call is made, so that a shopping list costs the
same round trips whether its items are one word or five.

A query SHALL be normalised before it is sent, of characters the server cannot match: a typographic
apostrophe and an ampersand both return nothing when sent through, and neither SHALL reach the
server unaltered.

The page size SHALL cap the one listing the search prints, and SHALL NOT cap each query separately.
A caller asking for ten results SHALL be given ten rather than ten per query. Where the caller asks
for no page size, ten SHALL be printed: a listing is an answer to a question, not a corpus to page
through, and a caller who wants more asks for more.

Nothing a search returns SHALL be kept after the answer is printed. A product is printed from the
call that returned it and is not written anywhere, so a second search costs exactly what the first
cost and answers from the branch as it stands rather than as it stood.

#### Scenario: Several queries at once

- **WHEN** the user writes several product queries
- **THEN** all queries travel in a single call, in the order given, so a shopping list costs one round trip

#### Scenario: A multi-word query the branch answers nothing for

- **WHEN** a query of three words names no product the branch carries all three words of
- **THEN** the words are searched in their own right as well, and the products answering them are the
  query's population, rather than the query returning nothing

#### Scenario: No combinations are built

- **WHEN** a query of four words is expanded
- **THEN** the query and its individual words are sent, and no pair, triple or leave-one-out variant
  of it is

#### Scenario: A query written in Latin characters

- **WHEN** a query carries Latin characters
- **THEN** the query transliterated into Cyrillic is searched beside it

#### Scenario: The page size sizes the listing

- **WHEN** the user searches three queries and asks for ten results
- **THEN** ten records are printed in all, rather than ten for each query

#### Scenario: No page size asked for

- **WHEN** the user searches with no page size
- **THEN** ten records are printed

#### Scenario: Queries written as bare arguments

- **WHEN** the user writes the queries after the command name
- **THEN** they are the queries the search runs, because that is the form a caller reaches for
  first and the only form the command offers

#### Scenario: A query holding a space

- **WHEN** a query names a product in more than one word
- **THEN** it travels as one query, the shell having kept it together, and is expanded rather than
  replaced by its words

#### Scenario: No query at all

- **WHEN** the user runs the search with neither a query nor a selector
- **THEN** the command fails before the call, rather than asking the server for nothing

#### Scenario: A search leaves nothing behind

- **WHEN** a search returns products and prints them
- **THEN** nothing is written anywhere, and an identical search run afterwards makes the same calls
  and can return a different answer if the branch changed

### Requirement: What a product record prints, and where each field comes from

The product listings SHALL print each product as one record whose keyed fields take a line each —
every identifier the product can be named by, its stock, and the step it is sold in when the product
is weighted — and SHALL close that record with a single line carrying no key, holding the product's
name, the size of one package where the product is sold by the piece, its price, and its previous
price where the payload carries one.

Two further keyed rows MAY stand among them, each present only when it has something to say. A row
naming the queries that matched the product, where more than one query was searched and the record
answers several. And, where the caller asked for it, the static half of the product's card. A record
carries neither by default, and no listing SHALL print one of them empty.

The identifiers SHALL be the product's own uuid, its slug, and its external product id. All three
SHALL be printed wherever all three can be had, because no two are accepted by the same tools: a
cart write and a removal take the uuid alone and reject the others outright; a
product card and its alternatives take any of the three; a search matches an external product id
exactly when it is given as a search term; and adding a product to favourites requires the uuid and
the external product id together.

A form the payload did not carry SHALL be supplied only where the payload itself determines it. The
external product id is the numeric tail of the slug, so a payload carrying a slug determines it and
the record SHALL print it. A form nothing in the payload determines SHALL be absent rather than
derived, and SHALL NOT be recovered from any record of a product printed earlier: a handle recovered
by matching one payload against another is a claim that two payloads name the same product, and the
CLI has no way to be sure of that which the payload has not already told it.

No amount SHALL be converted in either direction: every price, stock and step SHALL be the number the
payload carried. A price SHALL carry the currency. A price SHALL also carry the unit it is per
whenever the payload flags the product as sold by weight, and that flag SHALL be the only thing
consulted — no value SHALL be inspected to decide whether a product is sold by weight. Stock and step
SHALL carry that same unit under the same condition. Every price, stock and availability on a record
SHALL come from the call that printed it.

The branch SHALL NOT be printed, because it is the branch the session named and the payload only
echoes it. The company SHALL be hoisted into `common` where every record of the listing shares one,
and printed on the record where they do not. The ratio SHALL NOT be printed under a key of its own:
where the product is sold by the piece it stands beside the name as the size of one package, and
where it is sold by weight it names the reference unit of the storefront and carries nothing the
caller can act on. The product image SHALL NOT be printed. Because every selector returns this record
with the same fields, they SHALL build it through one shared piece of text-building.

#### Scenario: One record per product

- **WHEN** a product listing is printed
- **THEN** each product's fields take a line of their own and a blank line stands between products

#### Scenario: Every handle the payload carries

- **WHEN** a product record is printed for a product whose payload carried a uuid, a slug and an
  external product id
- **THEN** all three appear, each on a keyed line

#### Scenario: The two conditional rows

- **WHEN** a record is printed for a single query with no static half asked for
- **THEN** neither conditional row appears, and neither is printed empty

#### Scenario: An external product id the slug determines

- **WHEN** a product record is printed from a payload that carries a slug and no external product id
- **THEN** the record prints the id the slug names, because the slug determines it rather than
  suggesting it

#### Scenario: A payload short of a handle

- **WHEN** a product record is printed from a payload short of a form nothing in it determines
- **THEN** the record prints the identifiers it has and derives nothing, whatever any earlier listing
  printed for a product of the same name

#### Scenario: The name and the price close the record

- **WHEN** a product record is printed
- **THEN** its last line holds the name and the price together, carries no key, and stands below
  every keyed row of that record

#### Scenario: A product sold by weight

- **WHEN** a product is flagged as sold by weight
- **THEN** its price names the unit it is per, its stock and step name that same unit, and the step
  is printed on a keyed row of its own because a caller adding the product to a cart passes that
  number unchanged

#### Scenario: A product sold by the piece

- **WHEN** a product is not flagged as sold by weight
- **THEN** the size of one package stands beside the name, the price names no unit beyond the
  currency, and no step is printed

#### Scenario: No amount is converted

- **WHEN** a price, a stock or a step is printed
- **THEN** it is the number the payload carried, digit for digit, and the unit beside it is a label
  rather than the result of any arithmetic

#### Scenario: Fields a product does not carry

- **WHEN** a product has no previous price or no special price
- **THEN** those parts are absent rather than shown as empty

#### Scenario: Availability

- **WHEN** a product reports a stock of zero, or reports that it is unavailable
- **THEN** the record says so, because a caller deciding what to buy needs it

#### Scenario: The same record across three tools

- **WHEN** a scope listing, a search or the saved products print a product
- **THEN** the record reads identically, field for field, whichever selector printed it, save for the
  conditional rows, whose presence follows from what the caller asked rather than from which tool
  answered

### Requirement: What the single product card prints

The single product card SHALL print the product's uuid, its slug, its stock and its company
under their keys, SHALL close the record with the same keyless line of name and price the
listings use, and SHALL print the attribute dictionary the server supplies as one line per
entry, with the keys exactly as the server spelled them. The card's payload carries no external
product id under a key of its own, and the card SHALL print the one its slug names, the slug being
part of the same payload. The card SHALL decide whether the product is sold by weight from the unit
the payload names, not from its weighted flag, because that flag is returned as false for products
every listing reports as weighted. The gallery of images and the web page address SHALL NOT be
printed.

#### Scenario: The card reads the unit, not the flag

- **WHEN** a product card names a unit of weight while its weighted flag says otherwise
- **THEN** the price is printed as a price per that unit, so the card and the listing agree
  on the same product

#### Scenario: Attributes as the server named them

- **WHEN** a product card carries attributes
- **THEN** each attribute takes a line as its own key and value, keeping the server's
  spelling, unit included

#### Scenario: No gallery

- **WHEN** a product card carries a list of image addresses and a page address
- **THEN** neither is printed

#### Scenario: The card carries its slug

- **WHEN** a product card is printed
- **THEN** its slug appears under a key of its own, because the card's payload carries one and
  it is the handle the alternatives lookup takes

#### Scenario: The card carries the external product id its slug names

- **WHEN** a product card is printed
- **THEN** the external product id the slug names appears, and the card alone is enough to add the
  product to the saved ones

#### Scenario: The branch is absent from the card too

- **WHEN** a product card is printed for the branch the caller named
- **THEN** no branch row appears, for the same reason it is absent from a listing's records

### Requirement: One listing, many selectors

Every product listing SHALL be answered by one command, and that command SHALL belong to a group named
for products, alongside the single card and the writes that save and unsave a product. A caller SHALL
find everything the CLI does with products under one name, rather than learning which of four
top-level commands answers which question about the same thing.

Which products the listing lists SHALL be decided by its selectors: a category, a promotion, a
curated set, or the caller's saved products. A free-text query SHALL NOT be one of them; it filters
and orders whatever they chose, and chooses the population itself — the catalogue's answer to it —
only where no selector was given.

The alternatives to a product SHALL NOT be a selector. What is like a product is a question the CLI
asks on the caller's behalf where it can see the answer is wanted, and the requirement that governs
that says when. A selector for it would be a second way to reach the same call, offered for a case
the CLI already covers.

The selectors SHALL decide the population and nothing else. Whatever selected them, the products SHALL
be printed as the same record, built by the same text-building from the same fields, under the same
summary, with the same filters and the same page size available over them.

What SHALL be allowed to differ follows from what was asked rather than from which tool answered: the
conditional rows a record may carry, and whether a server-side ordering is on offer at all. A row
naming the queries that matched stands only where more than one was searched; the static half stands
only where it was asked for.

The server's ordering SHALL be available over exactly one catalogue population and no query — one
category, or one promotion, or one set — its own tool being the only one that takes a sort. Two
populations of one kind are a union and two of different kinds are an intersection, and neither is a
listing the server ordered.

A listing SHALL require a query or a selector. With neither, the command SHALL fail before the call,
naming what it takes, rather than asking the server for the whole catalogue.

#### Scenario: Three populations, one shape

- **WHEN** the same product appears in a search of the catalogue, in the listing of a category, and
  among the saved products
- **THEN** its record is built from the same fields by the same text-building in all three, and the
  summary above it is the same summary

#### Scenario: A sort over one population of any kind

- **WHEN** the caller names exactly one category, or exactly one promotion, or exactly one set, and
  passes a sort field with no query
- **THEN** the sort is forwarded to the server, whichever of the three kinds it was

#### Scenario: No selector asks for alternatives

- **WHEN** the caller looks for a way to list what is like a named product
- **THEN** none is offered, the alternatives being printed where the CLI can see they are wanted

#### Scenario: One group for everything about a product

- **WHEN** a caller looks for the listing, the single card, or the way to save a product
- **THEN** all three are subcommands of the one group named for products

#### Scenario: Nothing to list

- **WHEN** the caller runs the listing with no query and no selector
- **THEN** the command fails before the call, naming the query and the selectors one of which is
  required

### Requirement: One product's card

The CLI SHALL open the full card of a product. The card SHALL take the product under any of the three
forms the tool accepts — its uuid, its slug or its external product id — and SHALL send whichever was
given, unchanged.

The card SHALL be a command of the product group taking one handle, and SHALL NOT be reached through
a lookup that decides what kind of thing a handle names, and SHALL NOT be folded into the listing as
a way of naming one product. Nothing has to be decided: all three forms are answered by the one tool
that opens a product, so the command passes on whatever it was given and the server says whether it
resolves. Folding it into the listing would require deciding whether an argument is a query or a
handle, and the batch search matches only a numeric external product id exactly — a uuid or a slug
written as a query would not reach the product it names. A handle in none of the three forms SHALL
fail naming the handle.

The card and the listing's static half SHALL answer different needs and SHALL both exist. The card is
one product read in full and printed on its own; the static half is the same reading printed beside a
listing, for every product of a page at once.

#### Scenario: Product card

- **WHEN** the user asks for a product by its uuid, its slug or its external product id
- **THEN** the CLI returns that product's full card, composition, nutrition, and attributes included

#### Scenario: A handle is not a query

- **WHEN** a caller names a product by uuid to the listing rather than to the card
- **THEN** it is searched as text, because the listing does not inspect an argument to decide what
  kind of thing it names

#### Scenario: The form the caller chose is the form that travels

- **WHEN** the user names the same product to the card three times, once under each form
- **THEN** each call carries the text that was typed, and the server decides whether it resolves

### Requirement: A listing with a query is ordered by the CLI

Where a query was given, the CLI SHALL order the products it drew and SHALL print them in that order,
by the one ranker the CLI uses to resolve a shopping list.

**The ranking SHALL reorder and SHALL NOT remove.** A product the server returned for the query stays
in the listing whether or not the CLI's own matching accounted for it, keeping the place the server
gave it. The CLI's matching knows nothing of morphology, of Russian written for a Ukrainian
catalogue, of transliteration or of a typo, all of which the server resolves; a rule letting it drop
what it did not understand lets the least informed layer overrule the best informed one. Measured
against the shipped ranker, that veto emptied a non-empty answer in 37 of 63 false misses and turned
30 of 50 valid Russian queries into a reported miss.

The order SHALL be built from what the CLI can see without another call:

- **First, how many of the query's expansions returned the product.** A product answering the whole
  query and each of its words is a better answer than one answering a single word, and this counts
  the server's own agreement with itself rather than any judgement of the CLI's.
- **Then, the position the server gave it**, within one such level.
- The size of one package, where it can be read as a number, MAY scale the order and SHALL NOT
  exclude anything from it.

No signal SHALL be drawn from a record of what the caller bought, saved or was shown before, and none
SHALL be drawn from a promotion, save where the requirement on settling a term admits one. Measured,
a promotion used to order candidates converts correct answers into wrong ones — a still water at 35
UAH replaced by an imported one at 179, plain butter by garlic butter — so in a listing, which
settles nothing, a promotion SHALL be printed as a fact of the product and take no part in the order.

The ranking itself SHALL cost no call. Every record it orders came back from the calls the query
already made.

Nothing the CLI received SHALL be kept after the listing is printed.

Where no query was given there is nothing to rank against, and the server's own order SHALL stand.
The server-side sort SHALL therefore be accepted only where the CLI does not rank **and** the
population's own tool offers one — which is the scope listing alone. It SHALL be refused with the
reason wherever the CLI ranks, two orderings not both being the answer, and equally over the saved
products, whose tool takes no sort argument at all.

#### Scenario: A query orders the population

- **WHEN** the caller writes a query over a population
- **THEN** the products are printed in the CLI's ordered order, and no call was made to produce that
  order

#### Scenario: A product the CLI could not account for

- **WHEN** the server returns a product for a query and the CLI's own matching accounts for none of
  the query's words in its name
- **THEN** the product is still printed, in the place the server's order gives it, rather than
  dropped

#### Scenario: A query in Russian against a Ukrainian catalogue

- **WHEN** a query is written in Russian and the server answers it with Ukrainian products
- **THEN** those products are listed, the CLI not requiring itself to recognise the words in order to
  print what the server found

#### Scenario: Agreement across expansions orders the answer

- **WHEN** one product is returned for the whole query and for each of its words, and another for one
  word alone
- **THEN** the first is printed above the second

#### Scenario: A promotion does not raise a record

- **WHEN** two products answer a query equally and one carries a promotion
- **THEN** the promotion is printed on its record and does not move it above the other

#### Scenario: Records ordered but not printed

- **WHEN** a listing orders more records than it prints
- **THEN** the printed ones are the highest ordered, and nothing received is kept afterwards

#### Scenario: A sort where the CLI ranks

- **WHEN** the caller passes a server-side sort together with a query
- **THEN** the command fails naming the conflict, rather than applying one ordering and discarding
  the other

#### Scenario: A scope listed with no query

- **WHEN** the caller lists a scope and writes no query
- **THEN** the server's order stands, and the server-side sort is accepted

#### Scenario: A sort over a population that has none

- **WHEN** the caller passes a server-side sort over the saved products, with or without a query
- **THEN** the command fails naming it, because that tool takes no sort and the CLI would otherwise
  have to accept an option it cannot honour

### Requirement: The attributes of every product on the page

The listing SHALL, on request, print beside each product the part of its card that does not change —
the attribute dictionary the server supplies for it, and the unit the product is counted in — while
every changing part of the record SHALL continue to come from the call that printed it.

Composition, allergens and nutrition are keys of that one dictionary rather than fields of their own,
they are not present on every product, and the CLI SHALL keep and print whatever keys the dictionary
carried without requiring any particular one.

The two halves SHALL be sourced differently and SHALL NOT be confused. Price, previous price, stock,
availability and step are the state of a product at a branch at a moment and SHALL come from the
listing's own payload, which already carries them. The attributes SHALL be fetched for every printed
product, the card being the only place they are published.

The fetching SHALL cover the printed page in full and SHALL NOT be bounded below it. The page is
already the caller's own bound on how much they asked for, and a second bound underneath it would
print some products with their attributes and others without, for a reason the caller did not choose.
The calls SHALL be made together rather than one after another.

Where a card cannot be had for a printed product, that product's attributes SHALL be absent and the
listing SHALL say which products they are, so that a record printed without attributes is not read as
a product that has none.

#### Scenario: The static half covers the page

- **WHEN** the caller asks for the static half over a page of ten products
- **THEN** ten cards are fetched, together, and every printed product carries its attributes

#### Scenario: The live half is never taken from what was fetched

- **WHEN** the static half is printed beside a product
- **THEN** the price, the stock and the availability are the ones the listing's own call returned

#### Scenario: A card that could not be had

- **WHEN** the card of one printed product cannot be fetched
- **THEN** that product prints without attributes, the listing names it, and the rest of the page is
  unaffected

## REMOVED Requirements


### Requirement: The record states why it was raised

**Reason**: The row named three things — that the caller has bought the product, how often and how
recently; that the caller has saved it; that it carries a promotion and by how much — and all three
were signals in the ordering. None of the three orders anything now. The purchase and saved signals
were measured as a ranking boost at one match in 221 candidates, and that match was wrong; the
promotion was measured to convert correct answers into wrong ones. A row explaining a bias that no
longer exists would describe the CLI rather than the answer.

**Migration**: The reason the row existed — that a reader who cannot see the shaping cannot correct
for it — is served by there being no shaping to see. What ordered the listing is now the server's
answer and the agreement between a query's expansions, both of which follow from the query the caller
wrote. A promotion is still printed on the record it belongs to, as the previous price beside the
current one, as a fact about the product rather than as a reason it was raised. Where the caller's own
purchases decide between two candidates the CLI would otherwise have had to ask about, the
list-resolution capability states it at the point the decision is made.

### Requirement: Batch search

**Reason**: The requirement made every product a search returned be folded into a store so that the
next resolution would be cheaper. There is no store, and the folding was the only reason the
requirement described what happened after an answer was printed. It also described a query as
travelling to the server as itself, which is what leaves a large share of multi-word queries
unanswered.

**Migration**: Replaced by "Batch search and the expansions a query travels with", which keeps the
several-queries-in-one-call rule, the bare-argument form and the page size sizing the listing, adds
what a query is expanded into before it is sent, and replaces the folding clause with its opposite:
nothing a search returns is kept. A caller who relied on a first search making a second one cheaper
has no equivalent, and the second search now costs what the first cost.

### Requirement: What a product record prints

**Reason**: The requirement described three conditional rows, one of which — the row naming why a
record was raised — is removed with the signals that fed it, and it let a form of an identifier the
payload lacked be supplied from the product index.

**Migration**: Replaced by "What a product record prints, and where each field comes from", which
keeps every field, every unit rule and the refusal to convert an amount, reduces the conditional rows
to the two that remain, and replaces the index as a source of a missing identifier with the payload
itself: an external product id is the numeric tail of a slug the payload already carries, so the one
form that used to need the index is determined without it. A form nothing in the payload determines
is now absent, where before it could be recovered from a record of an earlier listing.

### Requirement: What a product card prints

**Reason**: The card's external product id row was conditional on the index having seen the product,
which produced two scenarios describing a card that carries the row and a card that does not.

**Migration**: Replaced by "What the single product card prints", which keeps every other clause and
makes the row unconditional: the card's payload carries the slug, the slug determines the id, so the
card always prints it and is always enough to add the product to the saved ones. The case where the
row was absent no longer arises.

### Requirement: One search, many selectors

**Reason**: The requirement listed the alternatives to a product among the selectors, and described
the population of a bare query as the catalogue's answer together with the personal index.

**Migration**: Replaced by "One listing, many selectors", which keeps the one-command rule, the one
group, the one record shape and the rule about where a server-side ordering is available, drops the
alternatives selector, and names the catalogue's answer alone as the population of a bare query. What
the alternatives selector did is now done where the CLI can see it is wanted, under "Alternatives to
an unavailable match are offered without being asked for".

### Requirement: One product and its alternatives

**Reason**: The requirement covered two commands, and one of them — the selector listing a product's
alternatives — is withdrawn.

**Migration**: Replaced by "One product's card", which keeps the card word for word: the three forms
it accepts, the rule that whichever was given travels unchanged, the refusal to fold it into the
listing, and the distinction between the card and the listing's static half. Only the alternatives
half is dropped.

### Requirement: A listing with a query is ranked by the CLI

**Reason**: The requirement described a ranking over the catalogue's answer united with the personal
index, a paid-for fetch of live state for records the index alone supplied, a bound on that fetching,
and the folding of every received record into the index. None of those has anything left to describe.

**Migration**: Replaced by "A listing with a query is ordered by the CLI", which keeps the rule that
ordering costs no call and the rules about where a server-side sort is accepted, and adds what the
ordering is built from and the prohibition on the CLI removing what the server returned. A caller who
saw a product the catalogue's search did not return will no longer see it; the change accepts that in
exchange for never seeing the catalogue's answer emptied.

### Requirement: The static half of a product card beside a listing

**Reason**: The requirement was built around what the CLI already held: attributes were read from the
store, a card was fetched only where nothing was held, and the fetching was bounded because the number
of unknown products was unbounded. Nothing is held, so every printed product is unknown and the bound
would decide arbitrarily which products printed their attributes.

**Migration**: Replaced by "The attributes of every product on the page", which keeps the separation
of the two halves and the rule that whatever keys the dictionary carried are printed, and replaces the
bound with the page itself: a card is fetched for every printed product, the calls made together. The
listing no longer reports having stopped short, because it no longer stops short; it reports instead
any product whose card could not be had.
