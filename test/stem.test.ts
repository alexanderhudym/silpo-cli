import assert from "node:assert/strict";
import { test } from "node:test";

import { stem } from "../dist/utils/stem.js";

test("case endings do not hide an inflected match", () => {
  assert.equal(stem("картопля"), stem("картоплі"));
  assert.equal(stem("хліб"), stem("хліба"));
  assert.equal(stem("хліб"), stem("хлібом"));
});

test("a shared beginning does not make two words match", () => {
  assert.notEqual(stem("молоко"), stem("молочний"));
});

test("words that merely begin alike stay apart", () => {
  const slabo = new Set([
    stem("слабогазований"),
    stem("слабоалкогольний"),
    stem("слабосолена"),
  ]);

  assert.equal(slabo.size, 3);
});

test("a one-syllable word is returned unchanged", () => {
  assert.equal(stem("кіт"), "кіт");
});

test("an empty string is returned unchanged rather than emptied", () => {
  assert.equal(stem(""), "");
});

test("a perfective gerund is stripped ahead of any other group", () => {
  assert.equal(stem("прочитавши"), "прочита");
  assert.equal(stem("спекши"), "спек");
});

test("a reflexive verb reduces the same whether it ends -ся or -сь", () => {
  assert.equal(stem("усміхнулася"), stem("усміхнулась"));
});

test("verb personal endings reduce to one stem", () => {
  const forms = new Set([stem("читає"), stem("читаєш"), stem("читаємо")]);

  assert.equal(forms.size, 1);
});

test("passive participle forms of one verb reduce alike", () => {
  const forms = new Set([stem("консервований"), stem("консервована"), stem("консервовані")]);

  assert.equal(forms.size, 1);
});

test("the derivational -ість is stripped only where the shape licenses it", () => {
  assert.equal(stem("можливість"), "можлив");
});

test("an ending found only in the middle of a word is left alone", () => {
  assert.equal(stem("земля"), "земл");
  assert.equal(stem("борщем"), stem("борщ"));
});
