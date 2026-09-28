## ADDED Requirements

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
