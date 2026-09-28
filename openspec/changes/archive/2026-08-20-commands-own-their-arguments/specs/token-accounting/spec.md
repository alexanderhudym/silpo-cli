## MODIFIED Requirements

### Requirement: Recording a call

The CLI SHALL record, for each command invocation that renders a tool payload, the invocation as the argument parser read it, the tool name, the token count of the raw payload, and the token count of the printed text. The recorded invocation SHALL be reconstructed from what the parser holds rather than by reading the raw command line a second time.

#### Scenario: Rendered call

- **WHEN** a command calls a tool and prints its output
- **THEN** one record is stored with both token counts, measured with the same tokenizer

#### Scenario: Command identity

- **WHEN** the record is stored
- **THEN** the command is identified by its full subcommand path plus the positional arguments as the user typed them, before any alias was resolved

#### Scenario: Option identity

- **WHEN** the record is stored
- **THEN** only options the user actually passed on the command line are recorded, each as its long flag and the value as typed, and an option that takes no value is recorded with no value

#### Scenario: Values are recorded as typed

- **WHEN** an option carries a structured value such as JSON, or an alias standing for a uuid
- **THEN** the text the user typed is recorded, never the value the command converted it into

#### Scenario: A short flag is recorded under its long name

- **WHEN** an option is passed by its short flag
- **THEN** it is recorded under the long flag, so that the same invocation typed either way is one entry in the report rather than two

#### Scenario: Repeated option

- **WHEN** the user passes the same option more than once
- **THEN** each occurrence is recorded separately, in the order they were given, grouped where that option first appeared
