## ADDED Requirements

### Requirement: One listing of scopes, discriminated by kind

The categories, the promotions and the product sets of the session's branch SHALL be listed by one
command. They are three kinds of the same thing — a part of the catalogue a listing of products can
be narrowed to — and a caller looking for somewhere to browse SHALL NOT have to know which of three
commands holds the answer before asking.

Every row of that listing SHALL name its kind: category, promotion or set. The kind SHALL be printed
rather than inferred, because the handle a row is taken by depends on it and because one listing now
holds rows that behave differently when they are used.

The listing SHALL take an optional filter, and the two flags that restrict it to a hierarchy or to
the popular categories. Nothing else SHALL be required of the caller: with no argument at all the
listing SHALL print what the branch offers.

#### Scenario: Three kinds in one answer

- **WHEN** the caller asks what the store offers to browse
- **THEN** the categories, the promotions and the product sets are printed as one listing
- **AND** each row states which of the three it is

#### Scenario: A row is taken to the product listing

- **WHEN** the caller takes a row of the listing to the product search as a scope
- **THEN** the handle printed on that row is the handle the search accepts, whichever kind it is

### Requirement: A scope is reachable by its name

Wherever a scope is named — as the filter of the listing, as the scope of a product search, or as
the category whose subtree the listing is asked to open — the CLI SHALL accept the title it is
called by as well as the handle it is taken by. Matching SHALL be over the titles of the categories,
the promotions and the sets of the session's branch, without regard to letter case, and over the
whole listing rather than one page of it.

Where exactly one scope carries the name, it SHALL be used without asking. Where more than one does,
the CLI SHALL print all of them with their kinds and their handles and stop, and SHALL NOT take the
first: a listing is not ordered by anything the caller cares about. Where none does, the command
SHALL fail saying so.

This is what removes the two-step errand. A caller who knows a part of the catalogue by name had to
find its handle first and carry it into a second command; the handle was never the thing being asked
about.

#### Scenario: A category listed by its name

- **WHEN** the caller asks for the products of a scope, naming it by its title
- **THEN** the title is resolved to that scope's handle and its products are listed, in one command

#### Scenario: A name two scopes carry

- **WHEN** a name matches both a category and a promotion
- **THEN** both are printed with their kinds and handles, the command stops, and nothing is listed
  on the strength of a guess

#### Scenario: A name nothing carries

- **WHEN** a name matches no category, promotion or set of the branch
- **THEN** the command fails saying so, rather than falling back to a listing of everything

## MODIFIED Requirements

### Requirement: Categories of a branch

The CLI SHALL list the categories of the session's branch as rows of the one scope listing, paged.
That listing SHALL NOT be the way the hierarchy is read: the parent relation SHALL NOT be printed,
and SHALL NOT be offered as a filter. The tool's own parent filter takes a category uuid, which is
the one form no other category call accepts and the one form the CLI does not print, so offering it
would be offering a filter that cannot be filled from anything the CLI shows. The hierarchy is read
from the tree.

#### Scenario: Flat list

- **WHEN** the user lists what the store offers to browse
- **THEN** the categories appear as a flat list of rows for the session's branch, forwarding the page
  size and offset it was given

#### Scenario: Children of one category

- **WHEN** the user wants the children of one category
- **THEN** the flat listing offers no filter for it, because the tool's filter takes a category uuid
  and the CLI prints none, and the tree and the category page are where the hierarchy is read instead

### Requirement: Category hierarchy

The CLI SHALL return the category tree of the session's branch within its delivery type and time
slot, SHALL list the branch's most popular categories, and SHALL open a single category together
with its subtree. All three SHALL be reached through the browsing command: asked for the hierarchy
with no scope named it returns the whole tree, asked for it with one category named it returns that
category and what hangs beneath it. There SHALL be no separate command for opening a category, and
no command that opens a handle of any kind the caller names: a category is opened where categories
are browsed. None of the three SHALL take a branch, a delivery type or a time slot from the caller.

