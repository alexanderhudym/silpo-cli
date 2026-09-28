import assert from "node:assert/strict";
import { test } from "node:test";

const { ceilToStep, floorToStep, isMultipleOfStep } = await import("../dist/utils/step.js");

test("a step that already divides is left unchanged", () => {
  assert.equal(ceilToStep(2, 0.5), 2);
  assert.equal(floorToStep(2, 0.5), 2);
  assert.ok(isMultipleOfStep(ceilToStep(2, 0.5), 0.5));
  assert.ok(isMultipleOfStep(floorToStep(2, 0.5), 0.5));
});

test("a step that does not divide is raised or lowered to the nearest one", () => {
  assert.equal(ceilToStep(0.3, 0.5), 0.5);
  assert.equal(floorToStep(0.3, 0.5), 0);
  assert.ok(isMultipleOfStep(ceilToStep(0.3, 0.5), 0.5));
  assert.ok(isMultipleOfStep(floorToStep(0.3, 0.5), 0.5));
});

test("an amount below a single step ceils up to it and floors to nothing", () => {
  assert.equal(ceilToStep(0.1, 0.5), 0.5);
  assert.equal(floorToStep(0.1, 0.5), 0);
  assert.ok(isMultipleOfStep(ceilToStep(0.1, 0.5), 0.5));
  assert.ok(isMultipleOfStep(floorToStep(0.1, 0.5), 0.5));
});

test("a step that is absent, zero or negative counts whole units of one", () => {
  for (const step of [undefined, 0, -1] as const) {
    assert.equal(ceilToStep(2.3, step), 3);
    assert.equal(floorToStep(2.3, step), 2);
  }
});

test("arithmetic on a step never leaves a number the tolerance rejects", () => {
  const raised = ceilToStep(0.5, 0.2);

  assert.equal(raised, 0.6);
  assert.ok(isMultipleOfStep(raised, 0.2));
  assert.ok(isMultipleOfStep(3 * 0.2, 0.2));
});

test("a step of zero or less multiplies to a legal quantity of anything", () => {
  assert.ok(isMultipleOfStep(1.23, 0));
  assert.ok(isMultipleOfStep(1.23, -1));
});

test("an amount a floating-point step already divides is left unchanged, not moved a whole step", () => {
  const cases: readonly [number, number][] = [
    [1.05, 0.35],
    [0.6, 0.2],
    [1.2, 0.4],
    [0.1, 0.1],
    [0.95, 0.95],
  ];

  for (const [amount, step] of cases) {
    assert.ok(isMultipleOfStep(amount, step), `expected ${amount} to already be a multiple of ${step}`);
    assert.equal(ceilToStep(amount, step), amount, `ceilToStep(${amount}, ${step})`);
    assert.equal(floorToStep(amount, step), amount, `floorToStep(${amount}, ${step})`);
  }
});
