## ADDED Requirements

### Requirement: A one-value answer is printed as that value alone

Where a command's whole answer is a single value, it SHALL print that value and nothing else: no
key, no label, no surrounding record. A caller reading such a command reads it to hand the value
straight to the next command, and a label makes the output something to parse rather than
something to use.

This SHALL NOT extend to a command that answers with a record which happens to hold one field
today. The test is whether the command could ever have a second thing to say, not how many lines
it prints for one payload.

#### Scenario: The active cart

- **WHEN** the active cart is asked for
- **THEN** its local number is printed on its own, so that substituting the command into the
  next one yields a cart the CLI accepts

#### Scenario: The value still comes back labelled where it is part of a record

- **WHEN** the same local number appears inside a cart snapshot or any other record
- **THEN** it keeps its key, because there it stands beside other fields and the reader needs to
  know which is which

### Requirement: A summary counts what the command printed

Where a command heads its output with a count, that count SHALL describe the result the command
printed. A count the server returned SHALL be shown only where it still describes that result;
where the CLI narrowed, filtered or assembled what it prints, the count SHALL be the CLI's own.
A count of what was asked for SHALL NOT be presented as a count of what was found, because a
caller reads the head of the output to decide whether to read the rest.

#### Scenario: The command filtered what the server returned

- **WHEN** a command matches three records out of a listing the server reports a thousand for
- **THEN** the summary states three, and the thousand is not shown beside it

#### Scenario: A page of a larger listing

- **WHEN** a command prints one page of a listing the server pages
- **THEN** the summary may state both what this page holds and the total available, because
  both describe the same set and the second tells the caller there is more

#### Scenario: Asked for many, found none

- **WHEN** a command is asked about several records and the server offers a result for none of
  them
- **THEN** the summary says that none were found, rather than counting the records that were
  asked about
