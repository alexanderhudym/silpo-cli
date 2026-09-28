## Context

See proposal.md — Why.

Ten facts were measured against the live server on 2026-08-24 and 2026-08-25. Six of them decide
something below.

1. **The external product id is the tail of the slug.** Across 1 418 product records drawn
   from twelve categories and from eleven pages of the promotional listing, the digits after
   the last hyphen equalled `externalProductId` in every one, with no record carrying a
   non-numeric tail and none carrying a null external id. The rule survives
   `paket-biorozkladnyi-3-kg-958358-958358`, where the number appears twice.
2. **The receipt's `lagerId` is the same number, and it sits on the line itself.** On 87
   receipt lines that carried a catalogue entry, `lagerId` equalled the tail of that entry's
   slug in every one. `lagerId` is a field of the receipt line, not of the catalogue entry
   nested inside it, so a line carrying a catalogue entry carries all three identifiers
   between them and needs no lookup to complete.
3. **The batch search is a ranked search, not a lookup, and cannot be trusted with a code.**
   Its description documents an exact article-code term, and given the external ids of 90
   products drawn from a listing it did return all 90, one match each — but that sample was
   drawn from a listing, which is to say from products the search indexes well. The honest
   measurement is the control: given the article codes of 30 receipt lines whose catalogue
   product the server had *already resolved at that same branch*, it found 17. It misses
   products that are demonstrably in the catalogue it is being asked about. `1011390` is the
   worked example — no match from the search, while the lookup of fact 6 answers with
   `gryby-shymedzhi-bili-1011390`. Nothing is resolved through it.
4. **The favorites tool is keyed on the external product id, not on the uuid.** Sending one
   product's uuid with another product's external id added *the external id's* product; the
   uuid was ignored. A wrong external id answers 500 and the nil uuid answers 400, so the uuid
   is required to be some real product and nothing more. This inverts what the tool's own
   description says.
5. **The uuid is the same at every branch.** `viski-jameson-2712` carries one uuid at two
   different branches, so the record needs no branch of its own.
6. **The product card tool answers all three key forms, and its delivery context is
   decorative.** `silpo_get_product_details` takes a uuid, a slug or a bare article code under
   its `slug` argument and answers with the identifier and the slug. Its four context arguments
   are enforced by the schema and read by nothing: the nil branch answers, and so do a 1970
   timeslot, a 2099 timeslot, an end before its start, empty strings, `not-a-time`, and a
   delivery type of `Nonsense`. Every one of those returns the same product. The branch is
   likewise only parsed, not read — id and slug agreed between the nil branch and a real one on
   all 10 keys tried, including products that branch does not stock and a code that resolves
   nowhere. A key that names nothing answers `Resource not found`, so a miss means the product
   is gone rather than absent from one shop.
7. **A missing catalogue product says nothing about the product, only about the branch.** The
   server decides that field against the branch the *caller named*, not against the store the
   order was placed at. One page of ten offline orders, unchanged, splits three ways by which
   branch the command was given: 24, 29 and 34 of its 134 lines come back without a catalogue
   product. The orders themselves are never filtered by that branch — they are the caller's own
   purchases, all 21 of them here rung up at store 5831 — so a wrong `--branch-id` silently
   costs the output identifiers it could have had. What the line always carries is `lagerId`,
   which is the external product id (fact 2), and fact 6 turns that into the other two.
8. **Searching such a line by its name is worse than not searching.** Of three names taken
   from those lines, two found nothing and `Цукіні` returned a white Ferrero Rocher chocolate.
   Fact 6 removes the temptation, the code being an exact key where the name is a guess.
9. **The saving is the slug, not the number.** A hundred products render at 6 861 tokens
   today. Dropping the slug row takes it to 4 765, dropping the external id row as well to
   4 051, and five-digit local numbers in place of the aliases put it back to 4 151. The
   number itself is a wash, as it was for branches. Re-measured against the implementation on a
   fresh hundred-product listing: 6 871 before, 4 215 after, 38.7 per cent, the difference from
   the figures above being a different day's promotions.
