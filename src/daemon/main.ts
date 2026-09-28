import { createConnection, createServer, type Server, type Socket } from "node:net";
import { rmSync, writeFileSync } from "node:fs";

import { ensureHome, paths } from "../config/paths.js";
import { getSetting } from "../config/settings.js";
import { openSession, type McpSession } from "../mcp/session.js";
import { Cart } from "./cart.js";
import { Filler } from "./fill.js";
import {
  isDaemonMethod,
  type DaemonMethod,
  type DaemonRequest,
  type DaemonResponse,
  type DaemonResult,
  type DaemonStatus,
  type StartupError,
} from "./protocol.js";

function log(message: string): void {
  process.stdout.write(`${new Date().toISOString()} ${message}\n`);
}

function reportStartupFailure(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  const payload: StartupError = { message, at: new Date().toISOString() };
  try {
    writeFileSync(paths.startupError, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  } catch {}
  log(`startup failed: ${message}`);
  process.exit(1);
}

async function isSocketAlive(): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = createConnection({ path: paths.socket });
    const settle = (alive: boolean) => {
      probe.destroy();
      resolve(alive);
    };
    probe.setTimeout(1_000, () => settle(false));
    probe.once("connect", () => settle(true));
    probe.once("error", () => settle(false));
  });
}

class Daemon {
  private readonly startedAt = new Date();
  private lastActivityAt = new Date();
  private requestsServed = 0;
  private server: Server | undefined;
  private idleTimer: NodeJS.Timeout | undefined;
  private stopping = false;
  private readonly cart: Cart;
  private readonly filler: Filler;

  constructor(
    private readonly session: McpSession,
    private readonly idleTimeoutMs: number,
  ) {
    this.cart = new Cart(session);
    this.filler = new Filler(session, this.cart);
  }

  async listen(): Promise<void> {
    if (await isSocketAlive()) {
      log("another daemon already owns the socket, exiting");
      await this.session.close();
      process.exit(0);
    }
    rmSync(paths.socket, { force: true });

    const server = createServer((socket) => this.handleConnection(socket));
    this.server = server;

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(paths.socket, () => {
        server.removeListener("error", reject);
        resolve();
      });
    });

    this.idleTimer = setTimeout(() => void this.shutdown("idle timeout"), this.idleTimeoutMs);
    log(`listening on ${paths.socket} (idle timeout ${this.idleTimeoutMs}ms)`);
  }

  private touch(): void {
    this.lastActivityAt = new Date();
    this.idleTimer?.refresh();
  }

  private handleConnection(socket: Socket): void {
    socket.setEncoding("utf8");
    let buffer = "";
    socket.on("error", () => socket.destroy());
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
        if (line.trim()) void this.handleLine(socket, line);
      }
    });
  }

  private async handleLine(socket: Socket, line: string): Promise<void> {
    let request: DaemonRequest;
    try {
      const parsed: unknown = JSON.parse(line);
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        !("id" in parsed) ||
        !("method" in parsed) ||
        !isDaemonMethod(parsed.method)
      ) {
        throw new Error("malformed request");
      }
      request = parsed as DaemonRequest;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      socket.write(`${JSON.stringify({ id: "", ok: false, error: { message } })}\n`);
      return;
    }

    this.touch();
    this.requestsServed += 1;

    try {
      const result = await this.dispatch(request);
      const response: DaemonResponse = { id: request.id, ok: true, result };
      socket.write(`${JSON.stringify(response)}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const response: DaemonResponse = { id: request.id, ok: false, error: { message } };
      socket.write(`${JSON.stringify(response)}\n`);
      return;
    }

    if (request.method === "stop") {
      socket.end();
      await this.shutdown("stop requested");
    }
  }

  private async dispatch(request: DaemonRequest): Promise<DaemonResult<DaemonMethod>> {
    switch (request.method) {
      case "ping":
        return { pong: true };
      case "status":
        return this.status();
      case "stop":
        return { stopping: true };
      case "callTool": {
        const { name, arguments: args } = request.params;
        if (typeof name !== "string" || !name) throw new Error("callTool requires a tool name");
        return this.session.callTool(name, args ?? {});
      }
      case "cartCurrent":
        return this.cart.current();
      case "cartAdd":
        return this.cart.addProducts(request.params.products);
      case "cartRemove":
        return this.cart.removeProducts(request.params.products);
      case "cartClear":
        return this.cart.clear();
      case "cartSetup":
        return this.cart.setup(request.params.change);
      case "cartCertificates":
        return this.cart.certificates(request.params);
      case "resolveList":
        return this.filler.resolve(request.params.items, request.params.answers);
    }
  }

  private status(): DaemonStatus {
    return {
      pid: process.pid,
      startedAt: this.startedAt.toISOString(),
      lastActivityAt: this.lastActivityAt.toISOString(),
      idleTimeoutMs: this.idleTimeoutMs,
      idleExpiresAt: new Date(this.lastActivityAt.getTime() + this.idleTimeoutMs).toISOString(),
      baseUrl: this.session.baseUrl,
      sessionId: this.session.sessionId ?? null,
      serverInfo: this.session.serverInfo ?? null,
      toolCount: this.session.toolCount,
      requestsServed: this.requestsServed,
    };
  }

  async shutdown(reason: string): Promise<void> {
    if (this.stopping) return;
    this.stopping = true;
    log(`shutting down: ${reason}`);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    await new Promise<void>((resolve) => {
      if (!this.server) return resolve();
      this.server.close(() => resolve());
      this.server.unref();
    });
    rmSync(paths.socket, { force: true });
    await this.session.close();
    process.exit(0);
  }
}

async function main(): Promise<void> {
  ensureHome();
  rmSync(paths.startupError, { force: true });

  let idleTimeoutMs: number;
  let baseUrl: string;
  try {
    idleTimeoutMs = getSetting("daemon.idleTimeout");
    baseUrl = getSetting("mcp.baseUrl");
  } catch (error) {
    reportStartupFailure(error);
  }

  log(`connecting to ${baseUrl}`);
  let session: McpSession;
  try {
    session = await openSession(baseUrl);
  } catch (error) {
    reportStartupFailure(error);
  }
  log(`authorized, ${session.toolCount} tools available`);

  const daemon = new Daemon(session, idleTimeoutMs);
  try {
    await daemon.listen();
  } catch (error) {
    await session.close();
    reportStartupFailure(error);
  }

  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
    process.on(signal, () => void daemon.shutdown(signal));
  }
}

void main();
