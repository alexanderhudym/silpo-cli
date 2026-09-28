# product-search

## MODIFIED Requirements

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

The page size SHALL bound what each query contributes, not the merged listing. Bounding the merged
listing spends the whole page on whichever query was written first: measured, ten queries under a
page size of four were answered for the first four and not at all for the other six, while the
summary above the listing went on reporting a found count for every one of the ten — so the listing
contradicted its own summary, and the caller re-ran the search three times at widening sizes before
abandoning the batch and searching the terms in groups.

A product an earlier query already placed SHALL still spend the later query's allowance, so that a
query repeated in other words does not double the page it is answered in. The residue of a selector
the queries were ranked within SHALL remain a filler: it reaches the page only where the queries left
room.

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

#### Scenario: Every query is answered under a page size smaller than what it found

- **WHEN** three queries are searched under a page size of two and each finds nine products
- **THEN** the listing carries two products for each of the three, and none of them is answered with
  nothing

#### Scenario: A selector's residue fills only what the queries left

- **WHEN** a category is searched with a query under a page size of one and the query matches a
  product in that category
- **THEN** the listing carries that one match, and no further product of the category is added
  beneath it

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

The page size SHALL bound what each query is answered with, and SHALL NOT bound the merged listing.
It was the other way round, on the reading that a caller asking for ten results wants ten. What that
delivered was ten answers to the first query and none to the rest, the summary above the listing
going on reporting a found count for every one of them — measured, ten queries under a page size of
four were answered for four. A caller writing several queries is asking several questions, and a
page size is how fully each of them is to be answered. Where the caller asks for no page size, ten
SHALL be printed for each: a listing is an answer to a question, not a corpus to page through, and a
caller who wants more asks for more.

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
- **THEN** each of the three is answered with up to ten records, rather than the first of them
  taking the whole page

#### Scenario: No page size asked for

- **WHEN** the user searches one query with no page size
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
