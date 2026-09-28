import { auth, discoverOAuthServerInfo } from "@modelcontextprotocol/sdk/client/auth.js";

import { openInBrowser } from "./browser.js";
import { listenForCallback } from "./callback.js";
import { clearCredentials, readCredentials, type StoredCredentials } from "./credentials.js";
import { InteractiveAuthProvider } from "./provider.js";

export const LOGIN_TIMEOUT_MS = 5 * 60_000;

export interface LoginOptions {
  readonly baseUrl: string;
  readonly port: number;
  readonly useBrowser: boolean;
  readonly onAuthorizationUrl: (url: string, opened: boolean) => void;
}

export async function performLogin(options: LoginOptions): Promise<StoredCredentials> {
  const provider = new InteractiveAuthProvider(options.port);
  const listener = await listenForCallback({
    port: options.port,
    expectedState: provider.expectedState,
    timeoutMs: LOGIN_TIMEOUT_MS,
  });

  try {
    const started = await auth(provider, { serverUrl: options.baseUrl });
    if (started !== "REDIRECT") {
      throw new Error(`unexpected authorization outcome: ${started}`);
    }

    const authorizationUrl = provider.takeAuthorizationUrl().toString();
    options.onAuthorizationUrl(authorizationUrl, options.useBrowser && openInBrowser(authorizationUrl));

    const code = await listener.result;
    const finished = await auth(provider, { serverUrl: options.baseUrl, authorizationCode: code });
    if (finished !== "AUTHORIZED") {
      throw new Error(`token exchange did not complete: ${finished}`);
    }
  } finally {
    listener.close();
  }

  const credentials = readCredentials();
  if (!credentials?.access_token) throw new Error("login finished without an access token");
  return credentials;
}

export async function revokeTokens(baseUrl: string): Promise<boolean> {
  const credentials = readCredentials();
  const token = credentials?.refresh_token ?? credentials?.access_token;
  if (!token || !credentials?.client_id) return false;

  let endpoint: string | undefined;
  try {
    const info = await discoverOAuthServerInfo(baseUrl);
    const metadata = info.authorizationServerMetadata as Record<string, unknown> | undefined;
    const declared = metadata?.["revocation_endpoint"];
    endpoint = typeof declared === "string" ? declared : undefined;
  } catch {
    return false;
  }
  if (!endpoint) return false;

  const body = new URLSearchParams({
    token,
    token_type_hint: credentials.refresh_token ? "refresh_token" : "access_token",
    client_id: credentials.client_id,
  });

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function forgetCredentials(): void {
  clearCredentials();
}
