## MODIFIED Requirements

### Requirement: Call breakdown

The CLI SHALL report, on request and separately from the totals, one entry per recorded
invocation, ordered by the tokens saved descending, in the composed form.

#### Scenario: One entry per invocation

- **WHEN** the user asks for the call breakdown
- **THEN** each entry opens with the command path and its positional arguments on a line of
  its own, lists below that the options the invocation was called with, one per line as flag
  and value, and closes with a single line reporting the total saved, the call count, the
  average saved per call, and the average saved share

#### Scenario: Entries are separated by an empty line

- **WHEN** more than one invocation is reported
- **THEN** exactly one empty line separates neighbouring entries, and no entry opens with a
  marker

#### Scenario: The breakdown carries no heading

- **WHEN** the call breakdown is printed
- **THEN** the first line is the first entry's command path, with no title above it

#### Scenario: Invocation without options

- **WHEN** an invocation carries no options
- **THEN** its entry holds no option list at all

#### Scenario: Long values are never shortened

- **WHEN** an invocation carries a positional argument or an option value of any length
- **THEN** it is reported in full, because no line is bound to a width

#### Scenario: Nothing recorded

- **WHEN** the user asks for the call breakdown before any call was recorded
- **THEN** the CLI says no calls have been recorded yet

#### Scenario: Division by zero

- **WHEN** an invocation's raw payload token count is zero
- **THEN** the saved share is reported as zero percent rather than failing

### Requirement: Gain totals

The CLI SHALL report the total savings across every recorded call, in the composed form and
with no heading above it.

#### Scenario: Totals

- **WHEN** the user asks for the gain report and calls have been recorded
- **THEN** the CLI prints the number of calls, the total raw payload tokens, the total printed
  tokens, and the tokens saved with the saved share as a percentage, one fact per line

#### Scenario: No heading

- **WHEN** the gain report is printed
- **THEN** the first line is the first fact, with no title above it

#### Scenario: Nothing recorded

- **WHEN** the user asks for the gain report before any call was recorded
- **THEN** the CLI says no calls have been recorded yet
