import assert from "node:assert/strict";
import { test } from "node:test";

const { formatAddress, splitAddress, compareBuildingNumbers, stripStreetTypeWords } = await import(
  "../dist/utils/address.js"
);

test("puts the parts of a place in the order a place is written", () => {
  assert.equal(
    formatAddress({
      city: "Київ",
      street: "Хрещатик",
      building: "1",
      entrance: "2",
      floor: "3",
      apartment: "12",
    }),
    "Київ, Хрещатик, буд. 1, під. 2, пов. 3, кв. 12",
  );
});

test("names the building, the entrance, the floor and the apartment", () => {
  assert.equal(formatAddress({ building: "12А" }), "буд. 12А");
  assert.equal(formatAddress({ entrance: "2" }), "під. 2");
  assert.equal(formatAddress({ floor: "3" }), "пов. 3");
  assert.equal(formatAddress({ apartment: "12" }), "кв. 12");
});

test("takes any part on its own and skips the ones it was not given", () => {
  assert.equal(formatAddress({ city: "Одеса" }), "Одеса");
  assert.equal(formatAddress({ city: "Львів", building: "12А" }), "Львів, буд. 12А");
  assert.equal(formatAddress({ city: "Львів", street: null, apartment: "5" }), "Львів, кв. 5");
  assert.equal(formatAddress({}), "");
});

test("splitAddress reads the street type, the street and the building off a plain address", () => {
  assert.deepEqual(splitAddress("просп. Володимира Івасюка, 46"), {
    streetType: "просп.",
    street: "Володимира Івасюка",
    building: "46",
  });
});

test("splitAddress reads Бережанська 22 as a street and a building with no street-type word", () => {
  assert.deepEqual(splitAddress("Бережанська 22"), { street: "Бережанська", building: "22" });
});

test("splitAddress falls back to the first digit-starting token when there is no comma", () => {
  assert.deepEqual(splitAddress("вулиця Кирилівська 47А"), {
    streetType: "вулиця",
    street: "Кирилівська",
    building: "47А",
  });
});

test("splitAddress splits at the last comma when its tail carries a digit, even with a comma before it", () => {
  assert.deepEqual(splitAddress("вул. Кирилівська, 12, корпус 2"), {
    streetType: "вул.",
    street: "Кирилівська, 12",
    building: "корпус 2",
  });
});

test("splitAddress reports no building where the text names none", () => {
  assert.deepEqual(splitAddress("вулиця Незалежності"), {
    streetType: "вулиця",
    street: "Незалежності",
  });
});

test("splitAddress on an empty string returns an empty street and nothing else", () => {
  assert.deepEqual(splitAddress("   "), { street: "" });
});

test("compareBuildingNumbers: 22 and 22А match in their numeric part only", () => {
  assert.equal(compareBuildingNumbers("22", "22А"), "numeric");
});

test("compareBuildingNumbers: 60 and 358А conflict", () => {
  assert.equal(compareBuildingNumbers("60", "358А"), "conflicting");
});

test("compareBuildingNumbers: the same building number, spelled identically, is equal", () => {
  assert.equal(compareBuildingNumbers("22", "22"), "equal");
  assert.equal(compareBuildingNumbers("22а", "22А"), "equal");
});

test("compareBuildingNumbers: a building number absent on either side is neither equal nor conflicting", () => {
  assert.equal(compareBuildingNumbers(undefined, "22"), "absent");
  assert.equal(compareBuildingNumbers("22", undefined), "absent");
  assert.equal(compareBuildingNumbers(undefined, undefined), "absent");
});

test("stripStreetTypeWords: drops a street-type word wherever it stands, abbreviated or spelled out", () => {
  assert.equal(stripStreetTypeWords("вул. Шевченка"), "Шевченка");
  assert.equal(stripStreetTypeWords("вулиця Шевченка"), "Шевченка");
  assert.equal(stripStreetTypeWords("Шевченка"), "Шевченка");
});

test("stripStreetTypeWords: a street name that is not a street-type word is left untouched", () => {
  assert.equal(stripStreetTypeWords("Кирилівська"), "Кирилівська");
});

test("stripStreetTypeWords: бульв., the spec's own third example, is stripped like бульвар and бул", () => {
  assert.equal(stripStreetTypeWords("бульв. Чоколівський"), "Чоколівський");
  assert.equal(stripStreetTypeWords("бульвар Чоколівський"), "Чоколівський");
  assert.equal(stripStreetTypeWords("бул. Чоколівський"), "Чоколівський");
});

test("stripStreetTypeWords: дор. and майдан, both carried by the live listing, are also street-type words", () => {
  assert.equal(stripStreetTypeWords("дор. Кільцева"), "Кільцева");
  assert.equal(stripStreetTypeWords("дорога Кільцева"), "Кільцева");
  assert.equal(stripStreetTypeWords("майдан Шептицького"), "Шептицького");
});
