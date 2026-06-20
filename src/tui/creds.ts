import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

export interface Creds {
  baseUrl: string;
  token: string;
}

function configPath(): string {
  const base = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(base, "gitify", "config.json");
}

// Resolution order: env vars -> XDG config file -> null (caller prompts).
export function loadCreds(): Creds | null {
  const baseUrl = process.env.GITIFY_URL;
  const token = process.env.GITIFY_TOKEN;
  if (baseUrl && token) return { baseUrl, token };

  const p = configPath();
  if (existsSync(p)) {
    try {
      const c = JSON.parse(readFileSync(p, "utf8")) as Partial<Creds>;
      if (c.baseUrl && c.token) return { baseUrl: c.baseUrl, token: c.token };
    } catch {
      // ponytail: unreadable config -> fall through to prompt, don't crash
    }
  }
  return null;
}

// ponytail: PAT written 0600 to the XDG config; swap to the OS keyring before release.
export function saveCreds(c: Creds): void {
  const p = configPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(c, null, 2), { mode: 0o600 });
}
