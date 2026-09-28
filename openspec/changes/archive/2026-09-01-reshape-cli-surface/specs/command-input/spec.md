## MODIFIED Requirements

### Requirement: Repeatable options

The CLI SHALL let options that stand for a list be passed several times, collecting the values
in the order they were given. Where the list is the subject of the command rather than a filter
on it, the values SHALL be accepted as bare arguments **instead of** through an option, not as
well: one list written two ways is a choice the caller should not have to make. A command that
accepts its subject positionally SHALL NOT also carry sibling subcommands whose names a bare
argument could be read as.

#### Scenario: Several product queries

- **WHEN** the user writes several product queries
- **THEN** every value reaches the server as one list in that order

#### Scenario: The subject written bare

- **WHEN** the user writes the values the command exists to act on
- **THEN** they are collected in order as bare arguments, the command offering no option that
  would take the same list

#### Scenario: A repeatable option that is not the subject

- **WHEN** a command takes a list that narrows or qualifies what it acts on, such as the
  products a replacement is wanted for or the delivery types a slot listing allows
- **THEN** that list is given through a repeatable option, because the command's subject is
  something else

#### Scenario: A filter is not written bare

- **WHEN** an option narrows a listing rather than naming what the command acts on
- **THEN** it is given through its option alone, so that no bare argument has to be told apart
  from another
