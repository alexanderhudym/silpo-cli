## 1. Datetime utility

- [x] 1.1 Create `src/utils/datetime.ts` holding one instant parser, the local wall clock
      parser, the server zone constant, the reading of a time into a UTC instant, and the
      writing of an instant as local wall clock time to the minute
- [x] 1.2 Delete the duplicated instant parser from `src/commands/options.ts` and from
      `src/render/time.ts`; delete `src/render/time.ts` once nothing imports it
- [x] 1.3 Leave `toTimestamp` exported from `src/commands/options.ts` under its own name,
      calling the util and raising `InvalidArgumentError` when it reads nothing
- [x] 1.4 Point `test/time.test.ts` at the one module for both directions and add a round
      trip case; confirm `orders.ts`, `products.ts`, `catalog.ts` and `delivery.ts` needed
      no edit

## 2. Coordinate utility

- [x] 2.1 Create `src/utils/coordinate.ts` with a latitude reader range-checked to ±90, a
      longitude reader range-checked to ±180, and a writer that rounds to six decimals and
      drops trailing zeros, accepting the number form and the text form
- [x] 2.2 Add the pair reader as composition over the two axis readers, reporting which
      half failed so the three existing messages survive
- [x] 2.3 Leave `toCoordinates` exported from `src/commands/options.ts`, turning each
      failure into its own `InvalidArgumentError` wording
- [x] 2.4 Move the coordinate case out of `test/values.test.ts` into a test of the util;
      keep the `toCoordinates` cases in `test/options.test.ts` passing unchanged

## 3. Alias utility

- [x] 3.1 Decide whether the alias text parser returns nothing on bad input, moving its
      message to the adapter, or keeps throwing a plain error. Record which, and update
      the design decision if the second is chosen
- [x] 3.2 Create `src/utils/alias.ts` with the two conversion directions and the text form
      of an alias — its marker, its shape, and the checks over them
- [x] 3.3 Make the reading direction tell three outcomes apart: text that is not an alias
      comes back unchanged, a recorded alias comes back as its value, and an unrecorded
      alias reports nothing. Cover all three
- [x] 3.4 Reduce `src/db/aliases.ts` to storage: create, read back, list, remove
- [x] 3.5 Update `src/commands/options.ts`, `src/commands/aliases.ts` and `src/aliases.ts`
      to take the text form from the util and the rows from the database. `fromAlias`
      becomes a wrapper that calls the conversion and raises `InvalidArgumentError` when
      it reads nothing, so the seven commands importing it need no edit
- [x] 3.6 Split `test/aliases.test.ts` along the same seam and keep every existing case
      passing

## 4. Test harness for commands

- [x] 4.1 Leave the `test` script alone — `--experimental-test-module-mocks` is not needed,
      see the revised decision in design.md
- [x] 4.2 Move the fake daemon already in `test/commands.test.ts` into `test/harness.ts`:
      it answers the socket the tool client dials, runs the built CLI with given arguments,
      and captures standard output. Point `commands.test.ts` at it
- [x] 4.3 Have the harness point `SILPO_HOME` at a temporary directory before any import
      and clear the alias table between cases, so alias numbering starts from one

## 5. Profile commands, one at a time

- [x] 5.1 Move the profile, child, pet and address entity/field pairs into
      `src/commands/profile.ts`
- [x] 5.2 Rewrite the profile summary to compose its own text, naming every field it
      shows, holding the id back unless asked, and leaving the birthday unconverted;
      review the output as text and cover it with the harness
- [x] 5.3 Rewrite the saved address listing the same way, using the coordinate writer for
      latitude and longitude and showing neither when the address carries neither
- [x] 5.4 Rewrite the household listing, using the instant writer for the member's profile
      creation time and covering members, children and pets
- [x] 5.5 Rewrite the food restriction listing
- [x] 5.6 In each of the four, destructure the payload with a rest element and hand that
      rest to a parameter typed `Record<string, never>`, so a field added to a contract
      fails the build the test run starts with rather than disappearing

## 6. Removal and check

- [x] 6.1 Delete `src/render/commands/profile.ts`
- [x] 6.2 Remove the profile entries from `test/golden.test.ts`, leaving the other eight
      fixtures guarding the commands that have not moved
- [x] 6.3 Confirm nothing outside the profile path changed: the twenty-six other commands
      build and their goldens pass untouched
- [x] 6.4 Run the full suite and the four commands by hand against a live account

## 7. Rework from the review of the output

- [x] 7.1 Rename the reading direction of a time to name the zone it produces, and make
      both directions raise instead of answering nothing; add the question `isInstant` so
      the old engine's string sniffing has something to ask with
- [x] 7.2 Drop `--with-id` and the profile id, print one fact to a line in the order name,
      phone, email, birthday, read the name surname first, spend the gender on a title in
      front of it, and drop the account status
