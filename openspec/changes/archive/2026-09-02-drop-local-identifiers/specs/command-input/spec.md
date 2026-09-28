## ADDED Requirements

### Requirement: An entity argument is the entity's own identifier

Wherever an argument names an entity — a scalar option such as `--branch-id`, a positional such as
the product of a details lookup, or a field inside a JSON argument such as the `productId` of a cart
write — the CLI SHALL send the value it was given to the tool unchanged. It SHALL NOT inspect the
value's shape, look it up, substitute another form for it, or decide which entity it belongs to from
the field's name. There is no form the CLI recognises and no form it rewrites.

A value the tool does not accept SHALL therefore fail at the tool, and the CLI SHALL report the
tool's own error rather than one of its own. This includes the MCP layer's uuid validation, which
rejects a malformed identifier before the request reaches Silpo.

#### Scenario: A scalar entity argument

- **WHEN** the user passes `--branch-id` any value at all
- **THEN** that value reaches the tool exactly as typed

#### Scenario: An identifier inside a JSON argument

- **WHEN** a JSON argument carries a product, a company and a branch, as the products of a cart
  write do
- **THEN** each value reaches the call as it was given, and none is read under an entity

#### Scenario: A value the tool rejects

- **WHEN** the user passes a product slug where a cart write wants a uuid
- **THEN** the command fails carrying the tool's own message, and the CLI adds no message of its own

## MODIFIED Requirements

### Requirement: Arguments reach the command as typed

An argument SHALL reach the command holding the text the user typed. Turning that text
into what a tool call needs SHALL be done by the command, where the call is built, and
SHALL NOT replace the argument on the way in. Gathering a repeatable option into a list is
not a conversion and MAY still happen as the argument is read.

#### Scenario: The typed text survives the parse

- **WHEN** a command receives an argument that needs converting, such as a local
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

### Requirement: A field read out of a JSON entry

Where a JSON argument carries entries whose fields the command reads by name, a field
SHALL be read as the text it names, accepting a value written as a number as readily as
one written as a string, because an external product id and a quantity are naturally written
unquoted in JSON. A field carrying a structure rather than a value SHALL fail naming the field,
and so SHALL a field the call needs and the entry leaves out. The reading SHALL take the field's
name only so that it can name it in the failure, never to decide which entity the value belongs
to.

#### Scenario: A number written as a number

- **WHEN** an entry of a JSON argument gives a value as an unquoted number, such as
  `{"externalProductId": 864122}`
- **THEN** it is read as the text `864122` and sent exactly as the quoted form would be

#### Scenario: A field the call needs is missing

- **WHEN** an entry leaves out a field the call cannot be built without
- **THEN** the command fails naming that field, and no tool is called

#### Scenario: A field carrying a structure

- **WHEN** a field the command reads as a value carries an object or an array instead
- **THEN** the command fails naming that field, rather than reading a rendering of the
  structure

## REMOVED Requirements

### Requirement: Local numbers in arguments

**Reason**: The CLI issues no local numbers and holds no records to resolve them against. Every
clause of this requirement — the uuid recognised by shape, the lookup for every other form, the
entity a JSON field is read under, the ordering that resolves a branch before the product inside it —
describes machinery that no longer exists.

**Migration**: Pass the identifier the CLI printed, in the form the tool wants. The skill states
which tools want which form, and the failure when the form is wrong now comes from the tool itself.
