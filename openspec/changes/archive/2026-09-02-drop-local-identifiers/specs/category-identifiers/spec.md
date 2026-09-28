## REMOVED Requirements

### Requirement: A category is recorded by its remote identity

**Reason**: No entity is recorded. A category is named by its slug, which is the only form the
category tools accept.

**Migration**: None for a caller. Every command that names a category takes the slug the CLI
printed.

### Requirement: Three ways to name a category

**Reason**: There is one way. `silpo_get_category` answers `Resource not found` to a uuid, and the
`category` filter of `silpo_get_products` answers a uuid with `success: true` and an empty list —
so a uuid is not a way to name a category, it is a way to be told nothing.

**Migration**: Use the slug. The category uuid is no longer printed, because nothing takes it.

### Requirement: A category resolves to the form its call needs

**Reason**: Every category call needs the same form.

**Migration**: None.

### Requirement: An unrecorded slug is looked up

**Reason**: The lookup existed to fill the table, and issued `silpo_get_category` under a delivery
type of `Unknown` because it had no cart context to draw one from. Nothing needs the table, and the
category tree — the one surviving reader of that lookup — is fully covered by the branch's flat
category listing.

**Migration**: None. Measured against a live branch, the hierarchy and the flat listing name the
same 1018 categories, so no tree node needs a lookup of its own.

### Requirement: An unresolved category fails the command

**Reason**: `no category <n>` cannot be raised by a CLI that resolves nothing.

**Migration**: A slug the branch does not carry now comes back from the server as its own error, or
as an empty listing where the tool answers that way.
