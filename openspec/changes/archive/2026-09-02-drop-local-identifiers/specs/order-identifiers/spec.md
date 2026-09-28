## REMOVED Requirements

### Requirement: An online order is recorded by its remote identity

**Reason**: No entity is recorded. An order carries the identifier its payload names it by, and no
tool accepts one back.

**Migration**: None. An order is still named to the user by its receipt number or its date, as
before.

### Requirement: An order's receipt number is not an identifier

**Reason**: The distinction existed to keep a human-facing number out of the numbering scheme.
There is no numbering scheme.

**Migration**: None.

### Requirement: No argument takes an order

**Reason**: Still true, but it is no longer a statement about identifiers the CLI issues. It belongs
with what the account's order history prints, and is restated there.

**Migration**: None.
