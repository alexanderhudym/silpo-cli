## Context

See proposal.md — Why. Two constraints shape the approach.

The catalogue carries no field linking a piece to a mass. A product card for `Морква мита`
carries `Країна` and `Продавець` and nothing else; `displayRatio` is `"100г"` on every weighted
product, an advertising reference unit rather than a package size. So no correct conversion from
pieces to kilograms exists to be implemented, and any that appeared to work would be a table
invented here.

`step` is on the payload (`src/mcp/entities/product.ts:16-18`) and is already printed by
`products find` and `cart details`, but the Filler cannot see it: neither `ResolvedProductLike`
(`src/daemon/fill.ts:93-102`) nor `ResolvedCandidate` (`:48-53`) carries it. No step-aware
behaviour is possible until those two types widen, which makes that the first task rather than an
incidental one.

## Goals / Non-Goals

**Goals.** One rule that decides every quantity, stated once and read by both write paths. A
defect of this class that is caught by a test rather than by an agent noticing a strange price.

**Non-Goals.** Tagged unit types threaded through the resolver and the daemon protocol — that is
the larger refactor this change deliberately stops short of, and it remains the right next step.
A piece-to-mass estimate of any kind. Changing the MCP wire types.

## Decisions

**A count names steps rather than estimating a weight.** `n шт` against a weighted product writes
`n × step`. The alternative considered and rejected was estimating what one piece weighs — either
by a table or by treating one step as roughly one handful. Measured against real products, one
step is a closer estimate of a small count than `n` steps is: `курячі крила 5 шт` is about 0.5 kg
and one step is exactly 0.5, while five steps is 2.5. But closeness is the wrong criterion. An
estimate cannot be inverted: an agent holding the step and the rule cannot work out what estimate
the CLI will make, so it cannot name a number that buys what it wants. A convention can be
inverted, and it is stated in the skill so the agent holds it. The CLI is not guessing a weight;
it is defining what a count means for a product sold by weight, which is the only thing it is in
a position to do honestly.

**`ceil` where an amount was asked for, `floor` where an amount is all there is.** Raising a mass
to a whole step, covering a piece count with packs, and turning a fractional count into whole
steps are the same operation on a number the caller named, and rounding down there delivers less
than was asked for. The one place the direction reverses is an amount the branch reported rather
than one the caller named: taking what is in stock cannot round up past the stock, so it takes the
largest whole number of steps within it.

**Arithmetic on steps is done so the cart can divide the result.** `Math.ceil(0.5 / 0.2) * 0.2` is
`0.6000000000000001`, and three steps of 0.2 multiply to the same thing. That number is what would
reach the server, and it is a multiple of nothing. The spec already names this hazard for
converting grams; the same discipline applies here, and `isMultipleOfStep` already carries a
tolerance the new arithmetic must agree with rather than invent a second one.

**`ceil(n ÷ contents)` subsumes the pack-equality heuristic.** The current rule fires only when a
pack holds exactly the number asked for, which is why a fifteen-egg carton walks through it. The
general form returns 1 where `contents ≥ n` and covers the count otherwise, and the existing
behaviour for a ten-egg carton falls out of it rather than being written separately. A special
case that other values evade is how this defect returned the first time.

**Reading the contents is half the fix, and the half that was nearly missed.** The pattern that
reads a pack's contents is anchored at both ends, so it matches `15шт` and not `15шт/уп` — which
is what the carton behind the 1199 UAH basket actually states. A general rule that cannot see the
field it generalises over is the equality heuristic again in a longer form, so widening that
pattern is part of this change rather than a follow-up, and a scenario pins a contents string that
is not a bare number and unit.

**The unit, not just the step, decides whether a remainder can move.** The guard that exists today
compares `weighted` between the short product and its alternative, and the first reading of the
sausage failure blamed that guard for being meaningless between two weighted products. It is not:
two weighted products are exactly where a kilogram remainder does mean something. The guard's
defect is that it is too weak — it lets a remainder move without checking the alternative's own
step, which need not equal the short product's. So the guard is strengthened, not dropped, and a
remainder with no alternative in its unit goes unfilled and is reported.

**The invariant is a test, not a convention.** For every quantity `cart fill` writes, `cart set`
on that line with that number must be accepted. This is one property test over the rules, and it
subsumes the zero case, the step-multiple case and the fractional-pack case at once. Writing it
as three separate assertions would leave the fourth, whatever it turns out to be, uncovered —
which is the history this change exists to end.

**`isMultipleOfStep` moves to shared code rather than being duplicated.** It lives in
`src/commands/carts.ts:180-186` and has exactly one caller. Two call sites of one rule is how the
two paths drifted; one definition is the fix.

## Risks / Trade-offs

**A count against a weighted product buys more than a person would picture.** `банан 2 шт` buys
0.8 kg, six or seven bananas. → The line states that the count named steps, and the skill states
the convention, so both the agent and the person reading the report can see it. It is still an
order of magnitude better than the two kilograms it buys today, and unlike today it is
predictable.

**An item naming no quantity now buys one step where it bought one kilogram.** Where the term
resolves to a weighted product this is the difference between a quarter of a loaf and a whole
kilogram of one — `хліб` was measured settling on an artisan loaf at 169 UAH/kg during the
benchmark, though at the branch used while writing this it settles on a packaged 350 g loaf
instead, so the figure moves with the catalogue and only the direction is durable. →
Undershooting is reversible with one `cart set`, overshooting is a charge. The benchmark flows are
the instrument for deciding whether one step is the right default; this change makes that
measurable rather than settling it by taste.

**Two green tests assert the old behaviour and will fail.** → That is the point. They are
rewritten rather than adjusted, together with the spec sentence they were derived from, or the
behaviour returns the way it returned after the egg fix.

**The shortfall and alternatives arithmetic changes shape, and it is the least covered code in
the repo.** `test/daemon-fill.test.ts` has no weighted product at all. → A weighted fixture is
added before that code is touched, not after.

## Migration Plan

Nothing is stored between commands, so there is no data to migrate. The change is visible only in
what a subsequent `cart fill` writes. A cart already holding a quantity written under the old rule
is unaffected and is corrected, if the caller wants, by `cart set` as before.

Rollback is the revert; no state survives it.
