## 1. The token ledger

- [x] 1.1 Remove `recordCall` from all 53 call sites across the eleven command files, leaving each
      action ending on the write it already performs
- [x] 1.2 Delete `src/commands/gain.ts` and its registration, so `silpo gain`, `silpo gain calls` and
      `silpo gain clear` no longer exist
- [x] 1.3 Delete `src/db/calls.ts`
- [x] 1.4 Confirm `gpt-tokenizer` is still needed by `test/commands.test.ts` and keep or drop the
      dependency on that answer alone

## 2. The resolvers

- [x] 2.1 Delete `src/resolve/`, all six files
- [x] 2.2 Replace every `readProduct`, `readBranch`, `readCompany`, `readCategory`,
      `readNpSettlement` and `readNpOffice` call with the caller's own value, passed through
- [x] 2.3 Replace `readCartProducts`, `readCartProductRefs`, `readShipments` and `readCompaniesOf`
      with reading the JSON fields as they were given
- [x] 2.4 Remove the office coordinate fill from `readAddress`, leaving `officeId` and any
      coordinates the caller passed to travel as given
- [x] 2.5 Confirm no command invents a delivery type or a time slot for a lookup, the two invented
      contexts having gone with the files that held them

## 3. The database

- [x] 3.1 Delete `src/db/`, the remaining nine files
- [x] 3.2 Remove every `ensureProduct`, `ensureProducts`, `ensureCompany`, `ensureCompanies`,
      `ensureBranches`, `ensureCategories`, `ensureOrders`, `ensureAddresses`, `ensureNpOffices` and
      `ensureNpSettlements` call, and the identifier-collecting helpers that fed them
- [x] 3.3 Remove `paths.database`
- [x] 3.4 Confirm nothing imports `node:sqlite` and that the CLI starts with no `~/.silpo/silpo.db`
      present and creates none

## 4. What each command prints

- [x] 4.1 Print a product record with its uuid, its slug, and its external product id where the
      payload carries one, through the one shared record builder the four listing tools use
- [x] 4.2 Print a cart line with its product's uuid and slug, and a shipment with its company and
      branch uuids
- [x] 4.3 Print a category with its slug alone, in the flat listing, the search, the details and the
      popular listing
- [x] 4.4 Print a branch with its uuid and its store code, a company with its uuid, a settlement and
      an office with their uuids
- [x] 4.5 Print a receipt line with its catalogue product's uuid and slug where the line names one,
      and with no identifier where it does not
- [x] 4.6 Print an online order, a saved address, a coupon, a promo, a certificate and a household
      member with the identifiers their payloads carry, dropping a certificate's numeric id and
      keeping its barcode
- [x] 4.7 Confirm `common` hoisting still lifts a shared company out of every listing that has one

## 5. Commands whose surface changes

- [x] 5.1 Remove `--parent-id` from `silpo categories list`
- [x] 5.2 Remove `refuseHiddenCategory`, so an empty category listing prints as empty
- [x] 5.3 Keep the category tree's join against the flat listing, and drop the per-slug fallback that
      called `silpo_get_category`; print a node the listing does not cover with its slug alone

## 6. The skill

- [x] 6.1 Delete the `Ids` section entirely
- [x] 6.2 State beside each command which identifier it takes: uuid for a cart write, a removal and
      replacements; any of three for a product card and alternatives; slug for every category
      command; uuid for a branch, a company, a settlement and an office
- [x] 6.3 State that a branch's store code is for quoting to a person and is taken by no command, and
      keep the rule that a store is named to the user by its address
- [x] 6.4 Delete the `silpo gain` entries and the gotcha about the nil uuid branch
- [x] 6.5 State that a Nova Poshta cart address carries its own coordinates, beside `silpo cart setup`
- [x] 6.6 State that a receipt line without a catalogue product cannot be reordered
- [x] 6.7 Delete the gotcha claiming the cart is read once and kept, which contradicts both the
      section above it and the code
- [x] 6.8 Correct `silpo cart details` from "never changes it" to what it is — a read that can repair
      a lapsed slot, which is a write
- [x] 6.9 State that a cart ordered away mid-session is reopened on the settings it carried, and
      correct "it does not invent a cart" accordingly
- [x] 6.10 Correct "the server picks house" to the CLI picking it, and only when a cart is opened
- [x] 6.11 Correct the claim that no command takes a delivery context, which `silpo orders offline`
      does
- [x] 6.12 Collapse the nine facts stated twice into one home each, the command's own entry where it
      has one, under the rule the skill's own first rule already states

## 7. README

- [x] 7.1 Remove the measured token table, the command counts, the `silpo gain` example and the claim
      about the skill test
- [x] 7.2 Leave the file saying what the CLI is and how to install and authorize it, and nothing that
      a change of this size would falsify again

## 8. Tests

- [x] 8.1 Delete `test/calls.test.ts`, `test/identifiers.test.ts`, `test/records.test.ts`,
      `test/products-db.test.ts`, `test/store.test.ts` and `test/skill.test.ts`
- [x] 8.2 Reduce `test/category.test.ts` and `test/product.test.ts` to the rendering and lookup
      behaviour that survives, deleting only the cases about resolution
- [x] 8.3 Cover that a product record prints all three identifier forms where the payload carries
      them, and only what it carries where it does not
- [x] 8.4 Cover that a category is printed and taken by slug, and that the flat listing declares no
      parent filter
- [x] 8.5 Cover that a cart line prints its product's uuid and slug and that a cart write sends what
      it was given unchanged
- [x] 8.6 Cover that a receipt line with a catalogue product prints two identifiers and one without
      prints none, and that the command succeeds either way
- [x] 8.7 Cover that an office record always prints its coordinates
- [x] 8.8 Regenerate the 30 expected outputs that carry identifiers, and confirm the remaining 13 are
      untouched
