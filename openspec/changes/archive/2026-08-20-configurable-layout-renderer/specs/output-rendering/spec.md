## MODIFIED Requirements

### Requirement: Object layout

The CLI SHALL render a payload object as `key=value` pairs packed into lines no wider than 90 columns counted from the start of the line, indentation included, joined by two spaces, in the order the object gave them. A caller MAY supply an order, a renderer, a key, a separator and a placement for any field.

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

### Requirement: List layout

The CLI SHALL render a list of records as one item per record, indented under the key that holds them, with one empty line between items. Each item SHALL be marked `#N` from its one-based position, unless a caller asks for a dash instead.

#### Scenario: Item marker

- **WHEN** a list is rendered and no marker form was chosen
- **THEN** each item starts with `#` and its one-based position, padded to the width of the widest marker in that list, followed by the item's first line

#### Scenario: Dash markers

- **WHEN** a caller asks for dash markers
- **THEN** each item starts with a dash and a space, carries no position number, and its body aligns two spaces in, under the text of its first line

#### Scenario: Item continuation lines

- **WHEN** an item needs more than one line
- **THEN** the following lines align with the item's body, not with the marker

#### Scenario: One order for the whole list

- **WHEN** the items of a list carry the same fields
- **THEN** each item's fields follow the order that item carried them in, which is one order for the whole list because the items share a shape, and no order is computed across the items

#### Scenario: Items keep the order they arrived in

- **WHEN** a list is rendered
- **THEN** its records appear in the order the payload carried them, and the renderer offers no way to reorder them

#### Scenario: Items are separated

- **WHEN** a list holds more than one item
- **THEN** exactly one empty line separates neighbouring items

#### Scenario: Nested list

- **WHEN** an object or an item carries a list
- **THEN** the key is printed alone on its own line where the order puts it, and the list is rendered two spaces further in

#### Scenario: List of scalars is not a list of records

- **WHEN** a field holds an array whose elements are all scalars
- **THEN** it renders as a single pair rather than as `#N` items

### Requirement: Value shortening

The CLI SHALL shorten values whose full form costs more than it informs. A caller MAY ask instead that a field's values pass through untouched, for records the CLI has to reproduce exactly rather than summarise.

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

- **WHEN** a field bound to an alias entity holds a uuid
- **THEN** the alias recorded for that entity is printed in place of the uuid, and one is assigned first when the value has none

#### Scenario: Ids that are not uuids

- **WHEN** a field bound to an alias entity holds anything but a uuid, such as a number or a slug
- **THEN** the value is printed unchanged and no alias is assigned

#### Scenario: Nested values

- **WHEN** a value is an object, or an array whose elements are objects
- **THEN** it is rendered as a nested block under its key rather than as compact JSON, and a null is left out entirely

#### Scenario: Values passed through untouched

- **WHEN** a caller asks for untouched values and a field holds text that would otherwise be read as an instant or as an aliased id
- **THEN** the text is rendered exactly as it was given, with no time conversion and no alias substitution

## ADDED Requirements

### Requirement: Per-field rendering

The CLI SHALL let a caller give any field its own renderer, and SHALL choose a renderer by the value's type otherwise. A renderer SHALL be a function of its own value alone: it SHALL NOT be told its key, its siblings, or where its output will be placed.

#### Scenario: A field renders through its own renderer

- **WHEN** a caller gives a renderer for a field
- **THEN** that renderer produces the field's text, and every other field of the node is unaffected

#### Scenario: Default by type

- **WHEN** a field has no renderer of its own and none is registered for its name
- **THEN** it is rendered by the default for its value's type — a pair for a scalar, a comma-joined pair for an array of scalars, a block for an object or an array of objects

#### Scenario: A node overrides a registered default

- **WHEN** a field name has a registered default renderer and the node holding it gives its own
- **THEN** the node's renderer is used, so one field name may render differently under different parents

#### Scenario: A renderer that produces nothing

- **WHEN** a field's renderer produces no text
- **THEN** the field does not appear, and no key, separator or blank line is left behind

#### Scenario: A field takes a line of its own

- **WHEN** a caller places a field on a line of its own
- **THEN** it is rendered on a line holding nothing else, even where it and its neighbours would have fitted within the width together

#### Scenario: A block forced onto one line

- **WHEN** a caller places an object or a list as a pair rather than a block
- **THEN** its renderer's text stands beside its neighbours on a shared line, with no key line and no indented body

#### Scenario: A field without its key

- **WHEN** a caller drops a field's key
- **THEN** only the field's text is rendered, with neither its key nor a separator, at the placement the caller chose

#### Scenario: A renamed key

- **WHEN** a caller gives a field a key other than its name
- **THEN** that key is printed in place of the field's own name

#### Scenario: Chosen separator

- **WHEN** a caller gives a separator for a field or for a node
- **THEN** that separator stands between the key and the value in place of `=`, and a separator given for a node governs only that node's own fields

#### Scenario: Rendering never invents or drops data

- **WHEN** any of these settings is applied
- **THEN** it changes only ordering, line breaks, markers, separators, key visibility, and the text a field's own renderer produces from that field's own value

## REMOVED Requirements

### Requirement: Shared fields of a list

**Reason**: Whether several records repeat a value is a property of the data, not of its layout. Folding it into the renderer meant every list paid for a cross-record comparison, and it was the one rule that let a field disappear from the record that carried it.

**Migration**: A caller that wants values stated once prepares the payload before rendering, producing a shape that carries the shared fields and the records separately. That shape renders through the ordinary primitives — a hidden key on the records field drops its header so the records sit at the same indent as the shared block, reproducing the previous output. No such preparation ships with this change, so the four `common` sections in the golden files disappear.
