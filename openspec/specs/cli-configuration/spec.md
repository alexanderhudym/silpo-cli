# cli-configuration Specification

## Purpose

Holds the small set of settings the CLI needs — where the MCP server lives and how long the background session stays alive — in one file per home directory, with validation on write and a visible distinction between a stored value and a built-in default.

## Requirements

### Requirement: Known settings

The CLI SHALL accept only a fixed set of setting keys, each with a description, a built-in default,
and a parser: the MCP endpoint (default `https://mcp.silpo.ua/mcp`) and the background idle timeout
(default `10m`).

#### Scenario: Unknown key

- **WHEN** the user reads or writes a key that is not in the set
- **THEN** the CLI fails and lists the keys it accepts

#### Scenario: The idle timeout describes what it bounds

- **WHEN** the user reads the idle timeout setting
- **THEN** its description says it bounds both how long the background server lives and how long the
  cart it holds is trusted

### Requirement: Reading settings

The CLI SHALL print the effective value of every setting, marking values that come from the built-in defaults, and SHALL print the path of the configuration file.

#### Scenario: List settings

- **WHEN** the user asks for the configuration
- **THEN** the CLI prints the file path followed by one line per key with its effective value, and marks each value that is a default

#### Scenario: Single value

- **WHEN** the user asks for one key
- **THEN** the CLI prints only that value, suitable for use in a shell substitution

#### Scenario: Machine readable

- **WHEN** the user asks for the configuration or a single key with the JSON flag
- **THEN** the CLI prints a JSON object instead, and for a single key includes whether the value came from the file or from the default

### Requirement: Writing settings

The CLI SHALL validate a value before storing it, SHALL store it in the configuration file with owner-only permissions, and SHALL warn when a running background session still holds the previous value.

#### Scenario: Store a valid value

- **WHEN** the user sets a known key to a value its parser accepts
- **THEN** the CLI writes it to the configuration file and echoes the stored value

#### Scenario: Reject an invalid value

- **WHEN** the value fails its parser, for example a duration that is not a number with an optional `ms`, `s`, `m` or `h` unit, or an endpoint that is not an absolute http(s) URL
- **THEN** the CLI fails with the reason and leaves the file unchanged

#### Scenario: Warn about the running session

- **WHEN** a setting is stored while a background session is running
- **THEN** the CLI says the background session still runs with the old value and names the command that stops it

#### Scenario: Corrupted stored value

- **WHEN** a stored value cannot be parsed at read time
- **THEN** the CLI fails naming the key, the configuration file, and the parse error

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
