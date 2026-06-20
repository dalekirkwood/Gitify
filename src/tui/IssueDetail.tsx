import { useEffect, useRef, useState } from "react";
import { Box, Text, useInput, measureElement, type DOMElement } from "ink";
import Spinner from "ink-spinner";
import type { ForgeClient, Issue } from "../lib/forge";
import { useAsync, errMsg } from "./useAsync";
import { useTerminalSize } from "./useTerminalSize";
import { ScrollList } from "./ScrollList";
import { MentionInput } from "./MentionInput";

type Mode = "view" | "comment" | "assignees";

interface Line {
  text: string;
  color?: string;
  dim?: boolean;
  bold?: boolean;
}

// Hard word-wrap a string to `width`, preserving existing newlines.
function wrap(text: string, width: number): string[] {
  const w = Math.max(1, width);
  const out: string[] = [];
  for (const para of (text || "").split("\n")) {
    if (para === "") {
      out.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/\s+/)) {
      let word2 = word;
      while (word2.length > w) {
        if (line) {
          out.push(line);
          line = "";
        }
        out.push(word2.slice(0, w));
        word2 = word2.slice(w);
      }
      if (!line) line = word2;
      else if (line.length + 1 + word2.length <= w) line += " " + word2;
      else {
        out.push(line);
        line = word2;
      }
    }
    out.push(line);
  }
  return out;
}

