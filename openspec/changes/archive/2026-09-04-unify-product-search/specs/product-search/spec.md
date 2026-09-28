## ADDED Requirements

### Requirement: Selectors compose by kind

A selector names a population. Selectors SHALL compose rather than exclude one another, under two
rules and no others:

- **Repeated within one kind, they union.** Two scopes named together SHALL list the products of
  either.
- **Given across different kinds, they intersect.** The saved products together with a scope SHALL
  list the saved products that lie in that scope.

A free-text query SHALL NOT be a selector. It SHALL be the filter and the ordering over whatever
population the selectors chose. Where no selector was given, the query SHALL choose the population
itself, and that population SHALL be the catalogue's answer to the query **together with** whatever
the personal index holds for it. A product the catalogue search did not return and the index knows
SHALL be a candidate on the same terms as one the catalogue returned. The two are one corpus, because
the command that fills a cart draws its candidates from the same words and SHALL draw the same
population; a product the CLI can name confidently is not one the listing may fail to find.

A narrowing option — in-stock only, promotion only, a price bound, a page size, a page offset —
SHALL conflict with no selector and SHALL narrow whatever population the selectors chose. Where the
population cannot honour one, the command SHALL say so rather than drop it silently. A server-side
ordering over a union SHALL be refused on that rule: the order of a union is the CLI's own merge of
several listings, and no server can be asked for it.

Where several queries are given over a chosen population, each SHALL be matched over that population
in its own right, and the record SHALL name the ones that matched it. They SHALL NOT be joined into a
single phrase, as the scope search does today: joining them makes a shopping list one long query that
matches nothing, and the flat listing has a place to say which query found what.

Repetition SHALL be accepted only where it means something. Scopes union because a product can lie in
either. A second product to find alternatives to SHALL be refused rather than unioned, the
alternatives to two products being two questions and not one listing.

Where the server offers no single call for a composition, the CLI SHALL assemble it: the catalogue
tool intersects a category, a set and a promotion within one call but offers no union of them at all,
so a union SHALL be drawn as one listing per scope and merged, and every merge SHALL remove the
duplicates it created.

#### Scenario: A sort over a union

- **WHEN** the caller names two scopes and asks for a server-side ordering
- **THEN** the command says the ordering cannot be honoured over a union, rather than sorting one
  listing and merging another into it

#### Scenario: Several queries inside a scope

- **WHEN** the caller names a scope and writes three queries
- **THEN** each is matched over that scope in its own right and the records name which matched them,
  rather than the three being joined into one phrase

#### Scenario: Two scopes named together

- **WHEN** the caller names two scopes in one listing
- **THEN** the products of either are listed, each product once, however many of the two hold it

#### Scenario: Two populations of different kinds

- **WHEN** the caller asks for the saved products within a scope
- **THEN** only the saved products that lie in that scope are listed

#### Scenario: A query over a chosen population

- **WHEN** the caller writes a query and names a population
- **THEN** the population is drawn and the query orders and filters it, and the query is not itself
  treated as a population

#### Scenario: A query alone

- **WHEN** the caller writes a query and names no population
- **THEN** the query chooses the population, which is the catalogue's answer to it together with what
  the personal index holds, both ranked on the same terms

#### Scenario: Nothing to list

- **WHEN** the caller runs the listing with neither a query nor a selector
- **THEN** the command fails before the call, naming the query and the selectors, rather than asking
  the server for the whole catalogue

### Requirement: A listing with a query is ranked by the CLI

Where a query was given, the CLI SHALL rank the products it drew and SHALL print them in that order,
by the one ranker the CLI uses to resolve a shopping list — the same corpus loading, the same lexical
scoring over the product name, and the same signals.

The ranking itself SHALL cost no call. Every record it orders is one the CLI already holds — received
in answer to the population it drew, or held in the personal index — so ordering and shortening them
is paid for.

