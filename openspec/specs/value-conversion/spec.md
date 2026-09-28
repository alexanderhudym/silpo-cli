# value-conversion Specification

## Purpose

Holds the conversions that a value needs in both of its directions — reading it from
something a user typed, and writing it for display — together, one subject per module, so
that the two halves of a round trip cannot drift apart and neither half depends on the
command line parser or on how anything is stored.

## Requirements

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

### Requirement: Latitude and longitude

The CLI SHALL treat a latitude and a longitude as two separate subjects, each read and
range-checked on its own, and SHALL NOT hold a reading that takes both at once. A coordinate
written for display SHALL be rounded to six decimal places with trailing zeros dropped,
accepting the number form and the text form alike, because the tool contracts disagree about
which they return.

#### Scenario: A latitude out of range

- **WHEN** a latitude outside -90 to 90 is read
- **THEN** the conversion reports that it read nothing, distinguishably from a longitude
  failing

#### Scenario: A longitude out of range

- **WHEN** a longitude outside -180 to 180 is read
- **THEN** the conversion reports that it read nothing, distinguishably from a latitude
  failing

#### Scenario: A point is two readings

- **WHEN** a caller needs a point rather than one axis
- **THEN** it reads the latitude and the longitude separately and puts them together itself,
  because the conversion layer offers no reading of a pair

#### Scenario: A coordinate is written rounded

- **WHEN** a coordinate is written for display, whether it arrived as a number or as text
- **THEN** it is rounded to six decimal places and trailing zeros are dropped

### Requirement: Whole numbers and decimals

Whole numbers and decimals SHALL be one converted subject rather than two, each reading
written out on its own terms rather than expressed through the other, so that neither has
to be understood by following a chain. A decimal SHALL be an optional minus sign, digits,
and at most one fractional part. A whole number SHALL be the same with no fractional part
or one made only of zeros, and SHALL be accepted only where the value can be held exactly.
Everything the whole-number reading accepts the decimal reading SHALL accept too, and that
agreement SHALL be pinned by a test rather than by one calling the other. The conversion
SHALL read the text exactly as given: it SHALL NOT absorb surrounding blanks, and it SHALL
NOT read a number out of the leading part of text whose remainder it cannot read. Trimming
text before offering it to a conversion is the caller's business, so that asking whether
text is a number and converting it answer alike.

#### Scenario: A whole number is read on its own terms

- **WHEN** text is read as a whole number
- **THEN** it is accepted where it carries no fractional part or one made only of zeros,
  and only where the value it names can be held exactly

#### Scenario: The two readings do not disagree

- **WHEN** text is accepted as a whole number
- **THEN** it is accepted as a decimal too, so that two separately written forms cannot
  drift apart unnoticed

#### Scenario: Text that parses only in part

- **WHEN** text carries digits followed by anything the form does not allow, such as an
  exponent, a hexadecimal prefix, a digit separator, or trailing letters
- **THEN** the conversion reads nothing, rather than the number the leading digits spell

#### Scenario: Blank text is not zero

- **WHEN** text is empty or holds only blanks
- **THEN** the conversion reads nothing

#### Scenario: Surrounding blanks are not absorbed

- **WHEN** text carries a number with blanks around it
- **THEN** the conversion reads nothing, and asking whether that same text is a number
  answers no, so the two agree

#### Scenario: Asking and converting agree

- **WHEN** a caller asks whether text names a number of either kind
- **THEN** the answer holds exactly when the matching conversion reads something, because
  the question is answered by the conversion rather than beside it

#### Scenario: A whole number that cannot be held exactly

- **WHEN** text names a whole number too large to be held exactly
- **THEN** the conversion reads nothing, rather than a rounded value

### Requirement: Converters do not decide how a failure is presented

A conversion that cannot read its input SHALL NOT choose an exit code or the command line
parser's own error type. Naming what was expected is part of converting and SHALL stay with
the conversion; deciding how that name reaches the user is not. It SHALL report the failure
in whichever way its own subject makes clearest: returning nothing where a caller must be
free to offer either form, naming which part failed where there is more than one part, or
raising where every caller has already established what kind of value it holds. Turning any
of those into something printed and an exit SHALL remain the responsibility of the caller
that owns the user interface, which is the single handler surrounding the whole parse rather
than each command in turn.

#### Scenario: A failed reading carries no presentation

- **WHEN** a conversion is given input it cannot read
- **THEN** however it reports that, it names no exit code and reaches for no parser error
  type, and the caller decides how what it said reaches the user

#### Scenario: The user still learns what was expected

