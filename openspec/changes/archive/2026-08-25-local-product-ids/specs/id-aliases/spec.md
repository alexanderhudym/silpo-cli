## MODIFIED Requirements

### Requirement: One alias per entity value

The CLI SHALL identify an aliased value by the entity it belongs to, drawn from a fixed set of entities shared by every command, so that one uuid carries one alias no matter which command printed it or which field name it arrived under. An entity named by a local number of its own SHALL NOT belong to that set.

#### Scenario: Same uuid under different field names

- **WHEN** the same cart uuid arrives as `shoppingCartId` in one payload and as `id` in another
- **THEN** both render as the same alias

#### Scenario: Same uuid in different commands

- **WHEN** two commands print the same order uuid
- **THEN** both print the same alias

#### Scenario: Different entities of one payload

- **WHEN** a payload carries an order uuid and an address uuid
- **THEN** each is aliased under its own entity, and the entity recorded for an address id is the address rather than the order that carried it

#### Scenario: An entity named by a local number

- **WHEN** a payload carries a branch uuid, a company uuid or a product uuid
- **THEN** no alias is assigned, because those are named by the local numbers recorded for them

#### Scenario: Unknown field

- **WHEN** a uuid arrives under a field name that belongs to no entity in the set
- **THEN** it is printed unchanged and no alias is assigned
