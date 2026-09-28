## MODIFIED Requirements

### Requirement: Categories of a branch

The CLI SHALL list the categories of the session's branch as rows of the one scope listing, paged by
the CLI over the table it holds rather than by the server. That listing SHALL NOT be the way the
hierarchy is read: the parent relation SHALL NOT be printed, and SHALL NOT be offered as a filter.
The tool's own parent filter takes a category uuid, which is the one form no other category call
accepts and the one form the CLI does not print, so offering it would be offering a filter that
cannot be filled from anything the CLI shows. The hierarchy is read from the tree.

#### Scenario: Flat list

- **WHEN** the user lists what the store offers to browse
- **THEN** the categories appear as a flat list of rows for the session's branch, cut to the page
  size and offset the CLI was given, taken over the table it holds

#### Scenario: Children of one category

- **WHEN** the user wants the children of one category
- **THEN** the flat listing offers no filter for it, because the tool's filter takes a category uuid
  and the CLI prints none, and the tree and the category page are where the hierarchy is read instead

### Requirement: Category listings state their own shape

The scope listing, the category page and the tree return different records, and each SHALL be
printed in the shape of what it holds rather than through one shape imposed on all three. A scope
SHALL be named in output by its kind and by the one handle that kind is taken by — a category by its
slug, a promotion by its code, a set by its slug — and by nothing else: no server identifier and no
parent.

The scope listing SHALL print each row's kind, handle and title, whether it was filtered, restricted
to the popular categories, or printed whole. It SHALL summarise it by the number of rows it printed,
and SHALL name a larger number beside that only where the larger number counts the same set. A total
for the unfiltered listing standing beside a filtered count is forbidden, because it counts a
different set and invites the reader to take the one for a share of the other.

Where the CLI's own page size cut a listing short, the number of scopes that listing would have held
SHALL be printed beside the count, because that is the same set and the reader would otherwise take a
bounded page for the whole of it. Where a filter was given, the number named SHALL be the number the
filter matched, never the size of the branch's catalogue.

The category page SHALL print slug and title, the path to it as one line, the price range as one
line, and its children as records of their own, each named by its own slug and title.

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

#### Scenario: A bounded page of the same set

- **WHEN** no filter was given and the CLI's page size cut the listing short
- **THEN** the number of rows printed and the number of scopes the branch holds are both stated,
  because here the larger number counts the same set the page was taken from

#### Scenario: A filtered listing cut short

- **WHEN** a filter matched more scopes than the page size prints
- **THEN** the number stated beside the page is the number the filter matched, not the size of the
  branch's catalogue

#### Scenario: The path is one line

- **WHEN** a category page carries the path that leads to it
- **THEN** the titles are joined into a single line in order, so a breadcrumb costs one line

#### Scenario: The price range is one line

- **WHEN** a category page carries a price range
- **THEN** the lowest and the highest price are shown together on one line

#### Scenario: A category page with no children

- **WHEN** a category page carries no children
- **THEN** no group is named for them

### Requirement: One listing of scopes, discriminated by kind

The categories, the promotions and the product sets of the session's branch SHALL be listed by one
command, and that command SHALL be named for the thing it lists rather than for the act of looking at
it. A caller reading the surface SHALL be able to tell what the command answers from its name.

They are three kinds of the same thing — a part of the catalogue a listing of products can be
narrowed to — and a caller looking for somewhere to browse SHALL NOT have to know which of three
commands holds the answer before asking.

Every row of that listing SHALL name its kind: category, promotion or set. The kind SHALL be printed
rather than inferred, because the handle a row is taken by depends on it and because one listing now
holds rows that behave differently when they are used.

The listing SHALL take an optional filter, a page size, a page offset, and the two flags that
restrict it to a hierarchy or to the popular categories. Nothing else SHALL be required of the caller.

The page size and the offset SHALL be the CLI's own, taken over the table it holds, and SHALL NOT be
forwarded. Once the branch's scopes are answered from a copy on disk there is no request to forward
them to, and the whole table has to be in hand in any case for a filter to reach a scope wherever it
sits. The server's own paging SHALL be used only to fill that copy.

The listing SHALL be bounded by a page size that holds whether or not the caller passed one. A branch
carries over a thousand categories beside its promotions and its sets, and a listing that prints all
of them answers a question nobody asked at a cost nobody chose. Where the bound cut the listing short,
the listing SHALL say how many scopes the listing it was taken from holds — the branch's whole table
where no filter was given, and the number the filter matched where one was — so that a short answer
is not read as a small catalogue and no count is set beside a number that counts a different set.

#### Scenario: Three kinds in one answer