Printing a record the index alone supplied SHALL be paid for separately, and by identifier. The index
holds no price, stock or availability by its own requirement, so a record that reaches the printed
page from the index and from nowhere else SHALL have its live state fetched under the identifier the
index holds for it, rather than searched for again by text — the text search is what failed to return
it. That fetching SHALL happen only for records that reached the printed page, SHALL be bounded, and
the bound SHALL be stated. Where the bound stopped it short, the listing SHALL say so. A record whose
live state could not be had SHALL NOT be printed with a price, a stock or an availability taken from
anywhere else, the index being forbidden to hold them.

Every record the CLI received SHALL be folded into the index, including those the ranking did not
print, so that a listing pays for the next resolution whether or not the caller read it.

Where no query was given there is nothing to rank against, and the server's own order SHALL stand.
The server-side sort SHALL therefore be accepted only where the CLI does not rank **and** the
population's own tool offers one — which is the scope listing alone. It SHALL be refused with the
reason wherever the CLI ranks, two orderings not both being the answer, and equally over the saved
products and a product's alternatives, whose tools take no sort argument at all.

#### Scenario: A query orders the population

- **WHEN** the caller writes a query over a population
- **THEN** the products are printed in the CLI's ranked order, and no call was made to produce that
  order

#### Scenario: A record only the index knew

- **WHEN** the ranking raises onto the printed page a product the catalogue's answer did not carry
- **THEN** its live state is fetched under the identifier the index holds for it, and it is printed
  with the price, the stock and the availability that fetch returned

#### Scenario: More index-only records than the bound allows

- **WHEN** more index-only records reach the printed page than the bound on fetching allows
- **THEN** the listing states that it stopped short, rather than printing a record without live state
  as though the branch held none of it

#### Scenario: Records ranked but not printed

- **WHEN** a listing ranks more records than it prints
- **THEN** the printed ones are the highest ranked
- **AND** every record received is folded into the index, printed or not

#### Scenario: A sort where the CLI ranks

- **WHEN** the caller passes a server-side sort together with a query
- **THEN** the command fails naming the conflict, rather than applying one ordering and discarding
  the other

#### Scenario: A scope listed with no query

- **WHEN** the caller lists a scope and writes no query
- **THEN** the server's order stands, and the server-side sort is accepted

#### Scenario: A sort over a population that has none

- **WHEN** the caller passes a server-side sort over the saved products or over a product's
  alternatives, with or without a query
- **THEN** the command fails naming it, because those tools take no sort and the CLI would otherwise
  have to accept an option it cannot honour

### Requirement: The record states why it was raised

A ranked product record SHALL carry a row naming what raised it above the records below it. That row
SHALL name only signals the caller can act on: that the product carries a promotion, and by how much
it is reduced; that the caller has bought it, how often and how recently; that the caller has saved
it.

The row SHALL NOT name signals that tell the caller nothing — presence at the branch the session
already named, or membership of the scope the caller themselves chose. Those raise a candidate and
say nothing about it.

The row SHALL be absent where nothing raised the record, rather than printed empty.

This exists because the ranking is deliberately partial. It prefers what the caller has bought, and
it prefers what is discounted. A caller asking what a shop carries is shown a view shaped by their
own history and by the shop's offers, and a reader that cannot see that shaping cannot correct for
it. Stating the reason costs one short row and turns a silent bias into a legible one.

#### Scenario: A product the caller buys

- **WHEN** a raised record names a product the caller has bought before
- **THEN** the row states that, with how often and how recently it was bought

#### Scenario: A discounted product

- **WHEN** a raised record names a product carrying a promotion
- **THEN** the row states the promotion and the size of the reduction

#### Scenario: Nothing raised the record

- **WHEN** a record was raised by nothing but the text it matched
- **THEN** no such row appears

#### Scenario: The branch is not a reason

- **WHEN** a record was raised in part because the product has been seen at the session's branch
- **THEN** that is not named in the row, because the session named that branch itself

### Requirement: The static half of a product card beside a listing

The listing SHALL, on request, print beside each product the part of its card that does not change —
the attribute dictionary the server supplies for it, and the unit the product is counted in — while
every changing part of the record SHALL continue to come from the call that printed it.

