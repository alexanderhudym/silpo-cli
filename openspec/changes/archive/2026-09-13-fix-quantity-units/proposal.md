## Why

`cart fill` writes a quantity without ever reading how the product is sold. A number the caller
wrote in pieces is sent verbatim into a field whose unit the product decides, so `морква 2 шт`
buys two kilograms of carrots and `яйця курячі 10 шт` against a fifteen-egg pack buys 150 eggs.
Fourteen wrong behaviours were reproduced live, and one of them writes 3 kg of a product the
caller never named.

It keeps coming back because it is written down as correct in three places:
`list-resolution/spec.md:81-86` requires it ("anywhere else it is how many to buy"),
`test/resolve-products.test.ts:663` asserts it with a title defending it, and
`test/fill.test.ts:806` asserts a quantity that `test/cart.test.ts:357` asserts must be refused —
both green. The egg case was already patched once, by an equality heuristic that only fires when
the pack size equals the number asked; a different carton size walks straight through it.

## What Changes

- **BREAKING** A number written against a product counts that product's own `step`, not
  kilograms and not packs. The quantity written to the cart becomes `ceil(n) × step`, with `n`
  defaulting to 1 when the caller named no amount. For a packaged product `step` is 1, so its
  behaviour is unchanged; for a weighted product `морква 2 шт` becomes 0.4 kg rather than 2 kg.
- A bare number and a number written in pieces mean the same thing. Mass and volume keep naming
  mass and volume.
- A mass or volume against a weighted product is rounded **up** to the nearest whole step and the
  rounding is stated on the line. `куряче філе 300 г` against a 0.5 kg step buys 0.5 kg.
- Pieces against a packaged product that declares its contents in pieces buy `ceil(n / contents)`
  packs. The existing "a pack of exactly ten" rule falls out of this as the case where
  `contents === n`, and stops being a special case that other pack sizes evade.
- A resolved quantity of zero writes no line at all, matching `cart set`, which already refuses
  one.
- The shortfall threshold, the shortfall note and the alternatives remainder are all computed in
  the product's own unit. The note names that unit on both of its numbers.
- **The invariant that closes the class**: every quantity `cart fill` writes must be one
  `cart set` would accept for the same line. `isMultipleOfStep` moves out of the cart command so
  both paths share one rule.
- The skill states the convention, so an agent can predict and invert it: a weighted product has
  a minimum step, and a count names that many steps.

## Capabilities

### New Capabilities

None. The behaviour belongs to capabilities that already exist.

### Modified Capabilities

- `list-resolution`: the requirement that a count against a product with no matching pack is
  "how many to buy" is replaced by the step rule; the bare-number requirement gains the unit it
  never named; the absent-quantity case stops meaning one kilogram; the shortfall and
  alternatives requirements gain the unit and step rules they are silent on; the worked example
  at `:93-96` is corrected, its own 0.3 kg not being a legal multiple of that product's step.
- `shopping-cart`: the step rule, today scoped to `cart set`, is extended to every path that
  writes a cart quantity, and the asymmetry between refusing a bad weight and rounding a derived
  one is stated with its reason.
- `agent-skill`: the skill documents the step convention and the piece-against-weighted case, and
  its examples say what each one buys. Two of its three current examples — `морква 0.5 кг` and
  `куряче філе 300 г` — buy different amounts after this change, so they are corrected rather
  than merely joined by a new one. The requirement that a command entry never accounts for the
  behaviour behind it is modified to admit a convention an argument cannot be written without.

## Impact

- `src/daemon/fill.ts` — the `??` chain at :157-159 is replaced; `ResolvedProductLike` (:93-102)
  and `ResolvedCandidate` (:48-53) gain `step`, which the Filler cannot see today; the shortfall
  threshold (:261-271) and the alternatives remainder (:287-308) are recomputed in the resolved
  unit.
- `src/resolve/products.ts` — `orderedWeight` and `orderedCount` (:323-352) take how the product
  is sold and can report that they could not settle; `matchesSpecification` (:354-376) stops
  calling a quantity converter to decide whether a pack check applies.
- `src/resolve/normalize.ts` — `quantity ?? 1` at :105 stops turning an absent amount into one.
- `src/resolve/products.ts:185` — the pattern that reads a pack's contents is anchored, so the
  fifteen-egg carton's `15шт/уп` does not match it and the case this change exists to fix would
  fall through to the rule it is the exception to.
- `src/commands/carts.ts:260-277` — the path that reduces a line to what the branch can fill
  writes the reported stock verbatim, and `cart fill` calls it, so it writes non-step quantities
  from inside the command this change is about.
- `src/commands/fill.ts` — the settled line states a rounding; the ask note names its units.
- `src/commands/carts.ts` — `isMultipleOfStep` (:180-186) moves to shared code.
- Tests: `test/resolve-products.test.ts:663` and `test/fill.test.ts:806` assert the defect and
  must be rewritten, not adjusted. `test/daemon-fill.test.ts` has no weighted product at all and
  gains one. A round-trip test asserts the `fill` → `set` invariant.
- `plugin/skills/silpo/SKILL.md:71-78`.
- No new dependency. No change to the MCP wire types.
