## MODIFIED Requirements

### Requirement: Categories of a branch

The CLI SHALL read the branch's whole category table on every invocation, until the server reports no
more rather than under a ceiling of its own. The first page reports the total, so the pages it implies
SHALL be requested together rather than one after another.

Each of the two category calls SHALL supply what only it carries, and neither SHALL be asked for what
the other holds. The hierarchy call carries the nesting and the product count and names its nodes by
slug alone; the flat listing carries each category's identifier, title and parent and says nothing
about how many products it holds. The nesting SHALL therefore come from the hierarchy and the title
and identifier from the flat listing, joined on the slug.

The parent the flat listing carries SHALL NOT be the source of the nesting. Measured, it reconstructs
the hierarchy exactly — 1014 nodes both ways, no orphan, no disagreement on any node's parent — and
that agreement is why the two can be joined at all; but a node the hierarchy carries and the flat
listing does not has no parent to be placed by, and a structure built from the parent relation has
nowhere to put it or its children.

The categories SHALL NOT be printed as a flat page. The parent relation SHALL shape the listing rather
than be withheld from it: a thousand categories in server order answer no question a caller asked, and
the same thousand nested answer "what does this store sell".

The tool's own parent filter SHALL NOT be used and SHALL NOT be offered as an option. It takes a
category identifier, and with the whole table in hand there is nothing to ask the server for.

#### Scenario: Flat list

- **WHEN** the user lists the categories of the branch
- **THEN** they appear nested rather than as a flat page in server order, because the CLI holds the
  whole hierarchy before it prints anything

#### Scenario: Children of one category

- **WHEN** the user wants the children of one category
- **THEN** they are answered from the table the CLI already holds, and no option forwards a parent to
  the server

#### Scenario: The table is read whole

- **WHEN** any catalogue command runs
- **THEN** the branch's categories are read until the server reports no more, under no ceiling of the
  CLI's own
- **AND** the pages after the first are requested together rather than one at a time

#### Scenario: The count comes from the hierarchy

- **WHEN** the CLI needs to know how many products a category holds
- **THEN** it reads the count the hierarchy carries, that being the only place the count is published

#### Scenario: The name comes from the flat listing

- **WHEN** the CLI needs a category's title or identifier
- **THEN** it reads them from the flat listing, joined to the hierarchy's node on the slug, that being
  the only place they are published

### Requirement: Category hierarchy

The CLI SHALL print the branch's categories as a hierarchy, nested, whenever it prints them. There
SHALL be no option that selects the hierarchy, because there is no other shape the category listing
takes, and an option offering to switch between the two offers a worse answer as a choice.

There SHALL be no option restricting the listing to the categories the server calls popular, and the
popular listing SHALL NOT be a source of rows. Its handles are not all handles of the branch's
catalogue: measured, two of its four name categories the branch's listing does not carry, hold no
products, and cannot be reached by any call the CLI makes.

The popular listing SHALL still be read, concurrently with the others, and SHALL contribute by joining
the branch's categories on the slug. A category that joins SHALL be marked. Where a marked category is
not itself a root, the root standing over it SHALL lead the hierarchy, and that root's row SHALL name
the descendant that moved it — calling the root itself popular would be false, since the popular thing
is the descendant.

A popular row that joins nothing SHALL be dropped. The number joined SHALL be stated in the hierarchy
group's own summary, beside the number of categories dropped for holding nothing, because otherwise a
failed read, an empty answer and a total failure to join are one appearance in the output and the value
of reading it at all cannot be judged from what it prints.

Neither the failure of that read nor its returning nothing SHALL fail the command.

None of this SHALL take a branch, a delivery type or a time slot from the caller.

#### Scenario: Whole tree

- **WHEN** the user asks what the store offers to browse and names nothing
- **THEN** the hierarchy for the session's context is returned whole, and no option was needed to ask
  for it

#### Scenario: Popular categories

- **WHEN** the user wants the branch's most popular categories
- **THEN** no option offers them, because two of the four the server returns name nothing the branch
  carries; the popular listing marks categories of the one listing instead

#### Scenario: A popular category leads its root

- **WHEN** the popular listing names a category standing beneath a root
- **THEN** that root leads the hierarchy and its row names the descendant that moved it, rather than
  the root being called popular

#### Scenario: The join is counted

- **WHEN** the listing is printed
- **THEN** it states how many popular rows were joined, so that none joining is visible rather than
  silent

#### Scenario: The popular read fails

- **WHEN** the popular listing cannot be read, or returns nothing
- **THEN** the listing is printed with no category marked and no root led, and the command succeeds

