## 1. Coordinates as two options

- [x] 1.1 Add `readLatitude` and `readLongitude` to `src/commands/options.ts`, each reading
      one value through `toLatitude`/`toLongitude` and failing with the existing per-axis
      message, and each also failing on a value that is not a finite number
- [x] 1.2 Replace the positional `<lat,lng>` on `delivery types` with required
      `--latitude <deg>` and `--longitude <deg>`, drop `.allowUnknownOption()`, and build
      the call from the two readings
- [x] 1.3 Remove `readCoordinates` from `src/commands/options.ts`, and `toCoordinates` with
      the `CoordinatesRead` shape and the `pair` failure from `src/utils/coordinate.ts`,
      keeping `toLatitude`, `toLongitude`, `formatCoordinate` and the `Coordinates` type
- [x] 1.4 Update `test/delivery.test.ts` to invoke `delivery types` with the two options,
      and cover a negative latitude reaching the call unmangled
- [x] 1.5 Move the pair cases in `test/options.test.ts` and `test/coordinate.test.ts` onto
      the two per-axis readers: out of range on each axis and a value that is not a number,
      each naming its own axis
- [x] 1.6 Update `test/commands.test.ts` so the recorded input for `delivery types` is
      asserted as the two options rather than the positional pair

## 2. Times say what they accept

- [x] 2.1 Change the `readTimestamp` failure in `src/commands/options.ts` to
      `expected a time, local or with a zone, like 2026-08-17 09:00`, and update the test
      that asserts on it
- [x] 2.2 Reword every `--timeslot-start` and `--timeslot-end` in `src/commands/products.ts`,
      `catalog.ts` and `orders.ts` to `time slot start, local or zoned` /
      `time slot end, local or zoned`
- [x] 2.3 Reword `delivery slots --start`/`--end` to `window start, local or zoned` /
      `window end, local or zoned`
- [x] 2.4 Reword `orders offline --date-start`/`--date-end` to
      `earliest receipt date, local or zoned` / `latest receipt date, local or zoned`
- [x] 2.5 Reword `cart update --timeslot` to `JSON object {start, end}, times local or zoned`

## 3. The rest of the wording

- [x] 3.1 `branches --limit`/`--offset` become `page size` / `page offset`
- [x] 3.2 Level the id-or-alias lines: `cart update --branch-id`,
      `catalog categories --parent-id`, and `<cartId>` across the six cart commands
- [x] 3.3 Rename the `delivery slots` branch placeholder to `<branchId>` and its
      `--type` placeholder to `<type>`
- [x] 3.4 Give `products search --sort-by` its full set of nine fields
- [x] 3.5 Reword `np offices --title` to `only offices with this name`
- [x] 3.6 Level the four `aliases` argument descriptions and the `raw <tool>` example onto
      `such as`, per the inventory in design.md

## 4. Sweep and close

- [x] 4.1 Walk every `.option`, `.requiredOption` and `.argument` in `src/commands/` against
      the four rules in design.md and fix anything the inventory missed
- [x] 4.2 Drop the recorded sentence about the help text still carrying a
      `forwarded as is` hedge
- [x] 4.3 Run `npm test` and confirm the golden and contract tests are untouched by the
      wording pass
