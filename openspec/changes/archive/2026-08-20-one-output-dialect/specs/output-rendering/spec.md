## MODIFIED Requirements

### Requirement: Output a command composes itself

Every command that prints SHALL build the text it prints directly from what it has to report,
whether that is a payload returned by the MCP server or the CLI's own state. Such a command
SHALL state its output in full: which fields appear, in what order, under which key if any,
and what each value becomes. Nothing about the output SHALL follow from a field's name, from
the runtime shape of its value, or from any default the command did not ask for.

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

#### Scenario: The CLI's own state is composed too

- **WHEN** a command reports the CLI's own state rather than a payload from the MCP server
- **THEN** it composes its text in the same form as every other command, and no form is
  reserved for it

### Requirement: The composed form

Every command SHALL follow one form, so that a reader moving between commands meets the same
shape of text. A key SHALL be joined to its value by a colon and a space. A fact SHALL take one
line of its own, and a line SHALL run as long as its value needs, because the reader is a
program behind a pipe rather than a window. Records SHALL be separated by exactly one empty
line, and SHALL carry no marker opening the record. A group of records SHALL be named on a line
of its own above them. Text SHALL be indented with spaces only, two per level of nesting, and
no line SHALL carry a tab or trailing whitespace.

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
- **THEN** exactly one empty line separates neighbouring records, and no record opens with a
  marker or an ordinal unless the command states one for every item of that list

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

#### Scenario: A command prints no heading of its own name

- **WHEN** a command's output would open with a title naming the command the user just typed
- **THEN** that title is left out, because it repeats the invocation and reports nothing

### Requirement: A bare value for a shell

A command whose whole answer is a single value SHALL print that value alone, with no key, no
surrounding block and nothing else on the line, so that it can be used in a shell substitution.

#### Scenario: One value is the whole answer

- **WHEN** a command is asked for a single value and finds it
- **THEN** the value is printed on a line of its own, with no key and no group name above it

#### Scenario: The value is absent

- **WHEN** a command asked for a single value cannot find it
- **THEN** it fails rather than printing an empty line

## REMOVED Requirements

### Requirement: Label and value blocks

**Reason**: The aligned form was the second dialect in the CLI, kept only for commands
reporting the CLI's own state. It padded labels to a shared width, which the composed form
forbids anywhere in the CLI, and it omitted the colon that joins a key to its value
everywhere else.

**Migration**: The commands that used it — `server`, `config`, `login` and `logout` — print
the same facts in the composed form, one `key: value` per line, unpadded.

### Requirement: Tables

**Reason**: One command listed records as a space-aligned table, and aligning columns measures
width, which the composed form forbids. A table also has no way to express nesting, which is
how the composed form groups records.

**Migration**: `silpo aliases`, the only table, groups its handles under the entity and field
they belong to, in the composed form.

### Requirement: List form for the CLI's own state

**Reason**: The marked-and-indented list was a third form, reserved once more for the CLI's own
state, and only `silpo gain calls` ever used it. Its record marker appears in no other command,
and it separated records without the empty line the composed form requires.

**Migration**: `silpo gain calls` prints each invocation as a composed record, opening with the
command path instead of a marker and separated from its neighbour by one empty line.
