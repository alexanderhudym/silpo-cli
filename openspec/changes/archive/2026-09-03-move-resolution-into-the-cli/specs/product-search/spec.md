## ADDED Requirements

### Requirement: One search, many selectors

Every product listing SHALL be answered by one command. Which products it lists SHALL be decided by
a selector: free-text queries, a scope to list, a product to find alternatives to, or the caller's
saved products.

The selector SHALL decide the population and nothing else. Whatever selected them, the products
SHALL be printed as the same record, field for field, under the same summary, with the same filters,
the same ordering and the same paging available over them. A caller SHALL learn one listing rather
than four, and SHALL NOT have to know which of four commands answers a question before asking it.

A listing SHALL require a query or a selector. With neither, the command SHALL fail before the call,
naming what it takes, rather than asking the server for the whole catalogue.

#### Scenario: Four populations, one shape

- **WHEN** the same product appears in a search by text, in the listing of a scope, among the
  alternatives to another product, and among the saved products
- **THEN** its record reads identically in all four, field for field, and the summary above it is
  the same summary

#### Scenario: Nothing to list

- **WHEN** the caller runs the listing with no query and no selector
- **THEN** the command fails before the call, naming the query and the selectors one of which is
  required

### Requirement: A selector is exclusive, a filter is not

The selectors SHALL be mutually exclusive: each names a different population, and no rule says what
the intersection of two of them would mean. Where two are given together the command SHALL fail
before the call, naming both, rather than honouring one and dropping the other.

The filters SHALL NOT be exclusive of anything. In-stock-only, promotion-only, a lowest price, a
highest price, a sort field, a sort direction, a page size and a page offset SHALL narrow and order
whatever population the selector chose. Where the population cannot honour a filter, the command
SHALL say so rather than drop it silently.

Free-text queries and a scope SHALL be combinable, and that combination SHALL mean searching inside
that scope. It is the case the old surface had no answer for: the listing refused a query and the
search refused a scope, so narrowing a search to a part of the catalogue took two commands and a
handle carried between them.

No tool answers that combination. The scope listing takes no query, the text search takes no scope,
and a product record names no scope it came from, so there is nothing to send the pair to. The CLI
SHALL therefore answer it itself: it SHALL page the scope's own listing and match the text over the
records it reads, without regard to letter case. A product record carries one piece of text, its
name, so a brand or a pack size is matched because it stands inside the name and not as a field of
its own.

That paging SHALL be bounded, and the bound SHALL be stated rather than left to the size of the
catalogue. The CLI SHALL stop at whichever comes first: enough matches to fill the page of results
the caller asked for, or a fixed ceiling of records read from the scope. That ceiling SHALL be the
same whichever scope is being read, and SHALL be named in the command's help. Where it stopped the
paging before the scope was exhausted, the listing SHALL say so, so that a short answer is never
read as the scope holding nothing more.

#### Scenario: Two selectors at once

- **WHEN** the caller asks for the saved products and the alternatives to a product in one call
- **THEN** the command fails before the call, naming both selectors

#### Scenario: A query inside a scope

- **WHEN** the caller searches for a text and names a scope to search it in
- **THEN** the scope's own listing is paged and the text is matched over the records the CLI read,
  because no tool takes a query and a scope together
- **AND** no separate call was needed to turn the scope's name into a handle first

#### Scenario: A scope larger than the ceiling

- **WHEN** a scope holds more products than the ceiling on records read allows
- **THEN** the matches found within the ceiling are printed and the listing states that the scope
  was not read to its end, rather than reporting the scope exhausted

#### Scenario: Filters over a selected population

- **WHEN** the caller lists the saved products in stock, under a price, sorted and paged
- **THEN** the filters narrow and order the saved products, and the records read as they always do

#### Scenario: Promotion-only over any population

- **WHEN** the caller asks for only the products carrying a promotion
- **THEN** that narrows whatever population the selector chose, and it conflicts with no selector

### Requirement: The favourite write prints what the server confirmed

The favourite write SHALL print what the server confirmed.

#### Scenario: Favorites confirmed

- **WHEN** saved products are added or removed
- **THEN** the output states, per product, which of the two happened, naming the product by the
  uuid the server confirmed it under

