## 1. Make the step visible, and give the rule one home

- [x] 1.1 Add `step` to `ResolvedProductLike` (`src/daemon/fill.ts:93-102`) and to
  `ResolvedCandidate` (`:48-53`), and carry it through `toCandidate` and every construction site,
  including the inline one in `src/commands/fill.ts:234-239`; both `Product` and `ProductDetails`
  already hold it, so nothing new is fetched.
- [x] 1.2 Move `isMultipleOfStep` out of `src/commands/carts.ts:180-186` into shared code, keeping
  its tolerance, and have `cart set` read it from there unchanged.
- [x] 1.3 Add `ceilToStep` and `floorToStep` beside it, both producing a number
  `isMultipleOfStep` accepts — `Math.ceil(0.5 / 0.2) * 0.2` is `0.6000000000000001`, so the
  arithmetic has to agree with that tolerance rather than invent a second one. Unit-test both
  against a step that already divides, one that does not, an amount below a single step, and a
  step that is absent, zero or negative, which counts whole units of one.

## 2. One rule for the resolved quantity

- [x] 2.1 Replace the `??` chain in `orderedQuantity` (`src/daemon/fill.ts:157-159`) with an
  explicit resolution that reads how the product is sold, so no branch can return a number whose
  unit was decided elsewhere.
- [x] 2.2 Read a bare number and a count in pieces as the same thing: `ceil(n)` steps. Delete the
  path that lets an absent quantity become 1 before the product is known
  (`src/resolve/normalize.ts:105`), and update the `parseItem` assertions in
  `test/normalize.test.ts` that read `quantity === 1` for items naming no quantity.
- [x] 2.3 Widen the pattern that reads a pack's contents (`src/resolve/products.ts:185`), which is
  anchored and so matches `15шт` but not the `15шт/уп` the fifteen-egg carton actually states.
  Verify against that carton's real payload before moving on — without this, task 2.4 changes
  nothing for the case the change exists to fix.
- [x] 2.4 Read a count in pieces against a product that declares its contents in pieces as
  `ceil(n ÷ contents)` packs, replacing the pack-equality heuristic in `orderedCount`
  (`src/resolve/products.ts:343-352`) so that a carton of fifteen answers `10 шт` with one carton.
- [x] 2.5 Raise a converted mass to the next whole step in `orderedWeight`
  (`src/resolve/products.ts:323-335`), keeping its existing guard against zero.
- [x] 2.6 Resolve a quantity of zero to no line, and report the item among those the CLI could not
  fill so that it does not vanish from the outcome entirely.
- [x] 2.7 Decouple `matchesSpecification` (`src/resolve/products.ts:354-376`) from the quantity
  converter: it decides whether a pack check applies by how the product is sold, not by calling
  `orderedWeight` and testing for `undefined`, whose meaning 2.5 changes. Cover the packaged
  product that states its contents in pieces against an item naming a mass, which is the path this
  rewiring moves.

## 3. Stop the bad number propagating

- [x] 3.1 Compare stock against the resolved quantity in the product's own unit when deciding
  whether an item is short (`src/daemon/fill.ts:261-271`), so a count of steps is never compared
  against kilograms of stock.
- [x] 3.2 Carry the alternatives remainder only to an alternative sold in the same unit, and raise
  it to a whole multiple of that alternative's own step, which need not equal the short product's
  (`src/daemon/fill.ts:287-308`). Strengthen the `top.weighted === product.weighted` guard rather
  than removing it; where no alternative shares the unit, leave the remainder unfilled and report
  it.
- [x] 3.3 Write the largest whole number of steps within stock when a shortfall is answered by
  taking what the branch holds, and resolve to a miss where that is less than one step.
- [x] 3.4 Name the unit on both numbers of the shortfall note (`src/commands/fill.ts:140-142`).
- [x] 3.5 Bring the reduce path to the same rule: `reduceTo` (`src/commands/carts.ts:260-277`)
  writes the reported stock verbatim and `cart fill` calls it (`src/commands/fill.ts:340`), so the
  command writes non-step quantities from inside itself today.

## 4. Say what was chosen

- [x] 4.1 State on a settled line where a mass was raised to the step, and where a count was read
  as that many steps (`src/commands/fill.ts:118-122`); a line that reads identically whether the
  caller or the CLI chose the amount is one the caller cannot correct.
