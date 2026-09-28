import assert from "node:assert/strict";
import { test } from "node:test";

const { requireJsonObject } = await import("../dist/utils/json.js");
const { buildProgram } = await import("../dist/program.js");

test("reads a JSON argument as the structure it was given", () => {
  assert.deepEqual(requireJsonObject('{"city":"Київ"}'), { city: "Київ" });
});

test("refuses a JSON argument of the wrong shape", () => {
  assert.throws(() => requireJsonObject("[]"), /expected a JSON object/);
  assert.throws(() => requireJsonObject("not json"), /expected JSON/);
});

test("no command besides raw takes a JSON document as an argument", () => {
  const offenders: string[] = [];

  function walk(command: import("commander").Command, path: string): void {
    const full = `${path} ${command.name()}`.trim();

    if (command.name() !== "raw") {
      for (const argument of command.registeredArguments) {
        if (/json/i.test(argument.description ?? "")) offenders.push(`${full} <${argument.name()}>`);
      }
    }

    for (const option of command.options) {
      const takesValue = /<.+>/.test(option.flags);

      if (takesValue && /json/i.test(option.flags)) offenders.push(`${full} ${option.flags}`);
      if (takesValue && /json/i.test(option.description ?? "")) offenders.push(`${full} ${option.flags}`);
    }

    for (const sub of command.commands) walk(sub, full);
  }

  walk(buildProgram(), "");

  assert.deepEqual(offenders, []);
});