### Requirement: One product and its alternatives

The CLI SHALL open the full card of a product and SHALL offer alternatives to it. The card and the
alternatives SHALL take the product under any of the three forms the tool accepts — its uuid, its
slug or its external product id — and SHALL send whichever was given, unchanged.

The card SHALL be a command of the product family taking one handle, and SHALL NOT be reached
through a lookup that decides what kind of thing a handle names. Nothing has to be decided: all
three forms are answered by the one tool that opens a product, so the command passes on whatever it
was given and the server says whether it resolves. A handle in none of the three forms SHALL fail
naming the handle.

#### Scenario: Product card

- **WHEN** the user asks for a product by its uuid, its slug or its external product id
- **THEN** the CLI returns that product's full card, composition, nutrition, and attributes included

#### Scenario: Alternatives

- **WHEN** the user asks for products similar to a named product
- **THEN** the CLI returns the alternatives for that branch, paged by the requested page size and
  offset, printed as the one product record every listing prints

#### Scenario: The form the caller chose is the form that travels

- **WHEN** the user names the same product to the card three times, once under each form
- **THEN** each call carries the text that was typed, and the server decides whether it resolves

## MODIFIED Requirements

### Requirement: Batch search

The CLI SHALL search several free-text product queries in one call, keeping the queries in the
order they were given, with an optional cap on matches per query. The queries SHALL be accepted
as bare arguments and in no other form: the search exists to take them, so a second way of
writing the same list would only be one more thing to choose between. A query SHALL be required
wherever no selector chose the population instead.

Every product a search returns SHALL be folded into the index after the answer has been printed, so
that a listing the caller has already paid for makes the next resolution cheaper. Nothing SHALL be
fetched for the index's sake, and the folding SHALL NOT stand between the caller and the answer.

#### Scenario: Several queries at once

- **WHEN** the user writes several product queries
- **THEN** all queries travel in a single call, in the order given, so a shopping list costs one round trip

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

### Requirement: Favorites

The CLI SHALL list the caller's saved products within the session's delivery context as one more
population of the single search, and SHALL add or remove up to five of them in one call through a
command named for the intent. The products SHALL be named positionally, by any of the forms a
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

### Requirement: Batch search output

The batch search SHALL print each query as a group named by the query text, holding the
matches for that query as product records, with the number the server found for it. Queries
SHALL appear in the order they were given.

A listing that no query selected SHALL be printed as one listing without groups, because there is no
query text to name a group by.

#### Scenario: A group per query

- **WHEN** several queries were searched in one call
- **THEN** each query names a group of its own, in the order given, holding its matches

#### Scenario: A query that matched nothing

- **WHEN** a query found no product
- **THEN** the query still appears, stating that it found nothing

#### Scenario: A selector without a query

- **WHEN** a listing is selected by a scope, by a product to find alternatives to, or by the saved
  products, with no query
- **THEN** the matches are printed as one listing, with no group above them

### Requirement: Delivery context comes from the session

Every product lookup that depends on availability SHALL be answered within the session's delivery
context — its branch, its delivery type and its time slot — and SHALL NOT accept those values from
the caller. A product lookup SHALL therefore never fail for want of them.

Where that context holds a slot that has already passed, the repair the delivery capability
specifies SHALL fire before the call, a read no differently from a write. This capability SHALL NOT
restate that rule; it requires only what the rule guarantees it. A listing SHALL never be answered
against a lapsed slot, because a cart sitting on one reports every line out of stock and the answer
would be wrong rather than merely stale. A listing SHALL never move the order: the store, the
delivery type and the address SHALL be untouched by a read. And a listing SHALL never send the
caller after a slot: no read SHALL fail asking for a slot to be listed, confirmed or rebooked first.

#### Scenario: A lookup carries no context of its own

- **WHEN** a search, a scope listing or a product card is run
- **THEN** the branch, the delivery type and the time slot come from the session, and the command
  offers the caller no option to name any of them

#### Scenario: The answer states the context it was given

- **WHEN** a product listing prints its results
- **THEN** the branch the results belong to is discoverable from the cart, and the listing does not
  repeat it per record

#### Scenario: A lapsed slot does not reach the query

