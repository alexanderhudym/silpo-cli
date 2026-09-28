import { readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";

import { ensureHome, paths } from "../config/paths.js";

export interface StoredCredentials {
  client_id?: string;
  client_secret?: string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  refresh_token?: string;
  obtained_at?: number;
}

export function readCredentials(): StoredCredentials | undefined {
  let contents: string;
  try {
    contents = readFileSync(paths.token, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  const parsed: unknown = JSON.parse(contents);
  if (typeof parsed !== "object" || parsed === null) return undefined;
  return parsed as StoredCredentials;
}

export function writeCredentials(credentials: StoredCredentials): StoredCredentials {
  ensureHome();
  const temp = `${paths.token}.tmp`;
  writeFileSync(temp, `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 });
  renameSync(temp, paths.token);
  return credentials;
}

export function mergeCredentials(patch: StoredCredentials): StoredCredentials {
  return writeCredentials({ ...readCredentials(), ...patch });
}

export function clearCredentials(): void {
  rmSync(paths.token, { force: true });
}

export function isExpired(credentials: StoredCredentials, skewMs = 60_000): boolean {
  if (credentials.obtained_at === undefined || credentials.expires_in === undefined) return false;
  return credentials.obtained_at + credentials.expires_in * 1_000 - skewMs <= Date.now();
}
