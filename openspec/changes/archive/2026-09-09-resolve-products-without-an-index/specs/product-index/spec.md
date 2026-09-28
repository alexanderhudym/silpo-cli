## REMOVED Requirements

### Requirement: The index holds identity, never state

**Reason**: The capability is removed in full. Every requirement it holds describes a local store of
products, and the change resolves products from the catalogue's live answer alone. Identity now comes
from the call that returned the product, in the same reply that carries its price and its stock, so
there is nothing left for a store of identity to be for.

**Migration**: None is possible or needed for a caller. The store was never addressable: nothing a
caller passed named it and nothing it printed came from it alone. Its file is deleted with the
change; a home directory that still holds one is left with an unread file, and deleting that file
by hand is optional rather than required.

### Requirement: The index is single, and the branch is a signal

**Reason**: The capability is removed in full. A branch is no longer a signal a stored record carries,
because there are no stored records; a branch is the argument every catalogue call is already made
with, and the answer is that branch's assortment by construction.

**Migration**: None. The behaviour this requirement shaped — that a product known at one branch is
not silently offered at another — is now a property of the server's answer rather than of a local
join, and holds without a rule.

### Requirement: The index is filled from what the caller has already paid for

**Reason**: The capability is removed in full. Order history and saved products are no longer drained
into a store ahead of a search. They are read live, alongside the search, and they act only where two
candidates that both account for the whole query cannot otherwise be separated — see
`list-resolution`, "A tie between fully covered candidates is broken by what the caller buys".

**Migration**: None. What the reads were for survives; where their result is kept does not.

### Requirement: The index is inspectable and disposable

**Reason**: The capability is removed in full, and with it the three commands that reported its
contents, rebuilt it and explained a resolution against it. There is no store to inspect, and nothing
to dispose of between one command and the next.

**Migration**: A caller who ran the report to see whether the index was warm has nothing to check: no
command depends on a prior command having been run. A caller who ran the rebuild to correct a stale
answer has nothing to correct, an answer being drawn fresh each time. A caller who ran the
explanation to understand a resolution is served by the listing itself, which prints how many products
matched and, where a term did not resolve, the candidates it was asked to choose between.

### Requirement: The index is isolatable per run

**Reason**: The capability is removed in full. Isolation existed so that one run's folded records
could not reach the next; with no records folded, two runs of the same errand are independent without
a rule making them so.

**Migration**: None. `SILPO_HOME` keeps every other meaning it has — configuration, credentials and
the background endpoint still follow from it, as `cli-configuration` states.

### Requirement: A missing index degrades, it does not fail

**Reason**: The capability is removed in full. The degradation path existed because a store could be
absent, unreadable or of the wrong schema while the command still had to answer. None of those
states is reachable when there is no store, and a command that reads only live data either gets its
answer or reports the failure of the call that was made.

**Migration**: None. A failure now names the call that failed, which is more than the degraded path
could say.
