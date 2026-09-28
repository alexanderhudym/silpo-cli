import type { Command } from "commander";

import {
  configKeys,
  getEntry,
  isConfigKey,
  listEntries,
  setSetting,
  type ConfigEntry,
  type ConfigKey,
} from "../config/settings.js";
import { paths } from "../config/paths.js";
import { getDaemonStatus } from "../daemon/client.js";
import { formatRows } from "../utils/list.js";
import { formatEntryAsRow } from "../utils/record.js";

function assertKey(key: string): asserts key is ConfigKey {
  if (!isConfigKey(key)) {
    throw new Error(`unknown config key "${key}", expected one of: ${configKeys.join(", ")}`);
  }
}

function entryRow(entry: ConfigEntry): string {
  return formatEntryAsRow(
    entry.key,
    entry.source === "default" ? `${entry.raw} (default)` : entry.raw,
  );
}

export function registerConfigCommands(program: Command): void {
  const config = program
    .command("config")
    .description("Effective CLI settings")
    .option("--json", "print raw JSON")
    .action(async (options: { json?: boolean }) => {
      const entries = listEntries();
      if (options.json) {
        const values = Object.fromEntries(entries.map((entry) => [entry.key, entry.raw]));
        process.stdout.write(`${JSON.stringify(values, null, 2)}\n`);
        return;
      }
      process.stdout.write(
        `${formatRows([formatEntryAsRow("file", paths.config), ...entries.map(entryRow)])}\n`,
      );
    });

  config
    .command("get")
    .argument("<key>", `config key: ${configKeys.join(", ")}`)
    .description("Print one config value")
    .option("--json", "print raw JSON")
    .action(async (key: string, options: { json?: boolean }) => {
      assertKey(key);
      const entry = getEntry(key);
      if (options.json) {
        const payload = { key: entry.key, value: entry.raw, source: entry.source };
        process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
        return;
      }
      process.stdout.write(`${entry.raw}\n`);
    });

  config
    .command("set")
    .argument("<key>", `config key: ${configKeys.join(", ")}`)
    .argument("<value>", "new value")
    .description("Store a config value")
    .action(async (key: string, value: string) => {
      assertKey(key);
      const entry = setSetting(key, value);
      process.stdout.write(`${entryRow(entry)}\n`);

      const status = await getDaemonStatus().catch(() => null);
      if (status) {
        process.stdout.write("background server is running with the old value, restart it: silpo server stop\n");
      }
    });
}