- **WHEN** a product listing runs and the session's time slot has lapsed
- **THEN** the slot is repaired before the call under the delivery capability's own rule, so stock
  and price are answered within a slot that has not passed
- **AND** the store, the delivery type and the address are unchanged, and the caller is not sent to
  list, confirm or rebook a slot

### Requirement: What a product record prints

The product listings SHALL print each product as one record whose keyed fields take a line each —
every identifier the product can be named by, its stock, and the step it is sold in when the product
is weighted — and SHALL close that record with a single line carrying no key, holding the product's
name, the size of one package where the product is sold by the piece, its price, and its previous
price where the payload carries one.

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
- **THEN** the record reads identically, field for field, whichever selector printed it

### Requirement: What the filtered listing takes

The CLI SHALL list the products of a scope — a category, a product set or a promotion — named by one
option, and SHALL narrow the listing by stock, by carrying a promotion and by price, and order it by
a requested field and direction. Each of those narrowings is a filter the scope listing itself takes,
and each SHALL reach the server only when the caller passed it. The scope SHALL be named by its
handle or by its title, the CLI resolving a title to a handle itself, so that a caller who knows what
a part of the catalogue is called does not first have to find out how it is spelled.

The listing SHALL NOT require a scope, and SHALL NOT refuse a free-text query. A query is a
population of its own, and a query together with a scope searches inside that scope. What SHALL
remain refused is a listing narrowed by price or stock alone, with neither a query nor a scope to
narrow, because the server rejects such a request and answers with a status the caller cannot act on.

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

- **WHEN** the user passes a sort field, a sort direction, a page size, or a page offset
- **THEN** they are forwarded to the server unchanged

#### Scenario: No anchor to narrow by

- **WHEN** the user asks for products in stock under a price, with neither a query nor a scope
- **THEN** the command fails before the call, naming what it needs, rather than letting the server
  answer with a status that names nothing

#### Scenario: A query written where a listing was asked for

- **WHEN** the user passes free text alongside a scope
- **THEN** the scope reaches the server and the text does not, the CLI paging that scope within its
  stated ceiling and matching the text over the records itself, the listing and the search being one
  command with nowhere else to send the caller

### Requirement: What a product card prints

The single product card SHALL print the product's uuid, its slug, its stock and its company
under their keys, SHALL close the record with the same keyless line of name and price the
listings use, and SHALL print the attribute dictionary the server supplies as one line per
entry, with the keys exactly as the server spelled them. The card's payload carries no external
product id: where the index holds one for the product it SHALL be printed, and where nothing holds
one it SHALL be absent rather than derived. The card SHALL decide whether the product is sold by
weight from the unit the payload names, not from its weighted flag, because that flag is returned as
false for products every listing reports as weighted. The gallery of images and the web page address
SHALL NOT be printed.

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

#### Scenario: The card carries an external product id the index knows

- **WHEN** a product card is printed for a product the index has seen an external product id for
- **THEN** that row appears, and the card is enough to add the product to the saved ones

#### Scenario: The card carries no external product id

- **WHEN** a product card is printed for a product the index holds no record of
- **THEN** no such row appears, because the card's payload does not carry one and nothing else can
  supply it

#### Scenario: The branch is absent from the card too

- **WHEN** a product card is printed for the branch the caller named
- **THEN** no branch row appears, for the same reason it is absent from a listing's records

## REMOVED Requirements

### Requirement: Replacements and favorites update output

**Reason**: Half of it governed the at-risk replacements listing, which this change drops. The
endpoint answers but offers nothing: over roughly 2000 calls across 40 branches, both delivery
types and some 3400 products, its candidate list came back empty every time, and the vendor's own
web client gets the same empty answer from the same call on the same cart.

**Migration**: The surviving half, what the favourites write prints, is now its own requirement,
"The favourite write prints what the server confirmed", unchanged in substance.

### Requirement: One product and its neighbours

**Reason**: It bound the product card and the alternatives together with the replacements lookup,
which this change drops.

**Migration**: The card and the alternatives are governed unchanged by "One product and its
alternatives". Where a product cannot be had, the substitute is found by naming it to `search`,
which is what the vendor's own web client does.