#### Scenario: A category that holds nothing here

- **WHEN** the branch holds no products under a category in this delivery type and slot
- **THEN** that category is absent from the branch's catalogue entirely — not printed, and not
  reachable by naming it — because it can only ever answer with an empty listing

#### Scenario: One category

- **WHEN** the user names one category, by its slug or by its title
- **THEN** it heads the category group with its path, its count and its children, assembled from the
  table the CLI holds and without a call of its own, there being no separate command or option that
  opens one category

#### Scenario: One category without a delivery type

- **WHEN** the user opens a category and passes no delivery type, because no command takes one
- **THEN** the answer is drawn within the session's delivery type

### Requirement: Promotions and sets

The CLI SHALL list the promotions currently running in the session's branch within its delivery
context, and the curated product sets that branch offers, within the same command as the categories
rather than as commands of their own. Each SHALL be usable as the population of a product listing by
the handle its kind is taken by: a promotion by its code, a set by its slug.

The three SHALL NOT be merged into one sequence. A category, a promotion and a set are read from
different calls, carry different fields and answer different questions, and interleaving them by a
score computed across all three orders things that are not alternatives to one another. They SHALL be
printed as three groups in a fixed order — the hierarchy, then the promotions, then the sets — each
group naming its kind once.

A promotion carries a product count, and a promotion covering nothing SHALL be dropped on the same
rule as a category. A set carries no count, so nothing can be tested for it and every set SHALL be
printed.

#### Scenario: Promotions

- **WHEN** the user lists what the store offers to browse
- **THEN** the promotions active for the session's context appear as their own group, after the
  hierarchy

#### Scenario: Product sets

- **WHEN** the user lists what the store offers to browse
- **THEN** the curated sets for the session's branch appear as their own group, after the promotions

#### Scenario: The tree holds categories alone

- **WHEN** the hierarchy is printed
- **THEN** only categories stand in it, because a promotion and a set have no place in a tree

#### Scenario: Three groups, not one order

- **WHEN** a text matches categories, promotions and sets alike
- **THEN** each kind is ranked within itself and printed as its own group, and no score orders a
  category against a promotion

### Requirement: Category listings state their own shape

Each of the three kinds SHALL be printed in the shape of what it is, and no kind SHALL be given a
field or an empty group to make it resemble another. A record SHALL be named by the one handle its
kind is taken by — a category by its slug, a promotion by its code, a set by its slug — and by no
server identifier.

Every category printed SHALL carry the number of products it holds, because that number is what the
caller is choosing between, and the CLI has it for every category without a further call.

A category SHALL carry its path wherever it is printed outside the hierarchy, whose own nesting
already shows it. Measured, 18 titles are carried by two categories each, so a title alone does not
say which category was meant.

A category is therefore the one kind printed in two shapes, and the shape SHALL be chosen by where the
record stands rather than by what narrowed the listing. Inside the hierarchy the nesting supplies the
record's place, so the row carries its slug, its title where known and its count, and no path. Outside
the hierarchy nothing else supplies that place, so the record carries its path as well, and its
children where the ranking kept it. A promotion and a set have one shape each, having no hierarchy to
stand in.

No price range SHALL be printed for a category. The only call that carries one takes a call per
category, and the prices are visible one step further on, among that category's products.

Each group SHALL summarise itself by the number of records it printed, and SHALL name a larger number
beside that only where the larger number counts the same set. Where a text ranked a group and the page
size cut it short, the number named SHALL be the number that group's ranking kept.

The hierarchy's summary SHALL additionally state **how many categories were dropped for holding
nothing**, and the popular join's own count SHALL be stated there too. Both are reports about a filter
the CLI applied, not second counts of the printed set, and both exist for the same reason: a filter
whose effect never reaches the output cannot be judged from the output. The pruning is the larger of
the two and the one this change is BREAKING for — a reader who cannot tell whether it removed nine
categories or nine hundred cannot tell whether the catalogue is being sharpened or gutted.

Where the table was marked uncounted, no dropped count SHALL be stated, nothing having been dropped.

There SHALL be no page offset. The order is a ranking with no meaningful tail, and an offset into it
offers to page through noise.

#### Scenario: Four lookups, four shapes

- **WHEN** the hierarchy, a promotion group, a set group or one category's record is printed
- **THEN** each shows the fields its own kind carries, and no field is shown because a field of that
  name appears in another

#### Scenario: One shape however the listing was narrowed

