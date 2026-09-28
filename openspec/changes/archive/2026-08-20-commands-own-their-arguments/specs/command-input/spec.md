## ADDED Requirements

### Requirement: Arguments reach the command as typed

An argument SHALL reach the command holding the text the user typed. Turning that text
into what a tool call needs SHALL be done by the command, where the call is built, and
SHALL NOT replace the argument on the way in. Gathering a repeatable option into a list is
not a conversion and MAY still happen as the argument is read.

#### Scenario: The typed text survives the parse

- **WHEN** a command receives an argument that needs converting, such as an alias, a local
  time, a coordinate pair, or a JSON structure
- **THEN** the value it receives is the text as typed, and the converted form exists only
  where the command builds its tool call

#### Scenario: A repeatable option still gathers

- **WHEN** an option that stands for a list is passed several times
- **THEN** the values are gathered into one list in the order they were given, each still
  as typed

#### Scenario: A conversion that fails still fails the command

- **WHEN** an argument cannot be converted
- **THEN** the command fails naming what it expected, as it did when the conversion
  happened during parsing, and no tool is called

## MODIFIED Requirements

### Requirement: Short ids in arguments

The CLI SHALL accept a short alias wherever it accepts a uuid, in scalar arguments and inside JSON arguments alike, and SHALL resolve it against the aliases recorded for an entity the command names. A field's name SHALL NOT be used to work out which entity a value belongs to.

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

- **WHEN** an option or a positional argument takes a branch, company, product, category, cart, address, or order id
- **THEN** it accepts the alias of that entity as readily as the uuid, under the entity the command named for that argument
