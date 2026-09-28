## ADDED Requirements

### Requirement: An identifier is printed in the form its tools take

A composed output SHALL print an identifier only when some tool of the MCP surface accepts a value of
that kind as an input, and SHALL print it in the form the payload carried it in. Where a payload
carries an entity under more than one form — a product under its uuid, its slug and its external
product id — every form the payload holds SHALL be printed, because no two of them are accepted by
the same set of tools and the CLI holds no mapping between them. A form that every tool taking that
entity rejects SHALL NOT be printed, because it offers the caller a handle that fails.

Identifiers no tool consumes SHALL be left out, because a uuid costs more tokens than a line of
readable text and buys nothing a caller can act on. An identifier that some tool consumes SHALL
nevertheless be left out where the value only echoes an argument the caller passed to the same
command, because it tells the caller what the caller just said. A key naming an identifier SHALL end
in `Id` where the identifier belongs to an entity other than the record holding it, so that a reader
can tell an identifier from a name; the key of a record's own identifier SHALL remain `id`. A link
the CLI cannot act on SHALL be treated the same way, unless the link is the whole substance of the
response.

An identifier that no tool consumes MAY nevertheless be printed where the row would otherwise be
unnameable in conversation, or where a person could quote it to a shop.

An identifier every record of a group shares SHALL be hoisted into that group's `common` section
under the rule that already governs shared fields. This carries more weight than it did: a uuid
repeated on thirty rows is thirty times the cost of one.

#### Scenario: A consumed identifier

- **WHEN** a payload carries an id that some tool accepts as an argument
- **THEN** it is printed exactly as the payload carried it, so the caller can pass it back

#### Scenario: An entity carrying several forms

- **WHEN** a payload names a product by a uuid, a slug and an external product id
- **THEN** all three are printed, because a cart write takes only the first and a batch search
  matches only the third

#### Scenario: A form every tool rejects

- **WHEN** a payload names an entity under a form that every tool taking that entity rejects, as a
  category uuid is rejected by every category tool
- **THEN** that form is not printed, because one of those rejections is an empty list rather than an
  error and the caller would have no way to tell

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

#### Scenario: A shared identifier is hoisted

- **WHEN** every record of a listing names the same company
- **THEN** that company is printed once in `common` and not on any record

#### Scenario: Image and page links

- **WHEN** a payload carries an image address or a web page address
- **THEN** it is left out, unless the response carries nothing else of substance

### Requirement: A one-value answer prints bare

Where a command's whole answer is a single value, it SHALL print that value and nothing else: no
key, no label, no surrounding record. A caller reading such a command reads it to hand the value
straight to the next command, and a label makes the output something to parse rather than
something to use.

This SHALL NOT extend to a command that answers with a record which happens to hold one field
today. The test is whether the command could ever have a second thing to say, not how many lines
it prints for one payload.

#### Scenario: One configuration value

- **WHEN** a single configuration value is asked for by its key
- **THEN** the value is printed on its own, so that substituting the command into another yields
  the value and nothing to strip

#### Scenario: The same value labelled inside a record

- **WHEN** that value appears inside a record listing the whole configuration
- **THEN** it keeps its key, because there it stands beside other fields and the reader needs to
  know which is which

## REMOVED Requirements

### Requirement: An identifier is printed only where a tool consumes it

**Reason**: The requirement's rule was that every identifier is printed as the local number recorded
for its entity, one short form per entity and no entity under two. Both halves are gone: there are no
recorded numbers, and an entity is now printed under every form its payload carries because different
tools take different ones.

**Migration**: Replaced by "An identifier is printed in the form its tools take", above, which keeps
every clause about which identifiers are worth printing at all and changes only the form they take.

### Requirement: A one-value answer is printed as that value alone

**Reason**: Both of its scenarios turned on a cart printed as a bare local number, so that the
command could be substituted into the next one. The CLI issues no numbers, and it prints no
identifier for the cart under any form, because no tool takes one back.

**Migration**: Replaced by "A one-value answer prints bare", above, which keeps the rule and the
reason for it word for word and grounds it in the one command that answers with a single value,
`silpo config get`.
