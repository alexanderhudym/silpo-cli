import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const home = mkdtempSync(join(tmpdir(), "silpo-cli-"));

process.env.SILPO_HOME = home;

const { paths } = await import("../dist/config/paths.js");
const { Filler } = await import("../dist/daemon/fill.js");
const { createSurface } = await import("../dist/mcp/surface.js");

const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const FIXTURES = fileURLToPath(new URL("./fixtures/", import.meta.url));

export type ToolCall = { name: string; arguments: Record<string, unknown> };

export const PAGE_LIMIT_CAP: Readonly<Record<string, number>> = {
  silpo_get_products: 100,
  silpo_find_products_batch: 100,
  silpo_get_my_favorites: 500,
  silpo_get_similar_products: 100,
  silpo_get_my_online_orders: 50,
  silpo_get_my_offline_orders: 10,
};

function guardLimit(call: ToolCall): void {
  const cap = PAGE_LIMIT_CAP[call.name];
  const limit = call.arguments.limit;

  if (cap !== undefined && typeof limit === "number" && limit > cap) {
    throw new Error(`${call.name} sent limit ${limit}, over the server's cap of ${cap}`);
  }
}

function recordCall(call: ToolCall): void {
  guardLimit(call);
  calls.push(call);
}

const CART_TOOL = "silpo_get_shopping_cart_by_id";

export const CART = "6156c5c8-cb19-4f23-ad3c-ba981698b91f";
export const BRANCH = "1ee15e2a-7c41-6b83-9d52-4b7d0e93c468";
export const COMPANY = "1ec88c5d-a050-669c-8467-570a157f3e31";

const HELD_CART = {
  cart: {
    id: CART,
    deliveryType: "SelfPickup",
    timeslot: { start: "2026-08-17T06:00:00+00:00", end: "2026-08-17T06:30:00+00:00" },
    address: { addressType: "self-pickup", city: "Київ", street: "просп. Володимира Івасюка, 46" },
    shipments: [{ id: "s1", companyId: COMPANY, branchId: BRANCH, products: [] }],
    promoCode: null,
    calculation: {
      total: 0,
      totalAfterDiscounts: 0,
      certificatesTotal: 0,
      subTotal: 0,
      subDiscount: 0,
      productsTotal: 0,
      delivery: { total: 0, totalWeight: 0, deliveryExpressByPromise: null },
      promoCode: null,
      payment: { availableTypes: [] },
      validations: [],
    },
  },
  loyalty: null,
};

let respond: (call: ToolCall, peek?: boolean) => unknown = () => ({});
let server: Server | undefined;
let calls: ToolCall[] = [];

export function setPayload(value: unknown): void {
  respond = () => value;
}

export type Responder = (args: Record<string, unknown>) => unknown;

export function setPayloads(byTool: Readonly<Record<string, unknown>>): void {
  const queues = new Map(
    Object.entries(byTool).map(([tool, value]) => [
      tool,
      Array.isArray(value) ? [...(value as unknown[])] : value,
    ]),
  );

  respond = (call, peek) => {
    const value = queues.get(call.name);

    if (typeof value === "function") {
      return (value as Responder)(call.arguments);
    }

    if (Array.isArray(value)) {
      return value.length > 1 && peek !== true ? value.shift() : value[0];
    }

    return value ?? {};
  };
}

export function toolCalls(): ToolCall[] {
  return calls;
}

export function clearToolCalls(): void {
  calls = [];
}

export function fixture(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), "utf8")) as Record<
    string,
    unknown
  >;
}

function outcome(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && "isError" in value
    ? (value as Record<string, unknown>)
    : { isError: false, structured: value };
}

const WRITES: Readonly<Record<string, string>> = {
  cartAdd: "silpo_add_or_update_cart_products",
  cartRemove: "silpo_remove_cart_products",
  cartClear: "silpo_clear_shopping_cart",
  cartSetup: "silpo_update_shopping_cart",
  cartCertificates: "silpo_add_or_update_certificates",
};

function readCart(fromServer: boolean): Record<string, unknown> {
  const call = { name: CART_TOOL, arguments: { shoppingCartId: CART } };
  const answer = respond(call, !fromServer) as Record<string, unknown>;

  if (fromServer) recordCall(call);

  return "cart" in answer ? answer : (HELD_CART as unknown as Record<string, unknown>);
}

export type ResolveAnswer =
  | { term: string; productId: string }
  | { term: string; answer: "stock" }
  | { term: string; answer: "alternatives" };

type FillerInstance = {
  resolve(items: readonly string[], answers: readonly ResolveAnswer[]): Promise<unknown>;
};

async function surfaceCall(
  tool: string,
  args: Record<string, unknown>,
): Promise<{ content: string; structured: Record<string, unknown> }> {
  const call = { name: tool, arguments: args };

  recordCall(call);

  const answer = outcome(respond(call));

  if (answer.isError) throw new Error(answer.content as string);

  return { content: (answer.content as string | undefined) ?? "", structured: answer.structured as Record<string, unknown> };
}

