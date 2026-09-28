## MODIFIED Requirements

### Requirement: Categories of a branch

The CLI SHALL look up the categories of the session's branch as a flat list, narrowed by the filters
it was given and paged. It SHALL NOT be the way the hierarchy is read: a parent may be named to
select that parent's children, but the relation itself SHALL NOT be printed.

#### Scenario: Flat list

- **WHEN** the user lists categories
- **THEN** the CLI returns them as a flat list for the session's branch, forwarding the page size and
  offset it was given

#### Scenario: Children of one category

- **WHEN** the user passes a parent category, named by its local number, the server's identifier or
  its slug
- **THEN** only that category's children are requested

### Requirement: Category hierarchy

The CLI SHALL return the category tree of the session's branch within its delivery type and time
slot, and SHALL open a single category with its subtree. Neither SHALL take a branch, a delivery type
or a time slot from the caller.

#### Scenario: Whole tree

- **WHEN** the user asks for the tree
- **THEN** the CLI returns the hierarchical tree for the session's context

#### Scenario: One category

- **WHEN** the user asks for a category, naming it by its local number, the server's identifier or
  its slug
- **THEN** the CLI returns that category together with its subtree

#### Scenario: One category without a delivery type

- **WHEN** the user asks for a category and passes no delivery type, because no command takes one
- **THEN** the call is made within the session's delivery type, and the answer is the same one any
  delivery type would have produced

#### Scenario: Popular categories

- **WHEN** the user asks for the popular categories
- **THEN** the CLI returns the session branch's most popular categories

### Requirement: Promotions and sets

The CLI SHALL list the promotions currently running in the session's branch within its delivery
context, and the curated product sets that branch offers.

#### Scenario: Promotions

- **WHEN** the user asks for promotions
- **THEN** the CLI returns the promotions active for the session's context

#### Scenario: Product sets

- **WHEN** the user asks for the product sets
- **THEN** the CLI returns the curated sets for the session's branch

## ADDED Requirements

### Requirement: A category the branch does not show

A category the server reports as not visible SHALL be printed as unavailable, and SHALL NOT be
offered as somewhere to browse products, because the branch holds nothing under it.

#### Scenario: A category marked not visible

- **WHEN** a category listing or a category card carries a category the server marks as not visible
- **THEN** it is printed as unavailable, in the same way a product out of stock is marked

#### Scenario: Browsing a category that is not visible

- **WHEN** the user asks for the products of a category the server marks as not visible
- **THEN** the command says the category holds nothing at this branch rather than returning an
  unexplained empty listing
