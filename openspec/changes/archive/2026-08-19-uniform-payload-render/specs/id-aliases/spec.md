## ADDED Requirements

### Requirement: One alias per entity value

The CLI SHALL identify an aliased value by the entity it belongs to, drawn from a fixed set of entities shared by every command, so that one uuid carries one alias no matter which command printed it or which field name it arrived under.

#### Scenario: Same uuid under different field names

- **WHEN** the same product uuid arrives as `productId` in one payload and as `id` in another
- **THEN** both render as the same alias

#### Scenario: Same uuid in different commands

- **WHEN** two commands print the same branch uuid
- **THEN** both print the same alias

#### Scenario: Different entities of one payload

- **WHEN** a payload carries a branch uuid and a company uuid
- **THEN** each is aliased under its own entity, and the entity recorded for a company id is the company rather than the branch that carried it

#### Scenario: Unknown field

- **WHEN** a uuid arrives under a field name that belongs to no entity in the set
- **THEN** it is printed unchanged and no alias is assigned

## MODIFIED Requirements

### Requirement: Alias assignment

The CLI SHALL assign a short handle to a uuid the first time it renders that uuid for an entity, SHALL reuse the same handle on every later encounter, and SHALL number handles in creation order across the whole table rather than per entity or per field.

#### Scenario: New value

- **WHEN** the CLI renders a uuid that has no handle for that entity
- **THEN** it assigns the next handle in sequence and stores the entity, the field, and the value alongside it

#### Scenario: Known value

- **WHEN** the CLI renders a uuid that already has a handle
- **THEN** the existing handle is returned and no new handle is consumed

#### Scenario: Shared numbering

- **WHEN** values of different entities are recorded in turn
- **THEN** they draw from one shared sequence, so no two rows in the table carry the same handle

#### Scenario: Assignment happens while rendering

- **WHEN** a command renders a payload that carries uuids of aliased entities
- **THEN** each of them is assigned a handle as it is printed, with no separate registration step that could be skipped

#### Scenario: Listings register their ids

- **WHEN** a command renders records whose ids are aliased, such as branch ids and company ids in a store listing
- **THEN** every such id in the payload carries a handle in the printed output, whether or not it had one before the command ran

#### Scenario: Values that are not uuids

- **WHEN** a payload carries a numeric id or a slug
- **THEN** no handle is assigned and the value is printed as it is
