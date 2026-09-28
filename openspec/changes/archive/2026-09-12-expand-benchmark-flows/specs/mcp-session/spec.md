## ADDED Requirements

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
