## 1. The shared conversions

- [x] 1.1 Add `src/utils/number.ts` with the single decimal form, `toNumber` private to the
  module, `toInteger` derived from it and narrowed to exactly-holdable values, `isInteger`
  asked of the conversion rather than implemented beside it, and `requireNumber` /
  `requireInteger` raising a plain `Error`. No trimming anywhere in the module.
- [x] 1.2 Add `src/utils/boolean.ts` with `toBoolean` and `requireBoolean`, carrying the
  accepted words over from `options.ts`.
- [x] 1.3 Leave absence to the callers: no subject offers a conversion that accepts text
  which may be absent, and no shared reader factory is introduced.
- [x] 1.4 Add `src/utils/json.ts` with `parseJson`, `isJsonObject`, the raising shape checks
  for an object, an array and a list of entries, and the entry-field getters that accept a
  value written as a number as readily as one written as a string, each naming the field in
  its failure.
- [x] 1.5 Point `toExternalId` in `src/utils/slug.ts` at the shared whole-number reading and
  drop its own `Number.isSafeInteger` check.

## 2. Readers join their subjects

- [x] 2.1 Fold the time wording into `toUtc` in `src/utils/datetime.ts`, so no wrapper
  stands in front of a conversion that already raises.
- [x] 2.2 Move the coordinate raising onto `src/utils/coordinate.ts` as `requireLatitude` /
  `requireLongitude`, keeping the wording each raises today, including which axis failed.
- [x] 2.3 Move the JSON shape checks onto `src/utils/json.ts`.
- [x] 2.4 Move the text coercion out of `readText` into `src/utils/text.ts`, leaving the
  entry getters in `json.ts` to use it.

## 3. Call sites that gain a branch

- [x] 3.1 Build the `--timeslot` object from `start` and `end` where the tool call is built
  in `src/commands/carts.ts`, dropping `as unknown as CartTimeslot`, and delete
  `readTimeslot`.
- [x] 3.2 Branch the three states of `--promo-code` and `--bonus-requested` at their call
  site with the spread form, and delete `readNullableString` and `readNullableNumber`.
- [x] 3.3 Inline the repeatable-option gatherer at its three sites in
  `src/commands/delivery.ts` and `src/commands/products.ts`, and delete `collect`.
- [x] 3.4 Inline `process.exitCode = 1` at the seven sites in `src/commands/carts.ts` and
  `src/commands/products.ts`, and delete `src/commands/exit.ts`. Do not raise instead.
- [x] 3.5 Read `--limit` and `--offset` of `products similar` as whole numbers.

## 4. Dissolve the parsing module

- [x] 4.1 Repoint every import in `src/commands/` away from `options.ts` to the subject
  modules.
- [x] 4.2 Delete `src/commands/options.ts` and confirm nothing imports it.

## 5. Resolvers leave commands

- [x] 5.1 Move `branch`, `cart`, `category`, `company`, `np-office`, `np-settlement` and
  `product` from `src/commands/` to `src/resolve/`, unchanged apart from their imports.
- [x] 5.2 Replace the seven copies of the local-number regex with the shared whole-number
  predicate and reading, and check that `isSlug` in `resolve/product.ts` still classifies
  the same text it did.
- [x] 5.3 Fold `src/commands/input.ts` into `src/db/calls.ts`, declaring `CallOption`
  there and giving `recordCall` the command itself, so the thirty-nine recording sites stop
  spreading a translation into its arguments.

## 6. Tests

- [x] 6.1 Split `test/options.test.ts` into tests beside the modules the readers now live
  in, keeping every case it already covers, including that `@` carries no meaning and that
  an entry field written as a number reads as text.
- [x] 6.2 Add cases pinning the refusals the specs now require: an empty and a blank value,
  surrounding blanks, an exponent, a hexadecimal prefix, digit separators, trailing
  characters, and a whole number too large to hold exactly.
- [x] 6.3 Add a case pinning that `12.0` reads as the whole number `12`.
- [x] 6.4 Add a case pinning that a `--timeslot` field other than `start` and `end` is not
  forwarded.
- [x] 6.5 Add a case pinning that a fractional page size fails for `products similar` as it
  does for the other paged commands.
- [x] 6.6 Run the suite and the type checker; confirm no import of `options.ts` or
  `exit.ts` remains.

## 7. Absence moves to the call sites

- [x] 7.1 Call the conversion plainly at the fifteen sites reading an argument or a
  `requiredOption`, which cannot be absent.
- [x] 7.2 Write the branch at the thirty-two sites reading an option that can be absent,
  asking whether the value is absent rather than whether it is empty.
- [x] 7.3 Delete every reader built from the factory, and `src/utils/optional.ts` with
  them; confirm no signature under `src/utils/` takes `string | undefined`.
- [x] 7.4 Pin that `toUtc` names both accepted forms when it refuses, and that a page size
  written as an empty value still fails rather than being dropped from the call.
