import { randomUUID } from "node:crypto";

import type { OAuthClientProvider } from "@modelcontextprotocol/sdk/client/auth.js";
import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";

import { CLI_NAME, CLI_VERSION } from "../version.js";
import { CALLBACK_HOST, CALLBACK_PATH } from "./callback.js";
import { clearCredentials, mergeCredentials, readCredentials, writeCredentials } from "./credentials.js";

export const DEFAULT_CALLBACK_PORT = 53682;

export function callbackUri(port: number): string {
  return `http://${CALLBACK_HOST}:${port}${CALLBACK_PATH}`;
}

export class LoginRequiredError extends Error {
  constructor(message = `not authorized: run \`${CLI_NAME} login\``) {
    super(message);
    this.name = "LoginRequiredError";
  }
}

export class FileAuthProvider implements OAuthClientProvider {
  constructor(protected readonly port: number = DEFAULT_CALLBACK_PORT) {}

  get redirectUrl(): string {
    return callbackUri(this.port);
  }

  get clientMetadata(): OAuthClientMetadata {
    return {
      client_name: `${CLI_NAME}-cli/${CLI_VERSION}`,
      redirect_uris: [this.redirectUrl],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
    };
  }

  clientInformation(): OAuthClientInformationMixed | undefined {
    const stored = readCredentials();
    if (!stored?.client_id) return undefined;
    return { client_id: stored.client_id, client_secret: stored.client_secret };
  }

  saveClientInformation(information: OAuthClientInformationMixed): void {
    mergeCredentials({
      client_id: information.client_id,
      ...("client_secret" in information && information.client_secret
        ? { client_secret: information.client_secret }
        : {}),
    });
  }

  tokens(): OAuthTokens | undefined {
    const stored = readCredentials();
    if (!stored?.access_token) return undefined;
    return {
      access_token: stored.access_token,
      token_type: stored.token_type ?? "Bearer",
      expires_in: stored.expires_in,
      scope: stored.scope,
      refresh_token: stored.refresh_token,
    };
  }

  saveTokens(tokens: OAuthTokens): void {
    mergeCredentials({ ...tokens, obtained_at: Date.now() });
  }

  redirectToAuthorization(_authorizationUrl: URL): void {
    throw new LoginRequiredError();
  }

  saveCodeVerifier(_codeVerifier: string): void {
    throw new LoginRequiredError();
  }

  codeVerifier(): string {
    throw new LoginRequiredError();
  }

  invalidateCredentials(scope: "all" | "client" | "tokens" | "verifier" | "discovery"): void {
    if (scope === "all") clearCredentials();
    if (scope === "tokens") {
      mergeCredentials({ access_token: undefined, refresh_token: undefined, obtained_at: undefined });
    }
  }
}

export class InteractiveAuthProvider extends FileAuthProvider {
  readonly expectedState = randomUUID();

  private registered: OAuthClientInformationMixed | undefined;
  private verifier: string | undefined;
  private authorizationUrl: URL | undefined;

  state(): string {
    return this.expectedState;
  }

  override clientInformation(): OAuthClientInformationMixed | undefined {
    return this.registered;
  }

  override saveClientInformation(information: OAuthClientInformationMixed): void {
    this.registered = information;
  }

  override tokens(): undefined {
    return undefined;
  }

  override saveTokens(tokens: OAuthTokens): void {
    const client = this.registered;
    writeCredentials({
      ...(client ? { client_id: client.client_id } : {}),
      ...(client && "client_secret" in client && client.client_secret
        ? { client_secret: client.client_secret }
        : {}),
      ...tokens,
      obtained_at: Date.now(),
    });
  }

  override redirectToAuthorization(authorizationUrl: URL): void {
    this.authorizationUrl = authorizationUrl;
  }

  override saveCodeVerifier(codeVerifier: string): void {
    this.verifier = codeVerifier;
  }

  override codeVerifier(): string {
    if (!this.verifier) throw new Error("PKCE verifier is missing, restart the login");
    return this.verifier;
  }

  takeAuthorizationUrl(): URL {
    if (!this.authorizationUrl) throw new Error("authorization server did not return a login URL");
    return this.authorizationUrl;
  }
}