- **WHEN** a promotion or a set is printed in its group, whole or ranked against a text
- **THEN** it reads identically in both, no field being added or dropped because a text narrowed the
  listing

#### Scenario: A category's shape follows its position

- **WHEN** a category is printed within the hierarchy, and another is printed outside it
- **THEN** the first carries its slug, its title and its count and no path, the nesting having already
  placed it
- **AND** the second carries its path as well, nothing else there saying which category was meant

#### Scenario: The parent is not shown

- **WHEN** the hierarchy prints a category that has a parent
- **THEN** the parent is not named on the row, because the nesting already shows it

#### Scenario: The path disambiguates a title

- **WHEN** a category is printed outside the hierarchy and its title is carried by another category
- **THEN** its path is printed with it, so the reader can tell which was meant

#### Scenario: One identifier, not three

- **WHEN** any command prints a category
- **THEN** the slug is the only identifier on the line, because it is the one form every category tool
  accepts

#### Scenario: The search counts what it matched

- **WHEN** a text ranked a group and kept three of its records
- **THEN** that group states that three were found, and the size of the branch's catalogue is not
  shown beside it

#### Scenario: A bounded page of the same set

- **WHEN** no text was given
- **THEN** no page bounds any group, so no count of a printed set stands beside another
- **AND** the hierarchy still states how many categories were dropped for holding nothing and how many
  popular rows were joined, those being reports of a filter rather than counts of a set

#### Scenario: The pruning is counted

- **WHEN** the hierarchy is printed and categories were dropped for holding nothing
- **THEN** their number is stated, so that the size of the filter is visible from the output rather
  than only from the server's own payload

#### Scenario: Nothing was dropped

- **WHEN** the table was marked uncounted, so nothing was dropped
- **THEN** no dropped count is stated

#### Scenario: A filtered listing cut short

- **WHEN** a text ranked a group and kept more records than the page size prints
- **THEN** the number stated beside that group is the number its ranking kept, not the size of the
  branch's catalogue

#### Scenario: The path is one line

- **WHEN** a category's path is printed
- **THEN** the titles are joined into a single line in order, so a breadcrumb costs one line

#### Scenario: The price range is one line

- **WHEN** a category is printed
- **THEN** no price range is shown, because obtaining one costs a call per category and the prices are
  one step further on

#### Scenario: A category page with no children

- **WHEN** a category's record carries no children holding products
- **THEN** no group is named for them

#### Scenario: No offset

- **WHEN** the caller wants to see past a printed page
- **THEN** no offset is offered, and a larger page size is the only way to see more

### Requirement: Category tree output

The hierarchy SHALL be printed as nested records, each indented two spaces under its parent, showing
the category's slug, its title and the number of products it holds. The nesting and the count SHALL
come from the hierarchy and the title from the flat listing, joined on the slug.

The count SHALL decide whether a category is printed, and the title SHALL decide only how it is named.
They are independent: a category the hierarchy carries a count for but the flat listing does not
account for SHALL be printed where the hierarchy puts it, with its slug and its count and no title,
because the slug is the handle every category call takes and a category carrying it is usable whether
or not it can be named. Its children SHALL be printed beneath it on the same terms, the hierarchy
having placed them regardless of what the flat listing knows of either.

A category the server reports no count for SHALL be left out, and its subtree with it, because the
count is a rollup and nothing beneath it is stocked either.

That rule SHALL apply only where the server reported a count for some category. Where no category
anywhere carries one, the absence reports that counts are not being published rather than that the
branch is empty, and the hierarchy SHALL be printed whole and without counts. A rule that empties the
catalogue when a field goes missing mistakes its own blindness for an answer.

The hierarchy SHALL otherwise be printed in full, however many categories it holds.

#### Scenario: Slug and title at every depth

- **WHEN** the hierarchy is printed
- **THEN** every category carries its slug and, where it can be named, its title, at whatever depth it
  stands

#### Scenario: Slug, title and count at every depth

- **WHEN** the hierarchy is printed and the server reported counts
- **THEN** every category carries its count beside its slug and title

#### Scenario: Nesting shows the hierarchy

- **WHEN** a category carries children that hold products
- **THEN** they are printed two spaces further in than their parent, one level per step of depth

#### Scenario: A leaf

- **WHEN** a category carries no children that hold products
- **THEN** it takes its line and no group is named beneath it

#### Scenario: A node with no product count

- **WHEN** the server reports counts for the branch but none for one category
- **THEN** that category is not printed at all, rather than printed without a number, because it holds
  nothing here

#### Scenario: No count anywhere in the tree

