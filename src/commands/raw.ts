import type { Command } from "commander";

import { runTool } from "../daemon/client.js";
import { requireJsonObject } from "../utils/json.js";

export function registerRawCommands(program: Command): void {
  program
    .command("raw")
    .description("Call any MCP tool directly and print its payload")
    .argument("<tool>", "MCP tool name, such as silpo_get_my_profile")
    .argument("[json]", "JSON object of tool arguments", "{}")
    .action(async (tool: string, json: string, _options: unknown, command: Command) => {
      const payload = await runTool(tool, requireJsonObject(json));

      process.stdout.write(`${JSON.stringify(payload)}\n`);
    });
}
