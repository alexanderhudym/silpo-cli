## MODIFIED Requirements

### Requirement: Session inspection

The CLI SHALL report the state of the background session, and SHALL be able to connect on
demand purely to check that authorization works.

#### Scenario: Server status while running

- **WHEN** the user asks for the server state and a background process is running
- **THEN** the CLI prints the endpoint, the server name and version, the session id, the tool
  count, the process id, the uptime, and when the idle stop is due

#### Scenario: Server status while stopped

- **WHEN** the user asks for the server state and no background process is running
- **THEN** the CLI prints a stopped state and the configured endpoint, without starting anything

#### Scenario: Connection test

- **WHEN** the user runs the connection test
- **THEN** the CLI ensures a background session exists and reports the same status, saying
  whether the session was reused or freshly started

#### Scenario: Machine readable status

- **WHEN** the user asks for the server state or the connection test with the JSON flag
- **THEN** the CLI prints the same facts as a JSON object instead of composed text
