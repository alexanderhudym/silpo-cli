## 1. Storage

- [x] 1.1 Add the `products` table to the schema in `src/db/database.ts`: local id as autoincrement primary key, remote id text not null unique, nullable slug and nullable integer external id
- [x] 1.2 Add `src/db/products.ts` with an upsert keyed on the remote id that selects before inserting, fills in a slug or an external id the record lacks, never clears one it already holds, and never derives the external id at write time; add a bulk upsert for a whole listing and lookups by local id, by remote id, by slug and by external id
- [x] 1.3 Cover the storage module with tests: a new row takes the next number, a repeat keeps it, a record made from an identifier alone is completed by a later payload, a payload short of a slug or an external id leaves the stored one alone, and a row cannot be written without a remote id

## 2. Reading an external id out of a slug

- [x] 2.1 Add the conversion to `src/utils/`, both directions living together as the value-conversion spec requires: the digits after the last hyphen, matched strictly, yielding nothing where the tail is not a run of digits
- [x] 2.2 Cover it with tests: an ordinary slug, a slug whose number appears twice, a slug with no hyphen, a slug whose tail is not digits, and a tail too large to be a safe integer
- [x] 2.3 Add the fixture test asserting that every product in `test/fixtures/` carries an external id that is a safe integer and equals the tail of its slug, so a change in the server's shape is named the day the fixtures are refreshed

## 3. Resolving a product

- [x] 3.1 Add `src/commands/product.ts` with the reader: digits are looked up as a local number, a value in the form of a uuid is looked up as the remote id and passed through when unrecorded, anything else is looked up as a slug
- [x] 3.2 Give the reader the resolution order — the record, then the tail of the slug for an external id, then the product card tool — stopping at the first step that answers and recording what it returns, and passing an unrecorded value through where its own form is what the call wants
- [x] 3.3 Add the lookup beside the reader: one call to the product card tool taking a uuid, a slug or an article code as its key and answering with the identifier and the slug, with every failure turning into nothing found rather than an error of its own
- [x] 3.4 Reach no tool but the product card to resolve a product, and never the batch search
- [x] 3.5 Fail the command naming the value where no step resolves it, and never fetch a listing to look for an unrecorded local number
- [x] 3.6 Cover the resolver with tests: each input form, an external id taken from the slug with no call made, an unrecorded slug passed through where a slug is wanted and failing where an identifier is wanted, a uuid resolved through the lookup, that lookup made under the nil branch where none is named, a resolution recorded so a second command makes no call, and each way a value fails

## 4. Recording what is printed

- [x] 4.1 Record products from every payload that carries them — the filtered listing, the batch search, the alternatives, the favorites list, the product card, the cart snapshot, the replacement groups and their replacements, and both order histories
- [x] 4.2 Record an online order line under its identifier alone, making no call to complete it
- [x] 4.3 Record a receipt line that carries a catalogue product with all three identifiers, taking the external id from the article code on the line itself rather than from the catalogue product, which carries none
- [x] 4.4 Resolve a receipt line that carries no catalogue product through the lookup, once per distinct article code not already recorded, all of them together, and print the local number it yields
- [x] 4.5 Print a receipt line whose code the lookup does not answer for with no identifier, record nothing for it, and neither fail the command nor retry
- [x] 4.6 Cover recording with tests: a listing writes its products in one transaction, a payload short of a slug adds no gap to an existing record, a receipt line records the article code from its own level, a repeated code is looked up once, a code already recorded is not looked up at all, and a lookup that finds nothing leaves the line bare and the command successful

## 5. Commands

- [x] 5.1 Take a product reference in `products details` and `products similar` where a slug was taken, resolving it to the slug those calls require
- [x] 5.2 Take product references in `products replacements` and resolve them to the identifiers that call requires
- [x] 5.3 Drop `externalProductId` from the `products favorites-update` JSON argument, resolve it from the record behind each named product, and fail the command naming a product no step supplies one for
- [x] 5.4 Read a product as a local-number field rather than an alias field in every JSON argument that carries one, `cart add` included
- [x] 5.5 Update the help of every option and argument that takes a product to name the forms it accepts, in the wording the command-input spec requires
- [x] 5.6 Resolve a JSON entry's own branch before its other fields and hand it to the product resolution of that entry, so a cart line asks under the branch it names
- [x] 5.7 Let a command that names no branch reach the lookup all the same, filling the branch the tool demands with the nil uuid, so `cart remove` and `products favorites-update` take a slug they hold no record of; cover it with tests asserting which branch each call names

## 6. Output

- [x] 6.1 Print the local number in place of the alias in the product record, the product card, the cart snapshot, the replacement group headings, the favorites confirmation, and both order histories
- [x] 6.2 Drop the `slug` and `externalId` rows from the product record, and the `slug` row from the product card
- [x] 6.3 Update the golden outputs and the expected texts for every command that prints a product
- [x] 6.4 Confirm the measured saving against a hundred-product listing, so the number in `design.md` is checked rather than asserted

## 7. Retiring the product alias

- [x] 7.1 Remove the `product` entity from `src/utils/alias.ts` and every declaration that names it
- [x] 7.2 Update the alias tests that used a product as their example to use an entity still in the set
- [x] 7.3 Run the whole suite and confirm no command reaches `toAlias` for a product

## 8. Retiring the storefront route

- [x] 8.1 Resolve through the product card tool instead, filling the delivery context it demands with the nil branch and fixed values the server does not read, measured against the route it replaces before the swap
- [x] 8.2 Take the external product id a resolution needs out of the slug the card returned, storing no value the server did not send, and keep a receipt line's article code from the line it was asked with
- [x] 8.3 Delete `src/api/` and the `api.baseUrl` setting, leaving no code outside the MCP surface
- [x] 8.4 Drop the stub HTTP server from the test harness, answering a lookup from the stub daemon and keeping a resolution out of the calls a test sees a command make
