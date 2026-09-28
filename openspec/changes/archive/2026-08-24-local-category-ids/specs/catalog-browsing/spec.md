## MODIFIED Requirements

### Requirement: Categories of a branch

The CLI SHALL look up the categories of a branch as a flat list, narrowed by the filters it
was given and paged. It SHALL NOT be the way the hierarchy is read: a parent may be named to
select that parent's children, but the relation itself SHALL NOT be printed.

#### Scenario: Flat list

- **WHEN** the user lists categories for a branch
- **THEN** the CLI returns them as a flat list, forwarding the page size and offset it was
  given

#### Scenario: Children of one category

- **WHEN** the user passes a parent category, named by its local number, the server's
  identifier or its slug
- **THEN** only that category's children are requested

### Requirement: Category hierarchy

The CLI SHALL return the category tree of a branch for a delivery type and a time slot, and
SHALL open a single category with its subtree. Opening one category SHALL NOT require a
delivery type; where the user gives none, the CLI SHALL make the call without committing to
one.

#### Scenario: Whole tree

- **WHEN** the user asks for the tree with a branch, a delivery type, and both slot bounds
- **THEN** the CLI returns the hierarchical tree for that context

#### Scenario: One category

- **WHEN** the user asks for a category with a branch, naming the category by its local
  number, the server's identifier or its slug
- **THEN** the CLI returns that category together with its subtree

#### Scenario: One category without a delivery type

- **WHEN** the user asks for a category and passes no delivery type
- **THEN** the call is still made, and the answer is the same one a delivery type would have
  produced

#### Scenario: Popular categories

- **WHEN** the user asks for the popular categories of a branch and delivery type
- **THEN** the CLI returns the branch's most popular categories

### Requirement: Category listings state their own shape

The four category lookups return four different records, and each SHALL be printed by the
command that asked for it rather than through one shape imposed on all of them. A category
SHALL be named in output by its local number and nothing else: no slug, no server identifier,
and no parent. The flat listing SHALL print each category's local number and title. The
popular listing SHALL print local number and title, and SHALL NOT print the page address. The
category page SHALL print local number and title, the path to it as one line, the price range
as one line, and its children as records of their own.

#### Scenario: Four lookups, four shapes

- **WHEN** the flat listing, the popular listing, the category page or the tree is printed
- **THEN** each shows the fields its own payload carries, and no field is shown because a
  field of that name appears in another lookup

#### Scenario: The parent is not shown

- **WHEN** the flat listing prints a category that has a parent
- **THEN** the parent is not printed, because the listing is a lookup and the tree is where
  the hierarchy is read

#### Scenario: One identifier, not three

- **WHEN** any command prints a category
- **THEN** the local number is the only identifier on the line, because every option that
  takes a category accepts that number, and printing the slug beside it would cost a line per
  category to say the same thing twice

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
parent, showing the category's local number, its title and, where the payload carries one,
the number of products in that category. Because the hierarchy the server returns names its
nodes by slug alone, the CLI SHALL obtain the local number and the title of every node from
the branch's category listing, requesting as many pages of it as the listing reports. A node
the listing does not account for SHALL be resolved on its own; where that resolution finds
nothing either, the node SHALL be left out rather than printed under a name the CLI does not
have. The tree SHALL otherwise be printed in full, however many nodes it holds.

#### Scenario: Nesting shows the hierarchy

- **WHEN** a tree node carries children
- **THEN** they are printed two spaces further in than their parent, one level per step of
  depth

#### Scenario: A leaf

- **WHEN** a tree node carries no children
- **THEN** it takes its line and no group is named beneath it

#### Scenario: A node with no product count

- **WHEN** a tree node carries no number of products
- **THEN** its line shows the local number and the title alone, and no count is invented

#### Scenario: No count anywhere in the tree

- **WHEN** the delivery type and time slot are ones for which the server counts nothing, and
  every node comes back without a number
- **THEN** the tree is printed without counts and the command succeeds, because the server
  reported success and the CLI reports what it received

#### Scenario: A node the listing does not account for

- **WHEN** the hierarchy names a node that the branch's category listing does not
- **THEN** that node is resolved on its own so that it too is printed with a local number and
  a title

#### Scenario: A node nothing can name

- **WHEN** the hierarchy names a node that neither the listing nor a lookup of its own
  resolves
- **THEN** that node and what hangs beneath it are left out, and the rest of the tree is
  printed, because a line without a local number and a title is not a line a caller can use

#### Scenario: Nothing is trimmed

- **WHEN** the tree holds a thousand nodes or more
- **THEN** all of them are printed, because deciding what a caller may not see is not the
  renderer's decision