Composition, allergens and nutrition are keys of that one dictionary rather than fields of their own,
they are not present on every product, and the CLI SHALL keep and print whatever keys the dictionary
carried without requiring any particular one.

The two halves SHALL be sourced differently and SHALL NOT be confused. Price, previous price, stock,
availability and step are the state of a product at a branch at a moment and SHALL come from the
listing's own payload, which already carries them. The attributes do not change, and SHALL be read
from what the CLI holds; only where nothing is held for a product SHALL its card be fetched.

Fetching SHALL be bounded, and the bound SHALL be stated rather than left to the size of the listing.
Where the bound stopped the fetching before every product was covered, the listing SHALL say so, so
that a record printed without attributes is not read as a product that has none.

#### Scenario: Attributes already held

- **WHEN** the caller asks for the static half over products the CLI already holds attributes for
- **THEN** the attributes are printed and no card is fetched

#### Scenario: A product never opened before

- **WHEN** the caller asks for the static half over a product the CLI holds no attributes for
- **THEN** that product's card is fetched, its attributes printed, and what was fetched is kept

#### Scenario: The live half is never taken from what is held

- **WHEN** the static half is printed beside a product
- **THEN** the price, the stock and the availability are the ones the listing's own call returned

#### Scenario: More products than the bound allows

- **WHEN** the static half is asked for over more unknown products than the bound allows fetching
- **THEN** the listing states that it stopped, rather than printing the remainder as though they
  carried no attributes

### Requirement: One listing, however many queries

A listing SHALL be printed as one listing, whatever selected it and however many queries were
searched. It SHALL NOT be divided into a group per query.

A product SHALL appear once. Where more than one query matched it, the record SHALL name the queries
that matched it, so that nothing is lost by printing it once rather than once per group. Where only
one query was searched there is nothing to distinguish, and no such row SHALL appear.

The order of the records SHALL follow the queries as they were given, because a lexical score is
computed against one query and scores from different queries are not comparable with one another: a
single order over several queries by raw score would be an order by a number that means nothing
across them.

A query that matched nothing SHALL still be accounted for, so that a caller who asked about a set of
products learns which of them the branch does not carry.

#### Scenario: One product matched by two queries

- **WHEN** two of the queries searched match the same product
- **THEN** it appears once, and the record names both queries

#### Scenario: A single query

- **WHEN** one query was searched
- **THEN** no record names the query, because there is nothing to distinguish it from

#### Scenario: A query that matched nothing

- **WHEN** a query found no product
- **THEN** the summary accounts for it, and the caller learns that this query in particular found
  nothing

#### Scenario: The order of a multi-query listing

- **WHEN** several queries were searched in one call
- **THEN** the records follow the order the queries were given, rather than one score across them all

### Requirement: What the CLI reads through is bounded

Where the CLI answers a question by reading records and narrowing them itself, rather than by asking
the server to narrow them, that reading SHALL be bounded, and the bound SHALL be stated rather than
left to the size of the catalogue.

This covers every composition the server has no single call for: a query matched over the records of
a scope; a filter applied over the saved products, over a product's alternatives, or over a free-text
search, whose tool takes no stock, promotion or price argument at all; a union drawn as one listing
per scope; an intersection drawn from two populations read separately; and any population the CLI
ranks, since ranking reads past what it prints by construction.

Where the CLI orders the records itself, it SHALL NOT stop at the page the caller asked for. The
best ten of a population are not the first ten read, and a reading that stops at ten cannot know
that the eleventh record would have outranked them. Reading SHALL therefore run to the ceiling, or
to the end of the population, and the page SHALL be taken from what was ranked. Only where the CLI
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

- **WHEN** the caller asks for the best ten of a population the CLI ranks
- **THEN** the reading does not stop at ten matches, and the ten printed are the ten highest of what
  was read rather than the first ten found

#### Scenario: An intersection over a truncated side

- **WHEN** two populations are intersected and one of them was cut short by the ceiling
- **THEN** the listing states that it was, and does not present the intersection as the whole of it

#### Scenario: A union larger than the ceiling

