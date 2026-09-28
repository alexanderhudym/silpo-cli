---
name: silpo
description: Drives the silpo CLI, a token-frugal wrapper over the Silpo MCP server. Use for anything to do with Silpo, the Ukrainian grocery chain — filling a shopping cart from a list, searching the catalogue, prices, promotions and discounts, checkout, stores and branches, delivery, pickup, Nova Poshta and time slots, loyalty bonuses, coupons and certificates, order history, profile, family, restrictions and favourites.
---

# silpo

A CLI over the Silpo MCP server. Resolution — which product a list item means, which delivery type and branch serve a
destination, which slot to book — happens inside the CLI; no command takes any of those, or a JSON document.

## Before anything else

- The branch, the delivery type and the time slot every command works within come from the active cart, read afresh each
  time so a change made elsewhere is already there; no catalogue or cart command takes any of the three, nothing here
  restarts the background process, and a cart ordered away mid-session reopens on the settings it carried.
- A lapsed slot is replaced automatically before any call whose answer depends on stock or price, read or write; the
  repair touches the slot alone, and there is nothing to check or fix by hand.
- With no cart, every catalogue and cart command fails with `this account has no shopping cart` — ask the person where
  the order should go and give that to `cart setup --to`, the one command that opens a cart from a destination.
- Every product `cart fill` or `products find` names comes from a call made for the question that was asked — a term the
  account has bought or searched before is searched exactly like any other.
- A quantity the branch cannot fully honour once written is reduced, and a product it cannot supply at all is named and
  left in the cart for the person's call; where `cart fill` finds the branch already holds less of a resolved product
  than the list asked for, it puts that to you instead of writing it short — see "Resolving a list" below for the three
  ways to answer it. Where more than one candidate is plausible — a destination, a delivery type, a list item, a
  category or promotion named by title — a command prints the candidates and stops rather than choosing, and a printed
  candidate list is answered rather than retried.

## Rules

- Put a whole shopping list into the cart with one `cart fill` call.
- Commands that do not need each other's answers go in one shell invocation, and so does a write with the read that
  verifies it. A command taking one handle at a time — `products card`, `np` — goes the same way: the several calls in
  one invocation, not one step each, and never a hunt for a version of it that takes a list.
- Checking a set of products already known — an order's lines, a printed list — is one `products find` call with a query
  per argument, never a call per product; several categories, promotions or sets, or a mix of kinds, still cost one call
  — see the `products find` entry for how they combine.
- Nothing already printed is read again — a card, a candidate, a price.
- Composition, allergens, nutrition and country of origin live only on the card, so a question turning on any of them is
  `products find --details` over every product at once — one call, one card each — never `products card` per product,
  never your own knowledge of what a food usually contains. Answer from what the card printed, and where a card carries
  no such attribute say so rather than filling the gap: the attributes are not uniform, and a card without an allergen
  line is not a card declaring the product free of it.
- Don't do by hand what a command does for itself: no `cart details` before working with the cart, no `products find`
  ahead of `cart fill`, no address lookup ahead of `cart setup --to`, no slot listing ahead of `--when`.
- Nor after: every write to the cart ends by printing the cart it produced, in full — the delivery type, the slot, the
  address, the `total`, the bonus row, the validations. `cart details` after a write reads back what that write just
  printed. It is for looking at a cart you have not touched this turn.
- A network failure — a timeout, a gateway error, no answer at all — says nothing about
  the shape of what you sent. Repeat the same call once. Shorten a list only after a short one fails too, and never
  conclude from one timeout that the command cannot take long lists: it can, and splitting the list turns one call into
  a dozen. Where the call that timed out was a **write**, read the cart before repeating it — the write may have reached
  the server and landed, and repeating it blindly puts the same products in twice.
- A rate limit is waited out inside the CLI, so one that still reaches you has already been waited out and repeated.
  Sleeping in the shell and running the command again will not clear it — say what is happening instead.
