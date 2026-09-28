import { toOneLine } from "./text.js";

const SEPARATOR = ": ";

export function formatEntryAsRow(
  key: string,
  value: string | number | boolean,
  separator = SEPARATOR,
): string {
  return `${key}${separator}${toOneLine(String(value))}`;
}

export function formatEntryAsSection(key: string, value: string): string {
  return `${key}\n${value}`;
}
