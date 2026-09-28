## ADDED Requirements

### Requirement: Output a command composes itself

A command MAY build the text it prints directly from the payload it received, rather than
handing that payload to the uniform renderer. Such a command SHALL state its output in
full: which fields appear, in what order, under which key if any, and what each value
becomes. Nothing about the output SHALL follow from a field's name, from the runtime shape
of its value, or from any default the command did not ask for.

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
- **THEN** it may join several fields of a record into a single piece of text, which the
  uniform renderer's one-field-to-one-value mapping cannot express

#### Scenario: Nothing is inferred from a field's name

- **WHEN** a command composes its own output
- **THEN** no conversion is chosen by matching a field's name, and no value is inspected
  to guess whether it is an id, an instant, or anything else

#### Scenario: A composed output is not bound to a width

- **WHEN** a command composes output whose reader is a program rather than a window
- **THEN** it lets a line run as long as its value needs, rather than inheriting the width
  the uniform renderer keeps to

#### Scenario: Conversions are the shared ones

- **WHEN** a composed output shows an absolute instant, a coordinate, or an alias
- **THEN** it uses the shared conversion for that subject, so that a value reads the same
  whichever command printed it

## MODIFIED Requirements

### Requirement: Object layout

The CLI SHALL render a payload object handed to the uniform renderer as `key=value` pairs packed into lines no wider than 90 columns counted from the start of the line, indentation included, joined by two spaces, in the order the object gave them. A caller MAY supply an order, a renderer, a key, a separator and a placement for any field. A command that composes its own output is not bound by this requirement.

#### Scenario: Pairs fill the line

- **WHEN** an object's pairs fit within the width
- **THEN** they appear on one line separated by two spaces

#### Scenario: Overflowing pairs wrap

- **WHEN** the next pair would cross the width
- **THEN** it starts a new line at the same indentation as the first pair

#### Scenario: Arrival order by default

- **WHEN** an object is rendered and no order was supplied
- **THEN** its fields appear in the order the object carried them, whatever their rendered length

#### Scenario: Supplied order

- **WHEN** a caller supplies an order for a node's fields
- **THEN** the fields are arranged by it, whether each one is a pair or a nested block, so a nested block may stand between two pairs

#### Scenario: Longest pairs last

- **WHEN** a caller asks for a node's fields to be ordered by rendered width
- **THEN** they are ordered by rendered length ascending, so the shortest pack together and the longest end the block

#### Scenario: A pair wider than the line

- **WHEN** a single `key=value` is itself wider than the width
- **THEN** it takes a line of its own and overflows it, neither wrapped mid-value nor truncated

#### Scenario: Fields that carry nothing

- **WHEN** a field is null, or an array that holds no element, or a field whose renderer produced no text
- **THEN** it is left out entirely

#### Scenario: Array of scalars

- **WHEN** a field holds an array of scalars
- **THEN** it renders as one pair whose value is the elements joined by commas

#### Scenario: Nested object

- **WHEN** an object carries a nested object
- **THEN** the key is printed alone on its own line where the order puts it, and the nested object is rendered two spaces further in

#### Scenario: Indentation is spaces

- **WHEN** any nesting level is rendered
- **THEN** it is indented with spaces only, two per level, never tabs

### Requirement: Label and value blocks

The CLI SHALL render a set of single facts as one line per fact, with labels padded to the widest label so the values line up. This form SHALL be used only by commands that report the CLI's own state, never for a payload returned by the MCP server.

#### Scenario: Aligned pairs

- **WHEN** a block of labelled values is rendered
- **THEN** each line holds the label padded to the widest label, a single space, and the value

#### Scenario: Selected keys of an object

- **WHEN** an object is rendered as pairs with an explicit list of keys
- **THEN** the keys appear in the requested order, and keys the object does not carry are skipped rather than shown as empty

#### Scenario: Server payloads use the uniform layout

- **WHEN** the output being rendered is a payload from the MCP server
- **THEN** it is rendered either as the object and list layout or as text the command composed itself, never as label and value blocks

### Requirement: Tables

The CLI SHALL offer a space-aligned table with a header row as one of the forms for rendering lists of records, omitting columns that hold no value in any row. This form SHALL be used only by commands that report the CLI's own state, never for a payload returned by the MCP server, and only where every cell is short enough that aligning it leaves the remaining columns readable.

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
- **THEN** it is rendered either as `#N` items or as text the command composed itself, never as a table