- Quote every piece of the person's own text — a list item, a query, a destination.
- Pass an identifier or a delivery type back exactly as the CLI printed it, never a familiar-looking stand-in.
- Never read a machine handle — a uuid, a slug, an external id, a barcode — out to a person; name a product by its name, a
  store by its address, an order by its date.
- Never write a plastic bag into a shopping list, under whichever of the shop's names it carries — drop it before the
  list reaches `cart fill`, without asking the person, whether the list is fresh or built from a past order's products.

## Commands

### The cart

- **Turn a shopping list into cart lines** — `--pick` (repeatable) answers a question naming a candidate; `--accept-stock`
  (repeatable) and `--fill-with-alternatives` (repeatable) each answer a question naming a shortfall; `--dry-run` resolves
  without writing; `--ask-all` puts every item to you; see "Resolving a list" below.
  `silpo cart fill <item...> [--pick <term=id>] [--accept-stock <term>] [--fill-with-alternatives <term>] [--dry-run] [--ask-all]`
  An item may carry how much of it to buy — a bare count, a count in pieces, or a weight where the product is sold by
  weight. A number counts the product's own step, the increment the branch actually sells it in: for a packaged product
  that is one pack, so `авокадо 2 шт`, sold singly, buys two; for a weighted product the step is a mass, so a count
  against one buys that many of its step rather than that many pieces — `морква 2 шт` against a product sold in steps
  of 0.2 kg buys 0.4 kg. A weight against a weighted product is raised to the next whole step where the step does not
  already divide it, and the settled line states the raising: `куряче філе 300 г` against a 0.5 kg step buys 0.5 kg,
  and `морква 0.5 кг` against a 0.2 kg step buys 0.6 kg. Write the amount there rather than correcting the line
  afterwards. A number in pieces against a product that states its own contents in pieces buys `ceil(n ÷ contents)`
  packs: `яйця курячі 10 шт` buys one carton of ten, because that is the pack. A percentage or a pack size says which
  product instead, never how much.
- **Read the cart** — products, totals, delivery context, checkout links.
  `silpo cart details`
- **Change how much lines hold, or one line's comment, several in one call** — the quantity is a new total, not an
  increment; a weighed product is kilograms in multiples of its step. Pairs follow each other, a uuid then its quantity,
  and every correction a cart needs goes in one call rather than one call each — never a shell loop over the command.
  `silpo cart set <product> <quantity> [<product> <quantity>...] [--comment <text>]`
  `<product>` is the uuid the cart's own snapshot prints for the line — never the product's name. `--comment` names one
  line's comment, so it goes with a single pair; with more the call fails rather than commenting all of them.
- **Take products out of the cart, several in one call.**
  `silpo cart remove <product...>`
  `<product>` is each line's uuid, from that same cart snapshot — never a name.
- **Empty the cart.**
  `silpo cart clear`
- **Send the order somewhere, change when it arrives, move it to another store, set feedback choices, or open the account's
  first cart** — pass only what is changing.
  `silpo cart setup [--to <text>] [--when <time>] [--delivery-type <type>] [--feedback-changes <choice>] [--feedback-contacts <choice>]`
  `--to` is the only way a destination is named, and it takes every way of naming one: an address, a store by its address or
  by the branch uuid an ambiguity printed, or a settlement and, after a comma, which office. It resolves the address, the
  type, the branch and a slot together, as one chain — there is no option that moves the branch on its own. Where a store
  is what is wanted, pass `--delivery-type SelfPickup` alongside it: that is what makes the text resolve against the
  store listing rather than against the account's saved addresses or the geocoder. `--when` takes `today`, `tomorrow`, a
  date, or a date and time; `--delivery-type` takes `SelfPickup` or `DeliveryHome` for pickup and home delivery, and any
  other value is named by the CLI's own error when the guess is wrong; `--feedback-changes` takes `approvedChanges` or
  `disapprovedChanges`, `--feedback-contacts` `call` or `doNotCall`.
