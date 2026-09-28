## MODIFIED Requirements

### Requirement: Tool call outcomes

The CLI SHALL treat a tool that reports an error and a tool that returns no structured output as failures, and SHALL surface the server's own message. A payload whose success marker is false SHALL NOT be treated as a failure of the call: it is delivered to the command, which decides what it means. A command that writes SHALL exit with a non-zero status when it receives one, so that a caller reading the exit status still learns the write did not take effect.

#### Scenario: Tool reports an error

- **WHEN** the MCP server marks a tool result as an error
- **THEN** the command fails with the text the server returned

#### Scenario: Payload marks the call unsuccessful

- **WHEN** the structured payload carries a false success marker
- **THEN** the payload is delivered to the command with the marker intact, and nothing is thrown

#### Scenario: A write command receives an unsuccessful payload

- **WHEN** a command that adds, removes, updates, or clears something receives a false success marker
- **THEN** it prints the payload as it would on success and exits with a non-zero status

#### Scenario: A read command receives an unsuccessful payload

- **WHEN** a command that only reads receives a false success marker
- **THEN** it prints the payload and exits successfully, because there is no write for the marker to invalidate

#### Scenario: No structured output

- **WHEN** a tool returns content without structured output
- **THEN** the command fails saying that tool returned no structured output

#### Scenario: Server sends more fields than it declared

- **WHEN** a tool result carries fields the server's own schema forbids
- **THEN** the CLI accepts the result rather than failing validation

## REMOVED Requirements

### Requirement: Direct tool access

**Reason**: The behaviour is unchanged but it is no longer this capability's to describe. Calling a tool by name with an arbitrary JSON object is the untyped counterpart to the typed call surface, so it is specified alongside that surface instead of here, where it was stated a second time.

**Migration**: None for users — the raw command, its arguments, and its output are untouched. Readers looking for the contract will find it under the typed tool client capability, as "Untyped tool access is preserved".
