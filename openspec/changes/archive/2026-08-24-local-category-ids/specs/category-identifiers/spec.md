## Purpose

Gives every category a short local number the user can paste into any option that takes a
category, and defines how that number, a remote uuid or a slug is turned into the identifier
the tool behind the option actually requires.

## ADDED Requirements

### Requirement: A category is recorded by its remote identity

The CLI SHALL keep a record of every category it has seen, holding a local number assigned in
the order records are created, the identifier the server uses for that category, and its
slug. A record SHALL NOT exist without the server's identifier, which SHALL name at most one
record. The CLI SHALL create or update a record whenever a payload gives it a category's
server identifier, whichever command printed it, including an identifier a payload names only
as some other category's parent. A record made from an identifier alone SHALL be completed
when a payload later gives that category a slug, and a payload that names an identifier
without a slug SHALL NOT take away the slug a record already holds.

#### Scenario: A category is seen for the first time

- **WHEN** a payload carries a category the CLI holds no record of
- **THEN** a record is created with the next local number, the server's identifier and the
  slug

#### Scenario: A category is seen again

- **WHEN** a payload carries a category the CLI already holds a record of
- **THEN** the existing local number is kept and the record's slug is brought up to date

#### Scenario: A category named only as a parent

- **WHEN** a listing names a category as the parent of another and gives that parent no slug
  of its own
- **THEN** the parent is recorded under its identifier alone, and the slug it is given by a
  later payload is filled in without changing its local number

#### Scenario: Local numbers are not reassigned

- **WHEN** categories are recorded over several commands
- **THEN** each keeps the number it was given, and adding a category never renumbers the ones
  already recorded

### Requirement: Three ways to name a category

An option or a positional argument that takes a category SHALL accept the local number, the
server's identifier, or the slug, and SHALL decide which was given from the shape of the
text: a run of digits is a local number, a value in the form of a uuid is a server
identifier, and anything else is a slug. A value of thirty-two characters carrying no
separators SHALL be read as a slug rather than as a server identifier.

#### Scenario: A local number

- **WHEN** a category argument is given as digits only
- **THEN** it is looked up as a local number

#### Scenario: A server identifier

- **WHEN** a category argument is given in the form of a uuid
- **THEN** it is looked up as the server's identifier

#### Scenario: A slug

- **WHEN** a category argument is neither digits only nor in the form of a uuid
- **THEN** it is looked up as a slug

#### Scenario: A slug that looks like an identifier

- **WHEN** a category argument is thirty-two characters of unseparated text, as some
  categories' slugs are
- **THEN** it is looked up as a slug

### Requirement: A category resolves to the form its call needs

Having found the record, the CLI SHALL pass on whichever of the recorded identifiers the tool
being called requires, so that the same text typed by the user reaches one tool as the
server's identifier and another as the slug.

#### Scenario: A call that takes the server's identifier

- **WHEN** a resolved category is passed to a call that names a category by the server's
  identifier
- **THEN** the recorded identifier is sent

#### Scenario: A call that takes the slug

- **WHEN** a resolved category is passed to a call that names a category by its slug
- **THEN** the recorded slug is sent

### Requirement: An unrecorded slug is looked up

Where a category argument was read as a slug and no record matches it, the CLI SHALL ask the
server for that category and record what it returns, together with every ancestor the answer
names, before continuing. The lookup SHALL be made without requiring the user to supply a
delivery type.

#### Scenario: The server knows the slug

- **WHEN** a category argument names a slug the CLI holds no record of
- **THEN** the CLI fetches that category, records it and its ancestors, and the command
  continues with the resolved identifier

#### Scenario: The lookup asks for no delivery type

- **WHEN** the CLI fetches a category to fill a gap
- **THEN** it does so without a delivery type from the user, in a command that offers one and
  in a command that does not

### Requirement: An unresolved category fails the command

Where a category argument matches no record and cannot be resolved against the server, the
CLI SHALL fail the command, naming the value it could not resolve, and SHALL NOT call the
tool with the text as typed.

#### Scenario: A local number nothing was recorded under

- **WHEN** a category argument is digits that match no record
- **THEN** the command fails naming the value, and no tool is called

#### Scenario: A slug the server does not know

- **WHEN** a category argument names a slug that neither the records nor the server resolve
- **THEN** the command fails naming the value, and the call it was meant for is not made

#### Scenario: An identifier nothing was recorded under

- **WHEN** a category argument is in the form of a uuid that matches no record
- **THEN** the command fails naming the value, and no tool is called