- **Apply a promo code, or name `none` to clear it.**
  `silpo cart promo <code>`
- **Spend loyalty bonuses, or name `none` to stop.**
  `silpo cart bonus <amount>`
- **Confirm the buyer is old enough for a restricted product.**
  `silpo cart adult`
- **Pay part of the order with a gift certificate.**
  `silpo cart certificate add <barcode> [--pin <code>]`
  `<barcode>` is what `me certificates` prints for it.
- **Take a certificate off the order.**
  `silpo cart certificate remove <barcode>`
  `<barcode>` is the same value, from the same listing.

### The catalogue

- **List products** — a free-text query (repeatable: several known names travel in one call, one item per argument), or a
  population named by `--category`, `--promotion` or `--set`, or by `--favorites`. Repeating the option of one kind
  unions its populations into one; giving the options of different kinds together intersects them — the saved products
  together with a category lists only the saved products that lie in that category. Naming a category names its whole
  subtree; its children are never named beside it to reach them. A query is not a population of its own: it is the filter
  and the ordering applied over whichever population the other selectors chose, or, where none were given, over the
  catalogue's own answer to it. The listing is ordered by how many of the query's own probes returned a product, then the
  shop's own position for it, then, where both records carry a size of the same kind, the smaller package — nothing else
  enters that order: not what the reader has bought, not what they have saved, not what is discounted. A product two or
  more queries matched prints once, naming every query that found it. Where the one decisive match is out of stock at
  this branch, its alternatives are fetched and printed beneath it, unasked, each marked as an alternative to it.
  `silpo products find [<query...>] [--category <name>] [--promotion <name>] [--set <name>] [--favorites] [--must-have-promotion <bool>] [--in-stock <bool>] [--from-price <amount>] [--to-price <amount>] [--sort-by <field>] [--sort-direction <dir>] [--limit <n>] [--details]`
  `--category` names a category by its slug, its identifier or its title; `--promotion` a promotion by its code or its
  title; `--set` a set by its slug or its title; each repeatable. `--limit` defaults to 10 and bounds what each query is
  answered with, not the merged listing; where a selector was searched alongside queries, its remaining products fill
  only what the queries left. There is no offset. `--sort-by` takes `popularity`, `score`, `title`, `price`,
  `promotion`, `productsList`, `slugsList`, `guestRating` or `carouselList`; `--sort-direction` takes `asc` or `desc` —
  both honoured only over a single category, promotion or set with no query; anywhere else the call fails. Sorting by
  `price` across a population holding both weighed and packaged goods orders a price per kilogram against a price per
  pack — the server states this itself as a limitation, so read such an order as a rough one and compare the printed
  prices rather than trusting the position. `--details` fetches a card for every printed product, concurrently, and
  names any it could not get one for.
- **Read one product's full card** — composition, nutrition, attributes; a uuid, a slug or an external product id all reach
  it. One product per call, and only where the card itself is the point: whether a set of products is in stock, and at what
  price, is `products find` over their names in one call.
  `silpo products card <product>`
- **Save products to favourites** — a uuid, a slug or an external product id, up to 5 per call.
  `silpo products favorite <product...>`
- **Remove products from favourites**, the same three forms and the same up-to-5-per-call cap.
  `silpo products unfavorite <product...>`
- **List categories, promotions and sets in one listing.**
  `silpo catalog [<name...>] [--limit <n>]`
  With no text: the branch's promotions, then its whole hierarchy, then its sets, in that fixed order; the page size does
  not apply to any of them. With a text: write a name the shop uses — a category, a promotion or a set, or an
  approximation of one — never a description of a need. The search matches the words of the shop's own Ukrainian
  titles and nothing else, and nothing is translated for you. A text sharing no word with any title returns nothing;
  read that as the answer, not as a failure. A record returned for sharing a single word with the text is not evidence
  the text was understood. Each of the three kinds is
  matched on its own, so a category's position beside a promotion or a set says nothing about which is the better match.
  `--limit` (default 10) then trims the bottom of each kind's own match; there is no offset — reach a further record by
  narrowing the text or raising `--limit`.
  Every category carries the number of products it holds at this branch, for the session's delivery type and time slot. A
  category holding nothing at this branch is neither printed nor nameable; report it as not stocked here, not as absent
  from the catalogue. Naming a category is enough to reach its whole subtree, printed beneath it to whatever depth it
  runs — there is nothing deeper than what's printed. Nothing here asks which kind a name belongs to before it's tried.

