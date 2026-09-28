## Why

The help text of options and arguments grew by accretion, one command at a time, and it
shows: `--limit` on `branches` hedges about server plumbing the user cannot act on, five
commands repeat the same worked date to explain a time that in fact accepts far more than
that date's shape, `--sort-by` trails off into an ellipsis, and `delivery types` is the one
command that asks for its input as a positional pair while every neighbour uses named
options. The text is what the user reads before typing, so its noise costs more than its
length.

## What Changes

- A stated house style for the description of an option or an argument: it names the value,
  never the plumbing behind it, and carries an example only where the shape is not already
  visible in the placeholder or the flag name.
- `branches --limit` / `--offset` drop the `forwarded as is` hedge and adopt the
  `page size` / `page offset` wording every other paginated command already uses.
- Every option that takes a time — `--timeslot-start`, `--timeslot-end`, `--date-start`,
  `--date-end`, `--start`, `--end`, and the `--timeslot` JSON object — drops the worked date
  and says instead that the time may be local or carry a zone, which is what the CLI has
  always accepted.
- The failure message for an unreadable time names both accepted forms rather than only the
  local one.
- **BREAKING** `delivery types` takes `--latitude <deg>` and `--longitude <deg>` instead of
  the positional `<lat,lng>` pair, matching how every other command names its inputs. The
  `allowUnknownOption` escape that existed only to let a negative latitude through is
  removed with it, and so is the reading of a `lat,lng` pair, whose only caller it was.
- `--sort-by` names its whole set of fields instead of trailing off after six of them.
- The remaining descriptions are levelled to the same style: one subject per line, no
  imperative phrasing where the rest use noun phrases, and `id or alias` said the same way
  everywhere it is true.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `command-input`: adds a requirement for what the help text of an option or argument says;
  changes the Coordinates requirement so a latitude and a longitude arrive as two options of
  their own; sharpens the Time arguments requirement so a rejected time names both forms.
- `stores-and-delivery`: the delivery type lookup takes its point as two named options
  rather than one positional pair.
- `value-conversion`: with nothing left that types a `lat,lng` pair, the conversion layer
  keeps the two per-axis readings and drops the pair reading built on top of them.

## Impact

- `src/commands/*.ts` — the description string of nearly every option and argument, and the
  option surface plus action signature of `delivery types`.
- `src/commands/options.ts` — the failure message of `readTimestamp`, a reader for a single
  latitude and one for a single longitude, and the removal of `readCoordinates`.
- `src/utils/coordinate.ts` — `toCoordinates` and the `CoordinatesRead` shape go; the
  per-axis readings and the display rounding stay.
- `test/commands.test.ts` — the recorded input for `delivery types` moves from the command
  line into two recorded options.
- `test/delivery.test.ts`, `test/options.test.ts`, `test/coordinate.test.ts` — the delivery
  type invocation, the timestamp failure message, and the pair reading's own tests.
- The recorded note that the help text still carries a `forwarded as is` hedge stops being
  true.
- No change to any tool call the CLI sends, other than how the coordinates reach it.
