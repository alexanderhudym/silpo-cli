## Why

The product record prints a price with no unit, and for a product sold by weight that price
means something other than what it looks like.

Probed live on 2026-08-21 against branch `1ee15e2a` (Київ, вул. Кирилівська 47А),
`SelfPickup`, slot 09:00–09:30:

- «Креветка варена 80/100» returns `price: 399`, `oldPrice: 579`, `weighted: true`,
  `step: 1`, `displayRatio: "100г"`, `stock: 9`. The storefront shows the same product as
  `39.90 грн` against `57.90 грн`.
- «Креветка гриль» returns `price: 599`, and the storefront shows `59.90 грн`.

So `price` on a weighted product is the price of a **kilogram**, and the site divides it by
ten to advertise a hundred grams. Two independent payloads confirm the kilogram reading
rather than the storefront one: the recorded cart contract holds a cart line where
`price 62.9 × quantity 0.2 = total 12.58`, and a live online order returns
`price: 209, quantity: 0.308, subtotal: 64.37` — in both, `quantity` is kilograms and
`price` multiplies with it directly. The CLI prints the bare number `399`, which reads as
the price of one item, and nothing in the record says otherwise.

Converting to the storefront's per-hundred-gram figure was considered and rejected; the
reasoning is in `design.md`. In short, the converted number cannot be multiplied by the
`quantity` the cart accepts, and «Хліб «Крафтяр»» at `price: 100.43` does not survive the
round trip (100.43 ÷ 10 = 10.043 → 10.04 → 100.40).

Alongside that, three of the record's eleven lines carry nothing the caller can use:

- `branch` is the branch the caller named in the command. All twelve products of a
  three-query batch echoed the requested `branchId`; it is an argument coming back.
- `company` is neither the manufacturer nor a property of the product. `list_branches`
  returns 454 branches and every one of them carries the same `companyId`, and the same id
  stands on products of Яготинське, Milupa, Злагода and the store's own bakery. It is the
  selling legal entity — «Продавець: ТОВ «СІЛЬПО-ФУД»» in the product's own attributes —
  and it is still required by `add_or_update_cart_products`, `get_replacements` and
  `update_shopping_cart`, so it has to stay reachable, just not thirty times per listing.
- `ratio` is the constant `"100г"` on every weighted product, and the size of one package
  on every other, which belongs beside the name rather than under a key of its own.

Measured with `gpt-tokenizer/encoding/o200k_base`, the encoder the CLI already uses for token
accounting, against the records the probe returned: the weighted «Креветка варена 80/100»
record costs 74 tokens, the piece-goods «Сирок глазурований PREMIA кокос 15%» record 81. A
record's cost tracks the length of its name, so the figure that carries is the share removed
rather than the digits: eleven keyed rows for facts that fit in six.

## What Changes

- The price stops being a keyed row. Each product record ends with one line carrying no
  key: the name, the package size where the product is sold by the piece, the price with
  its currency and — where the product is sold by weight — the unit that price is per, and
  the previous price where the payload carries one. For example
  `Креветка варена 80/100 — 399 ₴/кг was 579` and
  `Сирок глазурований «Волошкове поле» з ваніллю 26% 36г — 12.99 ₴`.
- **No price is ever converted.** Every amount is printed as the server sent it, and the
  unit suffix is a label, never a calculation. The same holds for `stock` and `step`, which
  keep the numbers the payload carries and gain a `кг` suffix on weighted products.
- Whether a product is sold by weight is read from a declared field, never guessed from a
  value: `weighted` in the listings, the cart and the replacement lists; `ratio` in the
  product card, because `get_product_details` reports `weighted: false` for products the
  listings report as `weighted: true` — reconfirmed live on «Креветка варена», which
  returns `weighted: false` beside `ratio: "кг"`; `unit` on an in-store receipt line. An
  online order line declares none of the three, so its price carries the currency and no
  unit.