### The account

- **See whether the session is authorized, and sign in** — `--force` re-authorizes, `--no-browser` prints the URL instead of
  opening one.
  `silpo login [--force] [--port <port>] [--no-browser]`
- **Sign out.**
  `silpo logout`
- **Who is signed in** — profile, loyalty balance, premium subscription.
  `silpo me`
- **The saved delivery addresses.**
  `silpo me addresses`
- **Household members, children and pets.**
  `silpo me family`
- **Dietary restrictions and food preferences.**
  `silpo me restrictions`
- **The coupons available to the user.**
  `silpo me coupons`
- **What one coupon covers.**
  `silpo me coupon <businessCouponId>`
- **Personal promotions and active promo codes.**
  `silpo me promos`
- **Gift certificates the user holds.**
  `silpo me certificates [--limit <n>] [--offset <n>]`
- **Order history — online, or in-store receipts with `--offline`.**
  `silpo me orders [--offline] [--date-start <time>] [--date-end <time>] [--limit <n>] [--offset <n>]`

### Stores, times and Nova Poshta

- **List stores ranked by relevance to the caller.**
  `silpo stores [<query>] [--pickup] [--np] [--radius <km>] [--limit <n>]`
  Send a place, not a sentence about one: the query takes a settlement, an address, a coordinate pair, a district, a metro
  station, a landmark, a branch uuid or a store code, all sent the same way — don't decide which of them you're holding.
  Leave out politeness, proximity and question words; send the retailer's own name with the rest of the query rather
  than stripping it out.
  Write a settlement in the spelling Ukraine uses today. Another language's name, a transliteration or a former name goes
  through the map and may resolve elsewhere — the line naming where the stores came from is where that shows itself. A
  query mixing alphabets fails naming the value; ask the person for the spelling rather than guessing one.
  `--pickup` and `--np` narrow to stores with self pickup or with Nova Poshta before the ranking; `--radius` (default 15)
  bounds what counts as near; `--limit` (default 10) trims the bottom of the ranked page. The first result is the answer.
- **A branch's delivery time slots** — `--branch` defaults to the cart's own; `--type` repeatable, taking `SelfPickup` or
  `DeliveryHome`, the CLI's own error naming the rest for anything else.
  `silpo slots [--branch <uuid>] [--type <type>] [--limit <n>] [--start <time>] [--end <time>]`
- **Find a Nova Poshta settlement, or its offices with `--office`** once the settlement is the one.
  `silpo np <settlement> [--office <text>]`

## Resolving a list

`cart fill` sorts every item into one of four outcomes:

| outcome | written? | what it owes you |
| --- | --- | --- |
| **auto** | yes | report the printed name and price; nothing to verify |
| **ask** | no | a decision — answer it as below |
| **warn** | yes | touches a stored dietary restriction; raise it with the person rather than treat it as settled |
| **miss** | no | report as a term not found at this branch, not as a product that does not exist; repeating changes nothing |

An **auto** or **warn** line answered with `--fill-with-alternatives` can still fall short: where none of the
alternatives are sold in the product's own unit, the remainder goes unwritten and prints as a `short <term>: …` row
naming what the branch holds against what was asked for — read that row before reporting the list filled, the same
as an `ask` or a `miss`.