A category the branch marks unavailable SHALL be printed as unavailable, because it holds nothing at
this store and a caller offered it as somewhere to browse will find an empty listing there.

#### Scenario: Whole tree

- **WHEN** the user asks for the tree
- **THEN** the CLI returns the hierarchical tree for the session's context

#### Scenario: One category

- **WHEN** the user names one category to the browsing command, by its slug or by its title, and
  asks for the hierarchy
- **THEN** the CLI returns that category together with its subtree, without a lookup command of its
  own standing between the two

#### Scenario: One category without a delivery type

- **WHEN** the user opens a category and passes no delivery type, because no command takes one
- **THEN** the call is made within the session's delivery type, and the answer is the same one any
  delivery type would have produced

#### Scenario: Popular categories

- **WHEN** the user asks for the popular categories
- **THEN** the CLI returns the session branch's most popular categories, as rows of the same listing
  every scope is printed in

#### Scenario: A category that holds nothing here

- **WHEN** a category the branch marks unavailable is printed
- **THEN** it says so, because this store holds no products under it

### Requirement: Promotions and sets

The CLI SHALL list the promotions currently running in the session's branch within its delivery
context, and the curated product sets that branch offers, as rows of the one scope listing rather
than as commands of their own. Each SHALL be usable as the scope of a product listing by the handle
its kind is taken by: a promotion by its code, a set by its slug.

The hierarchy and the popular listing SHALL restrict the answer to categories, because neither a
promotion nor a set stands in a tree or is ranked by popularity.

#### Scenario: Promotions

- **WHEN** the user lists what the store offers to browse
- **THEN** the promotions active for the session's context appear among the rows, marked as
  promotions

#### Scenario: Product sets

- **WHEN** the user lists what the store offers to browse
- **THEN** the curated sets for the session's branch appear among the rows, marked as sets

#### Scenario: The tree holds categories alone

- **WHEN** the user asks for the hierarchy
- **THEN** only categories are printed, because a promotion and a set have no place in a tree

### Requirement: Category listings state their own shape

The scope listing, the category page and the tree return different records, and each SHALL be
printed in the shape of what it holds rather than through one shape imposed on all three. A scope
SHALL be named in output by its kind and by the one handle that kind is taken by — a category by its
slug, a promotion by its code, a set by its slug — and by nothing else: no server identifier and no
parent.

The scope listing SHALL print each row's kind, handle and title, whether it was filtered, restricted
to the popular categories, or printed whole, and SHALL summarise it by the number of rows it printed,
never by a total the server reported for a listing that was not filtered. The category page SHALL
print slug and title, the path to it as one line, the price range as one line, and its children as
records of their own, each named by its own slug and title.

#### Scenario: Four lookups, four shapes

- **WHEN** the scope listing, the same listing filtered, the category page or the tree is printed
- **THEN** each shows the fields its own payload carries, and no field is shown because a
  field of that name appears in another lookup

#### Scenario: One shape however the listing was narrowed

- **WHEN** the listing is printed whole, filtered by a text, or restricted to the popular categories
- **THEN** the rows read identically in all three, kind, handle and title

#### Scenario: The parent is not shown

- **WHEN** the scope listing prints a category that has a parent
- **THEN** the parent is not printed, because the listing is a lookup and the tree is where
  the hierarchy is read

#### Scenario: One identifier, not three

- **WHEN** any command prints a category
- **THEN** the slug is the only identifier on the line, because it is the one form every
  category tool accepts, and the category uuid beside it would offer a handle whose failure is
  an empty list rather than an error

#### Scenario: The search counts what it matched

- **WHEN** a filter matched three scopes out of a listing of a thousand
- **THEN** the summary states that three were found, and the size of the unfiltered listing is
  not shown beside it, because it counts a different set

#### Scenario: The path is one line

- **WHEN** a category page carries the path that leads to it
- **THEN** the titles are joined into a single line in order, so a breadcrumb costs one line

#### Scenario: The price range is one line

- **WHEN** a category page carries a price range
- **THEN** the lowest and the highest price are shown together on one line

#### Scenario: A category page with no children

