## ADDED Requirements

### Requirement: A field read out of a JSON entry

Where a JSON argument carries entries whose fields the command reads by name, a field
SHALL be read as the text it names, accepting a value written as a number as readily as
one written as a string, because a local number is naturally written unquoted in JSON.
A field carrying a structure rather than a value SHALL fail naming the field, and so
SHALL a field the call needs and the entry leaves out. The reading SHALL take the field's
name only so that it can name it in the failure.

#### Scenario: A number written as a number

- **WHEN** an entry of a JSON argument gives an identifier as an unquoted number, such as
  `{"productId": 12}`
- **THEN** it is read as the text `12` and resolved exactly as the quoted form would be

#### Scenario: A field the call needs is missing

- **WHEN** an entry leaves out a field the call cannot be built without
- **THEN** the command fails naming that field, and no tool is called

#### Scenario: A field carrying a structure

- **WHEN** a field the command reads as a value carries an object or an array instead
- **THEN** the command fails naming that field, rather than reading a rendering of the
  structure

## MODIFIED Requirements

### Requirement: Scalar arguments

The CLI SHALL reject scalar arguments that do not match the type an option expects, naming
what it expected. One written form SHALL govern both the whole-number options and the
decimal ones: an optional minus sign, digits, and at most one fractional part. Text outside
that form SHALL fail rather than being read as far as it happens to parse, so that
exponent, hexadecimal, separator and trailing-character spellings are refused instead of
silently yielding a number the user did not write. A whole-number option SHALL accept a
value of that form whose fractional part is zero, and SHALL refuse one that cannot be held
exactly.

#### Scenario: Integer option

- **WHEN** a value for an integer option is not a whole number of the accepted form
- **THEN** the command fails saying an integer was expected

#### Scenario: A whole number written with a fractional zero

- **WHEN** a value for an integer option is written as `12.0`
- **THEN** it is read as the whole number `12`

#### Scenario: A whole number too large to hold exactly

- **WHEN** a value for an integer option names a whole number beyond what can be held
  exactly
- **THEN** the command fails rather than sending a rounded number

#### Scenario: Number option

- **WHEN** a value for a numeric option is not of the accepted form
- **THEN** the command fails saying a number was expected

#### Scenario: A spelling that parses only in part

- **WHEN** a value for either kind of numeric option is written as an exponent, in
  hexadecimal, with digit separators, or with characters trailing the digits
- **THEN** the command fails, and no number is read from the part that would have parsed

#### Scenario: An empty value

- **WHEN** a value for either kind of numeric option is empty or blank
- **THEN** the command fails, and it is not read as zero

#### Scenario: Page size and page offset are whole numbers

- **WHEN** a page size or a page offset is given to any command that pages its results
- **THEN** it is read as a whole number, and a fractional one fails, alike for every such
  command

#### Scenario: Boolean option

- **WHEN** a value for a boolean option is one of `true`, `1`, `yes`, `y` or `false`, `0`,
  `no`, `n`, in any letter case
- **THEN** the CLI reads it as the matching boolean, and fails otherwise saying `true` or
  `false` was expected

#### Scenario: Nullable option

- **WHEN** the literal value `null` is passed to an option that can be cleared, such as a
  promo code or a bonus amount
- **THEN** the CLI sends an explicit null so the server drops the current value

### Requirement: Time arguments

The CLI SHALL accept times either as an absolute instant or as a local wall clock time in
the machine's own time zone, and SHALL send an absolute UTC instant to the server. Both
accepted forms SHALL be named wherever the CLI tells the user what it expects — in the help
of an option that takes a time and in the failure it raises for a time it cannot read.

#### Scenario: Local time in, UTC out

- **WHEN** the user passes a time such as `2026-08-17 09:00`
- **THEN** the CLI interprets it in the machine's time zone and sends the corresponding UTC instant

#### Scenario: Absolute time passes through

- **WHEN** the user passes a time that already carries an offset or a zone
- **THEN** the CLI converts it to UTC without reinterpreting it locally

#### Scenario: Unparseable time

- **WHEN** the value is neither an instant nor a local date and time
- **THEN** the command fails saying it expected a time written either locally or with a zone,
  and shows one written form

#### Scenario: Times inside a JSON timeslot

- **WHEN** a JSON timeslot object carries `start` and `end`
- **THEN** the CLI converts those two fields the same way, sends a slot made of them alone,
  and fails naming the field if either is missing

#### Scenario: A field the timeslot does not have

- **WHEN** a JSON timeslot object carries fields beyond `start` and `end`
- **THEN** they are not forwarded, because the slot a tool call carries has those two
  fields and no others
