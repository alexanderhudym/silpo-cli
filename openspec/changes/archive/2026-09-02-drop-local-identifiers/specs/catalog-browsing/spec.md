## MODIFIED Requirements

### Requirement: Categories of a branch

The CLI SHALL look up the categories of the session's branch as a flat list, paged. It SHALL NOT be
the way the hierarchy is read: the parent relation SHALL NOT be printed, and SHALL NOT be offered as
a filter. The tool's own parent filter takes a category uuid, which is the one form no other
category call accepts and the one form the CLI no longer prints, so offering it would be offering a
filter that cannot be filled from anything the CLI shows. The hierarchy is read from the tree.

#### Scenario: Flat list

- **WHEN** the user lists categories
- **THEN** the CLI returns them as a flat list for the session's branch, forwarding the page size and
  offset it was given

#### Scenario: Children of one category

- **WHEN** the user wants the children of one category
- **THEN** the flat listing offers no filter for it, because the tool's filter takes a category uuid
  and the CLI prints none, and the category tree is where the hierarchy is read instead

### Requirement: Category tree output

The category tree SHALL be printed as nested records, each indented two spaces under its
parent, showing the category's slug, its title and, where the payload carries one, the number of
products in that category. Because the hierarchy the server returns names its nodes by slug alone
and carries no title, the CLI SHALL obtain the title of every node from the branch's category
listing, requesting as many pages of it as the listing reports and joining the two on the slug. A
node the listing does not account for SHALL be printed with its slug alone rather than left out,
because the slug is the handle every category call takes and a node carrying it is usable whether or
not it can be named. The tree SHALL otherwise be printed in full, however many nodes it holds.

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

### Requirement: Category hierarchy

The CLI SHALL return the category tree of the session's branch within its delivery type and time
slot, and SHALL open a single category with its subtree. Neither SHALL take a branch, a delivery type
or a time slot from the caller.

#### Scenario: Whole tree

- **WHEN** the user asks for the tree
- **THEN** the CLI returns the hierarchical tree for the session's context

#### Scenario: One category

- **WHEN** the user asks for a category, naming it by its slug
- **THEN** the CLI returns that category together with its subtree

#### Scenario: One category without a delivery type

- **WHEN** the user asks for a category and passes no delivery type, because no command takes one
- **THEN** the call is made within the session's delivery type, and the answer is the same one any
  delivery type would have produced

#### Scenario: Popular categories

- **WHEN** the user asks for the popular categories
- **THEN** the CLI returns the session branch's most popular categories

### Requirement: Catalog output

Catalog commands SHALL compose the text they print from the payload they received, naming
every field they show. No catalog command SHALL print whether the call succeeded, because a
call that did not succeed fails instead of printing. No catalog command SHALL record anything
about the call it made: the CLI keeps no ledger.

#### Scenario: Successful lookup

- **WHEN** a catalog command completes
- **THEN** the text it composed is written to standard output, and nothing else is written
  anywhere

#### Scenario: The command states its output

- **WHEN** a catalog command prints a payload
- **THEN** every field shown is one the command named, and nothing is chosen by inspecting
  the payload's shape or a field's name

### Requirement: Category listings state their own shape

The category lookups return different records, and each SHALL be printed by the command that
asked for it rather than through one shape imposed on all of them. A category SHALL be named in
output by its slug and nothing else: no server identifier and no parent. The flat listing SHALL
print each category's slug and title. The search SHALL print the matches in the same shape the
flat listing uses, and SHALL summarise them by the number it matched, never by a total the
server reported for a listing that was not filtered. The popular listing SHALL print slug and
title, and SHALL NOT print the page address. The category page SHALL print slug and title, the
path to it as one line, the price range as one line, and its children as records of their own,
each named by its own slug and title.

#### Scenario: Four lookups, four shapes

- **WHEN** the flat listing, the search, the popular listing, the category page or the tree is
  printed
- **THEN** each shows the fields its own payload carries, and no field is shown because a
  field of that name appears in another lookup

#### Scenario: The parent is not shown

- **WHEN** the flat listing prints a category that has a parent
- **THEN** the parent is not printed, because the listing is a lookup and the tree is where
  the hierarchy is read

#### Scenario: One identifier, not three

- **WHEN** any command prints a category
- **THEN** the slug is the only identifier on the line, because it is the one form every
  category tool accepts, and the category uuid beside it would offer a handle whose failure is
  an empty list rather than an error

#### Scenario: The search counts what it matched

- **WHEN** the search matched three categories out of a listing of a thousand
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

## REMOVED Requirements

### Requirement: A category the branch does not show

**Reason**: The refusal existed because a category named by a form the branch did not carry came
back as an empty listing rather than an error, and telling those two apart meant a second
`silpo_get_category` call. The form that produced the silent empty answer was the category uuid,
which the CLI no longer prints and a caller therefore no longer holds. What remains — a slug whose
category genuinely holds nothing at this branch — is an empty listing, and printing it as one is
correct.

**Migration**: A category listing that comes back empty is printed as empty, with its own summary
saying so. A caller that wants to know whether the category exists at the branch asks
`silpo categories details`, which answers on its own.
