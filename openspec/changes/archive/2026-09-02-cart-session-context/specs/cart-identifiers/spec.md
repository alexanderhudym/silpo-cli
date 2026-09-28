## REMOVED Requirements

### Requirement: A cart is recorded by its remote identity

**Reason**: The number existed so that a printed cart could be named back to a command. No command
takes a cart any more, and the cart's identifier is no longer printed, so nothing consumes the
record.

**Migration**: None for the caller — the number was never something to keep. The active cart is
resolved by the session; a cart the CLI has already seen needs no name.

### Requirement: Two ways to name a cart

**Reason**: No argument takes a cart, so there is no place a local number or a uuid could be given.

**Migration**: Drop the cart argument from any stored invocation. `silpo cart details 1` becomes
`silpo cart details`, and the same for every other cart command.

### Requirement: An unresolved cart fails the command

**Reason**: A cart argument is the only thing that could fail to resolve, and there is none.

**Migration**: None. A session with no cart fails saying so, and `silpo cart setup` opens one — but
neither path names a cart.
