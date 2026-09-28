## Context

See proposal.md — Why. Every description lives in a `.option()`, `.requiredOption()` or
`.argument()` call inside `src/commands/*.ts`; nothing else reads them, and no test asserts
on any of them except `test/profile.test.ts`, which only checks that a flag is absent. So
the edit is wide but shallow, and the only part with teeth is `delivery types`, where the
input moves from a positional argument to two options.

Two constraints shape the wording. The time options accept far more than the worked date
they show — `toUtc` takes any `Temporal.Instant` and falls back to a `PlainDateTime` read in
the machine's zone — so the example is not just noise, it is narrower than the truth. And
`--limit`/`--offset` are already described two different ways across commands, so the fix
has to pick one.

## Goals / Non-Goals

**Goals:**

- One house style, stated in the spec, that a later command can be checked against.
- Descriptions short enough to scan in a `--help` column without losing anything the user
  needs in order to type a correct value.
- `delivery types` reads like its neighbours.

**Non-Goals:**

- Command descriptions (`.description()` on a command). They are already short and are not
  what this change is about.
- Validating values against their closed sets with commander's `.choices()`. That would
  reject input the CLI accepts today, which is a behaviour change nobody asked for. Naming
  the set in the description is enough. See Decisions.
- Renaming any flag other than the coordinates. `--branch-id`, `--timeslot-start` and the
  rest keep their names.
- The README and other recorded notes beyond the one stale sentence about the pagination hedge.

## Decisions

### The style, in four rules

1. **Name the value, not its journey.** `max branches to return, forwarded as is` becomes
   `page size`. What the server does with a number afterwards is not something the user can
   act on while typing it.
2. **An example only where it does not narrow.** `<time>` gets `local or zoned`, not a
   worked date, because a worked date reads as the required shape. `<aliasOrEntity>` keeps
   `alias like @aal` and `raw <tool>` keeps `such as silpo_get_my_profile`, because there
   the example is the only place the shape appears at all.
3. **A closed set is named in full or not at all.** `asc or desc` stays. `popularity, score,
   title, price, promotion, guestRating, ...` is the one line that breaks the rule; it gets
   its four missing values rather than its ellipsis. `--delivery-type` names none of its
   fourteen and stays `delivery type` — naming a set of fourteen in a help column would cost
   more than it returns, and `delivery types` and `delivery slots` exist to list them.
4. **The same value, the same words.** `id or alias` reads the same everywhere it is true,
   including where the description currently says something else and drops it
   (`--parent-id`, `cart update --branch-id`). A `--limit`/`--offset` pair is
   `page size`/`page offset`; a `--limit` standing alone caps something and says what
   (`max slots to return`, `max matches per query`).

Alternative considered for rule 3: use `.choices()` and let commander print the set and
reject the rest. Rejected as a Non-Goal above — it changes what the CLI accepts. Worth
revisiting on its own if the enum casts (`as ProductSortBy`, `as DeliveryType`) ever start
producing confusing server errors.

### Coordinates become two options

`--latitude <deg>` and `--longitude <deg>`, both required, both read on their own axis. This
was chosen over one `--coordinates <lat,lng>` option because the CLI's unit of input
everywhere else is one option per scalar.

Two things fall out of it, both good. `.allowUnknownOption()` on `delivery types` goes: it
existed only so that a positional `-50.4,30.5` would not be mistaken for a flag, and
commander takes an option's value verbatim from the next argument without that test, so
`--latitude -50.4` needs no escape. And the pair reading loses its only caller — a grep for
`toCoordinates` and `readCoordinates` finds `delivery types` and the tests, nothing else —
so `readCoordinates` in `src/commands/options.ts` and `toCoordinates` with its
`CoordinatesRead` shape in `src/utils/coordinate.ts` go with it, along with the `pair`
failure and the `expected lat,lng` message. `toLatitude`, `toLongitude`, `formatCoordinate`
and the `Coordinates` type all stay; the new option readers are thin because the two axis
readings the pair was built on are already there.

