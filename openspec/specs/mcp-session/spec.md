# mcp-session Specification

## Purpose

Keeps one authorized MCP session alive in a background process so that individual CLI invocations do not pay for a fresh connection and handshake, and exposes that session for inspection, for direct tool calls, and for shutdown.

## Requirements

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

### Requirement: Session inspection

The CLI SHALL report the state of the background session, and SHALL be able to connect on demand purely to check that authorization works.

#### Scenario: Server status while running

- **WHEN** the user asks for the server state and a background process is running
- **THEN** the CLI prints the endpoint, the server name and version, the session id, the tool count, the process id, the uptime, and when the idle stop is due

#### Scenario: Server status while stopped

- **WHEN** the user asks for the server state and no background process is running
- **THEN** the CLI prints a stopped state and the configured endpoint, without starting anything

#### Scenario: Connection test

- **WHEN** the user runs the connection test
- **THEN** the CLI ensures a background session exists and reports the same status, saying whether the session was reused or freshly started

#### Scenario: Machine readable status

- **WHEN** the user asks for the server state or the connection test with the JSON flag
- **THEN** the CLI prints the same facts as a JSON object instead of composed text

### Requirement: Session shutdown

The CLI SHALL stop the background session on request and SHALL report whether anything was running.

#### Scenario: Stop a running session

- **WHEN** the user stops the server and a background process is running
- **THEN** the process closes the MCP session, removes its listening endpoint, exits, and the CLI reports that it stopped

#### Scenario: Stop with nothing running

- **WHEN** the user stops the server and nothing is running
- **THEN** the CLI reports that it was not running and exits successfully

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

### Requirement: The client waits on the daemon long enough for the work to finish

The client SHALL bound how long it waits for the daemon, and SHALL bound the wait for a connection
and the wait for an answer separately.

The connection is to a local socket and either succeeds at once or not at all, so its bound is
short. The answer covers the whole command, which is several requests to the server, so its bound
SHALL exceed the per-request timeout the MCP client already applies. Where a single request is what
hung, the error the caller sees SHALL be that client's own, naming the server — not one naming the
daemon, which is working.

One bound served both until this change, and at ten seconds it was cutting real work: across one
benchmark sweep the ninetieth percentile of successful calls stood at 7.9 seconds and the
ninety-fifth at 11.6.

A timeout waiting for an answer SHALL say that the client stopped waiting rather than that the
daemon failed, and SHALL say that a write may already have reached the server, so that a caller
repeating it knows to read the cart first.

#### Scenario: A command takes longer than a single server request

- **WHEN** a command's work spans more than one request to the server and takes longer than any one
  of them is allowed
- **THEN** the client keeps waiting, and the command completes

#### Scenario: The server stops answering

- **WHEN** one request to the server hangs until the MCP client gives up on it
- **THEN** that client's own error reaches the caller, naming the server rather than the daemon

#### Scenario: A write times out

- **WHEN** the client stops waiting for an answer to a command that writes
- **THEN** the error says the client stopped waiting, that the write may have landed, and that the
  cart is to be read before the write is repeated

### Requirement: A call the rate limiter turned away is made again

The server rejects a burst of cart writes with a tool error carrying "Rate limit exceeded" rather
than an HTTP status, so nothing below the tool layer sees a rejection to back off from. The CLI
SHALL recognise that rejection and repeat the call itself, waiting between attempts, and SHALL
give the caller the rejection only after its attempts are spent.

Repeating SHALL be safe to do to a write, because a call the limiter turned away never reached the
cart: it was refused ahead of the work, not interrupted in the middle of it. This is the opposite of
a call that timed out, which may have landed and SHALL NOT be repeated on the CLI's own initiative.

The waits SHALL be short. The window measured is under two seconds, and repeating into it did not
extend it: a write refused at the third of three in quick succession was accepted again two seconds
later.

A failure that is not the rate limit SHALL NOT be repeated, whatever it says, because nothing has
established that it left the cart untouched.

#### Scenario: A write refused by the limiter

- **WHEN** a cart write comes back rejected for the rate limit
- **THEN** the CLI waits and sends it again, and the caller is given the answer to the attempt that
  succeeded, never having seen the rejection

#### Scenario: A limiter that does not relent

- **WHEN** every attempt is refused for the rate limit
- **THEN** the rejection reaches the caller carrying the server's own words, rather than being
  reported as something else

#### Scenario: A failure of another kind

- **WHEN** a call fails for any reason other than the rate limit
- **THEN** it is not repeated, and the failure reaches the caller as it came