export function IssueDetail({
  client,
  owner,
  repo,
  issue,
  onBack,
}: {
  client: ForgeClient;
  owner: string;
  repo: string;
  issue: Issue;
  onBack: () => void;
}) {
  const { columns, rows } = useTerminalSize();
  const [rev, setRev] = useState(0);
  const [mode, setMode] = useState<Mode>("view");
  const [draft, setDraft] = useState("");
  const [top, setTop] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const data = useAsync(async () => {
    const [iss, comments, assignees] = await Promise.all([
      client.getIssue(owner, repo, issue.number),
      client.listComments(owner, repo, issue.number),
      client.listAssignees(owner, repo),
    ]);
    return { iss, comments, assignees };
  }, [owner, repo, issue.number, rev]);

  const refresh = () => setRev((r) => r + 1);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label);
    try {
      await fn();
      setBusy(null);
      refresh();
    } catch (e) {
      setBusy(errMsg(e));
    }
  }

  const iss = data.data?.iss;
  const assignees = data.data?.assignees ?? [];
  const current = new Set((iss?.assignees ?? []).map((a) => a.login));

  const bodyRef = useRef<DOMElement | null>(null);
  const [bodyH, setBodyH] = useState(rows - 4);
  useEffect(() => {
    if (bodyRef.current) {
      const { height } = measureElement(bodyRef.current);
      if (height > 0 && height !== bodyH) setBodyH(height);
    }
  });

  const textWidth = Math.max(10, columns - 2);
  const lines: Line[] = [];
  if (iss) {
    lines.push({ text: `${owner}/${repo}`, dim: true });
    lines.push({ text: `${iss.title}  #${iss.number}  [${iss.state}]`, bold: true });
    if (iss.labels.length) lines.push({ text: iss.labels.map((l) => l.name).join(" · "), color: "yellow" });
    lines.push({ text: "" });
    for (const l of wrap(iss.body?.trim() || "No description.", textWidth)) lines.push({ text: l });
    lines.push({ text: "" });
    lines.push({ text: `Comments (${data.data?.comments.length ?? 0})`, dim: true, bold: true });
    for (const c of data.data?.comments ?? []) {
      lines.push({ text: `@${c.user.login}`, color: "cyan" });
      for (const l of wrap(c.body, textWidth)) lines.push({ text: l });
      lines.push({ text: "" });
    }
  }
  const maxTop = Math.max(0, lines.length - bodyH);
  const clampedTop = Math.min(top, maxTop);

  useInput(
    (input, key) => {
      if (mode === "assignees") {
        if (key.escape) return setMode("view");
        if (key.downArrow || input === "j") setCursor((c) => Math.min(c + 1, assignees.length - 1));
        if (key.upArrow || input === "k") setCursor((c) => Math.max(c - 1, 0));
        if (input === " ") {
          const u = assignees[cursor];
          if (!u) return;
          const next = new Set(current);
          next.has(u.login) ? next.delete(u.login) : next.add(u.login);
          run("Saving assignees…", () => client.patchIssue(owner, repo, issue.number, { assignees: [...next] }));
        }
        return;
      }
      if (key.escape) return onBack();
      if (key.downArrow || input === "j") setTop((t) => Math.min(t + 1, maxTop));
      if (key.upArrow || input === "k") setTop((t) => Math.max(t - 1, 0));
      if (key.pageDown || input === "f") setTop((t) => Math.min(t + 10, maxTop));
      if (key.pageUp || input === "b") setTop((t) => Math.max(t - 10, 0));
      if (input === "g") setTop(0);
      if (input === "G") setTop(maxTop);
      if (input === "c" && iss) {
        run(iss.state === "open" ? "Closing…" : "Reopening…", () =>
          client.patchIssue(owner, repo, issue.number, { state: iss.state === "open" ? "closed" : "open" }),
        );
      }
      if (input === "m") { setDraft(""); setMode("comment"); }
      if (input === "a") { setCursor(0); setMode("assignees"); }
    },
    { isActive: mode !== "comment" },
  );

  if (data.loading || !iss) {
    return (
      <Box width={columns} height={rows} padding={1}>
        <Text>
          <Spinner type="dots" /> loading issue…
        </Text>
      </Box>
    );
  }

  if (mode === "assignees") {
    return (
      <Box flexDirection="column" width={columns} height={rows}>
        <Box paddingX={1} borderStyle="round" borderColor="cyan">
          <Text bold color="cyan">
            Assignees · #{iss.number}
          </Text>
        </Box>
        <Box ref={bodyRef} flexGrow={1} flexDirection="column" paddingX={1}>
          {assignees.length === 0 ? <Text dimColor>No assignable users.</Text> : null}
          <ScrollList
            items={assignees}
            selected={Math.min(cursor, Math.max(assignees.length - 1, 0))}
            height={bodyH}
            renderRow={(u, isSel) => (
              <Text wrap="truncate" color={isSel ? "black" : undefined} backgroundColor={isSel ? "cyan" : undefined}>
                {isSel ? "▶ " : "  "}[{current.has(u.login) ? "x" : " "}] @{u.login}
              </Text>
            )}
          />
        </Box>
        <Box paddingX={1}>
          <Text dimColor wrap="truncate">
            {busy ? busy : "j/k move · space toggle · esc back"}
          </Text>
        </Box>
      </Box>
    );
  }

  const windowLines = lines.slice(clampedTop, clampedTop + bodyH);

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      <Box justifyContent="space-between" paddingX={1} borderStyle="round" borderColor="cyan">
        <Text bold color={iss.state === "open" ? "green" : "magenta"} wrap="truncate">
          #{iss.number} {iss.title}
        </Text>
        <Text dimColor>{maxTop > 0 ? `${clampedTop + 1}/${lines.length}` : ""}</Text>
      </Box>

      <Box ref={bodyRef} flexGrow={1} flexDirection="column" paddingX={1}>
        {windowLines.map((l, i) => (
          <Text key={clampedTop + i} wrap="truncate" color={l.color} dimColor={l.dim} bold={l.bold}>
            {l.text || " "}
          </Text>
        ))}
      </Box>

      {mode === "comment" && (
        <Box paddingX={1}>
          <MentionInput
            label="Comment: "
            value={draft}
            onChange={setDraft}
            users={assignees.map((a) => a.login)}
            onCancel={() => setMode("view")}
            onSubmit={(body) => {
              const text = body.trim();
              setMode("view");
              if (text) run("Posting…", () => client.addComment(owner, repo, issue.number, text));
            }}
          />
        </Box>
      )}

      <Box paddingX={1}>
        <Text dimColor wrap="truncate">
          {busy
            ? busy
            : mode === "comment"
              ? "type @ to mention · ↑/↓ + tab/enter accept · enter send · esc cancel"
              : `j/k scroll · c ${iss.state === "open" ? "close" : "reopen"} · m comment · a assignees · esc back`}
        </Text>
      </Box>
    </Box>
  );
}
