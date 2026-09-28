import assert from "node:assert/strict";
import { test } from "node:test";

process.env.TZ = "Europe/Kyiv";

const { isInstant, toLocalTime, toUtc, parseTime } = await import("../dist/utils/datetime.js");

test("shows a UTC instant in the local zone", () => {
  assert.equal(toLocalTime("2026-08-17T06:00:00+00:00"), "2026-08-17 09:00");
  assert.equal(toLocalTime("2026-08-17T22:30:00+00:00"), "2026-08-18 01:30");
});

test("honours an offset that is not UTC", () => {
  assert.equal(toLocalTime("2026-08-17T06:00:00+05:00"), "2026-08-17 04:00");
  assert.equal(toLocalTime("2026-08-17T06:00:00Z"), "2026-08-17 09:00");
});

test("recognises what names an absolute instant and what does not", () => {
  assert.equal(isInstant("2026-08-17T06:00:00+00:00"), true);
  assert.equal(isInstant("2026-08-17T06:00:00Z"), true);

  for (const raw of ["2026-08-17T06:00:00", "2026-08-17", "tomorrow", "7", ""]) {
    assert.equal(isInstant(raw), false, `${raw} was taken for an instant`);
  }
});

test("takes a time naming no zone for a local one, and leaves it where it stands", () => {
  assert.equal(toLocalTime("2022-10-11T17:12:31"), "2022-10-11 17:12");
  assert.equal(toLocalTime("2026-08-17T09:00"), "2026-08-17 09:00");
  assert.equal(toLocalTime("2026-08-17"), "2026-08-17 00:00");
});

test("refuses to write what names no time at all", () => {
  for (const raw of ["7", "2026-13-45 99:99", ""]) {
    assert.throws(() => toLocalTime(raw), `${raw} was written as a time`);
  }
});

test("reads today and tomorrow as that day's first local moment", () => {
  const today = Temporal.Now.plainDateISO().toString();
  const tomorrow = Temporal.Now.plainDateISO().add({ days: 1 }).toString();

  assert.equal(toLocalTime("today"), `${today} 00:00`);
  assert.equal(toLocalTime("tomorrow"), `${tomorrow} 00:00`);
});

test("reads a local wall clock time back as UTC", () => {
  assert.equal(toUtc("2026-08-17 09:00"), "2026-08-17T06:00:00+00:00");
  assert.equal(toUtc("2026-08-17T09:00"), "2026-08-17T06:00:00+00:00");
  assert.equal(toUtc("2026-08-17"), "2026-08-16T21:00:00+00:00");
});

test("does not reinterpret a value that already states its zone", () => {
  assert.equal(toUtc("2026-08-17T06:00:00+00:00"), "2026-08-17T06:00:00+00:00");
  assert.equal(toUtc("2026-08-17T06:00:00Z"), "2026-08-17T06:00:00+00:00");
  assert.equal(toUtc("2026-08-17T06:00:00+05:00"), "2026-08-17T01:00:00+00:00");
});

test("round trips every slot boundary the server can send", () => {
  for (const hour of ["00", "06", "12", "21", "23"]) {
    const server = `2026-08-17T${hour}:00:00+00:00`;

    assert.equal(toUtc(toLocalTime(server)), server);
  }
});

test("round trips a local wall clock time back to itself", () => {
  for (const local of ["2026-01-01 00:00", "2026-08-17 09:00", "2026-12-31 23:59"]) {
    assert.equal(toLocalTime(toUtc(local)), local);
  }
});

test("crosses a daylight saving change without drifting", () => {
  assert.equal(toLocalTime("2026-03-29T00:30:00+00:00"), "2026-03-29 02:30");
  assert.equal(toLocalTime("2026-03-29T01:30:00+00:00"), "2026-03-29 04:30");
  assert.equal(toUtc("2026-03-29 02:30"), "2026-03-29T00:30:00+00:00");
  assert.equal(toUtc("2026-03-29 04:30"), "2026-03-29T01:30:00+00:00");
});

test("refuses to read what it cannot make a time of, naming all three forms it takes", () => {
  for (const raw of ["2026-13-45 99:99", "7", ""]) {
    assert.throws(
      () => toUtc(raw),
      /expected today, tomorrow, a date, or a date and a time, like 2026-08-17 09:00/,
      `${raw} was read as a time`,
    );
  }
});

test("reads today and tomorrow as a UTC instant, at the boundary the caller asked for", () => {
  const today = Temporal.Now.plainDateISO();

  assert.equal(
    toUtc("today", "start"),
    today.toZonedDateTime(Temporal.Now.timeZoneId()).toInstant().toString({ timeZone: "UTC" }),
  );
  assert.equal(
    toUtc("today", "end"),
    today
      .add({ days: 1 })
      .toZonedDateTime(Temporal.Now.timeZoneId())
      .toInstant()
      .subtract({ nanoseconds: 1 })
      .toString({ timeZone: "UTC" }),
  );
});

test("reads today and tomorrow as the day in the machine's own time zone", () => {
  const today = parseTime("today");
  const tomorrow = parseTime("tomorrow");

  assert.equal(today.kind, "day");
  assert.equal(today.date.toString(), Temporal.Now.plainDateISO().toString());
  assert.equal(tomorrow.kind, "day");
  assert.equal(tomorrow.date.toString(), Temporal.Now.plainDateISO().add({ days: 1 }).toString());
});

test("reads a bare date as a day, not as midnight", () => {
  const parsed = parseTime("2026-08-17");

  assert.deepEqual(parsed, { kind: "day", date: Temporal.PlainDate.from("2026-08-17") });
});

test("reads a date and a wall clock time in the machine's own zone", () => {
  for (const raw of ["2026-08-17 09:00", "2026-08-17T09:00"]) {
    const parsed = parseTime(raw);

    assert.equal(parsed.kind, "instant");
    assert.equal(
      (parsed as { instant: Temporal.Instant }).instant.epochMilliseconds,
      Temporal.Instant.from(toUtc(raw)).epochMilliseconds,
    );
  }
});

test("reads a spelling carrying its own zone as the instant it names", () => {
  const parsed = parseTime("2026-08-17T09:00Z");

  assert.equal(parsed.kind, "instant");
  assert.equal((parsed as { instant: Temporal.Instant }).instant.toString(), "2026-08-17T09:00:00Z");
});

test("reads today or tomorrow followed by a wall clock time as that instant", () => {
  const todayAt = parseTime("today 15:30");

  assert.equal(todayAt.kind, "instant");
  assert.equal(
    (todayAt as { instant: Temporal.Instant }).instant.epochMilliseconds,
    Temporal.Instant.from(toUtc(`${Temporal.Now.plainDateISO().toString()} 15:30`)).epochMilliseconds,
  );

  const tomorrowAt = parseTime("Tomorrow 09:00");

  assert.equal(tomorrowAt.kind, "instant");
  assert.equal(
    (tomorrowAt as { instant: Temporal.Instant }).instant.epochMilliseconds,
    Temporal.Instant.from(
      toUtc(`${Temporal.Now.plainDateISO().add({ days: 1 }).toString()} 09:00`),
    ).epochMilliseconds,
  );
});

test("refuses a value in none of the three forms, naming all three", () => {
  for (const raw of ["not a time", "7", ""]) {
    assert.throws(
      () => parseTime(raw),
      /expected today, tomorrow, a date, or a date and a time, like 2026-08-17 09:00/,
      `${raw} was read as a time`,
    );
  }
});
