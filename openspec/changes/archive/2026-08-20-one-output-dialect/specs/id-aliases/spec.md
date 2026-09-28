## MODIFIED Requirements

### Requirement: Alias inspection

The CLI SHALL list every recorded alias grouped by the entity and field it stands for, and
SHALL look one up either by its handle or by the entity, field, and value it stands for,
answering a lookup with a bare value.

#### Scenario: List

- **WHEN** the user asks for the aliases
- **THEN** the CLI names each entity and field on a line of its own and prints beneath it, one
  per line and indented, every handle recorded for that pair with the value it stands for

#### Scenario: Order of the listing

- **WHEN** the aliases are listed
- **THEN** the groups follow the order in which each entity and field first had a handle
  assigned, and the handles inside a group follow the order they were assigned in

#### Scenario: The sequence number is not printed

- **WHEN** the aliases are listed
- **THEN** the number the CLI counts handles with does not appear, because no command accepts
  it and the handle already identifies the record

#### Scenario: Lookup by handle

- **WHEN** the user passes a handle
- **THEN** the CLI prints the value that handle stands for, alone on a line and with no key, or
  fails when no such handle exists

#### Scenario: Lookup by triple

- **WHEN** the user passes an entity, a field, and a value
- **THEN** the CLI prints the handle for that value, alone on a line and with no key, assigning
  one first when that value has none

#### Scenario: Incomplete triple

- **WHEN** the user passes an entity without both a field and a value
- **THEN** the CLI fails explaining that it expects either a handle or an entity with a field
  and a value
