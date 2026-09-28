import { Command } from "commander";

import { registerAuthCommands } from "./commands/auth.js";
import { registerCatalogCommand } from "./commands/catalog.js";
import { registerCartCommands } from "./commands/carts.js";
import { registerConfigCommands } from "./commands/config.js";
import { registerCartFillCommand } from "./commands/fill.js";
import { registerMeCommands } from "./commands/me.js";
import { registerNpCommand } from "./commands/np.js";
import { registerProductsCommand } from "./commands/products.js";
import { registerRawCommands } from "./commands/raw.js";
import { registerServerCommands } from "./commands/server.js";
import { registerSlotsCommand } from "./commands/slots.js";
import { registerStoresCommand } from "./commands/stores.js";
import { CLI_NAME, CLI_VERSION } from "./version.js";

export function buildProgram(): Command {
  const program = new Command();
  program
    .name(CLI_NAME)
    .description("CLI client for the Silpo MCP server")
    .version(CLI_VERSION)
    .showHelpAfterError();

  registerAuthCommands(program);
  registerMeCommands(program);
  registerStoresCommand(program);
  registerSlotsCommand(program);
  registerNpCommand(program);
  registerProductsCommand(program);
  registerCatalogCommand(program);
  const cart = registerCartCommands(program);
  registerCartFillCommand(cart);
  registerRawCommands(program);
  registerServerCommands(program);
  registerConfigCommands(program);

  return program;
}
