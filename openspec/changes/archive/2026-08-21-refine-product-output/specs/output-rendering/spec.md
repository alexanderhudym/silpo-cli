## ADDED Requirements

### Requirement: A field every record of a group shares

Where a command prints a group of records that all carry the same value of a field, it MAY
print that value once above the group instead of in every record, in a section named
`common` standing between the group's summary and its records and holding one keyed row per
such field. Whether a field is offered this way SHALL be stated by the command, one field at
a time; nothing SHALL be hoisted because its value happened to repeat. Where the records of
one payload do not all carry the same value, the command SHALL print the field in each record
as it otherwise would, and SHALL NOT print the section, so that the section is never a claim
the payload contradicts.

#### Scenario: A shared value is printed once

- **WHEN** every record of a group carries the same value of a field the command offers this
  way
- **THEN** that value appears once, under its key, in the `common` section above the records,
  and no record repeats it

#### Scenario: Records that disagree

- **WHEN** the records of a group do not all carry the same value of that field
- **THEN** the section is absent and every record carries the field itself

#### Scenario: Only what the command named

- **WHEN** a group's records happen to share a field the command did not offer this way
- **THEN** that field stays in the records, because hoisting follows from the command's
  statement rather than from the values

## MODIFIED Requirements

### Requirement: An identifier is printed only where a tool consumes it

A composed output SHALL print an identifier only when some tool of the MCP surface accepts a
value of that kind as an input, and SHALL print it as the alias recorded for its entity.
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
- **THEN** it is printed as that entity's alias, so the caller can pass it back

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
