import { readFileSync, writeFileSync } from "node:fs";

import { ensureHome, paths } from "./paths.js";

export interface ConfigField<T> {
  readonly description: string;
  readonly fallback: string;
  readonly parse: (raw: string) => T;
}

const DURATION_UNITS = { ms: 1, s: 1_000, m: 60_000, h: 3_600_000 } as const;

type DurationUnit = keyof typeof DURATION_UNITS;

function parseDuration(raw: string): number {
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h)?$/i.exec(raw.trim());
  if (!match) {
    throw new Error(`expected a duration like "5m", "300s" or "90000ms", got "${raw}"`);
  }
  const unit = (match[2]?.toLowerCase() ?? "m") as DurationUnit;
  const value = Math.round(Number(match[1]) * DURATION_UNITS[unit]);
  if (value <= 0) throw new Error("duration must be greater than zero");
  return value;
}

function parseHttpUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error(`expected an absolute URL, got "${raw}"`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`expected an http(s) URL, got "${raw}"`);
  }
  return url.toString();
}

const fields = {
  "daemon.idleTimeout": {
    description:
      "How long the background server stays alive without requests, and so how long the cart it holds is trusted",
    fallback: "10m",
    parse: parseDuration,
  },
  "mcp.baseUrl": {
    description: "Silpo MCP endpoint the background server connects to",
    fallback: "https://mcp.silpo.ua/mcp",
    parse: parseHttpUrl,
  },
} as const satisfies Record<string, ConfigField<unknown>>;

export type ConfigKey = keyof typeof fields;
export type ConfigValue<K extends ConfigKey> = ReturnType<(typeof fields)[K]["parse"]>;

export const configKeys = Object.keys(fields) as readonly ConfigKey[];

export function isConfigKey(key: string): key is ConfigKey {
  return Object.hasOwn(fields, key);
}

export function describeKey(key: ConfigKey): string {
  return fields[key].description;
}

type RawConfig = Partial<Record<ConfigKey, string>>;

function readRawConfig(): RawConfig {
  let contents: string;
  try {
    contents = readFileSync(paths.config, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
  const parsed: unknown = JSON.parse(contents);
  if (typeof parsed !== "object" || parsed === null) return {};
  const raw: RawConfig = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (isConfigKey(key) && typeof value === "string") raw[key] = value;
  }
  return raw;
}

export interface ConfigEntry<K extends ConfigKey = ConfigKey> {
  readonly key: K;
  readonly raw: string;
  readonly value: ConfigValue<K>;
  readonly source: "config" | "default";
  readonly description: string;
}

export function getEntry<K extends ConfigKey>(key: K): ConfigEntry<K> {
  const field = fields[key];
  const stored = readRawConfig()[key];
  const raw = stored ?? field.fallback;
  const source = stored === undefined ? "default" : "config";
  try {
    return { key, raw, value: field.parse(raw) as ConfigValue<K>, source, description: field.description };
  } catch (error) {
    if (source === "default") throw error;
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid value for ${key} in ${paths.config}: ${reason}`);
  }
}

export function getSetting<K extends ConfigKey>(key: K): ConfigValue<K> {
  return getEntry(key).value;
}

export function listEntries(): readonly ConfigEntry[] {
  return configKeys.map((key) => getEntry(key));
}

export function setSetting<K extends ConfigKey>(key: K, raw: string): ConfigEntry<K> {
  fields[key].parse(raw);
  ensureHome();
  const next = { ...readRawConfig(), [key]: raw };
  writeFileSync(paths.config, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 });
  return getEntry(key);
}
