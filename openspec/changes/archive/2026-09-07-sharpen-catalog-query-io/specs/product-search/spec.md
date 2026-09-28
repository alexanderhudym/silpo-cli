## MODIFIED Requirements

### Requirement: One search, many selectors

Every product listing SHALL be answered by one command, and that command SHALL belong to a group named
for products, alongside the single card and the writes that save and unsave a product. A caller SHALL
find everything the CLI does with products under one name, rather than learning which of four
top-level commands answers which question about the same thing.

Which products the listing lists SHALL be decided by its selectors: a category, a promotion, a
curated set, a product to find alternatives to, or the caller's saved products. A free-text query
SHALL NOT be one of them; it filters and orders whatever they chose, and chooses the population itself
— the catalogue's answer together with the personal index — only where no selector was given.

The selectors SHALL decide the population and nothing else. Whatever selected them, the products SHALL
be printed as the same record, built by the same text-building from the same fields, under the same
summary, with the same filters and the same paging available over them.

What SHALL be allowed to differ follows from what was asked rather than from which tool answered: the
conditional rows a record may carry, and whether a server-side ordering is on offer at all. A row
reporting why a record was raised stands only where the listing was ranked; a row naming the queries
that matched stands only where more than one was searched; the static half stands only where it was
asked for.

The server's ordering SHALL be available over exactly one catalogue population and no query — one
category, or one promotion, or one set — its own tool being the only one that takes a sort. Splitting
the catalogue selector into one option per kind SHALL NOT narrow that: a single set or a single
promotion is as much a single population as a single category, and each was honoured before the split.
Two populations of one kind are a union and two of different kinds are an intersection, and neither is
a listing the server ordered.

A listing SHALL require a query or a selector. With neither, the command SHALL fail before the call,
naming what it takes, rather than asking the server for the whole catalogue.

#### Scenario: Four populations, one shape

- **WHEN** the same product appears in a search of the catalogue, in the listing of a category, among
  the alternatives to another product, and among the saved products
- **THEN** its record is built from the same fields by the same text-building in all four, and the
  summary above it is the same summary
- **AND** where one of the four was ranked and another was not, the reason row stands on the ranked
  one alone, that being what was asked rather than what answered

#### Scenario: A sort over one population of any kind

- **WHEN** the caller names exactly one category, or exactly one promotion, or exactly one set, and
  passes a sort field with no query
- **THEN** the sort is forwarded to the server, whichever of the three kinds it was

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
refused naming the conflict rather than forwarded and then overridden. The page size and the page
offset SHALL be honoured in both cases, over whichever ordering stands.

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
- **AND** a page size and a page offset are honoured over whichever ordering stands, query or no query

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
saved products and the alternatives to a product. A category, a promotion and a set are read from
different calls and selected by different request parameters, and the CLI SHALL NOT flatten them into
one option whose kind it then has to infer.

Repeating the option of one kind SHALL union within that kind. Giving the options of two kinds
together SHALL intersect.

The intersection SHALL be assembled by the CLI, not delegated to the catalogue tool, even though that
tool can express one — it takes a category, a set and a promotion together in a single call. Delegating
it would answer only the case where each kind was named once and no other selector stood beside them.
A union within one kind intersected with a second kind, or any catalogue population intersected with
the saved products or with a product's alternatives, cannot be expressed in one call at all, and those
compositions are on the same footing as the simple one. Two assembly paths for one rule would differ
in their call counts, their read ceilings and the note they print when a ceiling cut them short, so
there SHALL be one.

A free-text query SHALL NOT be a selector. It SHALL be the filter and the ordering over whatever
population the selectors chose. Where no selector was given, the query SHALL choose the population
itself, and that population SHALL be the catalogue's answer to the query **together with** whatever
the personal index holds for it. A product the catalogue search did not return and the index knows
SHALL be a candidate on the same terms as one the catalogue returned. The two are one corpus, because
the command that fills a cart draws its candidates from the same words and SHALL draw the same
population; a product the CLI can name confidently is not one the listing may fail to find.

A narrowing option — in-stock only, promotion only, a price bound, a page size, a page offset — SHALL
conflict with no selector and SHALL narrow whatever population the selectors chose. Where the
population cannot honour one, the command SHALL say so rather than drop it silently. A server-side
ordering over a union SHALL be refused on that rule: the order of a union is the CLI's own merge of
several listings, and no server can be asked for it.

Where several queries are given over a chosen population, each SHALL be matched over that population
in its own right, and the record SHALL name the ones that matched it. They SHALL NOT be joined into a
single phrase: joining them makes a shopping list one long query that matches nothing, and the flat
listing has a place to say which query found what.

Repetition SHALL be accepted only where it means something. Populations of one kind union because a
product can lie in either. A second product to find alternatives to SHALL be refused rather than
unioned, the alternatives to two products being two questions and not one listing.

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
- **THEN** the query chooses the population, which is the catalogue's answer to it together with what
  the personal index holds, both ranked on the same terms

#### Scenario: Nothing to list

- **WHEN** the caller runs the listing with neither a query nor a selector
- **THEN** the command fails before the call, naming the query and the selectors, rather than asking
  the server for the whole catalogue
