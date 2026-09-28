## MODIFIED Requirements

### Requirement: Short ids in arguments

The CLI SHALL accept a short alias wherever it accepts a uuid, in scalar arguments and inside JSON arguments alike, and SHALL resolve it against the aliases recorded for an entity the command names. A field's name SHALL NOT be used to work out which entity a value belongs to. An argument that takes a category SHALL NOT be read as an alias, because a category is named by its own forms rather than by an alias.

#### Scenario: Known alias

- **WHEN** the user passes an alias for a branch id
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

#### Scenario: Every uuid-bearing option accepts an alias

- **WHEN** an option or a positional argument takes a branch, company, product, cart, address, or order id
- **THEN** it accepts the alias of that entity as readily as the uuid, under the entity the command named for that argument

#### Scenario: An argument that takes a category

- **WHEN** an option or a positional argument takes a category
- **THEN** it is read under the forms a category is named by, and the alias marker carries no meaning there