const fillerCart = { current: () => Promise.resolve(readCart(false)) };

let filler: FillerInstance | undefined;

function buildFiller(): FillerInstance {
  const session = createSurface(surfaceCall);

  return new Filler(session as never, fillerCart as never) as unknown as FillerInstance;
}

export async function startDaemon(): Promise<void> {
  try {
    unlinkSync(paths.socket);
  } catch {
    /* no stale socket */
  }

  filler = buildFiller();

  async function handleLine(socket: import("node:net").Socket, line: string): Promise<void> {
    let id = "";

    try {
      const request = JSON.parse(line) as { id: string; method: string; params: ToolCall };
      id = request.id;

      let result: Record<string, unknown> = { pong: true };

      const write = WRITES[request.method];

      if (request.method === "cartCurrent") {
        result = readCart(false);
      } else if (request.method === "resolveList") {
        const params = request.params as unknown as {
          items: readonly string[];
          answers: readonly ResolveAnswer[];
        };

        result = (await filler!.resolve(params.items, params.answers)) as Record<string, unknown>;
      } else if (write !== undefined) {
        const params = request.params as unknown as Record<string, unknown>;
        const call = {
          name: write,
          arguments: (request.method === "cartSetup"
            ? params.change
            : params) as Record<string, unknown>,
        };

        recordCall(call);
        result = { confirmed: respond(call), state: readCart(true) } as Record<string, unknown>;
      } else if (request.method === "callTool") {
        const call = request.params;

        recordCall(call);
        result = outcome(respond(call));
      }

      socket.write(`${JSON.stringify({ id: request.id, ok: true, result })}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      socket.write(`${JSON.stringify({ id, ok: false, error: { message } })}\n`);
    }
  }

  server = createServer((socket) => {
    socket.setEncoding("utf8");
    let buffer = "";
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        void handleLine(socket, line);
        newline = buffer.indexOf("\n");
      }
    });
  });

  await new Promise<void>((resolve) => server?.listen(paths.socket, resolve));
}

export function stopDaemon(): void {
  server?.close();
  rmSync(home, { recursive: true, force: true });
}

export type Output = { text: string; code: number | null; error: string };

export function output(args: readonly string[]): Promise<Output> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI, ...args], {
      env: { ...process.env, SILPO_HOME: home, TZ: "Europe/Kyiv" },
    });

    let out = "";
    let err = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (out += chunk));
    child.stderr.on("data", (chunk: string) => (err += chunk));
    child.on("error", reject);
    child.on("exit", (code) => resolve({ text: out, code, error: err }));
  });
}

export async function run(args: readonly string[]): Promise<string> {
  const { text, code, error } = await output(args);

  if (code !== 0) throw new Error(`${args.join(" ")} exited ${code}: ${error}`);

  return text;
}

export function fails(args: readonly string[]): Promise<string> {
  return run(args).then(
    () => {
      throw new Error(`${args.join(" ")} was expected to fail`);
    },
    (error: Error) => error.message,
  );
}

export type FixtureNames = Readonly<Record<string, string | readonly string[] | Responder>>;

export function fixtures(byTool: FixtureNames): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(byTool).map(([tool, name]) => [
      tool,
      typeof name === "function"
        ? name
        : typeof name === "string"
          ? fixture(name)
          : name.map(fixture),
    ]),
  );
}

export function pagedOrdersFixture(name: string): Responder {
  const payload = fixture(name) as {
    readonly orders: readonly Record<string, unknown>[];
    readonly meta: { readonly limit: number; readonly offset: number; readonly total: number };
  };

  return (args) => {
    const offset = Number(args.offset ?? 0);
    const limit = Number(args.limit ?? payload.meta.total);
    const page = payload.orders.slice(offset, offset + limit);

    return { ...payload, orders: page, meta: { ...payload.meta, limit, offset } };
  };
}

export async function render(name: string, args: readonly string[]): Promise<string> {
  setPayload(fixture(name));

  return await run(args);
}

export async function renderTools(
  byTool: FixtureNames,
  args: readonly string[],
): Promise<string> {
  setPayloads(fixtures(byTool));

  return await run(args);
}

export async function renderFailing(name: string, args: readonly string[]): Promise<string> {
  setPayload(fixture(name));

  return failingOutput(args);
}

export async function renderToolsFailing(
  byTool: FixtureNames,
  args: readonly string[],
): Promise<string> {
  setPayloads(fixtures(byTool));

  return failingOutput(args);
}

async function failingOutput(args: readonly string[]): Promise<string> {
  const { text, code } = await output(args);

  if (code === 0) throw new Error(`${args.join(" ")} was expected to fail`);

  return text;
}
