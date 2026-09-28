## ADDED Requirements

### Requirement: Category listings state their own shape

The four category lookups return four different records, and each SHALL be printed by the
command that asked for it rather than through one shape imposed on all of them. The flat
listing SHALL print each category's alias, slug, title and, where it has one, the alias of its
parent. The popular listing SHALL print alias, slug and title, and SHALL NOT print the page
address. The category page SHALL print alias, slug and title, the path to it as one line, the
price range as one line, and its children as records of their own.

#### Scenario: Four lookups, four shapes

- **WHEN** the flat listing, the popular listing, the category page or the tree is printed
- **THEN** each shows the fields its own payload carries, and no field is shown because a
  field of that name appears in another lookup

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
parent, showing the slug and, where the payload carries one, the number of products in that
category. The tree SHALL be printed in full, however many nodes it holds.

#### Scenario: Nesting shows the hierarchy

- **WHEN** a tree node carries children
- **THEN** they are printed two spaces further in than their parent, one level per step of
  depth

#### Scenario: A leaf

- **WHEN** a tree node carries no children
- **THEN** it takes its line and no group is named beneath it

#### Scenario: Nothing is trimmed

- **WHEN** the tree holds a thousand nodes or more
- **THEN** all of them are printed, because deciding what a caller may not see is not the
  renderer's decision

### Requirement: Promotions and sets output

The promotions listing SHALL print each promotion's code, title and the number of products it
covers. The product sets listing SHALL print each set's slug, title and description. Neither
SHALL print the web page address it carries.

#### Scenario: A promotion

- **WHEN** promotions are printed
- **THEN** each shows its code, its title and its product count, and no page address

#### Scenario: A set

- **WHEN** product sets are printed
- **THEN** each shows its slug, its title and its description, and no link

## MODIFIED Requirements

### Requirement: Catalog output

Catalog commands SHALL compose the text they print from the payload they received, naming
every field they show, and SHALL record the call for token accounting. No catalog command
SHALL print whether the call succeeded, because a call that did not succeed fails instead of
printing.

#### Scenario: Successful lookup

- **WHEN** a catalog command completes
- **THEN** the text it composed is written to standard output and the call is recorded with
  its token counts

#### Scenario: The command states its output

- **WHEN** a catalog command prints a payload
- **THEN** every field shown is one the command named, and nothing is chosen by inspecting
  the payload's shape or a field's name
