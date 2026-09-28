## ADDED Requirements

### Requirement: The home directory holds what the CLI was told, not what it found

The CLI SHALL keep its configuration, credentials, database, log, and background endpoint under a
single home directory, `~/.silpo` by default, overridable with the `SILPO_HOME` environment variable,
and SHALL create it with owner-only permissions.

The place of each of those SHALL follow from the home directory and SHALL NOT be a setting of its
own. A location the caller can move is a location the caller can be wrong about, and none of them is
worth a key.

The home directory SHALL hold nothing the CLI resolves a product against. What a command answers
SHALL follow from the calls that command made and from nothing a previous command left behind, so
that two runs given two homes are independent of each other not because the homes are separate but
because neither home holds an answer. A home directory prepared in advance SHALL change what a run is
authorised as and what it is configured with, and SHALL NOT change what a run finds.

#### Scenario: Custom home

- **WHEN** `SILPO_HOME` is set
- **THEN** the CLI uses that directory, resolving a relative path against the working directory, and
  derives the background endpoint from it so that two homes never share one background session

#### Scenario: No setting names a location

- **WHEN** the caller lists the settings
- **THEN** none of them names the path of the database, the credentials or the log, because each
  follows from the home directory

#### Scenario: One run cannot contaminate the next

- **WHEN** the same errand is run twice against the same home directory
- **THEN** the second run resolves as though the first had never happened, nothing the first run
  printed having been kept anywhere the second run reads

#### Scenario: A prepared home does not prepare an answer

- **WHEN** a home directory is prepared with credentials and configuration and a run is given it
- **THEN** the run is authorised and configured from it, and every product it names came from a call
  that run made

## REMOVED Requirements

### Requirement: Home directory

**Reason**: The requirement made the product index one of the things the home directory holds, and
built three of its guarantees on that: that two homes never share an index, that a run starts from
whatever its home already holds, and that a prepared index is what a run resolves against. There is
no index, and a home that held one would be read by nothing.

**Migration**: Replaced by "The home directory holds what the CLI was told, not what it found", which
keeps every other clause word for word — the default path, the environment variable, the permissions,
and the rule that no location is a setting of its own — and replaces the isolation clause with the
stronger property that now holds: a home directory carries no answer to isolate. A caller who used a
prepared home to fix what a run would resolve has no equivalent, because a run resolves against the
branch and not against a file.

### Requirement: The product index is derivable state, and discarding it is safe

**Reason**: There is no product index. The requirement's whole subject — that the store can be thrown
away and rebuilt from the account's own history because it derives from data the server still holds —
describes a file this change deletes.

**Migration**: The property it guaranteed holds absolutely rather than by argument: nothing a command
answers derives from anything a previous command left behind, so there is nothing whose loss could
cost anything. A caller who deleted the file to recover from a bad state has nothing to delete and
nothing to recover from.

### Requirement: The index is inspected, rebuilt and explained through its own commands

**Reason**: The three commands are removed with the store they operated on. Nothing reports what an
index holds, nothing rebuilds it, and nothing explains a resolution against it.

**Migration**: The report has no equivalent and needs none: no command depends on a previous command
having been run, so there is no warm or cold state to check. The rebuild has none for the same
reason. The explanation is replaced by the answer itself — a listing prints how many products matched,
and a term the CLI declines to settle prints the candidates it was choosing between, which is what the
explanation existed to show. The rule that decided is stated in the skill rather than printed on
demand.