Alternative considered: keep `toCoordinates` as an unused conversion in case a later command
wants a pair. Rejected — the `value-conversion` spec would then require a reading nothing
reaches, and a later command can put two axes together in the four lines it takes. The spec
delta says so: the pair reading is removed and the requirement that replaces it states that
a caller needing a point does the joining itself.

### The failure message for a time

`expected a local time like 2026-08-17 09:00` becomes
`expected a time, local or with a zone, like 2026-08-17 09:00`. The example stays here even
though it leaves the help text: a failure is where the user has already got it wrong and a
concrete form is the fastest way out. The help text has room to name the family instead.

### Wording inventory

Everything not listed keeps its current description.

| Where | Now | After |
| --- | --- | --- |
| `branches --limit` | `max branches to return, forwarded as is` | `page size` |
| `branches --offset` | `branches to skip, forwarded as is` | `page offset` |
| `delivery types <lat,lng>` | `coordinates in degrees, latitude first` | replaced by the two options below |
| `delivery types --latitude <deg>` | — | `latitude in degrees` |
| `delivery types --longitude <deg>` | — | `longitude in degrees` |
| `delivery slots <idOrAlias>` | `branch id or alias` | placeholder becomes `<branchId>`, text unchanged |
| `delivery slots --type` | placeholder `<deliveryType>` | placeholder `<type>`, text unchanged |
| `delivery slots --start` | `window start, local time, for example 2026-08-17 09:00` | `window start, local or zoned` |
| `delivery slots --end` | `window end, local time, for example …` | `window end, local or zoned` |
| every `--timeslot-start` (5 commands) | `time slot start, local time, for example …` | `time slot start, local or zoned` |
| every `--timeslot-end` (4 commands) | `time slot end, local time, for example …` | `time slot end, local or zoned` |
| `orders offline --date-start` | `earliest receipt date, local time, for example …` | `earliest receipt date, local or zoned` |
| `orders offline --date-end` | `latest receipt date, local time, for example …` | `latest receipt date, local or zoned` |
| `cart update --timeslot` | `JSON object {start, end}, each absolute or local time` | `JSON object {start, end}, times local or zoned` |
| `cart <cartId>` (6 commands) | `shopping cart id or alias` | `cart id or alias` |
| `cart update --branch-id` | `move the cart to another branch` | `branch to move the cart to, id or alias` |
| `catalog categories --parent-id` | `only children of this category` | `parent category id or alias` |
| `products search --sort-by` | `popularity, score, title, price, promotion, guestRating, ...` | `popularity, score, title, price, promotion, productsList, slugsList, guestRating, carouselList` |
| `np offices --title` | `filter offices by name` | `only offices with this name` |
| `aliases get [field]` | `field of that entity, for example branchId` | `field of that entity, such as branchId` |
| `aliases remove [field]` | `field of that entity` | `field of that entity, such as branchId` |
| `aliases get [value]` | `the value to alias, created if it does not exist yet` | `value to alias, created if new` |
| `aliases remove [value]` | `the aliased value` | `value the alias stands for` |
| `raw <tool>` | `MCP tool name, for example silpo_get_my_profile` | `MCP tool name, such as silpo_get_my_profile` |

## Risks / Trade-offs

- **`delivery types` breaks for anyone who typed the positional form** → It is one command
  in a CLI with one user, and the failure is loud: commander reports an unexpected argument
  and two missing required options rather than doing something silently wrong.
- **`local or zoned` is a term of art the help does not define** → Weighed against a worked
  date that is actively misleading about what the option takes. `delivery slots` prints
  slots in local time, so the reader has seen the local form before they type one.
- **The `--sort-by` line grows to about ninety characters and will wrap** → Preferred to an
  ellipsis that hides four real values. If it turns out to read badly in a narrow terminal,
  `.choices()` becomes the better answer and the Non-Goal is worth reopening.
- **Removing the pair reading widens the change into a third spec** → `value-conversion`
  gets a delta that removes the `Coordinates` requirement and adds `Latitude and longitude`
  in its place. Worth the width: the alternative is a spec requiring code nothing calls.
- **A style stated in a spec is only as good as the next reader** → The four rules are
  written as scenarios in `command-input`, so a later command that hedges about plumbing or
  truncates a set is a spec violation, not just a taste disagreement.
