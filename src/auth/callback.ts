import { createServer, type Server } from "node:http";

export const CALLBACK_HOST = "127.0.0.1";
export const CALLBACK_PATH = "/callback";

const PAGE_STYLE =
  "font:16px/1.5 -apple-system,system-ui,sans-serif;max-width:32rem;margin:20vh auto;text-align:center;color:#1d1d1f";

function page(title: string, detail: string): string {
  return `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="${PAGE_STYLE}"><h1>${title}</h1><p>${detail}</p>`;
}

export interface CallbackListener {
  readonly redirectUri: string;
  readonly result: Promise<string>;
  close(): void;
}

export interface CallbackOptions {
  readonly port: number;
  readonly expectedState: string;
  readonly timeoutMs: number;
}

export async function listenForCallback({
  port,
  expectedState,
  timeoutMs,
}: CallbackOptions): Promise<CallbackListener> {
  let server: Server;
  let settle: (outcome: { value: string } | { error: Error }) => void = () => {};

  const result = new Promise<string>((resolve, reject) => {
    settle = (outcome) => ("value" in outcome ? resolve(outcome.value) : reject(outcome.error));
  });

  server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", `http://${CALLBACK_HOST}:${port}`);
    if (url.pathname !== CALLBACK_PATH) {
      response.writeHead(404).end();
      return;
    }

    const error = url.searchParams.get("error");
    const code = url.searchParams.get("code");

    if (error) {
      const detail = url.searchParams.get("error_description") ?? error;
      response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
      response.end(page("Authorization failed", detail));
      settle({ error: new Error(`authorization rejected: ${detail}`) });
      return;
    }
    if (!code) {
      response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
      response.end(page("Authorization failed", "The callback carried no authorization code."));
      settle({ error: new Error("callback carried no authorization code") });
      return;
    }
    if (url.searchParams.get("state") !== expectedState) {
      response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
      response.end(page("Authorization failed", "The callback state did not match this login."));
      settle({ error: new Error("authorization state mismatch, aborting login") });
      return;
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(page("Signed in to Silpo", "You can close this tab and return to the terminal."));
    settle({ value: code });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", (error: NodeJS.ErrnoException) => {
      reject(
        error.code === "EADDRINUSE"
          ? new Error(`port ${port} is busy, pass a free one with --port`)
          : error,
      );
    });
    server.listen(port, CALLBACK_HOST, resolve);
  });

  const timer = setTimeout(() => {
    settle({ error: new Error(`login timed out after ${Math.round(timeoutMs / 1000)}s`) });
  }, timeoutMs);

  return {
    redirectUri: `http://${CALLBACK_HOST}:${port}${CALLBACK_PATH}`,
    result,
    close() {
      clearTimeout(timer);
      server.close();
      server.closeAllConnections();
    },
  };
}