- **WHEN** two scopes are unioned and one holds more records than the ceiling allows
- **THEN** the records read are merged and deduplicated, and the listing states that it stopped short

### Requirement: Alternatives to an unavailable match are offered without being asked for

Where the ranking puts one product clearly ahead of the rest and that product is out of stock or
unavailable, the CLI SHALL fetch that product's alternatives and print them below it, each marked as
an alternative to it, without the caller having asked for them.

This is the question the caller is about to ask. A listing that answers "the thing you named exists
here and there is none of it" and stops has told the caller to run a second command they could not
have known they would need; the CLI already holds the handle that answers it.

The lookup SHALL be bounded to the one product the ranking singled out, and SHALL happen only where
the ranking was decisive — where no single product stands clearly ahead, there is nothing to find
alternatives to, and the listing SHALL print what it found.

The alternatives SHALL be marked as such and SHALL NOT be mixed into the matches as though the caller
had asked for them, because they answer a different question from the one that was typed.

The explicit selector that lists a product's alternatives SHALL remain. "What else is like this" is a
question worth asking about a product that is in stock, and the automatic lookup answers only the
narrower case where the named product cannot be had.

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

## MODIFIED Requirements

### Requirement: One search, many selectors

Every product listing SHALL be answered by one command, and that command SHALL belong to a group
named for products, alongside the single card and the writes that save and unsave a product. A caller
SHALL find everything the CLI does with products under one name, rather than learning which of four
top-level commands answers which question about the same thing.

Which products the listing lists SHALL be decided by its selectors: a scope to list, a product to
find alternatives to, or the caller's saved products. A free-text query SHALL NOT be one of them; it
filters and orders whatever they chose, and chooses the population itself — the catalogue's answer
together with the personal index — only where no selector was given.

The selectors SHALL decide the population and nothing else. Whatever selected them, the products
SHALL be printed as the same record, built by the same text-building from the same fields, under the
same summary, with the same filters and the same paging available over them. A caller SHALL learn one
listing rather than four, and SHALL NOT have to know which of four commands answers a question before
asking it.

What SHALL be allowed to differ follows from what was asked rather than from which tool answered: the
conditional rows a record may carry, and whether a server-side ordering is on offer at all. A row
reporting why a record was raised stands only where the listing was ranked; a row naming the queries
that matched stands only where more than one was searched; the static half stands only where it was
asked for; and the server's ordering is available only over a single scope, its own tool being the
only one that takes a sort. None of these is a difference between selectors dressed up as a
difference between records.

A listing SHALL require a query or a selector. With neither, the command SHALL fail before the call,
naming what it takes, rather than asking the server for the whole catalogue.

#### Scenario: Four populations, one shape

- **WHEN** the same product appears in a search of the catalogue, in the listing of a scope, among
  the alternatives to another product, and among the saved products
- **THEN** its record is built from the same fields by the same text-building in all four, and the
  summary above it is the same summary
- **AND** where one of the four was ranked and another was not, the reason row stands on the ranked
  one alone, that being what was asked rather than what answered

#### Scenario: A query beside a selector is not a second population

- **WHEN** the caller asks for the alternatives to a product and writes a query as well
- **THEN** the alternatives are the population, and the query filters and orders them, rather than
  being taken as a second population to union or intersect with them

#### Scenario: One group for everything about a product

- **WHEN** a caller looks for the listing, the single card, or the way to save a product
- **THEN** all three are subcommands of the one group named for products

#### Scenario: Nothing to list

- **WHEN** the caller runs the listing with no query and no selector
- **THEN** the command fails before the call, naming the query and the selectors one of which is
  required


### Requirement: Favorites

The CLI SHALL list the caller's saved products within the session's delivery context as one more
population of the single listing, and SHALL add or remove up to five of them in one call. Saving and
unsaving SHALL be commands of the group named for products, because what is saved is a product; each
SHALL be named for its intent, and the products SHALL be named positionally, by any of the forms a
product is named by. No JSON SHALL be accepted as an input form.

