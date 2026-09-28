## Context

See proposal.md — Why.

Five facts were measured against the live server on 2026-08-24 through
`silpo_list_branches` with no arguments. Three of them decide something below.

1. **455 branches came back in one call**, with `meta.limit: 50` in the same payload. The
   server does not honour the page size today. This is known and settled; the design assumes
   nothing either way and pages until the reported total is in hand.
2. **One company operates all 455 branches.** `companyId` is the same uuid on every record.
3. **The external number is numeric and unique but not an identifier we can use.** 450 of the
   455 are digits, the other five read `delete_filia_silpo_*`; no two repeat; the numeric ones
   run from 1932 to 791091 and so happen not to overlap the 1..455 a local sequence would
   produce.
4. **City and street do not identify a store.** 63 groups of stores share a city and an
   address, 8 carry no city and 7 no address, and five records are leftovers of deleted stores.
5. **Local numbers save no tokens.** The listing renders at 24 876 tokens today. Swapping both
   aliases for local numbers renders at 24 884 — eight tokens worse, because `@estado` and `1`
   both disappear next to the `id: ` in front of them. Folding the city and the street into one
   address line renders at 23 990. The whole saving in this change is the address, and the
   whole point of it is that a number can be typed from memory.

## Goals / Non-Goals

**Goals:**

- One identifier for a branch and one for a company that a person can retype without copying.
- Filling the tables without spending the caller's tokens.
- Resolution that never guesses: a value that resolves to nothing fails the command.

**Non-Goals:**

- Deriving the company from the branch, so that `--company-id` and the `companyId` of a cart
  item could be dropped. That wants a column on the branch row and is its own change.
- Narrowing the store listing by city or by distance.
- Giving products local numbers, which is where the alias table's remaining bulk is.
- Migrating or cleaning the dead `branch` and `company` rows in the alias table.

## Decisions

### Two tables rather than one keyed by entity

```sql
CREATE TABLE branches (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  remote_id TEXT NOT NULL UNIQUE
);

CREATE TABLE companies (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  remote_id TEXT NOT NULL UNIQUE
);
```

A single `locals(entity, remote_id)` table was considered and rejected on two counts. Its
numbering would be one shared sequence, so the only company there is would be numbered 456 —
after the 455 branches ahead of it — and that number would then be printed 455 times in the
store listing. And an identifier either entity gains later would have no place to live but a
nullable column that means nothing for the other entity. With a table each, per-entity
numbering falls out of `AUTOINCREMENT` for free, and a further identifier is a column.

`categories` stays where it is. It carries a slug and a lookup of its own, and folding three
entities into one shape would cost more than the duplication saves.

### The upsert selects before it inserts

A conflicting insert still spends a number from the autoincrement sequence. Every store listing
touches 455 rows; burning 455 numbers per render would push the numbers the user types into
four digits within a handful of commands. So a branch already recorded is looked up, not
inserted over — the same rule the category table follows.

### Two input forms, and the external number is not one of them

Digits are a local number; a uuid is the server's identifier; anything else fails.

The external number is the tempting third form, and it has one real advantage over a local
number: it survives `rm silpo.db`, because the server owns it. It is left out anyway. It is
numeric, so it would share the digits branch with local numbers, and fact 3 shows the two
ranges only miss each other by accident — 455 stores against numbers starting at 1932. A rule
resting on that accident fails silently when it fails, by resolving to a real store that is the
wrong one. If it is ever wanted, it is a `number` column and a lookup that fails loudly on two
matches, not a fallback.

### A uuid passes through and is not recorded

Records are made from what the server sent. A uuid on the command line is already the value the
call needs, so it is forwarded as typed; recording it would create a row for a store the server
may never confirm. It gets its number when it comes back in a payload.

This is also what the CLI does today: an argument that is not an alias is passed through as
typed.

### The gap is filled from the store listing, on input only

A local number matching no row makes the CLI fetch the stores itself, page until it holds the
reported total, record every branch and every company, and try again. Once per command, however
many arguments missed.

The alternative is to fail and let the user run `silpo branches`, which prints 24 876 tokens to
recover a number. The fetch prints nothing, because the payload never leaves the CLI process.
That difference is the argument for the whole mechanism, more than the resolution itself.

Renders do not fetch. They record what they are already printing and nothing more.

The consequence is worth stating plainly: a number written down before the database was wiped
will now resolve to a real store that may not be the one it named before, rather than failing.
That is accepted. A local number is a unique key that means nothing beyond the life of the
database it was assigned in — the rule the category table already states — so before the fill
there was no mapping for the new one to contradict. What the fill must never do is fire from a
render, where it would silently multiply one command into two.

### The company keeps its line in the store listing

It is 455 repetitions of one value, and dropping it was considered. It stays because the cart
requires a company on input and the store listing is the only place a branch is shown with the
company that operates it. When the branch row learns to carry its company, the line can go.

### The address is folded by the shared conversion

A branch's `address` is already a street with a building number, so it goes to the `street`
slot: `formatAddress({ city, street: address })`. The conversion drops empty parts by itself,
which covers the 15 records missing one side or both.

### A JSON argument gains a second kind of field

`expandAliases` rewrites only strings that start with `@`. After this change a cart item reads
`{"productId": "@apple", "companyId": 1, "branchId": 12}`, so the declaration a command makes
for its JSON fields has to say which of the two kinds each field is, and the walk has to resolve
a number as readily as a handle.

## Risks / Trade-offs

- **A stale number resolves to the wrong store instead of failing.** → Accepted, and recorded
  above. The mitigation is that no output cites a local number as a lasting reference.
- **The server starts honouring `limit` and `offset`.** → The fill already pages to the
  reported total; today the loop ends after one answer.
- **A company no branch names cannot be filled.** → It fails loudly. On the live catalogue
  there is one company and every branch names it.
- **Branch numbers reach three digits.** → Still one token and still typeable; the alternative
  was shared numbering, which is worse on both counts.
- **The store listing writes 456 rows per run.** → The same order as the category tree's 1009,
  in one transaction.
- **Dead `branch` and `company` rows stay in the alias table** and `silpo aliases` will list
  them. → Accepted; the database is disposable.
- **Two scenario titles in `stores-and-delivery` still say "handle"** where the behaviour is now
  a number, because a delta may rename a requirement but not a scenario. → Left as is rather
  than removing and re-adding two requirements to work around the validator.
