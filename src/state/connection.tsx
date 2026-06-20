import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ForgeClient, type ForgeUser } from "@/lib/forge";
import { clearCredentials, loadCredentials, saveCredentials } from "@/lib/auth";

interface ConnectionState {
  client: ForgeClient | null;
  user: ForgeUser | null;
  ready: boolean;
  connect: (baseUrl: string, token: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

const Ctx = createContext<ConnectionState | null>(null);

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<ForgeClient | null>(null);
  const [user, setUser] = useState<ForgeUser | null>(null);
  const [ready, setReady] = useState(false);

  async function connect(baseUrl: string, token: string) {
    const c = new ForgeClient(baseUrl, token);
    const me = await c.whoami(); // throws on bad URL/token -> surfaced to caller
    await saveCredentials({ baseUrl, token });
    setClient(c);
    setUser(me);
  }

  async function disconnect() {
    await clearCredentials();
    setClient(null);
    setUser(null);
  }

  useEffect(() => {
    (async () => {
      const saved = await loadCredentials().catch(() => null);
      if (saved) {
        try {
          await connect(saved.baseUrl, saved.token);
        } catch {
          await clearCredentials();
        }
      }
      setReady(true);
    })();
  }, []);

  const value = useMemo(
    () => ({ client, user, ready, connect, disconnect }),
    [client, user, ready],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConnection() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useConnection must be used within ConnectionProvider");
  return v;
}
