import type { Command } from "commander";

import { ensureDaemon, getDaemonStatus, stopDaemon, type StartOutcome } from "../daemon/client.js";
import type { DaemonStatus } from "../daemon/protocol.js";
import { getSetting } from "../config/settings.js";
import { formatRows } from "../utils/list.js";
import { formatEntryAsRow } from "../utils/record.js";

function formatDuration(ms: number): string {
  if (ms % 3_600_000 === 0) return `${ms / 3_600_000}h`;
  if (ms % 60_000 === 0) return `${ms / 60_000}m`;
  if (ms % 1_000 === 0) return `${ms / 1_000}s`;
  return `${ms}ms`;
}

function formatElapsed(fromIso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - Date.parse(fromIso)) / 1_000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour12: false });
}

function statusRows(status: DaemonStatus): string[] {
  return [
    formatEntryAsRow("mcp", status.baseUrl),
    formatEntryAsRow(
      "server",
      status.serverInfo ? `${status.serverInfo.name} ${status.serverInfo.version}` : "unknown",
    ),
    formatEntryAsRow("session", status.sessionId ?? "none"),
    formatEntryAsRow("tools", status.toolCount),
    formatEntryAsRow("pid", status.pid),
    formatEntryAsRow("uptime", formatElapsed(status.startedAt)),
    formatEntryAsRow(
      "idleStop",
      `${formatDuration(status.idleTimeoutMs)} at ${formatClock(status.idleExpiresAt)}`,
    ),
  ];
}

export function registerServerCommands(program: Command): void {
  const server = program
    .command("server")
    .description("State of the background MCP session")
    .option("--json", "print raw JSON")
    .action(async (options: { json?: boolean }) => {
      const status = await getDaemonStatus();

      if (options.json) {
        const payload = status
          ? { running: true, ...status }
          : { running: false, baseUrl: getSetting("mcp.baseUrl") };
        process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
        return;
      }
      if (!status) {
        process.stdout.write(`${formatRows([
          formatEntryAsRow("state", "stopped"),
          formatEntryAsRow("mcp", getSetting("mcp.baseUrl")),
        ])}\n`);
        return;
      }
      process.stdout.write(
        `${formatRows([formatEntryAsRow("state", "authorized"), ...statusRows(status)])}\n`,
      );
    });

  server
    .command("test")
    .description("Connect and authorize, reusing the running background server if any")
    .option("--json", "print raw JSON")
    .action(async (options: { json?: boolean }) => {
      const outcome: StartOutcome = await ensureDaemon();
      const status = await getDaemonStatus();
      if (!status) throw new Error("background server stopped right after starting");

      if (options.json) {
        process.stdout.write(`${JSON.stringify({ ok: true, outcome, ...status }, null, 2)}\n`);
        return;
      }
      process.stdout.write(
        `${formatRows([
          formatEntryAsRow("state", `authorized (${outcome === "reused" ? "reused" : "started"})`),
          ...statusRows(status),
        ])}\n`,
      );
    });

  server
    .command("stop")
    .description("Stop the background server and drop the MCP session")
    .action(async () => {
      const stopped = await stopDaemon();
      process.stdout.write(stopped ? "stopped\n" : "not running\n");
    });
}
