## 1. The shared line of name and price

- [x] 1.1 Add one piece of shared text-building that composes the trailing keyless line from
  a name, an optional package size, a price, an optional previous price and an optional unit
  the price is per, and place it beside the other shared text-building in `src/utils/`, not
  in `value-conversion` — it composes several fields into one piece of text, which
  `output-rendering` already provides for, and it has no reading direction to pair with
- [x] 1.2 Give it the currency and the separator as its own constants, so no caller spells
  either
- [x] 1.3 Unit-test it directly in `test/`: with and without a package size, with and without
  a previous price, with and without a unit, and with a name the payload gave on several
  lines, which must still collapse to one

## 2. The product record

- [x] 2.1 `src/commands/products.ts`: in `productText`, drop the `name`, `price`, `oldPrice`,
  `ratio`, `company` and `branch` rows; keep `id`, `slug`, `stock` and the weighted-only
  `step`; rename `external` to `externalId`; close the record with the shared line
- [x] 2.2 Same file: suffix `stock` and `step` with the unit of weight when the product is
  flagged weighted, and pass that same unit to the shared line; a product not flagged
  weighted passes its `displayRatio` as the package size instead
- [x] 2.3 Same file: `productLiteText` follows 2.1 and 2.2 from the fields it has — it
  carries no size, so a weighted product there gets the unit and a piece-goods product gets
  no package size
- [x] 2.4 Same file: `detailsText` keeps `id`, `slug`, `stock` and `companyId`, drops the
  `branch` row, and decides the unit from the card's `ratio` field rather than its `weighted`
  flag, which the server returns wrong
- [x] 2.5 Same file: add the `common` section to `listingText` and to `batchText`, holding
  `companyId` when every product of the payload names the same company, and fall back to a
  per-record `companyId` row when they do not
- [x] 2.6 Same file: `replacementsText` inherits the record from 2.3; confirm its group
  headers and the `none` marker are untouched

## 3. The cart line and the order lines

- [x] 3.1 `src/commands/cart.ts`: in `detailsText`, drop the `name`, `price`, `oldPrice` and
  `ratio` rows from a product line, close the line with the shared line, and suffix
  `quantity`, `stock` and `step` with the unit when the line is flagged weighted
- [x] 3.2 Same file: leave the shipment's `company` and `branch` rows in place — a cart may
  hold more than one shipment and neither is an argument the caller passed — renaming their
  keys to `companyId` and `branchId`
- [x] 3.3 `src/commands/orders.ts`: in `onlineText`, close each line with the shared line and
  print no unit at all, because the payload declares none
- [x] 3.4 Same file: in `offlineText`, drop the `unit` row and read it instead — a unit of
  weight becomes the price's unit, any other size becomes the package size beside the name,
  and the value that merely counts pieces yields neither
- [x] 3.5 Check every remaining `formatEntryAsRow` key across the three files for the `Id`
  rule, so that no `company`, `branch` or `product` key survives where it names another
  entity's identifier

## 4. Fixtures and goldens

- [x] 4.1 `test/fixtures/products.details.json`: replace the piece-goods card with a captured
  weighted card — «Креветка варена 80/100», which returns `weighted: false` beside
  `ratio: "кг"` — so the card's weighted path and the contradiction it has to survive are
  both covered
- [x] 4.2 `test/fixtures/README.md`: record where that card came from and why it is the one
  the card test uses
- [x] 4.3 Confirm the existing fixtures already cover the rest: `products.search.json` holds a
  weighted product beside two piece-goods ones, `cart.details.json` holds two weighted lines,
  `orders.offline.json` holds a `"кг"` line, a `"500г"` line and a `"шт"` line, and
  `orders.online.json` holds fractional quantities with no unit. Add only what is missing
- [x] 4.4 Add a fixture whose products do not all name the same company, so the fallback in
  2.5 is exercised rather than only reasoned about
- [x] 4.5 Regenerate the goldens with `UPDATE_GOLDEN=1`, then read every diff and confirm each
  one shows only the intended edits

## 5. Write down what the probe found

- [x] 5.1 Record that `price` on a weighted product
  is the price of a kilogram, with the storefront comparison that proves it — «Креветка
  варена 80/100» at `price: 399` shown as `39.90 грн / 100г`, «Креветка гриль» at `price:
  599` shown as `59.90 грн` — and the two payloads that confirm the kilogram reading, the
  cart line arithmetic and an online order line
- [x] 5.2 Record that every product of a listing carries the `branchId` the request
  named, over the twelve products of the three-query probe
- [x] 5.3 Upgrade the recorded note that `companyId` is
  constant across observed branches to the full count — 454 of 454 branches returned by
  `list_branches`, Nova Poshta branch included — and record that it is the selling legal
  entity rather than the manufacturer, since products of four different producers carry it
- [x] 5.4 Record that an online order line declares no unit
  and no weighted flag while its price is per kilogram for weight-priced goods, and that an
  in-store receipt line's `unit` carries three different kinds of value

## 6. Verify

- [x] 6.1 Run the full suite; every golden not listed in section 4 must pass untouched
- [x] 6.2 Run `products batch` live for one weighted and one piece-goods query and confirm the
  printed records match the golden shape, unit suffixes included
- [x] 6.3 Run `products details` live for the weighted product and confirm its price names the
  kilogram even though the payload's `weighted` flag says otherwise
- [x] 6.4 Run `cart details` live against a cart holding a weighted line and confirm the
  printed price multiplied by the printed quantity equals the printed total
- [x] 6.5 Measure one weighted and one piece-goods record with the encoder
  `src/db/calls.ts` uses and confirm the reduction against the tokens recorded in the
  proposal. Done, and the proposal's baselines were corrected: the 85 and 112 first written
  there do not reproduce against any record in the repo or any record the live probe returns,
  so they were replaced with the two measured records, 74 and 81, both re-derivable. Measured
  reduction: 18% on the weighted record, 19% on the piece-goods one, 14% on the card block
  compared on identical data, and 6% over the nine changed goldens taken whole — the whole-file
  figure is lower because a cart snapshot and an order are mostly rows this change did not
  touch
