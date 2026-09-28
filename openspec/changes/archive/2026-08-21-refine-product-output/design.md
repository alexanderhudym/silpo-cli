## Context

See `proposal.md` — Why for the measurements this design rests on. What matters here is that
four record shapes carry a price and each of them declares the unit of that price differently,
or not at all:

| record | tools | flag for "sold by weight" | value naming a size |
| --- | --- | --- | --- |
| `Product` | search, batch, similar, favorites | `weighted` | `displayRatio` |
| `ProductDetails` | product card | `ratio` (`"кг"` / `"шт"`) — its `weighted` is wrong | `displayRatio` |
| `ProductLite` | replacements | `weighted` | none |
| `CartProduct` | cart snapshot | `weighted` | `ratio` (`"100г"` / package size) |
| `OfflineOrderProduct` | in-store receipt | `unit == "кг"` | `unit` (package size) |
| `OnlineOrder.products` | online order | none | none |

Two of these need pointing out. `get_product_details` returned `weighted: false` beside
`ratio: "кг"` for «Креветка варена 80/100» on 2026-08-21, the same product every listing
returns as `weighted: true` — a divergence already on record, reconfirmed. And the field
spelled `ratio` in a cart line holds what the listings spell `displayRatio`, while the field
spelled `ratio` in a card holds something else entirely. The names collide across tools; the
meanings do not.

## Goals / Non-Goals

**Goals:**

- One composed line for a priced product, built once and called from four commands.
- The unit of a price is read from a declared field of the payload, per record shape.
- Every printed amount is the payload's own number.

**Non-Goals:**

- Any arithmetic on money, weight or counts, in either direction.
- Any change to command arguments. `--quantity` keeps taking kilograms.
- Teaching `ProductLite` or an online order line a unit they do not declare.

## Decisions

### The price is printed per the unit the server priced it in

The storefront shows «Креветка варена» at `39.90 грн` for 100 г; the payload says `399`. The
obvious move is to match the storefront, and it was the first plan. It was dropped for three
reasons, in ascending order of weight:

1. It does not survive a round trip. «Хліб «Крафтяр»» is `100.43` per kilogram; a hundred
   grams of it is `10.043`, printed `10.04`, which multiplies back to `100.40`. The storefront
   has the same rounding, but the storefront is not also the thing you compute a cart total
   with.
2. It cannot be applied everywhere, and `output-rendering` requires that a value read the
   same whichever command printed it. `ProductLite` and an online order line carry no size at
   all, so their prices would have to be either converted on the assumption that a weighted
   product's reference unit is always 100 г, or left unconverted and inconsistent with the
   listing beside them.
3. It breaks the arithmetic a caller does with the numbers. `quantity` in a cart line, in a
   cart mutation and in an order line is kilograms. A price per 100 г multiplied by a
   quantity in kilograms is off by ten, and the record that shows price, quantity and total
   together would stop adding up in front of the reader.

Printing `399 ₴/кг` costs one suffix, keeps every identity intact, and is the same number the
caller sees again in the cart. The storefront figure is recoverable by anyone who wants it.

**Alternative considered:** print both, `39.90 ₴/100г (399 ₴/кг)`. Rejected — it is the most
expensive option in tokens and still leaves two numbers where a caller must pick the right one.

### The unit comes from a field the command names, never from a value

`output-rendering` forbids choosing a conversion by inspecting a value. That rule decides the
awkward cases for us: an online order line has a fractional `quantity` and nothing else, and
fractional-therefore-weighted is exactly the inference the rule forbids. It is also unsound —
a kilogram of cheese and one packet both arrive as `1`.

So the unit is a per-record-shape decision stated by the command, from the table above. The
card is the one place where the flag and the unit disagree, and the card takes the unit,
because that is the field the listings agree with.

**Alternative considered:** normalise every shape into one internal product type first, then
render. Rejected — the shapes genuinely differ in what they declare, and a normalising layer
would have to invent the missing declarations, which is the inference we are avoiding.

### `ratio` is a package size or nothing

For a product sold by the piece, `displayRatio` is the content of one package — `36г`,
`10шт`, `0.46л` — which is part of how a shopper names the thing, so it joins the name.
For a product sold by weight it is `"100г"` on every observation, a constant naming the
storefront's advertising unit, and since we do not advertise in that unit it says nothing;
it goes. The same rule reads an in-store receipt's `unit`, which is `"кг"` on weight-priced
lines, a package size on packaged lines, and `"шт"` on things counted individually — that
last is the one value that means "nothing to add" rather than a size.

### `company` is hoisted, `branch` is dropped

Both are constants of a listing, but for different reasons, and the difference decides where
they go. `branch` is an argument of the command that fetched the listing: all twelve products
of a three-query batch echoed the requested `branchId`. Printing it back is pure echo, so it
goes entirely — while a cart shipment's branch, which the caller did not supply, stays.

`company` is not an argument, and three tools require it as one, so it must remain reachable.
Every one of the 454 branches `list_branches` returns carries the same `companyId`, so in
practice it is one value per account — but "in practice" is not a contract, and a listing
whose records disagree must not be summarised into a section that lies. Hence: hoisted when
the records agree, printed per record when they do not.

**Alternative considered:** drop `company` from the output entirely and default
`--company-id` from `--branch-id` inside the CLI. It is the better end state and it is
input-side work on `command-input`, not this change.

## Risks / Trade-offs

- [The `common` section can be absent] → A caller that reads it unconditionally breaks on a
  mixed-company payload. Mitigated by making the fallback the ordinary per-record row, which
  is what every other field does, so the record is never missing information — only its
  position moves.
- [A weighted product whose reference unit is not 100 г] → Nothing breaks: no arithmetic
  depends on that value any more, and the value itself is no longer printed. This risk was
  the main cost of the rejected conversion and is now zero.
- [The card's unit field is the only defence against a known-wrong flag] → If the server ever
  fixes `weighted` in the card and breaks `ratio` instead, the card silently misprices. The
  golden fixture captured for the card pins the current contradiction, so a change in it
  fails a test rather than passing quietly.
- [**BREAKING** stdout shape] → Six keyed rows leave the product record. The CLI's own goldens
  are the only consumers in the repository; nothing outside it parses this output today.
- [Currency on every price] → A few tokens per record buy the distinction between a price and
  any other number in the record. The unit suffix is the part that carries information; the
  currency is there so that the price is unmistakable as one.

## Migration Plan

None. The change is confined to composed text; there is no stored data, no protocol and no
argument affected. Reverting is reverting the commit.

## Open Questions

None.