- **WHEN** the delivery type and time slot are ones for which the server counts nothing, and every
  category comes back without a number
- **THEN** the hierarchy is printed whole and without counts, and nothing is left out, because the
  absence reports that counts are not published rather than that the branch is empty

#### Scenario: A node the listing does not account for

- **WHEN** the hierarchy carries a count for a category the branch's flat listing does not carry
- **THEN** that category is printed with its slug and its count and no title, and what hangs beneath it
  is printed too, because the slug alone is enough to browse it

#### Scenario: A node nothing can name

- **WHEN** the hierarchy names a stocked category the flat listing carries no title for
- **THEN** it is still printed, with its slug standing alone beside its count

#### Scenario: Nothing is trimmed

- **WHEN** the hierarchy holds a thousand stocked categories
- **THEN** all of them are printed, because deciding what a caller may not see is not the renderer's
  decision

### Requirement: Promotions and sets output

A promotion SHALL print its code as its handle, its title and the number of products it covers. A
product set SHALL print its slug as its handle, its title and, **where it carries one**, its
description. Neither SHALL print the web page address it carries, and neither SHALL be given a path,
a parent or a group of children, having none.

Measured, no set of either branch sampled carried a description, so the field SHALL be printed only
where it is present rather than as an empty line held open for it.

#### Scenario: A promotion

- **WHEN** a promotion is printed
- **THEN** it shows its code, its title and its product count, and no page address

#### Scenario: A set

- **WHEN** a product set carrying a description is printed
- **THEN** it shows its slug, its title and that description, and no link

#### Scenario: A set with no description

- **WHEN** a product set carrying no description is printed
- **THEN** it shows its slug and its title, and no group is named for the description

### Requirement: Categories found by name

The listing SHALL take an optional text and rank each kind against it **within that kind**, over the
whole of that kind's table rather than one page of it, so that a record is found wherever it sits.
Matching SHALL be by the same ranker that resolves a product rather than by containment, so that a
name written approximately reaches what it names.

A ranking SHALL NOT be taken across kinds. A category and a promotion are not alternatives to one
another, and a score computed over both orders them by nothing the caller can act on.

Where the text ranks a category and one of its descendants together, the deepest SHALL be preferred. A
caller who writes the name of a thing is asking for that thing, and the parent that contains it is a
broader answer to a narrower question.

Where a category the ranking kept carries children, those children SHALL be printed within that
category's record as the narrowings available from it. This is navigation and not a repair of
coverage: a listing drawn from a parent already holds its whole subtree.

Where no text was given, nothing SHALL be ranked and no page size SHALL apply. The answer SHALL be the
hierarchy in full, then the promotions, then the sets.

#### Scenario: A category found wherever it sits

- **WHEN** the user gives a text matching a category deep in the hierarchy
- **THEN** that category is found, because the ranking covers the whole table rather than one page of
  it

#### Scenario: Case is not part of the match

- **WHEN** the text and a record's title differ only in letter case
- **THEN** the record matches

#### Scenario: A name written approximately

- **WHEN** the text names a record without reproducing its title exactly
- **THEN** that record is printed, ranked above the records of its kind that match the text less well

#### Scenario: The deepest match wins

- **WHEN** a text ranks a category and a category standing beneath it
- **THEN** the deeper one is ranked first

#### Scenario: A matched parent shows where to go next

- **WHEN** the ranking keeps a category that has children holding products
- **THEN** those children are printed within its record, named by slug, title and count

#### Scenario: The filter reaches all three kinds

- **WHEN** a text matches a category, a promotion and a set
- **THEN** all three are printed, each within its own group, and none is ordered against another

#### Scenario: Nothing matches

- **WHEN** no record of any kind ranks against the text
- **THEN** the command succeeds and reports that nothing matched, because a search that found nothing
  is an answer

#### Scenario: A search with no text

- **WHEN** the user runs the listing without giving a text
- **THEN** the whole hierarchy is printed, then the promotions, then the sets, and no page size cuts
  any of them

### Requirement: One listing of scopes, discriminated by kind

The categories, the promotions and the product sets of the session's branch SHALL be answered by one
command, and that command SHALL be named for the thing it lists rather than for the act of looking at
it. A caller looking for somewhere to browse SHALL NOT have to know which of three commands holds the
answer before asking.

They SHALL be answered as three groups rather than as one sequence of records tagged by kind. The kind
SHALL be named once, on the group, and SHALL NOT be repeated on every record: grouping states the
same thing the tag stated, at a cost that does not grow with the number of rows, and it prevents an
ordering across kinds from being expressible at all.

