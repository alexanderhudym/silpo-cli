## MODIFIED Requirements

### Requirement: Address and Nova Poshta output

The address lookup SHALL print each candidate as a record holding the parts of the place and
its coordinates under one key. The settlement lookup SHALL print each settlement's local
number, title, area and region. The office lookup SHALL print each office's local number and
its coordinates under their keys, and its title on a line of its own carrying no key, in that
order. The office's number and its address SHALL NOT be printed, because the number stands
inside the title and the address is the title's street part behind the name of the
settlement the caller already named. The office's working status SHALL be printed only when
the server reports the office as anything other than working.

#### Scenario: An address candidate

- **WHEN** an address string resolves to candidates
- **THEN** each candidate takes a record of its own, with its coordinates on one line

#### Scenario: A settlement

- **WHEN** settlements are printed
- **THEN** each shows its local number, title and area, and its region where it has one, so the
  number can be passed to the office lookup

#### Scenario: An office record

- **WHEN** offices are printed
- **THEN** each office shows its local number and its coordinates under their keys and then its
  title with no key, and shows neither its number nor its address

#### Scenario: The office number stays inside the title

- **WHEN** an office is printed
- **THEN** the number the carrier gave it appears only inside the title, and the local number is
  the only number under a key, so the two cannot be confused for one another

#### Scenario: A working office says nothing about it

- **WHEN** an office reports the working status the server uses for an office in service
- **THEN** no status line appears in that office's record

#### Scenario: An office that is not working

- **WHEN** an office reports any other status
- **THEN** that status is printed on a line of its own under its key, between the
  coordinates and the title, exactly as the server spelled it

#### Scenario: Every office is printed

- **WHEN** a settlement holds thousands of offices
- **THEN** all of them are printed, because the tool offers no way to ask for fewer
