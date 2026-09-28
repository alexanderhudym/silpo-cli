import { spawn } from "node:child_process";
import { openSync, readFileSync } from "node:fs";
import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { ensureHome, paths } from "../config/paths.js";
import type { CertificateChange, DeliveryChange } from "./cart.js";
import type { ResolveAnswer, ResolveListResult } from "./fill.js";
import type { CartProductInput, CartProductRef } from "../mcp/silpo.js";
import {
  type DaemonMethod,
  type DaemonParams,
  type DaemonRequest,
  type DaemonResponse,
  type DaemonResult,
  type DaemonStatus,
  type StartupError,
  type ToolCallOutcome,
} from "./protocol.js";
import { createSurface, type SilpoSurface } from "../mcp/surface.js";

const CONNECT_TIMEOUT_MS = 5_000;
/**
 * A command is one socket write and one wait, and `socket.setTimeout` is an inactivity timeout the
 * daemon does not reset — it writes nothing until the whole call is done. So whatever this is, it is
 * a flat ceiling on every command, and at 10 seconds it was cutting real work: a thirty-item
 * `cart fill` measured 9.8s on a healthy server, and across one benchmark sweep the ninetieth
 * percentile of successful calls was 7.9s and the ninety-fifth 11.6s.
 *
 * It is set above the MCP SDK's own 60-second per-request timeout on purpose. One command is
 * several requests, so the honest ceiling is a multiple of that; and where a single request is what
 * hung, the SDK's own error should be what surfaces, rather than this one blaming the daemon for a
 * server that stopped answering.
 */
const RESPONSE_TIMEOUT_MS = 120_000;
const START_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 100;

const DOWN_CODES = new Set([
  "ENOENT",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTSOCK",
]);

function isDownError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code !== undefined && DOWN_CODES.has(code);
}

export function daemonRequest<M extends DaemonMethod>(
  method: M,
  params: DaemonParams<M>,
): Promise<DaemonResult<M>> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ path: paths.socket });
    socket.setEncoding("utf8");
    socket.setTimeout(CONNECT_TIMEOUT_MS);

    let buffer = "";
    const fail = (error: Error) => {
      socket.destroy();
      reject(error);
    };

    let connected = false;

    socket.on("error", fail);
    socket.on("timeout", () =>
      fail(
        new Error(
          connected
            ? `no answer ${RESPONSE_TIMEOUT_MS / 1000}s after the request was sent, so this command gave up waiting — ` +
              "the daemon may still be working and a write may already have reached the server. " +
              "Read the cart before repeating a write, or the same products land in it twice."
            : `no daemon accepted a connection within ${CONNECT_TIMEOUT_MS / 1000}s`,
        ),
      ),
    );
    socket.on("close", () => reject(new Error("daemon closed the connection")));
    socket.on("connect", () => {
      connected = true;
      socket.setTimeout(RESPONSE_TIMEOUT_MS);

      const request: DaemonRequest<M> = { id: randomUUID(), method, params };
      socket.write(`${JSON.stringify(request)}\n`);
    });
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      const line = buffer.slice(0, newline);
      socket.end();
      let response: DaemonResponse<M>;
      try {
        response = JSON.parse(line) as DaemonResponse<M>;
      } catch {
        fail(new Error("malformed daemon response"));
        return;
      }
      if (!response.ok) {
        fail(new Error(response.error.message));
        return;
      }
      resolve(response.result);
    });
  });
}

export async function getDaemonStatus(): Promise<DaemonStatus | null> {
  try {
    return await daemonRequest("status", {});
  } catch (error) {
    if (isDownError(error)) return null;
    throw error;
  }
}

async function isAlive(): Promise<boolean> {
  try {
    await daemonRequest("ping", {});
    return true;
  } catch {
    return false;
  }
}

function readStartupError(): string | undefined {
  try {
    const parsed = JSON.parse(
      readFileSync(paths.startupError, "utf8"),
    ) as StartupError;
    return parsed.message;
  } catch {
    return undefined;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type StartOutcome = "reused" | "started";

export async function ensureDaemon(): Promise<StartOutcome> {
  if (await isAlive()) return "reused";

  ensureHome();
  const entry = fileURLToPath(new URL("./main.js", import.meta.url));
  const logFd = openSync(paths.log, "a");
  const child = spawn(process.execPath, [entry], {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: process.env,
  });

  let exited:
    | { code: number | null; signal: NodeJS.Signals | null }
    | undefined;
  let spawnError: Error | undefined;
  child.once("exit", (code, signal) => {
    exited = { code, signal };
  });
  child.once("error", (error) => {
    spawnError = error;
  });

  const detach = () => {
    child.removeAllListeners();
    child.unref();
  };

  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await isAlive()) {
      detach();
      return "started";
    }
    if (spawnError) {
      detach();
      throw spawnError;
    }
    if (exited) {
      detach();
      const reason =
        readStartupError() ??
        `background server exited (${exited.signal ?? `code ${exited.code}`}), see ${paths.log}`;
      throw new Error(reason);
    }
    await sleep(POLL_INTERVAL_MS);
  }

  detach();
  throw new Error(
    `background server did not become ready in ${START_TIMEOUT_MS / 1000}s, see ${paths.log}`,
  );
}

async function requestWithRestart<M extends DaemonMethod>(
  method: M,
  params: DaemonParams<M>,
): Promise<DaemonResult<M>> {
  await ensureDaemon();

  try {
    return await daemonRequest(method, params);
  } catch (error) {
    if (!isDownError(error)) throw error;

    await ensureDaemon();
    return daemonRequest(method, params);
  }
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<ToolCallOutcome> {
  return requestWithRestart("callTool", { name, arguments: args });
}

async function ask<M extends DaemonMethod>(
  method: M,
  params: DaemonParams<M>,
): Promise<DaemonResult<M>> {
  return requestWithRestart(method, params);
}

export const shoppingCart = {
  current: () => ask("cartCurrent", {}),
  addProducts: (products: CartProductInput[]) => ask("cartAdd", { products }),
  removeProducts: (products: CartProductRef[]) => ask("cartRemove", { products }),
  clear: () => ask("cartClear", {}),
  setup: (change: DeliveryChange) => ask("cartSetup", { change }),
  certificates: (change: CertificateChange) => ask("cartCertificates", change),
};

export function resolveList(
  items: string[],
  answers: ResolveAnswer[],
): Promise<ResolveListResult> {
  return ask("resolveList", { items, answers });
}

export async function runTool(
  name: string,
  args: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const outcome = await callTool(name, args);
  if (outcome.isError) throw new Error(outcome.content);

  return outcome.structured;
}

export const silpo: SilpoSurface = createSurface(async (tool, args) => {
  const outcome = await callTool(tool, args);

  if (outcome.isError) throw new Error(outcome.content);

  return { content: outcome.content, structured: outcome.structured };
});

export async function stopDaemon(): Promise<boolean> {
  try {
    await daemonRequest("stop", {});
    return true;
  } catch (error) {
    if (isDownError(error)) return false;
    throw error;
  }
}
