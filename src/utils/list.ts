const BETWEEN_ROWS = "\n";
const BETWEEN_ITEMS = "\n\n";
const INDENT = "  ";

type Row = string | false | null | undefined;

export function indent(text: string): string {
  return text
    .split("\n")
    .map((line) => (line === "" ? line : `${INDENT}${line}`))
    .join("\n");
}

export function formatRows(rows: readonly Row[]): string {
  return rows.filter(Boolean).join(BETWEEN_ROWS);
}

export function formatList(items: readonly Row[]): string {
  return items.filter(Boolean).join(BETWEEN_ITEMS);
}