10. **The undocumented storefront route adds nothing the card lacks.**
    `GET /v1/uk/branches/{branchId}/products/{key}` answers the same three key forms and does
    carry `externalProductId` outright, which the card does not. Asked the same 31 keys — 7
    article codes, 12 slugs, 10 uuids, plus two keys that resolve nowhere — the two agreed on
    every one, misses included. The one field it adds is recoverable by fact 1: across the 100
    records the CLI had stored and all 10 fixture products, the tail of the slug equalled the
    external product id 110 times out of 110. It is faster on a batch — seven keys in parallel
    cost 441 ms against the card's 624 ms — and that is the whole of its advantage.

## Goals / Non-Goals

**Goals:**

- One number a person can retype that reaches every tool wanting a product, whichever of the
  three identifiers that tool names it by.
- A product record that prints no machine handle the caller does not act on.
- Resolution that never guesses: a value resolving to nothing fails the command.

**Non-Goals:**

- Reordering from the online order history. It is what makes fact 6 worth acting on at all,
  and it is its own change.
- Giving an identifier to a receipt line whose product the lookup says is gone. Two of the 33
  measured are refused at every branch, and there is nothing left to name them by.
- Removing the dead `product` rows from the alias table.
- Scoping a product record to a branch, which fact 5 makes unnecessary.

## Decisions

### A table of its own, with two nullable columns

```sql
CREATE TABLE products (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  remote_id   TEXT NOT NULL UNIQUE,
  slug        TEXT,
  external_id INTEGER
);
```

This is the third table of this shape, after `categories` and the pair `branches`/`companies`,
and it is a third table rather than a column on a shared one for the reason the branch design
gives: a shared sequence numbers one entity behind all of another, and an identifier one entity
gains later has no place to live but a column meaning nothing for the rest.

`slug` and `external_id` are nullable because the payload shapes that reach the recorder are
not all complete. Five shapes exist, and only four of them are written:

| where it comes from                     | uuid | slug | external id      |
| --------------------------------------- | ---- | ---- | ---------------- |
| listing, batch, alternatives, favorites  | yes  | yes  | yes              |
| receipt line with a catalogue entry      | yes  | yes  | yes, `lagerId`   |
| card, cart, replacement                  | yes  | yes  | no               |
| online order history                     | yes  | no   | no               |
| receipt line with no catalogue entry     | no   | no   | yes, `lagerId`   |

Only the last shape cannot be written as it stands, having no uuid to key a record on. It is
the one shape that is resolved before it is recorded, by fact 6 and the rule below.

The second row is the one worth naming, because the obvious reading of the payload gets it
wrong. `lagerId` belongs to the receipt line, and the catalogue entry that carries the uuid and
the slug is nested inside that line; taking the entry on its own loses the external id that is
sitting one level up. Fact 2 is what says the two belong to the same product.

### The stored external id is what the server sent; the tail is a resolution step

The column is not derived on write. A record holds the number a payload gave it, and nothing
else is written into that column at record time — the tail of the slug is one of the steps the
*resolver* tries when a call needs an external id the record does not hold. Deriving on write
would make the tail rule load-bearing for stored data and would leave no way to tell a value
the server sent from a value the CLI guessed.

Fact 1 says the tail rule is exact on everything measured. It is still a guess, so it is
applied where a guess belongs: at the moment a call needs a value, where it can fail loudly.

### The tail is read strictly, or not at all

The tail is the digits after the last hyphen, matched as digits and nothing else. A slug whose
tail is not a run of digits yields no external id rather than a `NaN` that would travel
silently into a request. Fact 1 has never seen such a slug; the point of the rule is what
happens on the day it does.

The same caution answers the question of the column's type. `external_id` is an integer
because every value measured was one, and a test over the recorded fixtures asserts, for every
product they carry, that the external id is a safe integer and equals the tail of the slug. It
is the fixtures that would catch the server changing its mind, since the CLI itself only ever
sees the shape the recorded schema already admits.

### Resolution walks three steps, and the product card is the last

A call needing an identifier the record does not hold walks, in order:

```
  1. the record            free
  2. the tail of the slug  free, external id only  (fact 1)
  3. the product card      one call                (fact 6)
```