The caller SHALL NOT be asked for the external product id the write requires. The CLI SHALL take it
from the record the product was printed from, from the index where the index has seen that product,
and from a lookup otherwise.

#### Scenario: List favorites

- **WHEN** the user lists the saved products
- **THEN** the CLI returns them for the session's context, paged by the requested page
  size and offset, printed as the one product record every listing prints

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
- **THEN** the external product id the call requires is resolved from that product's record or from
  the index, and an external product id the caller supplied does not decide which product is acted on

#### Scenario: A favorite named by a slug never seen before

- **WHEN** a favourite write names a product by a slug neither a printed record nor the index
  accounts for
- **THEN** the slug is looked up, the external product id the call requires comes back with it, and
  the favourite is acted on

#### Scenario: A product that resolves to no external product id

- **WHEN** a favourite write names a product no step of resolution can supply an external product id
  for
- **THEN** the command fails naming the product, and no favourite is added or removed

### Requirement: One product and its alternatives

The CLI SHALL open the full card of a product and SHALL offer alternatives to it. The card and the
alternatives SHALL take the product under any of the three forms the tool accepts — its uuid, its
slug or its external product id — and SHALL send whichever was given, unchanged.

The card SHALL be a command of the product group taking one handle, and SHALL NOT be reached through
a lookup that decides what kind of thing a handle names, and SHALL NOT be folded into the listing as
a way of naming one product. Nothing has to be decided: all three forms are answered by the one tool
that opens a product, so the command passes on whatever it was given and the server says whether it
resolves. Folding it into the listing would require deciding whether an argument is a query or a
handle, and the batch search matches only a numeric external product id exactly — a uuid or a slug
written as a query would not reach the product it names. A handle in none of the three forms SHALL
fail naming the handle.

The card and the listing's static half SHALL answer different needs and SHALL both exist. The card is
one product read in full, fetched whether or not anything is held for it; the static half is what the
CLI already holds, printed beside a listing it did not have to fetch.

#### Scenario: Product card

- **WHEN** the user asks for a product by its uuid, its slug or its external product id
- **THEN** the CLI returns that product's full card, composition, nutrition, and attributes included

#### Scenario: A handle is not a query

- **WHEN** a caller names a product by uuid to the listing rather than to the card
- **THEN** it is searched as text, because the listing does not inspect an argument to decide what
  kind of thing it names

#### Scenario: Alternatives

- **WHEN** the user asks for products similar to a named product
- **THEN** the CLI returns the alternatives for that branch, paged by the requested page size and
  offset, printed as the one product record every listing prints

#### Scenario: The form the caller chose is the form that travels

- **WHEN** the user names the same product to the card three times, once under each form
- **THEN** each call carries the text that was typed, and the server decides whether it resolves

### Requirement: Batch search

The CLI SHALL search several free-text product queries in one call, keeping the queries in the
order they were given. The queries SHALL be accepted as bare arguments and in no other form: the
search exists to take them, so a second way of writing the same list would only be one more thing to
choose between. A query SHALL be required wherever no selector chose the population instead.

The page size SHALL cap the one listing the search prints, and SHALL NOT cap each query separately.
A per-query cap was what the grouped output needed, one page per group; with one deduplicated
listing there is one page to size, and a caller asking for ten results SHALL be given ten rather than
ten per query.

Every product a search returns SHALL be folded into the index after the answer has been printed, so
that a listing the caller has already paid for makes the next resolution cheaper. Nothing SHALL be
fetched for the index's sake, and the folding SHALL NOT stand between the caller and the answer.

#### Scenario: Several queries at once

- **WHEN** the user writes several product queries
- **THEN** all queries travel in a single call, in the order given, so a shopping list costs one round trip

#### Scenario: The page size sizes the listing

- **WHEN** the user searches three queries and asks for ten results
- **THEN** ten records are printed in all, rather than ten for each query

#### Scenario: Queries written as bare arguments

- **WHEN** the user writes the queries after the command name
- **THEN** they are the queries the search runs, because that is the form a caller reaches for
  first and the only form the command offers

#### Scenario: A query holding a space

