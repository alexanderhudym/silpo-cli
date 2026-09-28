## MODIFIED Requirements

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
