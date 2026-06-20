import { useEffect, useState } from "react";
import { render, Box, Text } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { ForgeClient, type ForgeUser } from "../lib/forge";
import { loadCreds, saveCreds, type Creds } from "./creds";
import { errMsg } from "./useAsync";
import { App } from "./App";

function Connect({ initialUrl, error, onDone }: { initialUrl: string; error?: string; onDone: (c: Creds) => void }) {
  const [step, setStep] = useState<"url" | "token">("url");
  const [url, setUrl] = useState(initialUrl);
  const [token, setToken] = useState("");
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Connect to Forgejo / Gitea</Text>
      {error ? <Text color="red">{error}</Text> : null}
      {step === "url" ? (
        <Box>
          <Text>Server URL: </Text>
          <TextInput value={url} onChange={setUrl} onSubmit={() => url.trim() && setStep("token")} />
        </Box>
      ) : (
        <Box>
          <Text>Token: </Text>
          <TextInput
            value={token}
            mask="*"
            onChange={setToken}
            onSubmit={() => token.trim() && onDone({ baseUrl: url.trim(), token: token.trim() })}
          />
        </Box>
      )}
    </Box>
  );
}

function Root() {
  const [creds, setCreds] = useState<Creds | null>(() => loadCreds());
  const [client, setClient] = useState<ForgeClient | null>(null);
  const [user, setUser] = useState<ForgeUser | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);

  // Take over the terminal (alt-screen) and restore it on exit — btop-style.
  useEffect(() => {
    process.stdout.write("\x1b[?1049h");
    const restore = () => process.stdout.write("\x1b[?1049l");
    process.on("exit", restore);
    return () => {
      process.off("exit", restore);
      restore();
    };
  }, []);

  useEffect(() => {
    if (!creds) return;
    let live = true;
    const c = new ForgeClient(creds.baseUrl, creds.token);
    c.whoami()
      .then((u) => {
        if (!live) return;
        saveCreds(creds); // persist only validated credentials
        setClient(c);
        setUser(u);
      })
      .catch((e: unknown) => {
        if (!live) return;
        setError(errMsg(e));
        setCreds(null);
      });
    return () => {
      live = false;
    };
  }, [creds]);

  if (!creds) {
    return (
      <Connect
        initialUrl={process.env.GITIFY_URL ?? ""}
        error={error}
        onDone={(c) => {
          setError(undefined);
          setCreds(c);
        }}
      />
    );
  }
  if (!client || !user) {
    return (
      <Box padding={1}>
        <Text>
          <Spinner type="dots" /> Connecting to {creds.baseUrl}…
        </Text>
      </Box>
    );
  }
  return <App client={client} user={user} />;
}

render(<Root />);
