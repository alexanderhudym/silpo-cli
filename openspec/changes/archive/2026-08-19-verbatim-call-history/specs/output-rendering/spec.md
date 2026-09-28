## MODIFIED Requirements

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
- **THEN** it is rendered as `#N` items rather than as a table

## ADDED Requirements

### Requirement: List form for the CLI's own state

The CLI SHALL offer, alongside the table, a list form for reporting its own state, in which each record opens with a marker and every further line of that record is indented beneath it. This form SHALL be used where a record carries a field long enough that a table would push the remaining columns out of view, and SHALL NOT be used for a payload returned by the MCP server.

#### Scenario: Record marker

- **WHEN** a record is rendered in list form
- **THEN** its first line opens with a dash followed by a space, and every further line of that record is indented so that it aligns under the text of the first line

#### Scenario: Nothing is aligned across records

- **WHEN** one record carries a far longer field than the others
- **THEN** it is printed in full and the other records are unaffected, because no field is padded to a shared width

#### Scenario: Nested detail

- **WHEN** a record carries a group of related values
- **THEN** the group is named on its own line and its values follow one per line, indented one step further