- [x] 7.3 Give every saved address field its own line under its own key with `: `, join the
      city, street, building, floor and apartment into one comma separated address behind
      `буд.`, `пов.` and `кв.`, show the coordinates under one key, and put a blank line
      between items
- [x] 7.4 Keep every line the profile commands print within ninety columns, breaking a
      longer one between words and continuing it indented
- [x] 7.5 Drop the ids from the household listing and give each of its fields a line
- [x] 7.6 Stop printing `success` anywhere, and remove the entity pairs no command aliases
      against any more
- [x] 7.7 Restate `user-account`, `value-conversion` and `output-rendering` against what
      the review settled, and re-run the suite and the four commands against a live account

## 8. Cleanup from the review of the code

- [x] 8.1 Move the two string operations to `src/utils/text.ts` under names that say what
      they do to a string: putting it on one line, and setting the line breaks of a block
      to a width defaulting to ninety. Point `renderText` at the first
- [x] 8.2 Drop the helpers that only filtered or joined, and the type they filtered on;
      cast a value to a string where it enters a field and join where the joining happens
- [x] 8.3 Show a coordinate only as a pair — one axis without the other locates nothing
- [x] 8.4 Drop the rest destructuring and the function it fed, and stop naming any field a
      command does not print; record in design.md what that gives up
- [x] 8.5 Put food restrictions in the same form as the other listings
- [x] 8.6 Cover `src/utils/text.ts` on its own, and cover a coordinate arriving without
      its pair
- [x] 8.7 Handle the moment a household member joined arriving with no zone, which is what
      the live server sends: `toWallClock` alongside `toLocalTime`, the command saying
      which shape it is looking at, and a fixture carrying one member of each

## 9. Second pass over the code

- [x] 9.1 Rename the one-line conversion to say it makes one line rather than that it
      removes whitespace
- [x] 9.2 Drop the cast helper; a field converts its own value and a bare one is written
      `?? ""` where it stands
- [x] 9.3 Move composing a place to `src/utils/address.ts`, every part optional, with the
      entrance among them and behind its own abbreviation, and cover it
- [x] 9.4 Put every entity and field pair in one dictionary in `src/utils/alias.ts` and
      point every caller at it, so nothing declares a pair of its own
- [x] 9.5 Continue a broken line under the value of its key rather than under the line,
      so a field reads as one column

## 10. Third pass over the code

- [x] 10.1 Settle every time by one rule — carrying a zone means an absolute instant,
      carrying none means local — so both directions follow from the value and the command
      tells nothing apart. Drop the second writer and the branch in the command
- [x] 10.2 Move one key and its value to `src/utils/record.ts`, taking any value and a
      separator from the caller, and cover it
- [x] 10.3 Move marking an item and joining a listing to `src/utils/list.ts`, with the
      separator between items from the caller, and cover it
- [x] 10.4 Drop the helper that assembled a command's whole output; each command joins its
      own rows and sets the width itself

## 11. Fourth pass over the code

- [x] 11.1 Make the width conversion context free: it breaks lines at a width and prefixes
      continuations with the indent it is given, reading nothing out of the value. The
      command composes it with an entry to hang a continuation under the value
- [x] 11.2 Have an item indent every line of a row, not only the first, so a wrapped entry
      stays inside its item
- [x] 11.3 Give `formatEntry` a value that exists — a string, a number or a boolean — and
      guard at the call site where there is none
- [x] 11.4 Make a blank line between items the default of a listing; the household passes a
      single one because its sections are what separate its items
- [x] 11.5 Take the indent back out of the width conversion: it breaks a string to a width
      and does nothing else. `formatEntry` subtracts its own key and separator from the
      width it is given and lays the broken value out under itself, and the width comes
      from one constant handed down by the caller
- [x] 11.6 Drop the width threading and the two layouts built on it. A broken line continues
      one step in from the indentation it already carried, `formatEntry` composes a key, a
      separator and a value, and a command breaks its finished block once
- [x] 11.7 Drop the `- ` marker and the indent behind it. A blank line already separates
      items, so every row starts at the first column and nothing has to line up with an
      offset. `formatItem` goes with it — an item is a listing joined one row to a line
- [x] 11.8 Delete the width conversion and every caller. A line runs as long as its value
      needs, because the reader is a program; `src/utils/text.ts` keeps `toOneLine` alone
- [x] 11.9 Replace the separator argument of a listing with two joins named for what they
      join, so the two separators are defined once, next to each other, and no caller
      declares one of its own
- [x] 11.10 Make the household's groups the second layout of one key and its value rather
      than a helper of their own: `formatEntryAsRow` puts a value beside its key,
      `formatEntryAsSection` puts it underneath, and the emptiness check joins every other
      guard at the call site
