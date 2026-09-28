## MODIFIED Requirements

### Requirement: Recording a call

The CLI SHALL record, for each command invocation that renders a tool payload, the invocation as the
argument parser read it, the tools it rendered, the token count of the raw payloads, and the token
count of the printed text. The recorded invocation SHALL be reconstructed from what the parser holds
rather than by reading the raw command line a second time. A command that renders more than one
payload SHALL be recorded once, against the sum of those payloads, because the unit the report
compares is one command against the text it printed. A tool call the CLI makes on its own behalf,
whose payload no command renders — seeding the delivery context, creating a cart, repairing a time
slot, reducing a quantity, or a cart read that a later one supersedes — SHALL NOT be recorded, and
the report SHALL say that it measures rendering rather than the whole cost of a session.

#### Scenario: Rendered call

- **WHEN** a command calls a tool and prints its output
- **THEN** one record is stored with both token counts, measured with the same tokenizer

#### Scenario: A command that renders a write and the cart it produced

- **WHEN** a cart write prints the server's summary and the cart snapshot beneath it
- **THEN** one record is stored, naming both tools, whose raw count is the two payloads together and
  whose text count is everything the command printed

#### Scenario: A call the CLI makes for itself

- **WHEN** the CLI seeds the context, creates a cart, repairs a time slot or re-sends a reduced
  quantity
- **THEN** no record is stored for it, because no printed text corresponds to it

#### Scenario: The report says what it covers

- **WHEN** the totals are reported
- **THEN** they are described as covering the payloads commands rendered, so the figure is not read
  as the full traffic of a session

#### Scenario: Command identity

- **WHEN** the record is stored
- **THEN** the command is identified by its full subcommand path plus the positional arguments as the
  user typed them, before any alias was resolved

#### Scenario: Option identity

- **WHEN** the record is stored
- **THEN** only options the user actually passed on the command line are recorded, each as its long
  flag and the value as typed, and an option that takes no value is recorded with no value

#### Scenario: Values are recorded as typed

- **WHEN** an option carries a structured value such as JSON, or an alias standing for a uuid
- **THEN** the text the user typed is recorded, never the value the command converted it into

#### Scenario: A short flag is recorded under its long name

- **WHEN** an option is passed by its short flag
- **THEN** it is recorded under the long flag, so that the same invocation typed either way is one
  entry in the report rather than two

#### Scenario: Repeated option

- **WHEN** the user passes the same option more than once
- **THEN** each occurrence is recorded separately, in the order they were given, grouped where that
  option first appeared
