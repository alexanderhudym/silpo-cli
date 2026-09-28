## ADDED Requirements

### Requirement: The product index is derivable state, and discarding it is safe

The product index the CLI keeps under its home directory SHALL hold nothing the account cannot supply
again. Deleting it SHALL cost the caller a rebuild and nothing else.

No command SHALL fail because the index is absent, empty or unreadable, and no answer SHALL be wrong
because it was discarded. The CLI SHALL NOT ask the caller to keep a copy of it, SHALL NOT warn about
losing it, and SHALL NOT refuse to run without it. It is written with owner-only permissions, because
it holds what the caller has bought.

#### Scenario: The index is deleted between two runs

- **WHEN** the index is deleted and a command is run
- **THEN** the command completes against the live catalogue, saying the index was unavailable rather
  than reporting a failure

#### Scenario: Nothing treats the index as the caller's data

- **WHEN** the index is discarded, by the caller or by a rebuild
- **THEN** nothing warns of data loss and nothing asks for a confirmation, because every record is
  derivable from the account

#### Scenario: The index carries the caller's own permissions

- **WHEN** the index is created
- **THEN** it is readable and writable by its owner alone, as the credentials and the database are

### Requirement: The index is inspected, rebuilt and explained through its own commands

Hidden state that decides what goes into a cart SHALL be reachable from the command line. The CLI
SHALL offer three verbs over the index and no more.

A report SHALL say how many products the index holds, when it was last built, and where the file is.
A rebuild SHALL discard what the index holds and repopulate it from the account, and SHALL say what
it built. An explanation SHALL take a term and print the candidates it would rank for that term,
the score of each, and the rule that would decide between them — because a wrong automatic choice is
otherwise undebuggable, and a caller told only the answer has no way to find out why.

A rebuild SHALL reach whatever is serving resolution before the command that ordered it returns, so
that every command run afterwards ranks against the rebuilt contents and none ranks against what was
held before. The caller SHALL NOT have to stop, restart or otherwise disturb anything for a rebuild
to be seen, and SHALL NOT be told to.

#### Scenario: The index is reported

- **WHEN** the caller asks what the index holds
- **THEN** the CLI prints how many products it holds, when it was last built, and the path of the
  file

#### Scenario: The index is rebuilt

- **WHEN** the caller asks for a rebuild
- **THEN** the current contents are discarded, the index is repopulated from the account, and the
  command says how many products it now holds

#### Scenario: A rebuild while a background session runs

- **WHEN** the index is rebuilt while a background session is running
- **THEN** the next command resolves against the rebuilt contents rather than against what was held
  before the rebuild, and the caller is not told to stop the session

#### Scenario: A term is explained

- **WHEN** the caller asks why a term resolves as it does
- **THEN** the CLI prints the candidates it ranked for that term, the score of each, and the rule
  that decided

#### Scenario: A term nothing matches

- **WHEN** the caller asks about a term the index holds no candidate for
- **THEN** the CLI says so, rather than printing an empty candidate list without explanation

## MODIFIED Requirements

### Requirement: Home directory

The CLI SHALL keep its configuration, credentials, database, product index, log, and background
endpoint under a single home directory, `~/.silpo` by default, overridable with the `SILPO_HOME`
environment variable, and SHALL create it with owner-only permissions.

The place of each of those SHALL follow from the home directory and SHALL NOT be a setting of its
own. A location the caller can move is a location the caller can be wrong about, and none of them is
worth a key.

The product index SHALL be one of those places, so that pointing the home directory somewhere else
yields a separate index. A run given a home directory of its own SHALL neither read nor write any
other home's index, and SHALL start from whatever that home already holds and nothing else.
Two runs given two homes are therefore independent of each other whatever either of them resolves,
and a run given a prepared home resolves against exactly what was prepared there.

#### Scenario: Custom home

- **WHEN** `SILPO_HOME` is set
- **THEN** the CLI uses that directory, resolving a relative path against the working directory, and
  derives the background endpoint from it so that two homes never share one background session

#### Scenario: Two homes never share an index

- **WHEN** two home directories are used in turn
- **THEN** each holds its own index, and neither reads the other's, because the index is a record of
  what that home's account has bought

#### Scenario: One run cannot contaminate the next

- **WHEN** two runs of the same errand are each given a home directory of their own
- **THEN** what the first run's listings folded into its index is absent from the second run's, and
  the second resolves as though the first had never happened

#### Scenario: A prepared index is resolved against

- **WHEN** a home directory holding a prepared index is named for a run
- **THEN** the run ranks against exactly the products that index holds, and nothing carried over from
  any earlier run enters the ranking

#### Scenario: No setting names a location

- **WHEN** the caller lists the settings
- **THEN** none of them names the path of the index, the database, the credentials or the log,
  because each follows from the home directory
