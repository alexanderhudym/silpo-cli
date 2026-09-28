import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

const SUN_PATH_LIMIT = 100;

function resolveHome(): string {
  const override = process.env.SILPO_HOME;
  if (!override) return join(homedir(), ".silpo");
  return isAbsolute(override) ? override : resolve(process.cwd(), override);
}

function resolveSocket(forHome: string): string {
  const name = `silpo-${createHash("sha256").update(forHome).digest("hex").slice(0, 10)}.sock`;
  const preferred = join(tmpdir(), name);
  return preferred.length <= SUN_PATH_LIMIT ? preferred : join("/tmp", name);
}

const home = resolveHome();

export const paths = {
  home,
  config: join(home, "config.json"),
  token: join(home, "token.json"),
  socket: resolveSocket(home),
  log: join(home, "daemon.log"),
  startupError: join(home, "daemon.err.json"),
} as const;

export function ensureHome(): void {
  mkdirSync(home, { recursive: true, mode: 0o700 });
}
