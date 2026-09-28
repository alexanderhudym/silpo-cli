# Fixtures

Every payload here was captured from the live MCP server through `silpo raw`, with the
account's own data replaced by synthetic values, except for the files listed below.

## Generated from the tool contract

These lists are empty on the account the CLI was built against, so their payloads were
written from the `outputSchema` the server publishes in its `tools/list` answer. They prove
that the command prints what it says it prints, and nothing about the server.

- `loyalty.coupons.json`
- `loyalty.coupon.json`
- `loyalty.promos.json`
- `loyalty.promo-codes.json`
- `loyalty.certificates.json`

## Captured, then cut

`branches.branches.json` holds the first four of the 454 stores the server returned. The store
listing ignores `limit`, so there is no way to ask it for fewer, and the summary still reports
the full 454 the call found.

`categories.tree.json` holds the first of the 28 top-level categories, subtree intact. The tree
lookup takes no page argument, and the whole tree is 1009 nodes. That the command prints a
tree of any size is proved by an assertion instead, in `test/catalog.test.ts`.

`categories.list.json` holds the nine categories that `categories.tree.json` names and nothing
else, captured on 2026-08-24 from branch `1ee15e2a` through two `parentId` calls, with its
`meta.total` cut to match. The tree carries no ids and no titles, so the tree render joins it
against this listing; a listing of four unrelated rows, which is what this file held before,
could not exercise that join.

`categories.nested-list.json`, `categories.nested-tree.json` and `categories.nested-popular.json`
are written, not captured, to feed `catalog.whole` in `test/golden.test.ts` — the one golden the
catalogue command has. They describe four roots two and three levels deep, three categories the
tree reports no count for (`sik`, `yaitsia`, and the whole of `pobutova-khimiia`) so the hierarchy's
summary states a non-zero dropped count, and two popular categories — one a root
(`ovochi-frukty`), one a descendant (`syr`, under `moloko-yaitsia`) — so the summary states a
non-zero joined count and the hierarchy shows both a root that is itself marked and a root led by
naming the descendant that moved it. No captured payload was this shape at hand, and the point of
the golden is to exercise that shape rather than any one branch's real catalogue.

`orders.online.json` and `orders.offline.json` were written from the shapes the live history
returned, with the account's own purchases replaced by catalogue products and its delivery
address by a synthetic one.

## Captured for the contradiction it carries

`products.details.json` is the card of «Креветка варена 80/100», captured on 2026-08-21 from
branch `1ee15e2a` on `SelfPickup`. It is the card fixture because it returns `"weighted": false`
beside `"ratio": "кг"` — a divergence observed live, where
the card contradicts every listing that returns the same product as weighted. The card decides
what a price is per from `ratio`, so this payload is the one that proves it reads the right
field. Do not replace it with a piece-goods card: that path is already covered by the listings,
and this contradiction is covered nowhere else.

## Written to exercise a fallback the server never shows

`products.mixed.json` holds two products with different `companyId` values. No captured payload
can do this: all 454 branches `list_branches` returns carry one company, so every real listing
agrees with itself. The listing hoists a shared company into the `common` section and falls back
to a per-record `companyId` row when the records disagree, and this fixture is the only thing
that exercises the fallback. Do not read two companies as evidence of the server's behaviour.

## Captured, then given a value never observed

In `np.offices.json` the office `Відділення №10` carries `"status": "TemporarilyClosed"`. That
value is invented. Across 40 live office records from three settlements the field held
`Working` and nothing else, and no other value has ever been observed, so the office listing's conditional status line has no captured data that
would exercise it. The other 24 records keep the status they were captured with. Do not read
`TemporarilyClosed` as evidence of the server's vocabulary — the command prints whatever
string arrives, and this one was chosen only because it is not `Working`.