A pick is automatic where one candidate accounts for every word of the term and no other answers it as fully — that is
the rule to give when you are asked why something was chosen without being asked about, there being no command that
answers it after the fact. Where two or more account for every word, tie on how many probes returned them, and answer
the term at least as well as the first candidate does, the caller's own purchases decide between them, then their saved
products, then which of the tied candidates the shop is promoting, and only then the first the catalogue returned. A
candidate that answers the term less well is never reached by any of them, however it is priced. Purchases and saved products are read live with the search,
not kept between commands, so there is nothing to warm, rebuild or check.

A term becomes an `ask` where more than one candidate is plausible, where none is, or where the branch has none of the
match or can fill it only in part — in the last two it is named rather than written short, with what the branch holds
against what was asked for, and the alternatives already fetched as its candidates.

Every `ask` from one call is answered together, in one further call, repeating the whole original list alongside the
answers — an item already written is not written again, and a quantity on a term is carried by that term as first
given, not by the answer. Name a chosen candidate with `--pick <term>=<id>`, the term as printed and the id printed
beside it. Where the `ask` names a shortfall, answer instead with `--accept-stock <term>` to take what the branch
holds, or `--fill-with-alternatives <term>` to take what it holds and make up as much of the rest as the printed
alternatives can carry — an alternative only fills the remainder where it is sold in the product's own unit, and
where none is, the remainder goes unfilled and prints as a `short` row rather than as a plain `auto` line.
`--pick` still answers a shortfall too, by naming a different product outright. The two forms compose on one term:
`--pick <term>=<id>` together with `--accept-stock <term>` takes what the branch holds *of the product you picked*, and
with `--fill-with-alternatives <term>` makes the rest up from that product's own alternatives; a picked product that is
itself short is asked about again if you name no shortfall answer for it. Choose the candidate from what was
already printed: decide it yourself where the person's request already settles which one, put it to the person where
it does not, and never search again for a term just asked about. An auto-resolved line names the term it answers, then
the product and its price, then the amount written where the product is sold by weight or the count is not one; an
identifier appears only on an `ask` row. That term is the one `--pick` takes, so a line you disagree with is overridden
by repeating the call with a pick for it — read the settled lines rather than only counting them.

## What to offer

- Where the cart's report carries a `bonus: <available> of <total>` row and no `bonusRequested` row, offer to spend the
  available bonus in the same report that hands the finished cart back — never before it — and spend it only once the
  person agrees, with `cart bonus <amount>`.
- Hand back every link the cart printed, whole: the `checkout` link, and the `checkoutMobile` link too where it printed
  one.
- Where the person named a budget, fill or cost the order as close to it as the catalogue allows without passing it, and
  never report the order as ready while the cart's own `total` — printed once, at the head of the cart, never a line's
  own — stands above it; reduce it with `cart set` or `cart remove` until it doesn't, each write printing the new
  `total` with the cart. The same rule holds where nothing is written and a list is only costed from the prices
  `products find` printed.

## Reading results

- A `validations` row is a level, a type and a stable identifier, printed as `<level> <type>: <identifier>`, with any
  values the server sent for it indented beneath it. Never read the identifier out to a person — say what the row means
  in their own words, built from the values beneath it where there are any, and otherwise from what the identifier
  itself names. Only a row at `error` level blocks checkout; a row at any other level still reaches the person.
- In a product listing or a product's own card (`products find`, `products card`), a product printed `unavailable`
  beside a price of `0` is not sold at this branch — never describe it as temporarily out of stock. A product printed
  with a real price but `stock: 0` is out of stock right now.
- `cart fill` uses `unavailable` for something else again: inside an `ask` row it names a product this branch cannot
  supply at all — don't carry the listing's meaning of the word across to it.

## Writes that report success without effect

- **The cart is unchanged after `cart remove`.** The uuid named isn't one this branch carries; the write reports success
  anyway — read the printed cart, not the exit code, to see whether it changed.
- **A promo code is accepted and no discount appears.** Codes are stored without validation; only the totals in the printed
  cart say whether it did anything.
- **`cart adult` cannot be undone.** It is the only command there is, and the confirmation cannot be withdrawn once given —
  put it to the person before running it, not after.