- **WHEN** a query names a product in more than one word
- **THEN** it travels as one query, the shell having kept it together, and is not split into
  one query per word

#### Scenario: No query at all

- **WHEN** the user runs the search with neither a query nor a selector
- **THEN** the command fails before the call, rather than asking the server for nothing

#### Scenario: A search pays for the next one

- **WHEN** a search returns products the index has no record of
- **THEN** the matches are printed first
- **AND** the products are folded into the index afterwards, identity only

### Requirement: What the filtered listing takes

The CLI SHALL list the products of a scope — a category, a product set or a promotion — named by one
option, and SHALL narrow the listing by stock, by carrying a promotion and by price, and order it by
a requested field and direction. Each of those narrowings is a filter the scope listing itself takes,
and each SHALL reach the server only when the caller passed it. The scope SHALL be named by its
handle or by its title, the CLI resolving a title to a handle itself, so that a caller who knows what
a part of the catalogue is called does not first have to find out how it is spelled.

The listing SHALL NOT require a scope, and SHALL NOT refuse a free-text query. A query together with
a scope searches inside that scope. What SHALL remain refused is a listing narrowed by price or stock
alone, with neither a query nor a scope to narrow, because the server rejects such a request and
answers with a status the caller cannot act on.

The sort field and the sort direction are the server's ordering, and SHALL be forwarded only where
the CLI does not impose its own. Where a query was given the CLI ranks, and the server-side sort
SHALL be refused naming the conflict rather than forwarded and then overridden. The page size and the
page offset SHALL be honoured in both cases, over whichever ordering stands.

#### Scenario: Listing with filters

- **WHEN** the user lists products with any combination of scope, in-stock-only, promotion-only,
  lowest price, and highest price
- **THEN** only the filters the user passed reach the server, and the rest are left unset

#### Scenario: A category named by its slug

- **WHEN** the user names a scope by a category slug, a promotion code or a set slug
- **THEN** that handle reaches the server as it was typed, and the products of that scope are listed

#### Scenario: A scope named by its title

- **WHEN** the user names a scope by the title it is called by rather than by its handle
- **THEN** the title is resolved to exactly one handle and the products of that scope are listed,
  and where more than one scope carries that title the candidates are printed and the command stops

#### Scenario: A category the branch carries nothing under

- **WHEN** the user names a scope this branch holds no products for
- **THEN** an empty listing is printed and the command succeeds, because an empty answer is what
  the server gave and no second call is made to reinterpret it

#### Scenario: Ordering and paging

- **WHEN** the user passes a sort field or a sort direction over a scope and writes no query
- **THEN** they are forwarded to the server unchanged
- **AND** a page size and a page offset are honoured over whichever ordering stands, query or no
  query

#### Scenario: Ordering against a query

- **WHEN** the user passes a sort field together with a query
- **THEN** the command fails naming the conflict, because the CLI ranks whatever a query was given
  for and two orderings cannot both be the answer

#### Scenario: No anchor to narrow by

- **WHEN** the user asks for products in stock under a price, with neither a query nor a scope
- **THEN** the command fails before the call, naming what it needs, rather than letting the server
  answer with a status that names nothing

#### Scenario: A query written where a listing was asked for

- **WHEN** the user passes free text alongside a scope
- **THEN** the scope reaches the server and the text does not, the CLI paging that scope within the
  stated ceiling and matching the text over the records itself, the listing and the search being one
  command with nowhere else to send the caller

### Requirement: What a product record prints

The product listings SHALL print each product as one record whose keyed fields take a line each —
every identifier the product can be named by, its stock, and the step it is sold in when the product
is weighted — and SHALL close that record with a single line carrying no key, holding the product's
name, the size of one package where the product is sold by the piece, its price, and its previous
price where the payload carries one.

Three further keyed rows MAY stand among them, each present only when it has something to say. A row
naming why the record was raised, where the listing was ranked and something raised it. A row naming
the queries that matched the product, where more than one query was searched and the record answers
several. And, where the caller asked for it, the static half of the product's card. A record carries
none of the three by default, and no listing SHALL print one of them empty.