The command SHALL take an optional text and a page size, and nothing else. There SHALL be no option
selecting a hierarchy, no option selecting the popular categories, and no page offset.

The page size SHALL apply only where a text was given, and SHALL apply within each group. It SHALL
default to a small number of records, because a ranked answer a caller will act on is a handful and
not a screen, and it SHALL only ever trim the bottom of a ranking — it SHALL NOT add a record the
ranking did not keep, and it SHALL NOT page.

The page size SHALL be the CLI's own, taken over the tables it holds, and SHALL NOT be forwarded. The
whole of each table has to be in hand in any case for a ranking to reach a record wherever it sits, and
the server's own paging SHALL be used only to fill those tables.

#### Scenario: Three kinds in one answer

- **WHEN** the caller asks what the store offers to browse
- **THEN** the categories, the promotions and the product sets are all answered by that one command
- **AND** each appears in its own group, the group naming the kind once

#### Scenario: A listing with no filter at all

- **WHEN** the caller runs the listing naming neither a text nor a page size
- **THEN** the whole of what the branch offers is printed, the categories nested, and the page size
  does not apply

#### Scenario: The page size trims within a group

- **WHEN** the caller gives a text and a page size smaller than the number one group's ranking kept
- **THEN** the top of that group is printed and the rest dropped, and the other groups are trimmed by
  the same size in their own right

#### Scenario: A row is taken to the product listing

- **WHEN** the caller takes a record of one group to the product search
- **THEN** the handle printed on that record is the handle the option for that kind accepts

### Requirement: A scope is reachable by its name

Wherever a record of the catalogue is named — as the text of the listing, or as the population of a
product search — the kind SHALL be known before the name is resolved, and resolution SHALL be over
that kind's table alone. In a product search the option the caller used names the kind; in the listing
each kind is ranked in its own right. No resolution SHALL be taken across kinds, so a name can never be
ambiguous between a category and a promotion.

Each kind SHALL accept every form a caller may hold for it: a category by its title, its slug or its
identifier; a promotion by its title or its code; a set by its title or its slug.

An identifier SHALL be matched **within the CLI's own table** and SHALL NOT be forwarded. Measured, the
category call accepts a slug alone: an identifier returns not-found, as does the numeric tail of a
slug. The slug is therefore the only form that leaves the CLI, whatever form arrived.

A title SHALL be resolved by ranking rather than by exact comparison, and settled by the same policy
that settles a product. Where one record stands clearly above the rest it SHALL be used without asking.
Where the best candidates stand too close to separate, **or where the best is too weak to trust**, the
CLI SHALL print all of them with their handles and, for a category, their paths, and stop. Only where
nothing matches at all SHALL the command fail naming the value. The least bad candidate SHALL NOT be
used silently — a ranker answers every input, so a name that belongs to nothing has to be caught by the
policy rather than by the absence of a match.

A category the branch stocks nothing under is not in the table, so naming it SHALL fail as any unknown
name does.

The tables ranked SHALL be read from the server on each invocation. There is no copy on disk to read
them from, and the reads that fill them are issued together in any case.

This is what removes the two-step errand. A caller who knows a part of the catalogue by name had to
find its handle first and carry it into a second command; the handle was never the thing being asked
about.

#### Scenario: A category listed by its name

- **WHEN** the caller asks for the products of a category, naming it by its title
- **THEN** the title is resolved against the categories alone and its products are listed, in one
  command

#### Scenario: A scope named twice costs one reading

- **WHEN** two commands in turn name a record of the same branch
- **THEN** each reads the tables it needs from the server, in one wave with its other reads, because
  no copy is kept between them

#### Scenario: A category named by its identifier

- **WHEN** the caller names a category by its identifier
- **THEN** the CLI finds it in the table it holds and uses that category's slug in every call it makes

#### Scenario: A name two scopes carry

- **WHEN** a value is carried by both a promotion and a set
- **THEN** no ambiguity arises, because the option the caller used has already fixed which kind is
  being resolved

#### Scenario: A name two categories carry

- **WHEN** a name ranks two categories carrying the same title too close to separate
- **THEN** both are printed with their handles and their paths, and the command stops

#### Scenario: A name nothing carries strongly

- **WHEN** a name's best match within its kind is too weak to trust
- **THEN** the candidates are printed and the command stops, rather than the highest-scoring record
  being used

#### Scenario: A name nothing carries

- **WHEN** a name matches nothing of its kind at the branch
- **THEN** the command fails saying so, rather than falling back to a listing of everything
