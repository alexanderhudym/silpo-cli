import type { Command } from "commander";

import { isExpired, readCredentials } from "../auth/credentials.js";
import { forgetCredentials, performLogin, revokeTokens } from "../auth/login.js";
import { DEFAULT_CALLBACK_PORT } from "../auth/provider.js";
import { getSetting } from "../config/settings.js";
import { ensureDaemon, getDaemonStatus, stopDaemon } from "../daemon/client.js";
import { formatRows } from "../utils/list.js";
import { formatEntryAsRow } from "../utils/record.js";

function parsePort(raw: string): number {
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`expected a port between 1 and 65535, got "${raw}"`);
  }
  return port;
}

export function registerAuthCommands(program: Command): void {
  program
    .command("login")
    .description("Authorize in Silpo via the browser and store the tokens")
    .option("--force", "re-authorize even if tokens are already stored")
    .option("--port <port>", "local callback port", String(DEFAULT_CALLBACK_PORT))
    .option("--no-browser", "only print the authorization URL instead of opening a browser")
    .action(async (options: { force?: boolean; port: string; browser: boolean }) => {
      const baseUrl = getSetting("mcp.baseUrl");
      const existing = readCredentials();

      if (existing?.access_token && !isExpired(existing) && !options.force) {
        process.stdout.write("already authorized, use `silpo login --force` to sign in again\n");
        return;
      }

      await stopDaemon();

      await performLogin({
        baseUrl,
        port: parsePort(options.port),
        useBrowser: options.browser,
        onAuthorizationUrl: (url, opened) => {
          process.stdout.write(`${opened ? "opened in browser" : "open this URL"}: ${url}\nwaiting for callback...\n`);
        },
      });

      await ensureDaemon();
      const status = await getDaemonStatus();
      process.stdout.write(`${formatRows([
        formatEntryAsRow("state", "authorized"),
        formatEntryAsRow("mcp", baseUrl),
        formatEntryAsRow("tools", status ? String(status.toolCount) : "unknown"),
      ])}\n`);
    });

  program
    .command("logout")
    .description("Revoke the stored tokens and stop the background server")
    .action(async () => {
      const existing = readCredentials();
      if (!existing?.access_token) {
        await stopDaemon();
        process.stdout.write("not authorized\n");
        return;
      }

      await stopDaemon();
      const revoked = await revokeTokens(getSetting("mcp.baseUrl"));
      forgetCredentials();

      process.stdout.write(`${formatRows([
        formatEntryAsRow("state", "logged out"),
        formatEntryAsRow(
          "tokens",
          revoked ? "revoked and deleted" : "deleted locally (server did not confirm revocation)",
        ),
      ])}\n`);
    });
}
