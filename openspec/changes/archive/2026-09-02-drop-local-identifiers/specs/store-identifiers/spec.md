## REMOVED Requirements

### Requirement: A branch and a company are each recorded by their remote identity

**Reason**: No entity is recorded. A branch and a company are named by the uuids their payloads
carry.

**Migration**: None for a caller. `--branch-id` and `--company-id` take the uuid the CLI printed.

### Requirement: Two ways to name a branch or a company

**Reason**: There is one way. The store code a branch carries as `externalId` is rejected by the
tools — `silpo_get_time_slots` answers `Resource not found` to it — so it is a label, not a handle.

**Migration**: Pass the uuid. The store code is still printed, because a person can quote it to a
shop, but no command takes it.

### Requirement: An unrecorded number sends the CLI for the store listing

**Reason**: A command no longer pages 455 branches mid-flight to translate a number that no longer
exists.

**Migration**: None. This removes a hidden multi-call cost from any command given an unfamiliar
branch.

### Requirement: An unresolved branch or company fails the command

**Reason**: `no branch <n>` and `no company <n>` cannot be raised by a CLI that resolves nothing.

**Migration**: A wrong branch or company now fails at the server, in its own words.
