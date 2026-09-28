const SEPARATOR = ", ";

export type Flags = Readonly<Record<string, boolean>>;

function stripPrefix(name: string, prefix: string): string {
  if (prefix === "" || !name.startsWith(prefix)) {
    return name;
  }

  const rest = name.slice(prefix.length);

  return rest.charAt(0).toLowerCase() + rest.slice(1);
}

export function formatFlags(flags: Flags, prefix = ""): string {
  return Object.entries(flags)
    .filter(([, raised]) => raised)
    .map(([name]) => stripPrefix(name, prefix))
    .join(SEPARATOR);
}