- `branch` leaves the product record. It stays in the cart snapshot, where a shipment's
  branch is not an argument the caller supplied, and it was never printed on an order line.
- `company` leaves the product record and is printed once per listing, in a `common`
  section between the summary and the records. Where the records of one payload disagree
  on it, each record carries its own row instead, so the section never states something the
  payload contradicts.
- Keys that name an identifier of another entity say which: `company` becomes `companyId`
  and `external` becomes `externalId`. A record's own identifier stays `id`.
- `externalId` keeps being printed. `add_or_update_favorite_products` declares
  `externalProductId` in its `required` list, and `find_products_batch` accepts it as an
  exact-match search term, so it is an identifier a tool consumes.
- `ratio` stops being a row of its own everywhere. On piece goods its value joins the name;
  on weighted goods it is the constant `"100г"` and is dropped.
- `step` keeps a keyed row of its own, printed only for weighted products, suffixed `кг`.
  It stays the number the payload carries, so it can be passed to `cart add --quantity`
  unchanged.
- The cart line, the online order line and the in-store receipt line follow the same
  trailing keyless line, so one dialect covers every place a product is priced.
- **BREAKING** for anything parsing these commands' stdout: `price`, `oldPrice`, `name`,
  `ratio`, `company` and `branch` all stop appearing as keyed rows in a product record.

### Non-goals

- No conversion of any kind is introduced, in either direction. `cart add --quantity` keeps
  taking kilograms, unchanged and unsuffixed.
- The alias table is not taught to resolve a company from a branch. The 454-branch probe
  says the mapping is one to one today, but making `--company-id` optional is input-side
  work on a different capability.
- `slug` stays as it is, even though the article code repeats inside it in all twelve
  observed products. Dropping `externalId` on the strength of a pattern the contract does
  not state is not worth the round trip it would cost when the pattern breaks.
- The storefront's per-hundred-gram price is not shown anywhere, not even beside the
  per-kilogram one.
- `specialPrices` keeps the shape it has; a tiered price is quoted in the same unit as the
  price beside it and needs nothing this change introduces.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `product-search`: the requirements "The product record" and "Product card output" name
  the fields of a product record — the price and previous price under keys, the ratio, the
  company, the branch and the external id. The price, the name and the ratio become one
  keyless trailing line, the branch leaves, the company moves to a listing-level section,
  and a weighted price gains the unit it is per.
- `output-rendering`: gains a requirement for a field every record of a group shares, which
  is where the `common` section is defined, and the requirement "An identifier is printed
  only where a tool consumes it" gains two rules — an identifier that only echoes an
  argument of the same command is left out, and a key naming another entity's identifier
  ends in `Id`.
- `shopping-cart`: the requirement "Cart snapshot output" names the product line's name,
  price, previous price and ratio as separate fields. They become the same trailing line
  the listings use.
- `user-account`: the requirements "Online order output" and "In-store receipt output" name
  the line's name and price as separate fields. Both become the trailing line; the receipt
  line reads its unit from `unit`, and the online order line, which has no such field,
  prints no unit at all.

## Impact

- `src/commands/products.ts` — `productText`, `productLiteText`, `detailsText` and the
  three listing wrappers; a listing gains the `common` section.
- `src/commands/cart.ts` — the product lines of `detailsText`.
- `src/commands/orders.ts` — the lines of `onlineText` and `offlineText`.
- `src/utils/` — one place composing the trailing name-and-price line, shared by the four
  record shapes that carry a price.
- `test/fixtures/products.details.json` — the card fixture is a piece good (`ratio: "шт"`),
  so the card's weighted path, where `weighted` contradicts `ratio`, has no coverage. It
  gains a captured weighted card.
- `test/expected/*.txt` — every golden holding a priced product record: the six product
  goldens, both cart goldens, both order goldens.
- No change to the MCP client, the daemon, the alias store, the tool types or any command's
  arguments. No new dependency.
