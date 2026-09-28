## MODIFIED Requirements

### Requirement: Recording a call

The CLI SHALL record, for each command invocation that renders a tool payload, the invocation exactly as the user typed it, the tool name, the token count of the raw payload, and the token count of the printed text.

#### Scenario: Rendered call

- **WHEN** a command calls a tool and prints its output
- **THEN** one record is stored with both token counts, measured with the same tokenizer

#### Scenario: Command identity

- **WHEN** the record is stored
- **THEN** the command is identified by its full subcommand path plus the positional arguments exactly as the user typed them, before any alias was resolved

#### Scenario: Option identity

- **WHEN** the record is stored
- **THEN** only options the user actually passed on the command line are recorded, each as its flag and the value as typed, in the order they were typed, and an option that takes no value is recorded with no value

#### Scenario: Values are recorded as typed

- **WHEN** an option carries a structured value such as JSON, or an alias standing for a uuid
- **THEN** the text the user typed is recorded, never the value the parser produced from it

#### Scenario: Repeated option

- **WHEN** the user passes the same option more than once
- **THEN** each occurrence is recorded separately, in the order they were typed

## REMOVED Requirements

### Requirement: Gain report

**Reason**: The report is split in two. Totals and the per-invocation breakdown are now separate requirements, because the breakdown moved to its own subcommand so that it is free to render without shortening anything.

**Migration**: The totals are covered by "Gain totals" and keep their wording and their empty-history behaviour. The breakdown is covered by "Call breakdown", which carries the division-by-zero guarantee over unchanged.

## ADDED Requirements

### Requirement: Gain totals

The CLI SHALL report the total savings across every recorded call.

#### Scenario: Totals

- **WHEN** the user asks for the gain report and calls have been recorded
- **THEN** the CLI prints the number of calls, the total raw payload tokens, the total printed tokens, and the tokens saved with the saved share as a percentage

#### Scenario: Nothing recorded

- **WHEN** the user asks for the gain report before any call was recorded
- **THEN** the CLI says no calls have been recorded yet

### Requirement: Grouping recorded calls

The CLI SHALL treat two recorded calls as the same invocation when they share the command path, the positional arguments, and the same options carrying the same values, however the options were ordered on the command line. Calls that differ in any option or in any option value SHALL be kept apart, because the payloads they produce are not comparable in size.

#### Scenario: Options written in a different order

- **WHEN** the same command is called twice with the same options and the same values, written in a different order
- **THEN** both calls count towards one invocation

#### Scenario: Wording of an invocation

- **WHEN** an invocation is reported
- **THEN** its options are shown in the order they were typed the first time that invocation was recorded

#### Scenario: Different values stay apart

- **WHEN** two calls share a command path, positional arguments, and option flags, but differ in one option's value
- **THEN** they are reported as two invocations

### Requirement: Call breakdown

The CLI SHALL report, on request and separately from the totals, one entry per recorded invocation, ordered by the tokens saved descending.

#### Scenario: One entry per invocation

- **WHEN** the user asks for the call breakdown
- **THEN** each entry opens with the command path and its positional arguments, lists below that the options the invocation was called with, one per line as flag and value, and closes with the call count, the total saved, the average saved per call, and the average saved share

#### Scenario: Invocation without options

- **WHEN** an invocation carries no options
- **THEN** its entry holds no option list at all

#### Scenario: Long values are never shortened

- **WHEN** an invocation carries a positional argument or an option value long enough to distort a table
- **THEN** it is reported in full

#### Scenario: Nothing recorded

- **WHEN** the user asks for the call breakdown before any call was recorded
- **THEN** the CLI says no calls have been recorded yet

#### Scenario: Division by zero

- **WHEN** an invocation's raw payload token count is zero
- **THEN** the saved share is reported as zero percent rather than failing
