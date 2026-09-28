## MODIFIED Requirements

### Requirement: An identifier is printed only where a tool consumes it

A composed output SHALL print an identifier only when some tool of the MCP surface accepts a
value of that kind as an input, and SHALL print it as the short form its entity is named by:
the alias recorded for it, or the local number recorded for it where the entity is named by a
number rather than an alias. No entity SHALL be printed under both forms.
Identifiers no tool consumes SHALL be left out, because a uuid costs more tokens than a line
of readable text and buys nothing a caller can act on. An identifier that some tool consumes
SHALL nevertheless be left out where the value only echoes an argument the caller passed to
the same command, because it tells the caller what the caller just said. A key naming an
identifier SHALL end in `Id` where the identifier belongs to an entity other than the record
holding it, so that a reader can tell an identifier from a name; the key of a record's own
identifier SHALL remain `id`. A link the CLI cannot act on SHALL be treated the same way,
unless the link is the whole substance of the response.

#### Scenario: A consumed identifier

- **WHEN** a payload carries an id that some tool accepts as an argument
- **THEN** it is printed as the short form that entity is named by, so the caller can pass it back

#### Scenario: An entity named by a number

- **WHEN** a payload carries the id of an entity that holds local numbers of its own
- **THEN** the local number is printed and no alias is assigned to that value

#### Scenario: An identifier nothing accepts

- **WHEN** a payload carries an id that no tool accepts as an argument
- **THEN** it is not printed at all

#### Scenario: An identifier the caller supplied

- **WHEN** every record of a payload carries an identifier equal to an argument of the
  command that fetched it
- **THEN** it is not printed, even though a tool consumes identifiers of that kind

#### Scenario: A key that names another entity

- **WHEN** a record prints the identifier of an entity other than itself
- **THEN** the key ends in `Id`, and a record printing its own identifier keys it `id`

#### Scenario: Image and page links

- **WHEN** a payload carries an image address or a web page address
- **THEN** it is left out, unless the response carries nothing else of substance
