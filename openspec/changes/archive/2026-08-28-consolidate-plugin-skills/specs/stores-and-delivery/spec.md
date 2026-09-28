## MODIFIED Requirements

### Requirement: Delivery slots

The CLI SHALL list the delivery time slots of a branch, narrowed by delivery type and a time window,
and capped in count. The branch SHALL be named by a required option, as it is on every other command
scoped to a branch. The command SHALL NOT accept the branch as a positional argument.

#### Scenario: Branch by handle or id

- **WHEN** the user names the branch by its local number
- **THEN** the number is resolved to the branch id before the call, and an id in the form of a uuid is passed through as typed

#### Scenario: Branch named by option

- **WHEN** the user names the branch
- **THEN** it is given through the same option the branch-scoped catalogue and product commands use

#### Scenario: Branch left out

- **WHEN** the branch option is absent
- **THEN** the command fails before any tool is called

#### Scenario: Branch given positionally

- **WHEN** the branch is written as a bare argument rather than through the option
- **THEN** the command fails rather than reading it as the branch

#### Scenario: Window in local time

- **WHEN** the user passes the window bounds as local wall clock times
- **THEN** they are converted to absolute instants before the call

#### Scenario: Several delivery types

- **WHEN** the user repeats the delivery type option
- **THEN** all of them travel in one call
