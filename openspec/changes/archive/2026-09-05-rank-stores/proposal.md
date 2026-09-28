## Why

`silpo stores` answers the question the caller asked with the listing the server happened to page.
It takes seven options — `--near`, `--has-pickup`, `--has-np`, `--limit`, `--offset`,
`--from-distance`, `--to-distance` — and two rules about which of them may stand together, and it
orders by distance only when a place was named. Everything the account already knows about which
stores are the caller's own is unused: the CLI holds the store of every till receipt and every
address the caller has saved, and ranks a store by none of it.

That surface is the tool's surface, not the caller's question. `silpo_list_branches` pages — measured
2026-09-05, `limit: 5` returns five of 455 and `limit: 500` returns all 455 in one call, which
an earlier, now stale, measurement recorded as not working. So the CLI's default answer is
the server's first page: fifty branches in whatever order the server holds them, relevant to nobody.
Paging works, and it is the wrong question — a caller asking which store is theirs is not asking for
rows 50 to 100.

An agent driving this pays for that twice: once in the rows it did not want, and again in the turn it
spends narrowing a listing the CLI could have ranked itself.

## What Changes

- **BREAKING** `silpo stores` takes one positional query naming a place or a store, `--pickup`,
  `--np`, `--radius` and `--limit`. `--near`, `--offset`, `--from-distance` and `--to-distance` are
  removed, and with them both rules about which options may stand together. Every remaining option
  applies to every selection; none depends on another being present.
- **BREAKING** `--has-pickup <bool>` and `--has-np <bool>` become the switches `--pickup` and `--np`.
  Asking for the stores that do *not* support pickup, which `--has-pickup false` expressed, is no
  longer possible. It answers no question a caller has been seen to ask.
- **BREAKING** a filter narrows the corpus the answer is drawn from and is not a reason for a store
  to be in it. `--has-np true --limit 500`, which enumerated every Nova Poshta store in the estate,
  has no replacement; `silpo stores <place> --np` answers the same question about a named place, and
  `silpo raw silpo_list_branches` remains for a caller who wants the whole table uncompressed.
- **BREAKING** `--from-distance`, the minimum-distance half of the ring, is dropped rather than
  migrated. Widening `--radius` does not stand in for it — the radius is an upper bound and the page
  fills from the nearest — so a caller looking past the first few narrows the query instead.
- There are two situations, and the answer comes from whichever the caller is in:
  - **A query was given.** It names a place — a settlement, a full or partial address, a coordinate
    pair, a store code, a branch uuid, or one of the caller's own saved addresses by the label they
    gave it. Text is matched against the listing, then against those saved addresses, and geocoded
    only where it answered neither; a uuid or store code the listing does not hold fails naming it
    rather than being geocoded. The stores it matched come first, and the point it resolved to —
    for a text match, the best match's own coordinates — supplies the stores that follow. The
    caller's receipts do not decide *which* stores answer — asking about Lviv from Kyiv returns
    Lviv — but among the stores that did answer, one the caller shops at comes first.
- **BREAKING** text matching stops being substring containment and becomes word relevance. Measured
  2026-09-05, three of four natural queries return nothing today: `Кирилівська 47`,
  `вулиця Кирилівська` and `Київ Кирилівська` all find no store, because the listing writes
  `Київ, вул. Кирилівська, 47А` and the match is `String.includes`. Words are matched as words,
  street-type words earn nearly no weight because nearly every address carries them, and a partial
  building number ranks its building highest instead of matching nothing.
  - **No query was given.** The stores the caller's receipts name come first, most receipts first;
    then the stores within the radius of any saved delivery address, nearest first.
- `--radius` defaults to 15 km and bounds what counts as *near*, wherever nearness is the reason a
  store is in the answer. A store the caller shops at, or one the query named, stands however far
  away it is. Without the bound, "near one of my places" says nothing for a caller whose saved
  addresses are spread across the country.
- A store's row carries a line saying why it is there: the receipt count and the date of the last
  one, the distance and the point it was measured from, or the query it matched. The number that
  qualified is printed beside the page, so a store below the cut can be told from one a filter
  excluded.
- The store of a receipt is the one its `filId` names, joined to the store listing's own store code.
  The branch its products carry is **not** that store: measured 2026-09-05, `catalogProduct` is a
  live catalogue lookup in the branch the request named — the same twenty receipts asked against two
  branches return the same 139 lines with a different 103 and 105 of them carrying a card. It answers
  what a product costs there today, not where it was bought.
