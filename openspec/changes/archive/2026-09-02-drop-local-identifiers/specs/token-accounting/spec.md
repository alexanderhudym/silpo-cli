## REMOVED Requirements

### Requirement: Recording a call

**Reason**: The ledger counted only the tools a command handed it. It never counted the two cart
reads every command makes, the paged branch listing a resolver could trigger, the per-slug category
lookups behind a tree, or the write the session performs to repair a lapsed slot. The denominator
was systematically short, so the saving it reported was systematically overstated. Threading a
truthful count through the background session is possible but buys nothing the change is for.

**Migration**: None. The saving the CLI actually delivers is the difference between a payload and
the text printed in its place, which anyone can measure directly against `silpo raw`.

### Requirement: Gain totals

**Reason**: Removed with the ledger.

**Migration**: `silpo gain` no longer exists.

### Requirement: Grouping recorded calls

**Reason**: Removed with the ledger.

**Migration**: None.

### Requirement: Call breakdown

**Reason**: Removed with the ledger.

**Migration**: `silpo gain calls` no longer exists.

### Requirement: Clearing the history

**Reason**: Removed with the ledger. There is no history and no database file to clear.

**Migration**: `silpo gain clear` no longer exists. `~/.silpo/silpo.db` can be deleted by hand once,
and is never recreated.
