## Why

The five skills under `plugin/skills/` were written on the first day of the project and never
updated. Every command name in them is wrong: the binary has `silpo products batch`, they teach
`silpo search`; it has `silpo cart details <cartId>`, they teach `silpo cart`; it has `silpo
branches`, they teach `silpo stores --city`. They also teach `silpo context`, `silpo cart fill`
and global `--json/--format/--fields`, none of which exist. An agent following them produces
nothing but `unknown command`.

The gap they leave is worse than the errors. Of the CLI's fifty-one leaf commands, fourteen refuse to
run without `--branch-id`, nine of those also require `--delivery-type`, and six require the whole
quadruple with `--timeslot-start` and `--timeslot-end` — and those values can only come from the
active cart. Nothing in the repository says so. Neither does the undocumented rule that the MCP
answers several classes of bad input with `success: true` and no effect.

## What Changes

- Replace the five skills — `silpo`, `silpo-cart`, `silpo-catalog`, `silpo-geo`, `silpo-user` —
  with one `silpo` skill. The router disappears with them: three of the four documented Silpo
  workflows cross two or more of the old categories, so routing cost a hop almost every time and
  saved nothing measurable against the 11 490 tokens of MCP schemas the CLI already avoids.
- Index the skill by situation rather than by command group. Each row states a need and gives one
  command with every option it accepts spelled out inline as placeholders — `--delivery-type
  <type>`, never a worked example, never an abbreviation expanded elsewhere in the file.
- Open the skill with the context preamble: the cart is the only source of `branchId`,
  `deliveryType` and the timeslot, and the timeslot must be revalidated against the branch's slots
  before use.
- Add a failure-mode section for the server's recorded silent-success traps: a
  nonexistent `productId` accepted with no effect, an invalid promo code stored without validation,
  an invalid delivery type nulling every `catalogProduct` in the offline order history, a nil-UUID
  branch broadening the promotion set, and the one-way `isAdultConfirmed` flag.
- Carry the three workflows from <https://ai-factory.silpo.ua/docs/mcp> as numbered algorithms with
  no command names and no arguments in them; the reader maps each step onto the index.
- **BREAKING** `silpo delivery slots` takes the branch as `--branch-id <id>` instead of a
  positional argument. It is the only branch-scoped command in the CLI that names its branch
  positionally; every other one — `catalog categories`, `catalog promotions`, `products search` —
  uses the option. The positional form is removed rather than kept as an alias.

Deliberately out of scope, to be raised separately: `checkoutMobileLink` is never printed although
the cart payload carries it, the premium subscription output is thin, `silpo branches` has no
city or proximity filter, and the CLI does not cache the cart-derived context.

## Capabilities

### New Capabilities

- `agent-skill`: what the Claude Code plugin ships to teach an agent the CLI — that it is a single
  skill, that it is indexed by situation, how a command row is written, that the cart-derived
  context is stated before anything else, that failure modes which return success are named, and
  that workflow scenarios stay free of command names and arguments.

### Modified Capabilities

- `stores-and-delivery`: the delivery slot listing names its branch by option, not positionally.

## Impact

- `plugin/skills/silpo-cart/`, `plugin/skills/silpo-catalog/`, `plugin/skills/silpo-geo/`,
  `plugin/skills/silpo-user/` — removed.
- `plugin/skills/silpo/SKILL.md` — rewritten from a router into the whole surface.
- `src/commands/delivery.ts` — the slots command loses its positional argument.
- `README.md` — claims five skills, a router, and a cart context that is "resolved once and
  cached"; all three are false.
- No runtime dependency, transport or MCP contract changes. All 39 MCP tools already have a
  dedicated command, so the skill needs no fallback to `silpo raw`.