- **WHEN** a category page carries no children
- **THEN** no group is named for them

### Requirement: Category tree output

The category tree SHALL be printed as nested records, each indented two spaces under its
parent, showing the category's slug, its title and, where the payload carries one, the number of
products in that category. Because the hierarchy the server returns names its nodes by slug alone
and carries no title, the CLI SHALL obtain the title of every node from the branch's category
listing, requesting as many pages of it as the listing reports and joining the two on the slug. A
node the listing does not account for SHALL be printed with its slug alone rather than left out,
because the slug is the handle every category call takes and a node carrying it is usable whether or
not it can be named. The tree SHALL otherwise be printed in full, however many nodes it holds.

#### Scenario: Slug and title at every depth

- **WHEN** the tree is printed
- **THEN** every node carries its slug and, where it can be named, its title, at whatever depth it
  stands

#### Scenario: Nesting shows the hierarchy

- **WHEN** a tree node carries children
- **THEN** they are printed two spaces further in than their parent, one level per step of
  depth

#### Scenario: A leaf

- **WHEN** a tree node carries no children
- **THEN** it takes its line and no group is named beneath it

#### Scenario: A node with no product count

- **WHEN** a tree node carries no number of products
- **THEN** its line shows the slug and the title alone, and no count is invented

#### Scenario: No count anywhere in the tree

- **WHEN** the delivery type and time slot are ones for which the server counts nothing, and
  every node comes back without a number
- **THEN** the tree is printed without counts and the command succeeds, because the server
  reported success and the CLI reports what it received

#### Scenario: A node the listing does not account for

- **WHEN** the hierarchy names a node that the branch's category listing does not
- **THEN** that node is printed with its slug and no title, and what hangs beneath it is printed
  too, because the slug alone is enough to browse the category

#### Scenario: A node nothing can name

- **WHEN** the hierarchy names a node the listing carries no title for
- **THEN** it is still printed, with its slug standing alone, because the slug is the handle every
  category command takes and a node carrying it is usable whether or not it can be named

#### Scenario: Nothing is trimmed

- **WHEN** the tree holds a thousand nodes or more
- **THEN** all of them are printed, because deciding what a caller may not see is not the
  renderer's decision

### Requirement: Promotions and sets output

Within the one scope listing, a promotion SHALL print its code as its handle, its title and the
number of products it covers, and a product set SHALL print its slug as its handle, its title and
its description. Neither SHALL print the web page address it carries.

#### Scenario: A promotion

- **WHEN** a promotion is printed
- **THEN** it shows its kind, its code, its title and its product count, and no page address

#### Scenario: A set

- **WHEN** a product set is printed
- **THEN** it shows its kind, its slug, its title and its description, and no link

### Requirement: Categories found by name

The scope listing SHALL take an optional text and print the scopes of the branch whose title
contains it, matched without regard to letter case, over the categories, the promotions and the
sets alike. Because the server offers no such filter and returns its listings a page at a time, the
CLI SHALL request as many pages as each listing reports and match over all of them, so that a scope
is found wherever it sits.

The text SHALL NOT be required. A listing with nothing to filter by is the listing of everything the
branch offers, which is a question worth asking; it is the search of a product listing that has no
meaning without something to search for.

#### Scenario: A category found wherever it sits

- **WHEN** the user filters the listing by a text that matches a scope the server would return on
  its fourth page
- **THEN** that scope is found, because the filter covers the whole listing rather than one
  page of it

#### Scenario: Case is not part of the match

- **WHEN** the filter text and a scope's title differ only in letter case
- **THEN** the scope matches

#### Scenario: The filter reaches all three kinds

- **WHEN** a text matches a category, a promotion and a set
- **THEN** all three are printed, each marked with its kind

#### Scenario: Nothing matches

- **WHEN** no scope's title contains the text
- **THEN** the command succeeds and reports that nothing matched, because a search that found
  nothing is an answer

#### Scenario: A search with no text

- **WHEN** the user runs the listing without giving a text
- **THEN** the whole listing is printed, because listing what the branch offers is what the command
  is for
