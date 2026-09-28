## REMOVED Requirements

### Requirement: The scope table is held on disk

**Reason**: The copy is keyed by branch, and measured, the data it holds does not vary by branch. The
flat category listing is byte-identical between `1edb7345-2b99-62cc-9e83-6fea04bfe766` (Дніпро) and
`1edb6a9b-64ea-616e-a44d-a19abd0f8ccc` (Харків) — 1014 rows, every identifier, slug, title and parent
the same. The hierarchy holds the same 1014 nodes in the same root order at Дніпро, Харків and
`1ed43e73-051b-6842-a111-a5ad042eb496` (Київ), and under both SelfPickup and DeliveryHome. The 17
curated sets are byte-identical between branches and identical with and without a delivery type. The
key was carrying a distinction that does not exist.

What does vary by branch is read on every invocation regardless: the product counts, which differ for
777 of 1014 categories between Дніпро and Харків, and the promotions, which are 11 at Дніпро against 7
at Харків with 6 of the shared codes differing in product count. Neither can be answered from a copy,
so the copy never removed a call from the path that matters.

**Migration**: The branch's table is read from the server on every invocation, with all five reads
issued in one wave. Any scope table previously written to disk is dead data; nothing reads it and
nothing has to be migrated out of it. A caller sees one additional wave of concurrent reads and no
change in what is printed.

#### Scenario: A scope named twice

- **WHEN** two commands in turn name a scope at the same branch
- **THEN** each reads the branch's table from the server, in one wave with the other reads it needs

### Requirement: Each kind of scope refreshes on its own rhythm

**Reason**: The rhythms existed to decide when a copy had gone stale. With no copy there is nothing to
age, and the three lifetimes — stated where they were set, because no payload carried one — were
maintained by hand for a copy that answered a question the command did not ask.

**Migration**: None. Every kind is read fresh on every invocation, so no kind can be stale relative to
another.

#### Scenario: The campaign list has aged and the categories have not

- **WHEN** a scope is named at any time
- **THEN** every kind is read from the server, and no lifetime is consulted

### Requirement: The scope table is reference data, not the personal index

**Reason**: The distinction existed to keep the on-disk scope table from being governed by the
personal index's rules about what a product record may carry. With the table gone from disk, the two
no longer share a file and the boundary has nothing to separate.

**Migration**: None. The personal index is unchanged: it holds the caller's own products, and no scope
is written into a product record.

#### Scenario: The index is rebuilt from the account

- **WHEN** the index is rebuilt from orders and favourites
- **THEN** the products it holds come from the account's own history, and no scope table is written or
  discarded with it

### Requirement: A stale or missing scope table degrades, it does not fail

**Reason**: The requirement governed a copy that no longer exists. Its substance — that a read the
command does not depend on must not be the reason the command fails — survives in
`catalog-browsing`, where it now governs the popular listing, the one read whose absence the answer
can tolerate.

**Migration**: None. A scope handle that names something the branch no longer carries still yields
whatever the server answers for it, an empty listing where the scope has ended, and the command still
does not fail on the CLI's own account.

#### Scenario: A campaign ended since the listing was read

- **WHEN** a caller names a promotion that has ended
- **THEN** the listing is the server's answer for it, and the command does not fail on the CLI's own
  account