- **WHEN** the caller asks what the store offers to browse
- **THEN** the categories, the promotions and the product sets are printed as one listing
- **AND** each row states which of the three it is

#### Scenario: A listing with no filter at all

- **WHEN** the caller runs the listing naming neither a filter nor a page size
- **THEN** a bounded page is printed rather than every scope the branch carries
- **AND** the listing states how many scopes the branch holds, that being the set the page was taken
  from

#### Scenario: A row is taken to the product listing

- **WHEN** the caller takes a row of the listing to the product search as a scope
- **THEN** the handle printed on that row is the handle the search accepts, whichever kind it is

### Requirement: Categories found by name

The scope listing SHALL take an optional text and print the scopes of the branch it names, ranked
against that text, over the categories, the promotions and the sets alike. Because the server offers
no such filter, the CLI SHALL match over the whole table of scopes rather than one page of it, so
that a scope is found wherever it sits.

Matching SHALL be by the same ranker that resolves a product, rather than by containment: a caller
who writes a scope's name approximately — shortened, or in another ending — SHALL reach it, and the
rows SHALL be printed in the order the ranking put them.

The text SHALL NOT be required. A listing with nothing to filter by is the listing of what the branch
offers, which is a question worth asking. Where no text was given there is nothing to rank against,
and the listing SHALL keep the order the server gave, bounded by its page size.

#### Scenario: A category found wherever it sits

- **WHEN** the user filters the listing by a text that matches a scope the server would return on
  its fourth page
- **THEN** that scope is found, because the filter covers the whole table rather than one
  page of it

#### Scenario: Case is not part of the match

- **WHEN** the filter text and a scope's title differ only in letter case
- **THEN** the scope matches

#### Scenario: A name written approximately

- **WHEN** the filter text names a scope without reproducing its title exactly
- **THEN** that scope is printed, ranked above the scopes that match the text less well

#### Scenario: The filter reaches all three kinds

- **WHEN** a text matches a category, a promotion and a set
- **THEN** all three are printed, each marked with its kind

#### Scenario: Nothing matches

- **WHEN** no scope of the branch ranks against the text
- **THEN** the command succeeds and reports that nothing matched, because a search that found
  nothing is an answer

#### Scenario: A search with no text

- **WHEN** the user runs the listing without giving a text
- **THEN** a bounded page of what the branch offers is printed in the order the server gave, because
  there is nothing to rank against

### Requirement: A scope is reachable by its name

Wherever a scope is named — as the filter of the listing, as the scope of a product search, or as
the category whose subtree the listing is asked to open — the CLI SHALL accept the title it is
called by as well as the handle it is taken by. Matching SHALL be over the titles of the categories,
the promotions and the sets of the session's branch, without regard to letter case, and over the
whole table rather than one page of it.

The title SHALL be resolved by ranking rather than by exact comparison, and the result SHALL be
settled by the same policy that settles a product. Where one scope stands clearly above the rest, it
SHALL be used without asking. Where the best candidates stand too close to separate, **or where the
best is too weak to trust**, the CLI SHALL print all of them with their kinds and their handles and
stop, and SHALL NOT take the first: a listing is not ordered by anything the caller cares about, and
a weak best match is a question the caller can answer rather than a dead end. Only where nothing
matches at all SHALL the command fail naming the value. The least bad candidate SHALL NOT be used
silently — a ranker answers every input, so a name that belongs to no scope has to be caught by the
policy rather than by the absence of a match.

The scopes ranked SHALL be read from the CLI's own copy of the branch's table wherever that copy is
current, rather than from the server. Resolving a name costs four catalogue calls today, paid before
the listing itself and paid even where the caller gave a handle that needed no resolution at all.

This is what removes the two-step errand. A caller who knows a part of the catalogue by name had to
find its handle first and carry it into a second command; the handle was never the thing being asked
about.

#### Scenario: A category listed by its name

- **WHEN** the caller asks for the products of a scope, naming it by its title
- **THEN** the title is resolved to that scope's handle and its products are listed, in one command

#### Scenario: A scope named twice costs one reading

- **WHEN** two commands in turn name a scope of the same branch
- **THEN** the second resolves the name without reading the branch's scopes from the server again

#### Scenario: A name two scopes carry

- **WHEN** a name ranks a category and a promotion too close to separate
- **THEN** both are printed with their kinds and handles, the command stops, and nothing is listed
  on the strength of a guess

#### Scenario: A name nothing carries strongly

- **WHEN** a name's best match is too weak to trust
- **THEN** the candidates are printed with their kinds and handles and the command stops, rather than
  the highest-scoring row being used

#### Scenario: A name nothing carries

- **WHEN** a name matches no category, promotion or set of the branch
- **THEN** the command fails saying so, rather than falling back to a listing of everything
