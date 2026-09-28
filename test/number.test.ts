import assert from "node:assert/strict";
import { test } from "node:test";

const { requireInteger, requireNumber, toInteger } = await import(
  "../dist/utils/number.js"
);

test("reads a decimal and a whole number, negatives included", () => {
  assert.equal(requireNumber("12"), 12);
  assert.equal(requireNumber("-2.5"), -2.5);
  assert.equal(requireInteger("12"), 12);
  assert.equal(requireInteger("-7"), -7);
});

test("reads a whole number written with a fractional zero", () => {
  assert.equal(toInteger("12.0"), 12);
  assert.equal(toInteger("12.000"), 12);
  assert.equal(requireInteger("12.0"), 12);
});

test("reads nothing out of a blank value rather than zero", () => {
  assert.equal(toInteger(""), null);
  assert.equal(toInteger("  "), null);
  assert.throws(() => requireNumber(""), /expected a number/);
  assert.throws(() => requireInteger(""), /expected an integer/);
});

test("reads nothing out of a number wearing blanks", () => {
  assert.equal(toInteger(" 12 "), null);
});

test("reads nothing out of a spelling that parses only in part", () => {
  for (const spelling of ["1e3", "0x10", "12abc", "1_000", "12.", ".5", "+12", "Infinity"]) {
    assert.equal(toInteger(spelling), null, spelling);
    assert.throws(() => requireNumber(spelling), /expected a number/, spelling);
  }
});

test("refuses a fraction where a whole number is wanted", () => {
  assert.equal(toInteger("2.5"), null);
  assert.equal(toInteger("9007199254740991.4"), null);
  assert.throws(() => requireInteger("2.5"), /expected an integer/);
  assert.equal(requireNumber("2.5"), 2.5);
});

test("refuses a whole number too large to hold exactly", () => {
  assert.equal(toInteger("9007199254740991"), 9007199254740991);
  assert.equal(toInteger("9007199254740993"), null);
  assert.throws(() => requireInteger("9007199254740993"), /expected an integer/);
});

test("everything read as a whole number reads as a decimal too", () => {
  for (const spelling of ["12", "-7", "0", "12.0", "12.000", "-0.0"]) {
    assert.notEqual(toInteger(spelling), null, spelling);
    assert.equal(requireNumber(spelling), toInteger(spelling), spelling);
  }
});
