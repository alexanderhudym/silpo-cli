## MODIFIED Requirements

### Requirement: Delivery types for a point

The CLI SHALL report the delivery types available for a point, and SHALL take that point as
a latitude and a longitude passed as two options of their own, as every other command takes
its inputs.

#### Scenario: Coordinates in, delivery types out

- **WHEN** the user passes a latitude and a longitude as separate options
- **THEN** the CLI asks the server which delivery types serve that point

#### Scenario: Negative coordinates

- **WHEN** a coordinate begins with a minus sign
- **THEN** it is read as a negative number of degrees rather than as an unknown flag, and the
  command accepts no unknown option in order to allow it
