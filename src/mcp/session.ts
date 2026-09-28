import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { FileAuthProvider, LoginRequiredError } from "../auth/provider.js";
import { readCredentials } from "../auth/credentials.js";
import { OpenWorldValidator } from "./validator.js";
import { CLI_NAME, CLI_VERSION } from "../version.js";
import { createSurface, type SilpoSurface } from "./surface.js";
import { Client } from "@modelcontextprotocol/sdk/client";

export type ToolCallOutcome =
  | {
      readonly isError: false;
      readonly content: string;
      readonly structured: Record<string, unknown>;
    }
  | { readonly isError: true; readonly content: string };

export interface McpSession extends SilpoSurface {
  readonly client: Client;
  readonly baseUrl: string;
  readonly sessionId: string | undefined;
  readonly serverInfo: { name: string; version: string } | undefined;
  readonly toolCount: number;
  callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolCallOutcome>;
  close(): Promise<void>;
}

interface TextBlock {
  type: string;
  text?: string;
}

const RATE_LIMITED = /rate limit/i;

/**
 * The server rejects a burst of cart writes with a tool error rather than an HTTP 429, so the SDK
 * never sees a status to back off from. A rejected call did not run — the limiter turned it away
 * before it reached the cart — so repeating it cannot write twice. The window it opens is short:
 * a rejected write was accepted again within two seconds of being turned away, and repeating into
 * the window did not extend it.
 */
const RETRY_WAITS_MS = [1_000, 2_000, 4_000] as const;

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function pastRateLimit(
  attempt: () => Promise<ToolCallOutcome>,
  waits: readonly number[] = RETRY_WAITS_MS,
): Promise<ToolCallOutcome> {
  let outcome = await attempt();

  for (const wait of waits) {
    if (!outcome.isError || !RATE_LIMITED.test(outcome.content)) return outcome;

    await pause(wait);

    outcome = await attempt();
  }

  return outcome;
}

function flattenContent(content: unknown): string {
  if (!Array.isArray(content)) return "";
  return (content as TextBlock[])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n");
}

export async function openSession(baseUrl: string): Promise<McpSession> {
  if (!readCredentials()?.access_token) throw new LoginRequiredError();

  const transport = new StreamableHTTPClientTransport(new URL(baseUrl), {
    authProvider: new FileAuthProvider(),
  });
  const client = new Client(
    { name: CLI_NAME, version: CLI_VERSION },
    { jsonSchemaValidator: new OpenWorldValidator() },
  );

  try {
    await client.connect(transport);
  } catch (error) {
    await transport.close().catch(() => {});
    if (error instanceof UnauthorizedError) throw new LoginRequiredError();
    throw error;
  }

  const { tools } = await client.listTools();
  const serverVersion = client.getServerVersion();

  async function callOnce(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolCallOutcome> {
    const result = await client.callTool({ name, arguments: args });
    const content = flattenContent(result.content);

    if (result.isError === true) {
      return { isError: true, content: content || `${name} failed` };
    }

    const structured = result.structuredContent as
      | Record<string, unknown>
      | undefined;

    if (!structured) throw new Error(`${name} returned no structured output`);

    return { isError: false, content, structured };
  }

  async function callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<ToolCallOutcome> {
    return pastRateLimit(() => callOnce(name, args));
  }

  const surface = createSurface(async (tool, args) => {
    const outcome = await callTool(tool, args);

    if (outcome.isError) throw new Error(outcome.content);

    return { content: outcome.content, structured: outcome.structured };
  });

  return {
    ...surface,
    client,
    baseUrl,
    sessionId: transport.sessionId,
    serverInfo: serverVersion && {
      name: serverVersion.name,
      version: serverVersion.version,
    },
    toolCount: tools.length,
    callTool,
    async close() {
      await client.close().catch(() => {});
    },
  };
}
