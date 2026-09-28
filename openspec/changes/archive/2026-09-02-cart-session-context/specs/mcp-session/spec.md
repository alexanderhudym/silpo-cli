## MODIFIED Requirements

### Requirement: Shared background session

The CLI SHALL route every MCP tool call through a background process that owns a single connection to
the configured MCP endpoint, and SHALL start that process on demand when it is not already running.
That process SHALL also hold the active cart the rest of the CLI works within, resolving and reading
it before it accepts requests.

#### Scenario: First command starts the session

- **WHEN** a command needs a tool call and no background process is running
- **THEN** the CLI starts one, waits for it to become ready, and then issues the call

#### Scenario: Later commands reuse the session

- **WHEN** a command needs a tool call and a background process is already running
- **THEN** the CLI reuses it without starting a second process

#### Scenario: Only one process owns the session

- **WHEN** a background process starts while another one already holds the endpoint it listens on
- **THEN** the new process closes its session and exits, leaving the existing one in charge

#### Scenario: Startup never finishes

- **WHEN** the background process does not become ready within sixty seconds
- **THEN** the command fails with an error pointing at the background log file

#### Scenario: Startup fails

- **WHEN** the background process exits during startup, for example because credentials are missing
  or the endpoint is unreachable
- **THEN** the command fails with the reason the background process recorded, or with a generic
  failure naming the log file when no reason was recorded

#### Scenario: Every cart response passes through one place

- **WHEN** the cart is read or written
- **THEN** the background process is what does it, so the cart and the context it carries are held in
  one place and no command holds a copy of its own

### Requirement: Idle shutdown

The background process SHALL stop by itself after a configurable idle period with no requests, and
SHALL restart the countdown on every request. That period SHALL be understood as bounding how long the
cart it holds is trusted, not only how long the connection is kept warm.

#### Scenario: Idle expiry

- **WHEN** no request reaches the background process for the configured idle timeout
- **THEN** it closes the MCP session, removes its listening endpoint, and exits

#### Scenario: Activity extends the life

- **WHEN** a request reaches the background process
- **THEN** the idle countdown restarts from that moment

#### Scenario: The cart does not outlive the process

- **WHEN** the background process exits on idle
- **THEN** the cart it held is gone, and the next process reads a fresh one before it serves anything
