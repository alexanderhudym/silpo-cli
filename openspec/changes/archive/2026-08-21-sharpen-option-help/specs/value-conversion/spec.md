## REMOVED Requirements

### Requirement: Coordinates

**Reason**: The pair reading it required existed for one caller, the positional `<lat,lng>`
argument of `delivery types`. That argument becomes two options, each read on its own axis,
so nothing types a pair any more and nothing calls the pair reading.

**Migration**: A caller that needs a point reads a latitude and a longitude separately, each
through its own axis reading, as `delivery types` now does. The two axis readings and the
display rounding survive under the requirement added below.

## ADDED Requirements

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
