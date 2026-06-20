import { useEffect, useRef, useState } from "react";
import { Box, Text, useInput, measureElement, type DOMElement } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import type { ForgeClient, Issue } from "../lib/forge";
import { viewLabel, type View } from "../lib/view";
import { useAsync, errMsg } from "./useAsync";
import { useTerminalSize } from "./useTerminalSize";
import { ScrollList, rangeLabel } from "./ScrollList";

type State = "open" | "closed" | "all";
type Mode = "browse" | "search" | "new-title" | "new-body";

export function IssueList({
  client,
  view,
  onOpen,
  onBack,
}: {
  client: ForgeClient;
  view: View;
  onOpen: (owner: string, repo: string, issue: Issue) => void;
  onBack: () => void;
}) {
  const { columns, rows } = useTerminalSize();
  const [state, setState] = useState<State>("open");
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const [mode, setMode] = useState<Mode>("browse");
  const [draft, setDraft] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const isRepo = view.kind === "repo";
  const list = useAsync<Issue[]>(
    () =>
      view.kind === "repo"
        ? client.listIssues(view.repo.owner.login, view.repo.name, { state, q: q || undefined })
        : view.kind === "search"
          ? client.searchIssues({ ...view.params, state, q: q || undefined })
          : Promise.resolve([] as Issue[]),
    [view, state, q],
  );
  const issues = list.data ?? [];

  function openAt(i: number) {
    const it = issues[i];
    if (!it) return;
    if (view.kind === "repo") onOpen(view.repo.owner.login, view.repo.name, it);
    else if (it.repository) onOpen(it.repository.owner, it.repository.name, it);
  }

  async function createIssue(body: string) {
    if (view.kind !== "repo") return;
    setBusy("Creating…");
    try {
      const created = await client.createIssue(view.repo.owner.login, view.repo.name, {
        title: title.trim(),
        body: body.trim() || undefined,
      });
      setBusy(null);
      onOpen(view.repo.owner.login, view.repo.name, created);
    } catch (e) {
      setBusy(errMsg(e));
    }
  }

  useInput(
    (input, key) => {
      if (key.escape) return onBack();
      if (key.downArrow || input === "j") setCursor((c) => Math.min(c + 1, issues.length - 1));
      if (key.upArrow || input === "k") setCursor((c) => Math.max(c - 1, 0));
      if (key.pageDown || input === "f") setCursor((c) => Math.min(c + 10, issues.length - 1));
      if (key.pageUp || input === "b") setCursor((c) => Math.max(c - 10, 0));
      if (input === "g") setCursor(0);
      if (input === "G") setCursor(issues.length - 1);
      if (key.return) openAt(cursor);
      if (input === "o") { setState("open"); setCursor(0); }
      if (input === "c") { setState("closed"); setCursor(0); }
      if (input === "a") { setState("all"); setCursor(0); }
      if (input === "/") { setDraft(q); setMode("search"); }
      if (input === "n" && isRepo) { setTitle(""); setDraft(""); setMode("new-title"); }
    },
    { isActive: mode === "browse" },
  );

  const sel = Math.min(cursor, Math.max(issues.length - 1, 0));

  const bodyRef = useRef<DOMElement | null>(null);
  const [bodyH, setBodyH] = useState(rows - 5);
  useEffect(() => {
    if (bodyRef.current) {
      const { height } = measureElement(bodyRef.current);
      if (height > 0 && height !== bodyH) setBodyH(height);
    }
  });

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box justifyContent="space-between" paddingX={1} borderStyle="round" borderColor="cyan">
        <Text bold color="cyan" wrap="truncate">
          {viewLabel(view)} <Text dimColor>· {state}</Text>
          {q ? <Text dimColor> · /{q}</Text> : null}
        </Text>
        <Text dimColor>{rangeLabel(sel, issues.length)}</Text>
      </Box>

      {mode === "search" && (
        <Box paddingX={1}>
          <Text>Search: </Text>
          <TextInput
            value={draft}
            onChange={setDraft}
            onSubmit={() => { setQ(draft.trim()); setCursor(0); setMode("browse"); }}
          />
        </Box>
      )}
      {mode === "new-title" && (
        <Box paddingX={1}>
          <Text>New issue title: </Text>
          <TextInput value={title} onChange={setTitle} onSubmit={() => title.trim() && setMode("new-body")} />
        </Box>
      )}
      {mode === "new-body" && (
        <Box paddingX={1}>
          <Text>Body (optional): </Text>
          <TextInput value={draft} onChange={setDraft} onSubmit={() => createIssue(draft)} />
        </Box>
      )}

      <Box ref={bodyRef} flexGrow={1} flexDirection="column" paddingX={1}>
        {list.loading ? (
          <Text>
            <Spinner type="dots" /> loading…
          </Text>
        ) : list.error ? (
          <Text color="red" wrap="truncate">
            {list.error}
          </Text>
        ) : issues.length === 0 ? (
          <Text dimColor>No issues.</Text>
        ) : (
          <ScrollList
            items={issues}
            selected={sel}
            height={bodyH}
            renderRow={(it, isSel) => (
              <Text wrap="truncate" color={isSel ? "black" : undefined} backgroundColor={isSel ? "cyan" : undefined}>
                {isSel ? "▶ " : "  "}
                <Text color={isSel ? "black" : it.state === "open" ? "green" : "magenta"}>●</Text> {it.title}{" "}
                <Text dimColor={!isSel}>#{it.number}</Text>
                {view.kind === "search" && it.repository ? ` · ${it.repository.full_name}` : ""}
              </Text>
            )}
          />
        )}
      </Box>

      <Box paddingX={1}>
        <Text dimColor wrap="truncate">
          {busy ? busy : `j/k move · enter open · / search · o/c/a state${isRepo ? " · n new" : ""} · esc back`}
        </Text>
      </Box>
    </Box>
  );
}
