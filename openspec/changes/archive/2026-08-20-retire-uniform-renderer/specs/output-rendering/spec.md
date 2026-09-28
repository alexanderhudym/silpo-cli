## ADDED Requirements

### Requirement: The composed form

Every command that composes its own output SHALL follow one form, so that a reader moving
between commands meets the same shape of text. A key SHALL be joined to its value by a colon
and a space. A fact SHALL take one line of its own, and a line SHALL run as long as its value
needs, because the reader is a program behind a pipe rather than a window. Records SHALL be
separated by exactly one empty line. A group of records SHALL be named on a line of its own
above them. Text SHALL be indented with spaces only, two per level of nesting, and no line
SHALL carry a tab or trailing whitespace.

#### Scenario: Key and value

- **WHEN** a command prints a field under its key
- **THEN** the key, a colon, a space and the value stand on one line, and the next field
  starts a new line

#### Scenario: No line is wrapped

- **WHEN** a value is long enough that the line would exceed any terminal width
- **THEN** the line runs to the value's end, neither wrapped nor truncated, and no width is
  measured or detected

#### Scenario: Records are separated

- **WHEN** a command prints more than one record of the same kind
- **THEN** exactly one empty line separates neighbouring records, and no record carries an
  ordinal marker unless the command states one for every item of that list

#### Scenario: A group is named

- **WHEN** a command prints a group of records under a name
- **THEN** the name stands alone on the line above the group

#### Scenario: Nested records are indented

- **WHEN** a command prints a record inside another record
- **THEN** the inner block is indented two spaces further than the line naming it, one level
  per step of nesting, with spaces and never tabs

#### Scenario: A value that carries its own line breaks

- **WHEN** a value the server supplied holds newlines or runs of whitespace
- **THEN** it is collapsed to a single line before it is placed in a field, so a record the
  command states as one line stays one line

#### Scenario: No line carries trailing whitespace

- **WHEN** any command's output is written
- **THEN** every line ends at its last visible character, and no line holds a tab

### Requirement: An identifier is printed only where a tool consumes it

A composed output SHALL print an identifier only when some tool of the MCP surface accepts a
value of that kind as an input, and SHALL print it as the alias recorded for its entity.
Identifiers no tool consumes SHALL be left out, because a uuid costs more tokens than a line
of readable text and buys nothing a caller can act on. A link the CLI cannot act on SHALL be
treated the same way, unless the link is the whole substance of the response.

#### Scenario: A consumed identifier

- **WHEN** a payload carries an id that some tool accepts as an argument
- **THEN** it is printed as that entity's alias, so the caller can pass it back

#### Scenario: An identifier nothing accepts

- **WHEN** a payload carries an id that no tool accepts as an argument
- **THEN** it is not printed at all

#### Scenario: Image and page links

- **WHEN** a payload carries an image address or a web page address
- **THEN** it is left out, unless the response carries nothing else of substance

### Requirement: A dictionary whose keys are data

A command MAY print an object whose keys are supplied by the server rather than fixed by the
tool contract, in which case it SHALL print every entry of that object as a key and a value
in the composed form. Naming such fields in advance is not possible, and this SHALL be the
only place where a printed key comes from the payload rather than from the command.

#### Scenario: Server-supplied keys

- **WHEN** a command prints an object whose key set is not declared by the tool contract
- **THEN** each entry appears as its own key and value, with the key exactly as the server
  spelled it

#### Scenario: Everything else is named by the command

- **WHEN** a command prints any object whose fields the tool contract declares
- **THEN** each printed key comes from the command, not from the payload

## MODIFIED Requirements

### Requirement: Output a command composes itself

A command that prints a payload returned by the MCP server SHALL build the text it prints
directly from that payload. Such a command SHALL state its output in full: which fields
appear, in what order, under which key if any, and what each value becomes. Nothing about the
output SHALL follow from a field's name, from the runtime shape of its value, or from any
default the command did not ask for.

#### Scenario: The command decides what appears

- **WHEN** a command composes its own output
- **THEN** a field of the payload appears only because that command names it, and a field
  it does not name is absent

#### Scenario: A key is printed only where it informs

- **WHEN** a command composes its own output
- **THEN** it decides per field whether to print the field's key alongside the value, so
  that a value whose meaning is plain from the value itself costs no key

#### Scenario: Several fields become one piece of text

