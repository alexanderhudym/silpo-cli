## REMOVED Requirements

### Requirement: One alias per entity value

**Reason**: Every entity that carried an alias is now recorded in a table of its own and named by
the local number that table issues, the way branches, companies, products and categories already
are. One naming scheme replaces two.

**Migration**: An entity that was aliased is named by its local number: cart, online order, saved
address, Nova Poshta settlement, Nova Poshta office. See `cart-identifiers`,
`order-identifiers`, `address-identifiers` and `nova-poshta-identifiers`. Handles are no longer
printed, so nothing carries one forward; a caller reads the number from the listing that prints
the entity.

### Requirement: Alias assignment

**Reason**: Numbers are issued per entity by the table that records it, not from one sequence
shared across every entity, so a number stays short instead of growing with unrelated traffic.

**Migration**: Recording still happens while a command prints an entity, so a caller can still
name back anything it has seen. Each identifier capability states the recording rule for its
entity.

### Requirement: Alias form

**Reason**: The `@` marker and its word body no longer exist. A local number is a run of digits
and needs no marker to be told apart from a uuid.

**Migration**: Values starting with `@` carry no meaning to any argument and are read as ordinary
text.

### Requirement: Alias inspection

**Reason**: The `silpo aliases` command tree is removed with the alias table it read.

**Migration**: None in this change. Local numbers appear in the listing that prints each entity;
no command enumerates them.

### Requirement: Alias removal

**Reason**: Removed with the alias table. Restarting the numbering from one was an escape hatch
for a shared sequence that no longer exists.

**Migration**: The database is disposable; deleting it restarts every entity's numbering at once.
