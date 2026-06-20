import { useState } from "react";
import { useConnection } from "@/state/connection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Connect() {
  const { connect } = useConnection();
  const [baseUrl, setBaseUrl] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await connect(baseUrl.trim(), token.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center text-center">
          <img src="/icon.svg" alt="Gitify" className="size-16" />
          <h1 className="mt-3 text-xl font-semibold">Gitify</h1>
          <p className="text-sm text-muted-foreground">Connect to your Forgejo or Gitea instance.</p>
        </div>
        <label className="block space-y-1">
          <span className="text-sm">Instance URL</span>
          <Input
            placeholder="https://git.example.com"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm">Personal Access Token</span>
          <Input
            type="password"
            placeholder="token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Connecting…" : "Connect"}
        </Button>
      </form>
    </div>
  );
}