- **WHEN** a command composes its own output
- **THEN** it may join several fields of a record into a single piece of text

#### Scenario: Nothing is inferred from a field's name

- **WHEN** a command composes its own output
- **THEN** no conversion is chosen by matching a field's name, and no value is inspected
  to guess whether it is an id, an instant, or anything else

#### Scenario: Conversions are the shared ones

- **WHEN** a composed output shows an absolute instant, a coordinate, an alias, a group of
  boolean flags or a set of delivery cost tiers
- **THEN** it uses the shared conversion for that subject, so that a value reads the same
  whichever command printed it

#### Scenario: A composed output is not bound to a width

- **WHEN** a command composes output whose reader is a program rather than a window
- **THEN** it lets a line run as long as its value needs, and no width is measured or
  detected anywhere in the CLI

#### Scenario: A record shape shared by two tools

- **WHEN** two or more tools are shown to return a record with the same fields
- **THEN** that record MAY be composed by one shared piece of text-building that every such
  command calls, and a record returned by a single tool SHALL NOT be generalised in advance

### Requirement: Label and value blocks

The CLI SHALL render a set of single facts as one line per fact, with labels padded to the
widest label so the values line up. This form SHALL be used only by commands that report the
CLI's own state, never for a payload returned by the MCP server.

#### Scenario: Aligned pairs

- **WHEN** a block of labelled values is rendered
- **THEN** each line holds the label padded to the widest label, a single space, and the value

#### Scenario: Selected keys of an object

- **WHEN** an object is rendered as pairs with an explicit list of keys
- **THEN** the keys appear in the requested order, and keys the object does not carry are skipped rather than shown as empty

#### Scenario: Server payloads use the uniform layout

- **WHEN** the output being rendered is a payload from the MCP server
- **THEN** it is rendered as text the command composed itself, never as label and value blocks

### Requirement: Tables

The CLI SHALL offer a space-aligned table with a header row as one of the forms for rendering
lists of records, omitting columns that hold no value in any row. This form SHALL be used only
by commands that report the CLI's own state, never for a payload returned by the MCP server,
and only where every cell is short enough that aligning it leaves the remaining columns
readable.

#### Scenario: Aligned columns

- **WHEN** a table is rendered
- **THEN** every cell except the last in a row is padded to the width of the widest cell or header in its column, and trailing whitespace is trimmed

#### Scenario: Empty columns disappear

- **WHEN** a declared column is empty in every row
- **THEN** that column is left out entirely, header included

#### Scenario: Nothing to show

- **WHEN** every declared column is empty, or there are no rows at all
- **THEN** the table renders as an empty string rather than a lone header

#### Scenario: Titled table

- **WHEN** a table is given a title
- **THEN** the title is printed on its own line above the header row

#### Scenario: Server payloads use the uniform layout

- **WHEN** a list comes from a payload returned by the MCP server
- **THEN** it is rendered as text the command composed itself, never as a table

## REMOVED Requirements

### Requirement: Object layout

**Reason**: The layout it describes — `key=value` pairs packed into 90-column lines, keys
and separators chosen per field, fields ordered by a supplied comparator — belongs to a
renderer that walks a payload it does not understand. Every command now states its own
output, and the composed form replaces it.

**Migration**: Commands print one fact per line in the composed form, joining a key to its
value with a colon and a space, in the order the command names them.

### Requirement: List layout

**Reason**: `#N` markers and their alignment exist so that a generic walker can show where
one record ends and the next begins. A command that names its own fields separates records
with an empty line, and refers to a record by its alias rather than by its position.

**Migration**: Records are separated by one empty line; a command that needs to mark items
states one marker form for the whole list.

### Requirement: Per-field rendering

**Reason**: The per-field renderer, the placement, the renamed key and the chosen separator
are the configuration surface of a generic engine. With no engine there is nothing to
configure: a command writes the text it wants.

**Migration**: None needed — a command that wants a field rendered differently writes it
differently.

### Requirement: Value shortening

**Reason**: Every conversion it named is a conversion by subject, and subjects live in the
value-conversion capability, which already holds instants, coordinates and aliases. The two
that lived only here — groups of boolean flags and delivery cost tiers — move there with it.
The remaining clauses described how a generic walker chose a conversion by inspecting a
value, which no longer happens.

**Migration**: See the value-conversion capability for each subject; a command calls the
converter for the subject it knows it is holding.