- **WHEN** a command line argument fails to convert
- **THEN** the command still fails naming what it expected, as it did before, including
  which of a coordinate's two axes was at fault

#### Scenario: A converter takes no part in the command line

- **WHEN** a conversion needs to report that it failed
- **THEN** it does so without receiving the command it was called for, because presenting the
  failure is not its concern

### Requirement: A conversion carries its own wording and is not wrapped to reword it

Where a conversion raises rather than answering nothing, the sentence the user reads SHALL
live in that conversion, not in a wrapper whose only work is to catch it and raise a better
one. A raising wrapper SHALL exist only where the conversion it wraps answers nothing,
because only there is there a nothing that someone must turn into a failure. Naming what
was expected is part of converting, and a second function per subject that adds only a
sentence SHALL NOT be introduced.

#### Scenario: A conversion that already raises is called directly

- **WHEN** a conversion reports failure by raising
- **THEN** its callers call it as it stands, and no wrapper is placed in front of it to
  replace its wording

#### Scenario: The time conversion names both forms it accepts

- **WHEN** text that names no time is read as a time
- **THEN** the conversion itself raises saying a time was expected, written either locally
  or with a zone, and shows one written form

#### Scenario: A raising wrapper answers for a conversion that answers nothing

- **WHEN** a subject's conversion reports failure by answering nothing, as a coordinate or
  a number does
- **THEN** one companion in that same subject turns the nothing into a failure naming what
  was expected, and that companion is the only wrapper the subject has

#### Scenario: A value with more states than present and absent

- **WHEN** an option can be absent, explicitly cleared, or set to a value, as a clearable
  promo code or bonus amount is
- **THEN** the three are told apart where the tool call is built, and no conversion is
  given a shape that admits all three at once

### Requirement: Nothing read and nothing to read are different answers

A conversion SHALL distinguish having been given input it cannot read from its caller
having had no input to offer. The two SHALL NOT be reported as the same answer, because
only the second may reach a tool call as an argument left out; the first is a failure the
user is told about. A conversion SHALL take only the text it is to read, leaving the
question of whether there was any text to the caller that holds the option and already
knows whether it was passed. That question SHALL be settled where the tool call is built,
in the open, and SHALL NOT be delegated to a wrapper that a conversion is handed to.

#### Scenario: Unreadable input is not silently absent

- **WHEN** a caller offers a conversion text it cannot read
- **THEN** the answer differs from the one given when the caller had nothing to offer, and
  it cannot be mistaken for the argument having been left out

#### Scenario: An argument that was never given

- **WHEN** an option is not passed at all
- **THEN** the tool call leaves that argument out, and no conversion was asked to read
  anything

#### Scenario: A conversion is not asked whether there was input

- **WHEN** a conversion is defined for a subject
- **THEN** it takes the text to read and nothing wider, so that absence is settled before
  it is called rather than inside it

#### Scenario: An argument that cannot be absent is not checked for absence

- **WHEN** the option or argument a conversion reads is one the parser requires
- **THEN** the conversion is called on it plainly, with no check for something the caller
  has already been guaranteed

#### Scenario: Absence is told from emptiness

- **WHEN** a caller decides whether it was given a value
- **THEN** it asks whether the value is absent rather than whether it is empty, so that a
  value the conversion would refuse still reaches the conversion and still fails

### Requirement: Groups of boolean flags

A group of boolean flags SHALL be converted into the names of the raised flags alone, comma
separated, with the prefix the group shares stripped from each name. A group with no raised
flag SHALL convert to nothing, so its caller can leave the field out.

#### Scenario: Only what is raised

- **WHEN** a group of flags is converted
- **THEN** the names of the flags set to true are listed, comma separated, and the flags set
  to false are absent

#### Scenario: A shared prefix is stripped

- **WHEN** every name in the group opens with the same prefix
- **THEN** that prefix is removed from each name, and the first letter of what remains is
  lowercased

#### Scenario: Nothing raised

- **WHEN** no flag in the group is true
- **THEN** the conversion yields nothing at all

### Requirement: Delivery cost tiers

A list of delivery cost tiers SHALL be converted into one value per tier, each naming the cost
and the order total it begins at, the tiers comma separated. An empty list SHALL convert to
nothing.

#### Scenario: A tier reads as cost and threshold

- **WHEN** a cost tier carries a cost and the order total it starts from
- **THEN** it is converted into a single value naming both

#### Scenario: Several tiers

- **WHEN** a slot carries more than one tier
- **THEN** they are joined by commas in the order the payload gave them

#### Scenario: No tiers

- **WHEN** the list of tiers is empty
- **THEN** the conversion yields nothing at all
