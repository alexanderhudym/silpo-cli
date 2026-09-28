## ADDED Requirements

### Requirement: Object layout

The CLI SHALL render a payload object as `key=value` pairs packed into lines no wider than 90 columns counted from the start of the line, indentation included, joined by two spaces, ordered so that the longest pairs come last.

#### Scenario: Pairs fill the line

- **WHEN** an object's pairs fit within the width
- **THEN** they appear on one line separated by two spaces

#### Scenario: Overflowing pairs wrap

- **WHEN** the next pair would cross the width
- **THEN** it starts a new line at the same indentation as the first pair

#### Scenario: Longest pairs last

- **WHEN** an object carries pairs of differing rendered length
- **THEN** they are ordered by rendered length ascending, so the shortest pack together and the longest end the block

#### Scenario: A pair wider than the line

- **WHEN** a single `key=value` is itself wider than the width
- **THEN** it takes a line of its own and overflows it, neither wrapped mid-value nor truncated

#### Scenario: Fields that carry nothing

- **WHEN** a field is null, or an array that holds no element
- **THEN** it is left out entirely

#### Scenario: Array of scalars

- **WHEN** a field holds an array of scalars
- **THEN** it renders as one pair whose value is the elements joined by commas

#### Scenario: Nested object

- **WHEN** an object carries a nested object
- **THEN** the key is printed alone on its own line after every scalar pair of that node, and the nested object is rendered two spaces further in

#### Scenario: Indentation is spaces

- **WHEN** any nesting level is rendered
- **THEN** it is indented with spaces only, two per level, never tabs

### Requirement: List layout

The CLI SHALL render a list of records as one `#N` item per record, numbered from one, indented under the key that holds them, with one field order shared by every item and one empty line between items.

#### Scenario: Item marker

- **WHEN** a list is rendered
- **THEN** each item starts with `#` and its one-based position, padded to the width of the widest marker in that list, followed by the item's first line of pairs

#### Scenario: Item continuation lines

- **WHEN** an item needs more than one line
- **THEN** the following lines align with the item's body, not with the marker

#### Scenario: One order for the whole list

- **WHEN** the items of a list carry the same fields
- **THEN** the field order is computed once for the list, from the longest rendered pair per field, and every item follows it

#### Scenario: Items are separated

- **WHEN** a list holds more than one item
- **THEN** exactly one empty line separates neighbouring items

#### Scenario: Nested list

- **WHEN** an object or an item carries a list
- **THEN** the key is printed alone on its own line after that node's scalar pairs and nested objects, and the list is rendered two spaces further in

#### Scenario: List of scalars is not a list of records

- **WHEN** a field holds an array whose elements are all scalars
- **THEN** it renders as a single pair rather than as `#N` items

### Requirement: Shared fields of a list

The CLI SHALL move fields whose rendered value is identical in every item of a list into a `common` section at the head of that list, and SHALL leave them out of the items.

#### Scenario: Identical scalar

- **WHEN** two or more items of a list carry the same field with the same rendered value
- **THEN** that pair appears once under a line reading `common`, indented two spaces, and no longer appears in any item

#### Scenario: Section is labelled

- **WHEN** a `common` section is printed
- **THEN** the literal word `common` precedes it on its own line, so hoisted fields cannot be mistaken for fields of the container

#### Scenario: Nested structure is preserved

- **WHEN** every item carries a nested object and some fields of that object hold the same value in all of them
- **THEN** the `common` section repeats the nesting path and carries those fields inside it, and the items keep only their own remaining fields of that object

#### Scenario: A field that differs anywhere stays

- **WHEN** a field's value differs in any one item, or is missing or null in any one item
- **THEN** the field is not hoisted and stays in every item that carries it

#### Scenario: A nested object missing from any item

- **WHEN** at least one item does not carry a nested object that others carry
- **THEN** nothing is hoisted out of that object

#### Scenario: Lists are not traversed

- **WHEN** items carry nested lists
- **THEN** no field is hoisted out of them into this list's `common` section, and each nested list gets its own section when it is rendered

#### Scenario: A single item

- **WHEN** a list holds one item
- **THEN** no `common` section is printed

#### Scenario: Every field is shared

- **WHEN** all fields of all items are identical
- **THEN** they all move to `common` and the items print as bare markers with no trailing whitespace

## MODIFIED Requirements

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
- **THEN** it is rendered as the object and list layout rather than as label and value blocks

### Requirement: Tables

The CLI SHALL render lists of records as a space-aligned table with a header row, omitting columns that hold no value in any row. This form SHALL be used only by commands that report the CLI's own state, never for a payload returned by the MCP server.

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

### Requirement: Value shortening

The CLI SHALL shorten values whose full form costs more than it informs.

#### Scenario: Coordinates

- **WHEN** a latitude or longitude is rendered
- **THEN** it is rounded to six decimal places and trailing zeros are dropped

#### Scenario: Timestamps

- **WHEN** an absolute instant is rendered
- **THEN** it is shown as local wall clock time to the minute, and a value that is not an instant is shown unchanged

#### Scenario: Flag objects

- **WHEN** an object of boolean flags is rendered
- **THEN** only the names of the raised flags are listed, comma separated, with a shared name prefix stripped, and a cell with no raised flag is treated as empty

#### Scenario: Delivery cost tiers

- **WHEN** a list of cost tiers is rendered
- **THEN** each tier is shown as its cost and the order total it starts from, comma separated, and an empty list is treated as empty

#### Scenario: Aliased ids

- **WHEN** a field known to carry an id holds a uuid
- **THEN** the alias recorded for that entity is printed in place of the uuid, and one is assigned first when the value has none

#### Scenario: Ids that are not uuids

- **WHEN** a field known to carry an id holds anything but a uuid, such as a number or a slug
- **THEN** the value is printed unchanged and no alias is assigned

#### Scenario: Nested values

- **WHEN** a value is an object, or an array whose elements are objects
- **THEN** it is rendered as a nested block under its key rather than as compact JSON, and a null is left out entirely

## REMOVED Requirements

### Requirement: Summary and pagination blocks

**Reason**: The uniform object layout renders `summary` and `meta` as ordinary fields of the payload, so titled blocks, their fixed field order, and the empty-line separation between blocks no longer apply.

**Migration**: A command that printed a summary block now prints `summary=<sentence>` among the payload's pairs, and one that printed a pagination block now prints a nested `meta` block carrying whichever of `limit`, `offset`, and `total` the payload holds.
