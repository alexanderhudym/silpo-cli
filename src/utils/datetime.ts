const UTC = "UTC";
const WHEN_MESSAGE = "expected today, tomorrow, a date, or a date and a time, like 2026-08-17 09:00";
const TODAY = "today";
const TOMORROW = "tomorrow";
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const RELATIVE_DAY_WITH_TIME = /^(today|tomorrow)\s+(\S.*)$/i;

export function isInstant(value: string): boolean {
  try {
    Temporal.Instant.from(value);

    return true;
  } catch {
    return false;
  }
}

export type ParsedTime =
  | { readonly kind: "day"; readonly date: Temporal.PlainDate }
  | { readonly kind: "instant"; readonly instant: Temporal.Instant };

export function parseTime(value: string): ParsedTime {
  const text = value.trim();
  const lower = text.toLowerCase();

  if (lower === TODAY) return { kind: "day", date: Temporal.Now.plainDateISO() };
  if (lower === TOMORROW) {
    return { kind: "day", date: Temporal.Now.plainDateISO().add({ days: 1 }) };
  }

  const relative = RELATIVE_DAY_WITH_TIME.exec(text);

  if (relative) {
    const word = relative[1]!;
    const timePart = relative[2]!;
    const date =
      word.toLowerCase() === TODAY
        ? Temporal.Now.plainDateISO()
        : Temporal.Now.plainDateISO().add({ days: 1 });

    try {
      const time = Temporal.PlainTime.from(timePart.trim());

      return {
        kind: "instant",
        instant: date.toPlainDateTime(time).toZonedDateTime(Temporal.Now.timeZoneId()).toInstant(),
      };
    } catch {
      throw new Error(WHEN_MESSAGE);
    }
  }

  try {
    return { kind: "instant", instant: Temporal.Instant.from(text) };
  } catch {}

  if (DATE_ONLY.test(text)) {
    try {
      return { kind: "day", date: Temporal.PlainDate.from(text) };
    } catch {
      throw new Error(WHEN_MESSAGE);
    }
  }

  try {
    const local = Temporal.PlainDateTime.from(text);

    return {
      kind: "instant",
      instant: local.toZonedDateTime(Temporal.Now.timeZoneId()).toInstant(),
    };
  } catch {
    throw new Error(WHEN_MESSAGE);
  }
}

export type DayBoundary = "start" | "end";

function instantOf(parsed: ParsedTime, boundary: DayBoundary): Temporal.Instant {
  if (parsed.kind === "instant") return parsed.instant;

  const startOfDay = parsed.date.toZonedDateTime(Temporal.Now.timeZoneId());

  return boundary === "start"
    ? startOfDay.toInstant()
    : startOfDay.add({ days: 1 }).toInstant().subtract({ nanoseconds: 1 });
}

export function toEpochMs(value: string, boundary: DayBoundary = "start"): number {
  return instantOf(parseTime(value), boundary).epochMilliseconds;
}

export function toUtc(value: string, boundary: DayBoundary = "start"): string {
  return instantOf(parseTime(value), boundary).toString({ timeZone: UTC });
}

export function toLocalTime(value: string, boundary: DayBoundary = "start"): string {
  return instantOf(parseTime(value), boundary)
    .toZonedDateTimeISO(Temporal.Now.timeZoneId())
    .toPlainDateTime()
    .toString({ smallestUnit: "minute" })
    .replace("T", " ");
}
