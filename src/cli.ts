#!/usr/bin/env node
import { buildProgram } from "./program.js";

async function main(): Promise<void> {
  const program = buildProgram();

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    process.stderr.write(
      `error: ${error instanceof Error ? error.message : String(error)}\n`,
    );

    process.exit(1);
  }
}

void main();