The identifiers SHALL be the product's own uuid, its slug, and its external product id. All three
SHALL be printed wherever all three can be had, because no two are accepted by the same tools: a
cart write and a removal take the uuid alone and reject the others outright; a
product card and its alternatives take any of the three; a search matches an external product id
exactly when it is given as a search term; and adding a product to favourites requires the uuid and
the external product id together.

A form the payload did not carry SHALL be supplied from the index where the index has seen that
product under a form the payload does carry. A form neither the payload nor the index can supply
SHALL be absent rather than derived. This is what the index is for: the CLI once held no mapping
between the three forms, so a form the payload lacked was a form the caller could not recover, and a
product card could not supply a favourites write. A record now prints every form anything the CLI
holds can name the product by.

No amount SHALL be converted in either direction: every price, stock and step SHALL be the number the
payload carried. A price SHALL carry the currency. A price SHALL also carry the unit it is per
whenever the payload flags the product as sold by weight, and that flag SHALL be the only thing
consulted — no value SHALL be inspected to decide whether a product is sold by weight. Stock and step
SHALL carry that same unit under the same condition. No identifier the index supplied SHALL bring a
price, a stock or an availability with it: the index holds identity and the call answers for state.

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

#### Scenario: The three conditional rows

- **WHEN** a record is printed from an unranked listing, for a single query, with no static half asked
  for
- **THEN** none of the three conditional rows appears, and none is printed empty

#### Scenario: A handle the payload lacks and the index holds

- **WHEN** a product record is printed from a payload that carries no external product id, as a
  product card does, and the index holds one for that product
- **THEN** the record prints it, and the card can supply a favourites write

#### Scenario: A payload short of a handle

- **WHEN** a product record is printed from a payload short of a form, and the index holds no record
  of that product
- **THEN** the record prints the identifiers it has and derives nothing

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

#### Scenario: The same record across four tools

- **WHEN** a scope listing, a search, the alternatives or the saved products
  print a product
- **THEN** the record reads identically, field for field, whichever selector printed it, save for the
  conditional rows, whose presence follows from what the caller asked rather than from which tool
  answered

## REMOVED Requirements

### Requirement: A selector is exclusive, a filter is not

**Reason**: The exclusivity was a property of the MCP's tools, not of the caller's question. Four
tools answer the four populations, so the CLI refused to combine what no one call could answer. But
each combination has a plain meaning — the saved products lying in a category, the alternatives to a
product that are in stock under a price — and the requirement's own text already carved out an
exception for a query together with a scope, answered by paging the scope and matching the text in
the CLI. That exception was the rule arriving early.

**Migration**: Replaced by "Selectors compose by kind", which states the union and intersection rules
and keeps the requirement's second half — that a narrowing option conflicts with no selector — intact.
The bounded paging and the ceiling this requirement was the only normative home for are carried by
"What the CLI reads through is bounded", which restates them and widens them from a query inside a
scope to every population the CLI has to read through rather than filter at the server: a union drawn
scope by scope, an intersection drawn from two populations, and a filter applied over the saved
products or over a product's alternatives. Its "A scope larger than the ceiling" scenario is carried
there unchanged.

### Requirement: Batch search output

**Reason**: The grouping existed because the batch tool answers per query, and the output followed the
payload's shape rather than the caller's need. It duplicated every product two queries both matched,
printed the shared company section once per group instead of once per listing, and gave a reader
several short lists where one ordered list was the answer.

**Migration**: Replaced by "One listing, however many queries", which prints one deduplicated listing,
names on the record the queries that matched it where more than one did, keeps the order of the
queries as given, and still accounts in the summary for a query that found nothing. The
"A selector without a query" scenario is carried there too: a listing chosen by a selector alone has
no query text to name, so no record names one.

The per-query found count the groups carried is not reproduced. It stated the number of records
returned for that query rather than the number the branch holds — the batch tool reports the two as
one — so it was already only a count of the rows printed below it, which a reader of a flat listing
counts by reading the queries named on the records.
