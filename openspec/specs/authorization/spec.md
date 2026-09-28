# authorization Specification

## Purpose

Gives the CLI a signed-in Silpo identity by running the OAuth 2.1 authorization code flow in the user's browser, storing the resulting tokens on disk, and revoking them on request, so that every other command can call the MCP server on behalf of the user.

## Requirements

### Requirement: Browser login

The CLI SHALL authorize the user through the browser with an OAuth 2.1 authorization code flow with PKCE, using a loopback redirect on `127.0.0.1` at a configurable port (default `53682`), and SHALL store the issued tokens for later commands.

#### Scenario: First login

- **WHEN** the user runs the login command without stored tokens
- **THEN** the CLI registers a client, opens the authorization URL in the browser, prints the URL and that it is waiting for the callback
- **AND** after the callback carries a valid code, exchanges it for tokens, stores them, and prints the authorized state, the MCP endpoint, and the number of tools the server offers

#### Scenario: Already authorized

- **WHEN** the user runs the login command while an unexpired access token is stored
- **THEN** the CLI performs no network call and reports that the user is already authorized, naming the flag that forces re-authorization

#### Scenario: Forced re-login

- **WHEN** the user runs the login command with the force flag
- **THEN** the CLI runs the full authorization flow again regardless of the stored tokens

#### Scenario: Login without a browser

- **WHEN** the user runs the login command with the no-browser flag
- **THEN** the CLI prints the authorization URL for manual opening instead of launching a browser, and still waits for the callback

### Requirement: Callback safety

The CLI SHALL accept an authorization result only from its own callback path, only with a `state` value matching the one it generated for this login, and only within a five minute window.

#### Scenario: State mismatch

- **WHEN** the callback arrives with a `state` that does not match the current login
- **THEN** the CLI shows an authorization failure page in the browser and aborts the login with an error

#### Scenario: Authorization rejected

- **WHEN** the callback carries an `error` parameter
- **THEN** the CLI shows the error description in the browser and fails the login with that description

#### Scenario: Callback never arrives

- **WHEN** no valid callback arrives within five minutes
- **THEN** the CLI fails the login with a timeout error and stops listening

#### Scenario: Callback port taken

- **WHEN** the callback port is already in use
- **THEN** the CLI fails before opening the browser and names the flag for choosing a free port

### Requirement: Credential storage

The CLI SHALL keep client registration and tokens in a single file inside its home directory, readable only by the owner, and SHALL treat a missing file as "not authorized".

#### Scenario: Tokens are written privately

- **WHEN** the CLI stores or updates credentials
- **THEN** the home directory and the credential file are created with owner-only permissions and the file is replaced atomically

#### Scenario: Expiry is known locally

- **WHEN** a stored token carries an expiry and that expiry is less than a minute away
- **THEN** the CLI treats the credentials as expired without contacting the server

### Requirement: Logout

The CLI SHALL revoke the stored tokens at the authorization server when it advertises a revocation endpoint, delete them locally in every case, and stop the background session first.

#### Scenario: Logout with stored tokens

- **WHEN** the user runs the logout command while tokens are stored
- **THEN** the CLI stops the background session, posts the refresh token (or the access token when there is no refresh token) to the advertised revocation endpoint, deletes the credential file, and reports whether the server confirmed the revocation

#### Scenario: Logout without stored tokens

- **WHEN** the user runs the logout command with no stored tokens
- **THEN** the CLI stops the background session and reports that the user is not authorized

#### Scenario: Revocation unavailable

- **WHEN** the authorization server exposes no revocation endpoint or the revocation call fails
- **THEN** the CLI still deletes the credentials locally and says the server did not confirm the revocation

### Requirement: Login required

Any command that needs the MCP server SHALL fail with an instruction to log in when no access token is stored, rather than starting an authorization flow of its own.

#### Scenario: Command without credentials

- **WHEN** a user runs a data command with no stored access token
- **THEN** the command fails with an error naming the login command
