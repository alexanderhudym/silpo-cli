## 1. Fixtures and the test harness

- [x] 1.1 Capture each tool's payload through `silpo raw` at the start of its own group's
      task, using the argument notes in design.md, and turn it into a fixture then, replacing
      an older fixture of the same name and regenerating its golden in the same step
- [x] 1.2 Replace the account's real data — names, phone, email, addresses, loyalty card and
      purchase history — with synthetic values in every fixture before it is committed
- [x] 1.3 Do the same to the fixtures already committed: `test/fixtures/profile.profile.json`
      and `test/fixtures/profile.family.json` carry the account holder's real name and email,
      and `test/profile.test.ts` asserts those same strings, so all three change together.
      Leave `.claude-plugin/marketplace.json` alone — that email is an authorship field, not
      test data. This removes the data going forward only; what is already in the git history
      stays there unless the history is rewritten, which this change does not do
- [x] 1.4 Take two cart fixtures rather than one: a healthy snapshot, and one on a stale time
      slot, which carries `error` validations with `context` in both its shapes
- [x] 1.5 Generate fixtures for the six tools whose lists are empty on this account — coupons,
      coupon details, personal promos, promo codes, certificates, replacements — from the
      `outputSchema` published in the server's `tools/list` answer, and mark each as
      generated rather than captured
- [x] 1.6 Rewrite `test/golden.test.ts` to drive the built CLI through `test/harness.ts`
      instead of importing renderer modules, keeping `UPDATE_GOLDEN=1` and the checks for
      trailing whitespace and tabs
- [x] 1.7 Confirm the whole suite still passes with the profile goldens produced this way

## 2. Shared conversions

- [x] 2.1 Move the boolean flag group conversion out of `src/render/scalars.ts` into a
      converter by subject under `src/utils/`, with its own test
- [x] 2.2 Move the delivery cost tier conversion the same way, with its own test
- [x] 2.3 Leave the instant, coordinate and alias converters where they already are, and check
      that nothing in the new modules depends on the engine

## 3. products

- [x] 3.1 Compose the product record once, from the fields the four tools return, and prove it
      against the fixtures of all four
- [x] 3.2 Move `products search`, `products favorites` and `products similar` onto it,
      including their shared envelope
- [x] 3.3 Move `products batch`, grouping matches under each query in the order given
- [x] 3.4 Move `products details`, printing the attribute dictionary as the server keyed it and
      dropping the gallery and the page address
- [x] 3.5 Move `products replacements` and the favorites update
- [x] 3.6 Delete `src/render/commands/products.ts`, record the goldens, and measure the tokens
      saved against the raw payloads

## 4. np, branches, delivery

- [x] 4.1 Move both Nova Poshta lookups and delete `src/render/commands/np.ts`
- [x] 4.2 Move the store listing, replacing the requirement that it print nothing, and delete
      `src/render/commands/branches.ts`
- [x] 4.3 Move the address lookup, the delivery type lookup and the slot listing, using the
      conversions from group 2, and delete `src/render/commands/delivery.ts`
- [x] 4.4 Record the goldens and measure the tokens saved for the three groups

## 5. orders

- [x] 5.1 Move the online order history, nesting lines under their order and joining the
      address into one line
- [x] 5.2 Move the in-store receipts, printing the alias of the catalogue product behind a line
      where the payload names one
- [x] 5.3 Compare the lite product record here with the one in replacements; join them only if
      the two payloads agree field for field
- [x] 5.4 Delete `src/render/commands/orders.ts`, record the goldens, measure the saving

## 6. cart

- [x] 6.1 Move the cart snapshot: shipments and their lines nested, address on one line, totals
      and bonus state, no shipment id, no image
- [x] 6.2 Print validations in both context shapes, in the snapshot and in the certificate
      response
- [x] 6.3 Move the four confirmation payloads, keeping `exitOnFailure` after the text is
      written
- [x] 6.4 Move the certificate command, printing the server's message for a refused
      certificate
- [x] 6.5 Delete `src/render/commands/cart.ts`, record the goldens, measure the saving

## 7. catalog

- [x] 7.1 Move the flat category listing and the popular listing, each from its own shape
- [x] 7.2 Move the category page, with the path and the price range each on one line
- [x] 7.3 Move the category tree, indenting two spaces per level, printing every node
- [x] 7.4 Move promotions and product sets, dropping their page addresses
- [x] 7.5 Delete `src/render/commands/catalog.ts`, record the goldens, measure the saving

## 8. loyalty

- [x] 8.1 Move the loyalty card and balance, without the member id
- [x] 8.2 Move coupons, coupon details, personal promos, promo codes and certificates against
      their generated fixtures, printing the summary alone when a list is empty
- [x] 8.3 Move the premium subscription, keeping its links
- [x] 8.4 Delete `src/render/commands/loyalty.ts`, record the goldens, measure the saving

## 9. Remove the engine

- [x] 9.1 Give `src/render/table.ts` and `src/render/json.ts` their own cell mapper type and
      drop their dependency on `CELL` and `Renderer`
- [x] 9.2 Move `src/commands/gain.ts` off `renderList`, `renderObject` and `renderPayload` onto
      its own composed output, keeping its aligned pairs and dash-marked records
- [x] 9.3 Move `src/commands/aliases.ts` off the engine's `Renderer` type, keeping its table
- [x] 9.4 Delete `src/render/layout.ts`, `src/render/fields.ts`, the directory
      `src/render/commands/`, and the scalar renderers that only the engine called
- [x] 9.5 Remove the alias resolver seam — `AliasResolver`, `verbatimResolver`,
      `createMemoryResolver` and the uuid test — once nothing imports them
- [x] 9.6 Delete `test/layout.test.ts` and the resolver tests with their subjects

## 10. Close out

- [x] 10.1 Update the `## Purpose` of `openspec/specs/output-rendering/spec.md` by hand, since
      a delta cannot carry it, so that it describes the composed form rather than the engine
- [x] 10.2 Record the measured saving per group, including any identifier found to be
      consumed by no tool
- [x] 10.3 Run the full suite, confirm no golden holds a tab or trailing whitespace, and check
      that no module under `src/` still imports the engine
