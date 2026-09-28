## MODIFIED Requirements

### Requirement: Arguments reach the command as typed

An argument SHALL reach the command holding the text the user typed. Turning that text
into what a tool call needs SHALL be done by the command, where the call is built, and
SHALL NOT replace the argument on the way in. Gathering a repeatable option into a list is
not a conversion and MAY still happen as the argument is read.

#### Scenario: The typed text survives the parse

- **WHEN** a command receives an argument that needs converting, such as a local number, a local
  time, a coordinate pair, or a JSON structure
- **THEN** the value it receives is the text as typed, and the converted form exists only
  where the command builds its tool call

#### Scenario: A repeatable option still gathers

- **WHEN** an option that stands for a list is passed several times
- **THEN** the values are gathered into one list in the order they were given, each still
  as typed

#### Scenario: A conversion that fails still fails the command

- **WHEN** an argument cannot be converted
- **THEN** the command fails naming what it expected, as it did when the conversion
  happened during parsing, and no tool is called

## REMOVED Requirements

### Requirement: Short ids in arguments

**Reason**: The requirement was written around two coexisting short forms — an alias for some
entities, a local number for others — and around the field map that told the JSON walker which
was which. Neither survives: every entity is named by a local number, and a command resolves the
fields it declares rather than handing a map to a walker.

**Migration**: See the added requirement `Local numbers in arguments`, which states the single
form and how a JSON argument is resolved. The scenarios that ruled the alias marker out for
categories, branches, companies and products are no longer needed, because no entity is named by
a marker for them to be ruled out of.

## ADDED Requirements

### Requirement: Local numbers in arguments

The CLI SHALL accept the local number recorded for an entity wherever it accepts that entity's
remote uuid, in scalar arguments and inside JSON arguments alike, and SHALL resolve that number
against the records of the entity the command names for that argument. A field's name SHALL NOT
be used to work out which entity a value belongs to. A uuid SHALL be recognised by its own shape
and sent unchanged. Every other form SHALL be resolved by looking it up rather than by deciding
in advance what kind of identifier it must be, so that a run of digits the CLI never issued is
not a local number and is offered to whatever lookup that entity has.

#### Scenario: Known local number

- **WHEN** the user passes a local number for a cart id
- **THEN** the CLI substitutes the uuid recorded under it

#### Scenario: Unknown local number

- **WHEN** the number is not recorded for that entity and the entity has no way to be looked up
- **THEN** the command fails saying no such entity exists and naming the entity it was looked up
  under

#### Scenario: A uuid

- **WHEN** the value has the shape of a uuid
- **THEN** the CLI passes it through unchanged

#### Scenario: The alias marker means nothing

- **WHEN** an argument receives text beginning with `@`
- **THEN** it is read as ordinary text of no known identifier form, and fails or passes through
  on that basis alone

#### Scenario: Identifiers inside a JSON argument

- **WHEN** a JSON argument carries identifiers under fields that hold uuids, such as the products
  of a cart update or the office of a cart address
- **THEN** the command resolves each of those fields under the entity it declared for it and
  builds the call from the resolved values

#### Scenario: Fields of a JSON argument that hold no id

- **WHEN** a JSON argument carries values under fields the command declared no entity for
- **THEN** those values reach the call as they were given

#### Scenario: A JSON argument of mixed forms

- **WHEN** one entry of a JSON argument names a product, a branch and a company by their local
  numbers and a uuid under another field, as a cart update does
- **THEN** each field is read under the form its entity is named by, and all of them reach the
  call as the values they stand for

#### Scenario: Every uuid-bearing option accepts a local number

- **WHEN** an option or a positional argument takes an entity the CLI records
- **THEN** it accepts the local number of that entity as readily as the uuid, under the entity
  the command named for that argument

#### Scenario: One entry of a JSON argument settles its own context

- **WHEN** an entry of a JSON argument carries both a product and the branch it belongs to
- **THEN** the branch is read before the product, so resolving the product asks under the branch
  that entry names rather than under none

### Requirement: A failed argument is reported in one place

A conversion or a resolution that cannot read its input SHALL report the failure by raising,
and SHALL NOT write to the user or choose an exit status. The CLI SHALL turn any such failure
into one line on standard error and a failing exit status, in the single place that already
surrounds the whole parse.

#### Scenario: One wording, one exit

- **WHEN** any argument fails to convert or resolve
- **THEN** the CLI writes the failure as one line on standard error and exits with a failing
  status, whichever command and whichever argument it came from

#### Scenario: No usage hint for an entity that was not found

- **WHEN** an argument names an entity the CLI cannot resolve
- **THEN** the failure names the entity and the value and nothing else, because the caller made
  no syntax mistake to be shown the usage for
