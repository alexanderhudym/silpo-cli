## MODIFIED Requirements

### Requirement: Short ids in arguments

The CLI SHALL accept a short alias wherever it accepts a uuid, in scalar arguments and inside JSON arguments alike, and SHALL resolve it against the aliases recorded for the entity that field belongs to.

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
- **THEN** the CLI replaces each of them with the uuid it stands for before sending the call, at any depth of the structure

#### Scenario: Fields of a JSON argument that hold no id

- **WHEN** a JSON argument carries strings under fields that belong to no aliased entity
- **THEN** those strings are left untouched even if they start with the alias marker

#### Scenario: Every uuid-bearing option accepts an alias

- **WHEN** an option or a positional argument takes a branch, company, product, category, cart, address, or order id
- **THEN** it accepts the alias of that entity as readily as the uuid