- [x] 4.2 Update `plugin/skills/silpo/SKILL.md:71-78` to state the step convention and what each
  example buys. Two of the three examples there change meaning under this rule — `морква 0.5 кг`
  is raised to a step and `куряче філе 300 г` becomes 0.5 kg — so correct them rather than only
  adding a count against a weighted product beside them.

## 5. Rewrite what asserted the defect

- [x] 5.1 Rewrite `test/resolve-products.test.ts:663-668`, which asserts that a count against a
  weighted product is how many to buy, together with its title.
- [x] 5.2 Rewrite `test/fill.test.ts:806-835`, whose fixture sets a 0.2 step and asserts that 0.5
  is written, in contradiction with `test/cart.test.ts:357-363`.
- [x] 5.3 Add a weighted product to `test/daemon-fill.test.ts`, which has none, and cover the
  shortfall, accept-stock and alternatives paths with it, including two weighted alternatives
  whose steps differ.

## 6. Cover the class, not the instances

- [x] 6.1 Add the unit-level property test: over a matrix of items (`2`, `2 шт`, `1.5 шт`, `0 шт`,
  `0.5 кг`, `300 г`, `10 шт`, none) against products (weighted with steps 0.2 / 0.35 / 0.5;
  packaged with contents `null`, `10шт`, `15шт/уп`, `950г`; and a step that is zero), assert of
  every result that it is either absent or both greater than zero and accepted by the same
  `isMultipleOfStep` task 1.2 relocates.
- [x] 6.2 Add the round-trip test through the real commands: make the fake's cart payload carry
  `addToBasketStep` and `weighted` from the same fixture the search returned rather than from
  hand-written constants, then `cart fill` an item, read the recorded write, and `cart set` that
  same line to that same number without it failing. Include a row where the reported stock is not
  a step multiple, which fails today through the reduce path.
- [x] 6.3 Cover each reproduced symptom: `морква 2 шт`, `яблука голден 3 шт`, an item naming no
  quantity against a weighted product, `яйця курячі 10 шт` against a `15шт/уп` carton,
  `морква 1.5 шт`, `морква 0 шт`, `молоко 1.5 шт`, `морква 0.5 кг` against a 0.2 step, and the
  five-wings alternatives split.
- [x] 6.4 Keep green what already worked: `яблука 2 кг`, `кава 250 г`, `яйця курячі 10 шт` against
  a ten-egg carton, `авокадо 2 шт`, `молоко 2 шт`.
- [x] 6.5 Run `npm test` and confirm the suite passes with no test asserting both halves of the
  step rule.

## 7. Check it against the shop

- [x] 7.1 Re-run each symptom through `silpo cart fill --dry-run` against the live catalogue and
  confirm the printed quantity matches what the specs say, the dry run writing nothing. Force the
  fifteen-egg carton with `--pick`, the ten-egg one being what the term resolves to by default.

## Review checklist

- [x] No code path computes a cart quantity without reading how the product is sold. Searching for
  every construction of a quantity written to `add-or-update-cart-products` finds each one passing
  through the shared rule, and none reaching the wire from a bare `number` whose unit was fixed
  somewhere else.
- [x] The rule has one definition. `isMultipleOfStep` has no second implementation and no caller
  that re-derives it inline; `cart set`, the list path and the reduce path all reach the same
  function.
- [x] Every quantity the code can produce is a number that same function accepts. The property
  test's matrix covers a zero step, a fractional count, a mass below one step and a pack whose
  contents are stated with trailing text — and its assertion is the shared function, not a
  re-stated arithmetic.
- [x] Multiplying or dividing by a step never leaves a number the tolerance rejects. Grep for `*
  step` and `/ step` and confirm each result passes through the rounding helpers rather than
  reaching a comparison or the wire directly.
- [x] The pattern reading a pack's contents matches the payload the catalogue actually sends, not
  an idealised form of it. Confirmed against a real `15шт/уп` carton, not against a fixture written
  to match the pattern.
- [x] An item that writes no line still appears in the outcome. No input makes an item vanish from
  both the cart and the report.
- [x] A settled line whose amount the CLI chose reads differently from one whose amount the caller
  wrote. Reading the output alone tells which is which.
- [x] Nothing in the diff asserts both halves of the step rule. The two rewritten tests state the
  new behaviour rather than being relaxed to tolerate either.
- [x] The specs the change modified say what the code does. Where implementation and delta
  disagree, the delta is what was agreed and the code is wrong.
