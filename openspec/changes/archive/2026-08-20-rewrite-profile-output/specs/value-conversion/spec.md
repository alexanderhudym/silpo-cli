## Purpose

Holds the conversions that a value needs in both of its directions — reading it from
something a user typed, and writing it for display — together, one subject per module, so
that the two halves of a round trip cannot drift apart and neither half depends on the
command line parser or on how anything is stored.

## ADDED Requirements

### Requirement: Both directions of a subject live together

Each converted subject SHALL offer both of its directions from one place: reading a value
that arrived as text, and writing a value for display. A direction SHALL NOT be defined
in terms of the other's caller, and neither direction SHALL depend on the command line
parser or on a storage layer.

#### Scenario: A round trip returns the value it started from

- **WHEN** a value is read from text and then written back for display
- **THEN** the result is the same value the reading started from, for every value that
  survives the subject's own rounding

#### Scenario: One subject is not split across modules

- **WHEN** a caller needs either direction of a subject
- **THEN** both are reachable from the same place, and no caller has to assemble a
  direction out of parts that live apart

### Requirement: Absolute instants and local wall clock time

One rule SHALL settle every time the CLI handles: a time carrying a zone or an offset names
an absolute instant, and a time carrying neither is local to the machine. Both directions
SHALL follow from that one rule rather than from the caller saying which shape it holds.
Reading yields an absolute instant in UTC; writing yields local wall clock time to the
minute. Both directions SHALL be named for the zone they produce rather than for the caller
that wanted it, since UTC is a fact about the value and "the server" is not. Whether a piece
of text carries a zone SHALL be answerable on its own, for a caller that must decide whether
the text is a time at all before touching it.

#### Scenario: Local wall clock time is read as an instant

- **WHEN** a time is given as a local wall clock time
- **THEN** it is read as the absolute instant that wall clock time names in the machine's
  own zone

#### Scenario: An absolute instant is read unchanged

- **WHEN** a time is given as an absolute instant, whatever offset it carries
- **THEN** it is read as that same instant, expressed in UTC

#### Scenario: An instant is written in local time

- **WHEN** an absolute instant is written for display
- **THEN** it is shown as local wall clock time to the minute, with no zone or offset
  attached

#### Scenario: A time that names no zone is already local

- **WHEN** a value names a date and a time but no zone, which is what the server sends for
  the moment a household member joined
- **THEN** the same rule reads it as local and writing it returns it unmoved, so one
  conversion covers both shapes and no caller has to tell them apart

#### Scenario: A plain date is not an instant

- **WHEN** a value such as a birthday carries a date but no time of day
- **THEN** it is not offered to either direction at all, and the command that shows it
  prints it exactly as it is

#### Scenario: Text that is not a time

- **WHEN** text that names no instant is offered to either direction
- **THEN** the conversion raises rather than inventing a time or answering nothing, because
  every caller has already established that it is holding a time

#### Scenario: Asking whether text carries a zone

- **WHEN** a caller holds text it has no reason to believe is a time at all
- **THEN** it can ask whether the text carries a zone, and the answer follows from the text
  alone, so that a bare number or a plain date is not taken for a time

### Requirement: Coordinates

The CLI SHALL treat a latitude and a longitude as two separate subjects, each read and
range-checked on its own, and SHALL build the reading of a `lat,lng` pair out of those two
readings. A coordinate written for display SHALL be rounded to six decimal places with
trailing zeros dropped, accepting the number form and the text form alike, because the
tool contracts disagree about which they return.

#### Scenario: A latitude out of range

- **WHEN** a latitude outside -90 to 90 is read
- **THEN** the conversion reports that it read nothing, distinguishably from a longitude
  failing

#### Scenario: A longitude out of range

- **WHEN** a longitude outside -180 to 180 is read
- **THEN** the conversion reports that it read nothing, distinguishably from a latitude
  failing

#### Scenario: A pair is read as two axes

- **WHEN** a pair separated by a comma or by whitespace is read, latitude first
- **THEN** each half is read as its own axis, and the pair fails when either half fails
  or when the text does not hold exactly two parts

#### Scenario: A coordinate is written rounded

- **WHEN** a coordinate is written for display, whether it arrived as a number or as text
- **THEN** it is rounded to six decimal places and trailing zeros are dropped

### Requirement: Aliases

The CLI SHALL offer both directions of an alias from one place: turning a value into the
alias that stands for it, assigning one when the value has none, and turning an alias back
into the value it stands for. The shape of an alias as text — its marker and what may
follow it — SHALL be defined alongside those two directions and SHALL NOT depend on
anything being stored.

#### Scenario: A value becomes an alias

- **WHEN** a value is converted for display under a given entity and field
- **THEN** the alias recorded for that value is returned, and one is assigned first when
  the value has none

#### Scenario: An alias becomes a value

- **WHEN** an alias is converted back under a given entity and field
- **THEN** the value recorded for it is returned

#### Scenario: Text that is not an alias passes through

- **WHEN** text that does not carry the alias marker is converted back
- **THEN** it is returned exactly as it was given, and nothing is looked up, so a caller
  may offer either form without deciding first which one it holds

#### Scenario: An alias nobody recorded

- **WHEN** text carries the alias marker but no such alias was recorded for that entity
  and field
- **THEN** the conversion reports that it read nothing, distinguishably from text that
  was never an alias

#### Scenario: Recognising an alias

- **WHEN** text is checked for being an alias
- **THEN** the answer follows only from the text's own shape, with nothing read from
  storage

#### Scenario: Storage holds no conversion

- **WHEN** the storage layer is used directly
- **THEN** it creates, reads back, lists and removes recorded aliases, and performs no
  conversion of its own

### Requirement: Converters do not decide how a failure is presented

A conversion that cannot read its input SHALL NOT choose an exit code, a message addressed
to the user, or the command line parser's own error type. It SHALL report the failure in
whichever way its own subject makes clearest: returning nothing where a caller must be free
to offer either form, naming which part failed where there is more than one part, or
raising where every caller has already established what kind of value it holds. Turning any
of those into a message and an exit SHALL remain the responsibility of the caller that owns
the user interface.

#### Scenario: A failed reading carries no presentation

- **WHEN** a conversion is given input it cannot read
- **THEN** however it reports that, it names no exit code and no wording for the user, and
  the caller decides what the user is told

#### Scenario: The user still learns what was expected

- **WHEN** a command line argument fails to convert
- **THEN** the command still fails naming what it expected, as it did before, including
  which of a coordinate's two axes was at fault
