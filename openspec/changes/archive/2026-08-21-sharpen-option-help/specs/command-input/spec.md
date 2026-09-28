## ADDED Requirements

### Requirement: What the help of an option says

The description the CLI prints for an option or a positional argument SHALL name the value
the user is being asked for and nothing beyond it: not how the value travels once the CLI
holds it, not how the server treats it afterwards, and not an example of a shape the
placeholder or the flag name already carries. An example SHALL NOT be given where it would
narrow what the option in fact accepts. Where an option takes one of a closed set of values,
the description SHALL name every value of that set or none of them. Two commands that ask
for the same kind of value SHALL describe it in the same words.

#### Scenario: A value the CLI only passes on

- **WHEN** an option hands its value to the server untouched
- **THEN** its description names the value, and says nothing about the handing on

#### Scenario: An example that would mislead

- **WHEN** an option accepts a family of forms, such as a time written locally or with a zone
- **THEN** its description names the family, and does not show one member of it as though it
  were the shape required

#### Scenario: A closed set of values

- **WHEN** an option accepts only the values of a fixed set, such as a sort field or a sort
  direction
- **THEN** its description names all of them, never a few of them followed by an ellipsis

#### Scenario: The same value in two commands

- **WHEN** two commands take the same kind of value, such as a branch that may be named by
  its alias or a page of results
- **THEN** both describe it with the same words

## MODIFIED Requirements

### Requirement: Coordinates

The CLI SHALL take a latitude and a longitude as two options of their own, each holding one
number of degrees, and SHALL reject a value that is not a finite number or that falls
outside the range of its own axis, naming the axis that failed.

#### Scenario: Well formed coordinates

- **WHEN** the user passes a latitude and a longitude as separate options
- **THEN** the CLI reads each as a number of degrees and sends the point as one pair

#### Scenario: A negative degree

- **WHEN** a coordinate value begins with a minus sign
- **THEN** it is read as a negative number of degrees, and the command does not have to
  accept unknown options for that to work

#### Scenario: Out of range or malformed

- **WHEN** a value is not a finite number, or a latitude falls outside -90..90, or a
  longitude outside -180..180
- **THEN** the command fails naming the axis that failed and the range it expected

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

- **WHEN** a JSON timeslot object carries `start` or `end` as strings
- **THEN** the CLI converts those two fields the same way and leaves every other field untouched