The table above says which step answers, because it says what is missing:

- **an external id, for a record holding a slug** — step 2 settles it, and that is every record
  short of an external id, the card, the cart and the replacement being the only shapes that
  omit one and all three carrying a slug.
- **a slug, for a record holding neither** — the online order history is what leaves a record in
  that state, and only step 3 answers it.
- **everything, for an article code alone** — the catalogue-less offline order line, which step
  3 answers because the code is one of the three keys it takes.

Step 3 is one call taking any of the three keys, which is the whole of the resolution: there is
no fourth step. The batch search is not it — fact 3 finds it missing 13 of 30 products the same
server had just resolved at the same branch. An exact key that answers is worth more than a
search that ranks.

The card carries no external product id, so a resolution ending there hands step 2 the slug it
came back with. The record keeps only what the server sent, which leaves an article code
resolved this way holding a slug and no code — except on the receipt line, where the code was
the key we asked with and is therefore the server's own value, kept as such.

### A required field is not the same as a question being asked

This design got the same thing wrong twice, and the shape of the mistake is worth more than
either correction.

The first version refused the card outright: it demands a branch, a delivery type and both ends
of a timeslot, no command needing a resolution holds all four, therefore the card is out of
reach. So resolution went to an undocumented storefront route lifted from the website. The
second version then read *that* route's branch segment as a requirement too, and left `cart
remove` and the favorites update unable to take a slug they held no record of.

Both times a field that the schema demands was read as a question the server is asking. It
is neither. Fact 6 settles it by measurement: the nil branch answers as a real one does, and
the rest of the context can be `not-a-time` and `Nonsense` without changing a byte of the
answer. What is being asked is what a product's other identifiers are, and a product does not
have different identifiers in different shops or at different hours (facts 5 and 6). None of
the four ever entered the question.

So the CLI fills the holes. Where a branch is known it sends that one; where none is, the nil
uuid, which says no shop rather than naming one at random. The rest are fixed values chosen to
parse and mean nothing.

The known branch is preferred over the nil uuid even though the two are measured to agree, for
a reason that is not about correctness: should the card ever grow a branch-sensitive field, the
commands that already know the caller's shop keep asking under it, and only the branchless ones
degrade. A branch standing beside the product counts as known — `cart add` takes no
`--branch-id`, but every entry of its JSON names the branch that entry's product belongs to, so
the walker reads that field first and hands it to the resolution of its neighbour.

### Nothing leaves the MCP surface

The storefront route was written, shipped and then removed inside this change. It worked, and
fact 10 shows it agreeing with the card on every key tried and beating it by 180 ms on a batch
of seven. It was removed anyway.

Speed was never the argument for it; reach was, and the reach turned out to be identical. What
remained was a second transport with its own contract, its own failure modes, no coverage from
the recorded schemas, and a dependency on a route the site never promised anyone. Its one real
advantage — `externalProductId` sent outright rather than read off the slug — is a field fact 1
recovers 110 times out of 110, guarded by a fixture test that fails the day the server changes
shape.

Trading 180 ms on one command for an undocumented dependency is a bad trade. The `api.baseUrl`
setting, the `src/api/` module and the stub HTTP server in the test harness all go with it.

A resolution is not recorded as a call of the command that caused it. It is work done under the
hood to answer what the caller did ask for, so it stays out of the token accounting — and out
of `toolCalls()` in the harness, which is the same distinction drawn where the tests can see it.

### The uuid gap is one tool wide

The shapes without a slug look like four, and three of them are illusory. The replacement
group key, the cart confirmation, the removal confirmation and the favorites confirmation all
echo a uuid the CLI itself supplied, which it could only have taken from a record it already
holds. Nothing is learned and nothing needs resolving. `get_my_online_orders` is the only tool
that names a product the CLI may never have seen, and step 3 exists for it alone.

### An offline order line resolves its article code before it is recorded

Recording is otherwise free: it is what the CLI does with what it is already printing. The
catalogue-less offline order line is the exception, and it is worth being clear that it is one.
Rendering such a page asks the lookup for every distinct article code it does not already hold,
which on the measured history is fifteen to twenty calls for a page of ten orders, and
thirty-three for all twenty-one. That breaks the rule that one command is one call, for this
command.

It is paid because the alternative is a line the caller cannot act on at all. Without the
lookup the line prints a name and a price and no identifier, and 31 of 33 products behind those
lines are alive and buyable — the CLI would be withholding a local number for products it could
name. The cost is also paid once: what the lookup returns is recorded, so the second render of
the same history asks for nothing.

The calls are independent, so they go together rather than in turn, and a failure among them
is not an error. A code the card refuses is a product that no longer exists anywhere (fact 6),
and its line falls back to what it would have printed anyway: its name, its quantity, its price
and no identifier. Nothing in a render fails on account of a product that is gone.

The general rule holds either side of this: resolution fails loudly on input, where a wrong
guess would send a wrong call; on output a missing identifier is an absence rather than an
error, whether it was looked up and lost or never looked up at all.

### No filling of the gap from a listing

An unrecorded local number makes the store resolution fetch every branch and try again,
because 455 rows is a bounded thing to fetch. The catalogue is not: the promotional listing
alone reports 5 539 products. An unrecorded product number fails, and a slug or an external id
is resolved by the one targeted call above rather than by a sweep.

The offline order line is not an exception to this. It pays a request per article code, not per
page of a catalogue, and each one is an exact key that answers about exactly the product on the
line. A sweep looks for something; a lookup asks for it.

### Favorites stops asking the caller for the external id

Fact 4 makes the external id the field that selects the product and the uuid a formality. The
JSON argument therefore keeps `productId` and `toDelete`, and the external id is resolved from
the record behind the reference the caller gave. A caller who has a local number has, by
construction, everything the tool needs; asking them to also carry a number they cannot
remember was only ever an artefact of having nowhere to keep it.

Passing an external id belonging to a different product than the uuid is what fact 4 shows to
be silently destructive, and removing the field from the caller's hands removes that
possibility.

## Risks / Trade-offs

- **A stale local number resolves to the wrong product instead of failing.** → Accepted, and
  the same trade the branch and category tables already make. No output cites a local number as
  a lasting reference, and the database is disposable.
- **The tail rule stops holding.** → It is never stored, only resolved, and it is read
  strictly, so a slug it cannot read yields nothing rather than a wrong number. The fixture
  test names the day it changes.
- **The card starts reading the delivery context it demands.** → It is the last step of three,
  so everything resolvable without it stays resolvable. A branch is sent whenever one is known,
  so a branch-sensitive card degrades only the branchless commands. A failure is an unresolved
  value, which fails the command with the value named.
- **`orders offline` stops being one command, one call.** → Accepted deliberately, and it is
  the only command where it is. The calls are by exact key, fired together, and recorded, so the
  page pays once. A page of ten orders costs fifteen to twenty.
- **A code that resolves nowhere is asked for again on every render.** → Measured at 490 ms of
  a warm `orders offline`, spent on `498095`, which is the bonus round-up line rather than a
  product. Nothing is recorded for a miss, by the rule above, so nothing remembers it. Left
  alone here: caching a negative answer is its own change.
- **A wrong `--branch-id` on `orders offline` silently narrows what the server resolves.** →
  Fact 7 measures the effect at 24, 29 or 34 lines of 134. The lookup now covers the difference,
  every one of those lines being resolved by its own article code whichever branch was named,
  so the argument stops deciding how much of the output is usable.
- **Product numbers reach five digits.** → Fact 9 puts the cost at about one token per record
  against the alias, against 27 saved by dropping the slug and the external id.
- **A listing writes as many rows as it prints.** → A hundred per page, in one transaction, an
  order below the category tree's 1 009.
- **Dead `product` rows stay in the alias table** and `silpo aliases` will list them. →
  Accepted; the same was accepted for the branch and the company.
- **A caller scripting `favorites-update` with an external id of their own has it ignored.** →
  The resolved value wins, which is the point: fact 4 shows a mismatched pair silently
  favourites the wrong product, and the caller can no longer produce one. A caller scripting
  `products details <slug>` is unaffected, the slug being one of the three accepted forms.
