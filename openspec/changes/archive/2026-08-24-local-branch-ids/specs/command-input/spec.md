## MODIFIED Requirements

### Requirement: Short ids in arguments

The CLI SHALL accept a short alias wherever it accepts a uuid, in scalar arguments and inside JSON arguments alike, and SHALL resolve it against the aliases recorded for an entity the command names. A field's name SHALL NOT be used to work out which entity a value belongs to. An argument that takes a category, a branch, or a company SHALL NOT be read as an alias, because each of those is named by its own forms rather than by an alias. One JSON argument MAY therefore carry an alias under one field and a local number under another, each field read under whatever the command declared for it.

#### Scenario: Known alias

- **WHEN** the user passes an alias for a product id
- **THEN** the CLI substitutes the uuid it stands for

#### Scenario: Unknown alias

- **WHEN** the alias is not recorded for that entity
- **THEN** the command fails saying no such alias exists and naming the entity it was looked up under

#### Scenario: Plain id

- **WHEN** the value does not start with the alias marker
- **THEN** the CLI passes it through unchanged

#### Scenario: Aliases inside a JSON argument

- **WHEN** a JSON argument carries aliases under fields that hold uuids, such as the products of a cart update
- **THEN** the CLI replaces each of them with the uuid it stands for before sending the call, at any depth of the structure, resolving each field under the entity the command declared for it

#### Scenario: Fields of a JSON argument that hold no id

- **WHEN** a JSON argument carries strings under fields the command declared no entity for
- **THEN** those strings are left untouched even if they start with the alias marker

#### Scenario: A JSON argument of mixed forms

- **WHEN** one entry of a JSON argument names a product by its alias and a branch and a company by their local numbers, as a cart update does
- **THEN** each field is read under the form its entity is named by, and all three reach the call as the uuids they stand for

#### Scenario: Every uuid-bearing option accepts an alias

- **WHEN** an option or a positional argument takes a product, cart, address, or order id
- **THEN** it accepts the alias of that entity as readily as the uuid, under the entity the command named for that argument

#### Scenario: An argument that takes a category

- **WHEN** an option or a positional argument takes a category
- **THEN** it is read under the forms a category is named by, and the alias marker carries no meaning there

#### Scenario: An argument that takes a branch or a company

- **WHEN** an option, a positional argument, or a JSON field takes a branch or a company
- **THEN** it is read under the forms those are named by, and the alias marker carries no meaning there