- **Online orders take no part.** Their branch is the one Silpo picked to fulfil from, not one the
  caller chose; and their address carries no coordinates, while every one of the eight distinct
  addresses measured on a live account is already a saved delivery address under a different
  spelling. Geocoding them would buy points the CLI already holds and risk phantom ones from a
  spelling mismatch.
- Two rules of the existing capability are consciously reversed, and the delta says so with its
  reasons. **A coordinate pair is accepted** by the store query, where the capability said no command
  takes one — a caller who already holds a point should not have to turn it into words for the CLI to
  turn it back. **The store code is accepted** as a handle, where the capability said it exists only
  to be quoted to a person — it is the value a caller reads off their own receipt.
- `--limit` is a maximum. Where fewer stores qualify than it allows, fewer are printed, and no store
  is added to fill the page.
- `open` stays in the printed record and leaves the ordering. It changes hourly, is `null` for some
  branches, and is meaningless for a delivery order, which is served by a slot and not by a door.
- `src/resolve/place.ts` becomes `src/resolve/stores.ts` and takes on the ranking. It fetches the
  listing, the till receipts and the saved addresses through the client it is already given, and
  returns the qualifying stores in order, each with the reason it qualified.
- The ranking module SHALL NOT read the cart. The cart is one of its callers — a cart being recreated
  has no branch to offer, and a cart asking for a branch while the ranking asks the cart for one is a
  cycle. Anything cart-shaped arrives as an argument or not at all.
- Nothing is stored. The three reads happen per command, as the current listing read already does.

## Capabilities

### New Capabilities

None. This changes how an existing capability answers, not what the CLI is for.

### Modified Capabilities

- `stores-and-delivery`: "Store listing", "Store listing output" and "Address resolution" are
  modified; "Stores ordered by distance" and "One store printed on its own" are removed and replaced
  by "Stores ordered by relevance to the caller", "A radius bounds what counts as near" and "A page
  size is a maximum". Ordering becomes relevance to the caller rather than distance from a named
  place; the option surface loses `--near`, `--offset` and the distance ring and gains `--radius`;
  paging becomes a maximum rather than a window; a query matching several stores yields an order
  rather than a printed list of candidates and a stop; and the query accepts a coordinate pair and a
  store code. The requirement that the listing is read once per command, held for the command only
  and recorded nowhere is unchanged and continues to bound the reads this change adds.

## Impact

- `src/resolve/place.ts` → `src/resolve/stores.ts`; its `PlaceClient` grows `getMyOfflineOrders`.
  `src/commands/stores.ts` loses four options, the two combination rules and its own distance
  sorting, which moves into the module.
- `src/commands/carts.ts` and `src/resolve/delivery.ts` import the address helpers from
  `resolve/place.ts` and follow the rename. Address resolution itself is untouched, and
  `resolveDestination` keeps stopping on ambiguity — the ordered answer is this command's, not the
  destination chain's.
- Reads per `stores` invocation: the listing paged at 500, the schema's maximum, until the estate is
  exhausted — one call while it stays under 500, as it is today at 455; at most five for the receipts
  at the ten the tool caps them to; one for the saved addresses. Seven at worst today against one.
  Traffic is not the cost being managed here; what reaches the caller is, and that shrinks from fifty
  unordered rows to the few that were asked for.
- The receipt read sends the empty string for each of the four arguments the tool requires and does
  not validate. Measured, that returns the same receipts as any plausible value and additionally
  makes `catalogProduct` `null` throughout, so the field that must not decide a store count is absent
  from the payload rather than merely unread. It also leaves the read independent of the listing, so a
  filter that excludes every store cannot cost the caller their history.
- No new runtime dependency. Ranking is arithmetic over arrays the CLI already holds.
- `test/stores.test.ts` and `test/resolve-place.test.ts` follow the surface and the rename;
  `test/harness.ts` gains the ability to vary a response by the arguments it was called with, which
  it cannot do today.
- The earlier pagination measurement is superseded: its central claim is now false.
- Out of scope, and named because the discussion that produced this change reached them: cart
  recreation from account history, splitting the unified scope resolver into category, promotion and
  set, and the silent-mutation reporting in `daemon/cart.ts`. Each is its own change.
