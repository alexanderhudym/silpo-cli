## MODIFIED Requirements

### Requirement: An identifier is printed only where a tool consumes it

A composed output SHALL print an identifier only when some tool of the MCP surface accepts a
value of that kind as an input, and SHALL print it as the local number recorded for its entity.
Every entity the CLI names has a table of its own, so there is one short form and no entity is
printed under two.
Identifiers no tool consumes SHALL be left out, because a uuid costs more tokens than a line
of readable text and buys nothing a caller can act on. An identifier that some tool consumes
SHALL nevertheless be left out where the value only echoes an argument the caller passed to
the same command, because it tells the caller what the caller just said. A key naming an
identifier SHALL end in `Id` where the identifier belongs to an entity other than the record
holding it, so that a reader can tell an identifier from a name; the key of a record's own
identifier SHALL remain `id`. A link the CLI cannot act on SHALL be treated the same way,
unless the link is the whole substance of the response.

An identifier that no tool consumes MAY nevertheless be printed as a local number where the row
would otherwise be unnameable in conversation, and the number costs less than the uuid it stands
in for.

#### Scenario: A consumed identifier

- **WHEN** a payload carries an id that some tool accepts as an argument
- **THEN** it is printed as the local number recorded for that entity, so the caller can pass it
  back

#### Scenario: An entity named by a number

- **WHEN** a payload carries the id of any entity the CLI records
- **THEN** the local number is printed, and no other short form exists for it

#### Scenario: An identifier nothing accepts

- **WHEN** a payload carries an id that no tool accepts as an argument and that names no row a
  caller would refer back to
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
